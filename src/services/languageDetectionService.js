import path from 'path'
import fs from 'fs'
import { exec } from 'child_process'
import { pipeline } from 'stream'
import logger from '../utils/logger.js'
import { promisify } from 'util'
import { getFileFromS3 } from '../utils/aws.js'
import { languageDetector, validateWavFile } from '../utils/detectLanguage.js'
import calculateCostAndLogUsage from '../utils/costAndUsageTracker.js'
import convertToWav from '../utils/convertToWav.js'
import { getAudioDuration } from '../utils/getAudioDuration.js'
import process from 'node:process'

const execPromise = promisify(exec)
const streamPipeline = promisify(pipeline) // Use promisified pipeline for robust stream handling

export const languageDetectionService = {
  async detectLanguage({ fileUrl, organizationId, userId }) {
    const uniqueId = Date.now()
    const tempDir = `temp-${uniqueId}`
    const inputPath = path.join(tempDir, `${uniqueId}.wav`)
    const snippetPath = path.join(tempDir, `${uniqueId}_snippet.wav`)
    let totalCost = 0

    try {
      // Create temp directory
      fs.mkdirSync(tempDir, { recursive: true })

      // Extract bucket name and key
      const bucketName = process.env.AWS_S3_BUCKET
      const bucketPrefix = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/`

      if (!fileUrl.startsWith(bucketPrefix)) {
        throw new Error(
          `Invalid fileUrl. Expected to start with: ${bucketPrefix}`
        )
      }

      const key = fileUrl.replace(bucketPrefix, '')
      logger.info(`Downloading file from S3: bucket=${bucketName}, key=${key}`)

      // Fetch file from S3
      const s3Stream = await getFileFromS3({ bucketName, key })
      await streamPipeline(s3Stream, fs.createWriteStream(inputPath))
      logger.info(`File downloaded to: ${inputPath}`)

      // Ensure the file exists
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Downloaded file not found at ${inputPath}`)
      }

      // Get audio duration
      const durationSeconds = await getAudioDuration(inputPath)
      logger.info(`Audio duration: ${durationSeconds} seconds`)

      // Convert to WAV if necessary
      let wavPath = inputPath
      if (!inputPath.endsWith('.wav')) {
        wavPath = `${inputPath}.wav`
        await convertToWav(inputPath, wavPath)
        fs.unlinkSync(inputPath)
        logger.info(`File converted to WAV: ${wavPath}`)
      }

      // Extract 30-second snippet
      const snippetCommand =
        durationSeconds < 30
          ? `cp "${wavPath}" "${snippetPath}"`
          : `ffmpeg -i "${wavPath}" -t 30 -ac 1 -ar 16000 "${snippetPath}"`

      await execPromise(snippetCommand)
      logger.info(`Snippet created: ${snippetPath}`)

      // Validate WAV snippet
      validateWavFile(snippetPath)

      // Detect language
      const { detectedLanguage, languageConfidence } =
        await languageDetector(snippetPath)

      // Log cost and usage
      const costDetails = await calculateCostAndLogUsage({
        serviceId: 7, // Example service ID for "Detect Language"
        organizationId,
        userId,
        audioDuration: durationSeconds / 60, // Duration in minutes
        bytes: fs.statSync(snippetPath).size,
        status: 'completed'
      })

      totalCost += costDetails.cost

      return {
        message: 'Language detected successfully',
        language: detectedLanguage,
        confidence: languageConfidence,
        totalCost
      }
    } catch (error) {
      logger.error('Error during language detection:', error)
      throw new Error(error.message)
    } finally {
      // Cleanup
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
      if (fs.existsSync(snippetPath) && snippetPath !== inputPath)
        fs.unlinkSync(snippetPath)
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true })
    }
  }
}
