import axios from 'axios'
import fs from 'fs'
import path from 'path'
import archiver from 'archiver'
import { exec } from 'child_process'
import util from 'util'
import { uploadFileToS3 } from '../utils/aws.js'
import calculateCostAndLogUsage from '../utils/costAndUsageTracker.js'
import getAudioDuration from '../utils/getAudioDuration.js'
import convertToWav from '../utils/convertToWav.js'
import process from 'node:process'

const execPromise = util.promisify(exec)

const audioService = {
  /**
   * Split and zip an audio file
   * @param {Object} options
   * @param {String} options.s3FileUrl - URL of the file in S3
   * @param {Number} options.duration - Duration for each split segment
   * @param {Number} options.organizationId - Organization ID
   * @param {Number} options.userId - User ID
   * @returns {String} - URL of the zipped file
   */
  async splitAndZipAudio({ fileUrl, duration, organizationId, userId }) {
    const inputPath = `temp-${Date.now()}.wav`
    const outputDir = `output-${Date.now()}`
    const zipPath = `${outputDir}.zip`
    try {
      // Download the file from S3
      const response = await axios({
        url: fileUrl,
        method: 'GET',
        responseType: 'stream'
      })
      const writer = fs.createWriteStream(inputPath)
      response.data.pipe(writer)

      // Wait for the file to finish writing
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
      })

      // Convert to WAV if necessary
      let wavPath = inputPath
      if (!inputPath.endsWith('.wav')) {
        wavPath = `${inputPath}.wav`
        await convertToWav(inputPath, wavPath)
        fs.unlinkSync(inputPath)
      }

      // Get the audio duration
      const audioDuration = await getAudioDuration(wavPath)
      //get file size
      const stats = fs.statSync(wavPath)

      // Create output directory for split files
      fs.mkdirSync(outputDir, { recursive: true })

      // Use FFmpeg to split audio into segments
      const command = `ffmpeg -i "${wavPath}" -f segment -segment_time ${duration} -c copy "${outputDir}/output%03d.wav"`
      await execPromise(command)

      // Create a ZIP file of the split audio files
      const archive = archiver('zip', { zlib: { level: 9 } })
      const zipOutput = fs.createWriteStream(zipPath)
      archive.pipe(zipOutput)
      archive.directory(outputDir, false)
      await archive.finalize()

      // Upload the ZIP file to S3
      const zipKey = `audio-splits/${path.basename(zipPath)}`
      const zipUrl = await uploadFileToS3({
        bucketName: process.env.AWS_S3_BUCKET,
        key: zipKey,
        body: fs.createReadStream(zipPath),
        contentType: 'application/zip'
      })

      // Log service usage - Audo Splitting = service ID 6
      const result = await calculateCostAndLogUsage({
        serviceId: 6, // Assuming transcription has ID 1 in the database
        organizationId,
        userId,
        audioDuration, // 5 minutes
        bytes: stats.size, // 10 MB file
        requestMetadata: { audioFormat: 'mp3' },
        status: 'completed'
      })

      console.log('Transcription cost and usage logged:', result)

      return zipUrl
    } catch (error) {
      throw new Error(`Failed to split and zip audio: ${error.message}`)
    } finally {
      // Cleanup local files
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
      if (fs.existsSync(outputDir))
        fs.rmSync(outputDir, { recursive: true, force: true })
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)
    }
  }
}

export default audioService
