import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import fs, { createWriteStream } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import util from 'util'
import { uploadFileToS3 } from '../utils/aws.js'
import ffmpeg from 'fluent-ffmpeg'
import ffprobe from 'ffprobe-static'
import getAudioDuration from '../utils/getAudioDuration.js'
import convertToWav from '../utils/convertToWav.js'
import whisperTranscriber from '../utils/whisperTranscriber.js'
import { transcribeWithGoogle } from '../utils/googleTranscriber.js'
import calculateCostAndLogUsage from '../utils/costAndUsageTracker.js'
import process from 'node:process'
import knex from '../config/knex.js'
import { getFileFromS3 } from '../utils/aws.js'
import dotenv from 'dotenv'
import logger from '../utils/logger.js'

dotenv.config()
const streamPipeline = promisify(pipeline) // Use promisified pipeline for robust stream handling

const execPromise = util.promisify(exec)

const transcriptionService = {
  /**
   * Split and transcribe an audio file
   * @param {Object} params
   * @param {String} params.fileUrl - S3 URL of the audio file
   * @param {String} params.language - Language for transcription
   * @param {Boolean} params.doubleModel - Whether to use multiple transcription models
   * @param {Number} params.duration - Duration for splitting audio segments
   * @param {Number} params.organizationId - Organization ID
   * @param {Number} params.userId - User ID
   * @returns {Object} - Transcription result
   */
  async splitAndTranscribe({
    organizationId,
    userId,
    fileUrl,
    language,
    doubleModel,
    duration
  }) {
    const outputDir = `output/${Date.now()}`
    const inputPath = path.join('temp', path.basename(fileUrl))
    const bucketName = process.env.AWS_S3_BUCKET // Replace with your bucket name
    logger.info('process.env :>> ', process.env.AWS_S3_BUCKET)
    const key = fileUrl.replace(
      `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
      ''
    )
    // Define a temporary local path for the downloaded file
    const tempDir = 'temp'
    const tempFilePath = path.join(
      tempDir,
      `${Date.now()}-${path.basename(key)}`
    )

    let wavPath

    try {
      // Ensure the temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      // Get the file from S3
      const s3Stream = await getFileFromS3({ bucketName, key })
      const writeStream = createWriteStream(tempFilePath)
      // Pipe the S3 stream to the local file
      await new Promise((resolve, reject) => {
        s3Stream.pipe(writeStream)
        s3Stream.on('end', resolve)
        s3Stream.on('error', reject)
      })

      logger.info(`File downloaded to: ${tempFilePath}`)
      // Validate file format
      await this.validateAudioFile(organizationId, userId, tempFilePath)

      // Convert to WAV if necessary
      //check if file is a WAV already
      if (!tempFilePath.endsWith('.wav')) {
        wavPath = await convertToWav(tempFilePath)
      } else {
        wavPath = tempFilePath
      }
      // Get audio duration
      const bytes = fs.statSync(wavPath).size

      // Split audio
      const files = await this.splitAudio(
        organizationId,
        userId,
        wavPath,
        outputDir,
        duration,
        bytes
      )

      // Transcribe using Whisper
      const whisperResults = await this.transcribeWithWhisper(
        organizationId,
        userId,
        files,
        language
      )
      logger.info('whisperResults :>> ', whisperResults)
      // Upload Whisper transcription
      const whisperTxtFileUrl = await this.uploadTranscription(
        organizationId,
        userId,
        whisperResults.transcription,
        fileUrl,
        'whisper'
      )
      logger.info('whisperTxtFileUrl :>> ', whisperTxtFileUrl)
      const result = {
        message: 'Transcription completed successfully',
        whisperTranscription: whisperResults.transcription,
        whisperTxtFileUrl
      }

      // Optional: Transcribe using Google if `doubleModel` is true
      if (doubleModel) {
        const googleResults = await transcribeWithGoogle(
          organizationId,
          userId,
          files,
          language
        )
        const googleTxtFileUrl = await this.uploadTranscription(
          organizationId,
          userId,
          googleResults.transcription,
          fileUrl,
          'google'
        )

        result.googleTranscription = googleResults.transcription
        result.googleTxtFileUrl = googleTxtFileUrl
      }

      return result
    } catch (error) {
      throw new Error(`Failed to split and transcribe audio: ${error.message}`)
    } finally {
      // Cleanup
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
      if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath)
      if (fs.existsSync(outputDir))
        fs.rmSync(outputDir, { recursive: true, force: true })
    }
  },

  async validateAudioFile(organizationId, userId, filePath) {
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, { path: ffprobe.path }, (err, metadata) => {
        if (err) reject(err)
        resolve(metadata)
      })
    })
    await calculateCostAndLogUsage({
      serviceId: 6,
      organizationId,
      userId,
      audioDuration: metadata.format.duration,
      bytes: fs.statSync(filePath).size,
      status: 'completed'
    }).cost
    if (!metadata.streams || metadata.streams[0].codec_type !== 'audio') {
      throw new Error('Invalid audio file')
    }
  },

  async splitAudio(
    organizationId,
    userId,
    inputPath,
    outputDir,
    duration,
    bytes
  ) {
    fs.mkdirSync(outputDir, { recursive: true })
    const command = `ffmpeg -i "${inputPath}" -f segment -segment_time ${duration} -c copy "${outputDir}/output%03d.wav"`
    await execPromise(command)

    const files = fs
      .readdirSync(outputDir)
      .filter((file) => file.endsWith('.wav'))
    if (files.length === 0) {
      throw new Error('No valid WAV files created after splitting')
    }
    await calculateCostAndLogUsage({
      serviceId: 6,
      organizationId,
      userId,
      audioDuration: duration,
      bytes,
      status: 'completed'
    }).cost
    return files.map((file) => path.join(outputDir, file))
  },

  async transcribeWithWhisper(organizationId, userId, files, language) {
    const transcriptions = []
    let totalCost = 0
    for (const file of files) {
      let audioDuration = await getAudioDuration(file)
      const transcription = await whisperTranscriber(
        organizationId,
        userId,
        file,
        audioDuration,
        language
      )
      transcriptions.push(transcription)
    }

    return { transcription: transcriptions.join('\n'), cost: totalCost }
  },

  /**
   * Transcribe an audio file
   * @param {Object} params
   * @param {String} params.fileUrl - S3 URL of the audio file
   * @param {String} params.language - Language for transcription
   * @param {Boolean} params.doubleModel - Whether to use multiple transcription models
   * @param {Number} params.organizationId - Organization ID
   * @param {Number} params.userId - User ID
   * @returns {Object} - Transcription result
   */
  async transcribe({ organizationId, userId, fileUrl, language, doubleModel }) {
    const uniqueId = Date.now()
    const inputPath = `temp-${uniqueId}-${path.basename(fileUrl)}`
    const wavPath = `temp-${uniqueId}-${path.basename(fileUrl, path.extname(fileUrl))}.wav`
    let txtFilePath
    let totalCost = 0

    try {
      // Parse bucket and key from fileUrl
      const bucketName = process.env.AWS_S3_BUCKET
      const key = fileUrl.replace(
        `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
        ''
      )

      // Download file from S3
      logger.info(`Downloading file from S3: bucket=${bucketName}, key=${key}`)
      const s3Stream = await getFileFromS3({ bucketName, key })

      await streamPipeline(s3Stream, fs.createWriteStream(inputPath))
      logger.info(`File downloaded to: ${inputPath}`)

      // Validate that the input file exists
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Downloaded file not found at ${inputPath}`)
      }

      // Get audio duration
      const audioDuration = await getAudioDuration(inputPath)

      // Convert to WAV if necessary
      if (!inputPath.endsWith('.wav')) {
        logger.info(
          `Running FFmpeg command to convert ${inputPath} to ${wavPath}`
        )
        await convertToWav(inputPath, wavPath)
        fs.unlinkSync(inputPath) // Cleanup original file
      }

      // Validate that WAV file exists
      if (!fs.existsSync(wavPath)) {
        throw new Error(`Converted WAV file not found at ${wavPath}`)
      }
      logger.info(`Converted audio to WAV: ${wavPath}`)

      // Transcribe with Whisper
      const whisperResult = await whisperTranscriber(
        organizationId,
        userId,
        wavPath,
        audioDuration,
        language
      )

      // Upload Whisper transcription
      const whisperTxtFilePath = `temp-${uniqueId}-whisper-transcription.txt`
      fs.writeFileSync(whisperTxtFilePath, whisperResult)

      if (!fs.existsSync(whisperTxtFilePath)) {
        throw new Error(
          `Transcription TXT file not created at ${whisperTxtFilePath}`
        )
      }

      const whisperTxtFileUrl = await this.uploadTranscription(
        organizationId,
        userId,
        whisperResult,
        fileUrl,
        'whisper'
      )

      const result = {
        message: 'Transcription successful',
        whisperTranscription: whisperResult,
        whisperTxtFileUrl,
        totalCost
      }

      // Transcribe with Google if `doubleModel` is true
      if (doubleModel) {
        const googleResult = await transcribeWithGoogle(
          organizationId,
          userId,
          wavPath,
          language
        )

        const googleTxtFilePath = `temp-${uniqueId}-google-transcription.txt`
        fs.writeFileSync(googleTxtFilePath, googleResult.transcription)

        if (!fs.existsSync(googleTxtFilePath)) {
          throw new Error(
            `Google transcription TXT file not created at ${googleTxtFilePath}`
          )
        }

        const googleTxtFileUrl = await this.uploadTranscription(
          organizationId,
          userId,
          googleResult.transcription,
          fileUrl,
          'google'
        )

        result.googleTranscription = googleResult.transcription
        result.googleTxtFileUrl = googleTxtFileUrl
      }

      return result
    } catch (error) {
      await knex('files')
        .where({ path: fileUrl })
        .update({ transcript_status: 'failed' })
      logger.error(`Transcription failed: ${error.message}`)
      throw new Error(`Transcription failed: ${error.message}`)
    } finally {
      // Cleanup
      ;[inputPath, wavPath, txtFilePath].forEach((file) => {
        if (file && fs.existsSync(file)) {
          fs.unlinkSync(file)
        }
      })
    }
  },
  async uploadTranscription(
    organizationId,
    userId,
    transcription,
    fileUrl,
    model
  ) {
    console.log('uploadTranscription')
    // Construct the file paths
    console.log('fileUrl :>> ', fileUrl)
    const txtFileName = `transcriptions/${path.basename(fileUrl, path.extname(fileUrl))}-${model}-transcription.txt`
    console.log('txtFileName:', txtFileName)

    const txtFilePath = `temp-${path.basename(fileUrl, path.extname(fileUrl))}-${model}-transcription.txt`
    console.log('txtFilePath:', txtFilePath)

    try {
      console.log('Uploading transcription for:', {
        organizationId,
        userId,
        fileUrl,
        model
      })

      // Write transcription to file
      fs.writeFileSync(txtFilePath, transcription)
      logger.info('Transcription written to:', txtFilePath)

      // Upload to S3
      const s3Url = await uploadFileToS3({
        bucketName: process.env.AWS_S3_BUCKET,
        key: txtFileName,
        body: fs.createReadStream(txtFilePath),
        contentType: 'text/plain'
      })
      logger.info('File uploaded to S3:', s3Url)

      // Calculate file size and log usage
      const bytes = fs.statSync(txtFilePath).size
      logger.info('File size (bytes):', bytes)

      const result = await calculateCostAndLogUsage({
        serviceId: 6, // Ensure this service ID matches your DB setup
        organizationId,
        userId,
        audioDuration: 0,
        bytes,
        status: 'completed'
      })
      logger.info('Cost and usage logged:', result)

      return s3Url
    } catch (error) {
      logger.error('Error in uploadTranscription:', error)
      throw error
    } finally {
      // Cleanup
      if (fs.existsSync(txtFilePath)) fs.unlinkSync(txtFilePath)
    }
  }
}

export default transcriptionService
