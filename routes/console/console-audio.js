import express from 'express'
import multer from 'multer'
import { exec } from 'child_process'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import transcribeWithWhisper from '../../utils/transcribe-whisper.js'
import convertToWav from '../../utils/convertToWav.js'
import detectLanguage, { validateWavFile } from '../../utils/detectLanguage.js'
import archiver from 'archiver'
import ffmpeg from 'fluent-ffmpeg'
import ffprobe from 'ffprobe-static'
import {
  transcribeWithGoogle,
  transcribeWithGoogle1Minute
} from '../../utils/transcribeWithGoogle.js'
import { getAudioDuration } from '../../utils/getAudioDuration.js'
import { translateWithWhisper } from '../../utils/translateWithWhisper.js'
import { translateWithGoogle } from '../../utils/translateWithGoogle.js'
import knex from '../../db/knex.js'
import { calculateCost } from '../../db/calculateCost.js'
import { logUsage } from '../../middleware/logUsage.js'
import { uploadFileToS3, deleteFileFromS3 } from '../../utils/aws.js'
import logger from '../../utils/logger.js'
import process from 'node:process'
import transliterate from 'transliteration' // Install this package: npm install transliteration

const router = express.Router()

const upload = multer({ storage: multer.memoryStorage() }) // Use memory storage for temporary file handling

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ error: 'No file uploaded' })
  }
  console.log(`Using bucket: ${process.env.AWS_S3_BUCKET}`)

  const { originalname, mimetype, buffer } = req.file // Access file data from multer
  const organizationId = req.body.organization_id || 1
  const userId = req.body.user_id || 1

  try {
    const timestamp = Date.now() // Get the current timestamp
    const fileExtension = path.extname(originalname) // Extract the file extension
    const safeName = transliterate.slugify(
      path.basename(originalname, fileExtension)
    ) // Transliterate and slugify name
    const truncatedName = safeName.slice(0, 10) || 'file' // Use first 10 letters or fallback to 'file'

    const s3Key = `uploads/${organizationId}/${timestamp}_${truncatedName}${fileExtension}` // Generate S3 key
    // Upload the file to S3
    const s3Params = {
      bucketName: process.env.AWS_S3_BUCKET, // Ensure this is defined
      key: s3Key,
      body: buffer,
      contentType: mimetype
    }

    await uploadFileToS3(s3Params)

    const filePath = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`

    // Insert a new record in the database with the S3 path and converted name
    const [fileRecord] = await knex('files')
      .insert({
        name: `${timestamp}_${truncatedName}${fileExtension}`, // Save the new name
        path: filePath,
        organization_id: organizationId,
        user_id: userId,
        status: 'pending'
      })
      .returning('*')

    logger.info(`File uploaded successfully: ${originalname}`) // Log success

    // Respond with the file record
    res.status(201).json({
      id: fileRecord.id,
      name: fileRecord.name, // Display the converted name
      path: fileRecord.path
    })
  } catch (err) {
    logger.error('Error uploading file:', err) // Log error
    res.status(500).send('Failed to upload file')
  }
})

router.delete('/delete-file', async (req, res) => {
  const { key, id } = req.body // Pass the key of the file to delete in the request body

  if (!key) {
    return res.status(400).json({ error: 'File key is required' })
  }

  try {
    const params = {
      bucketName: process.env.AWS_S3_BUCKET,
      key: key
    }

    const response = await deleteFileFromS3(params)
    logger.info(`File '${key}' deleted successfully from S3`) // Log success
    await knex('files').where({ id }).del()
    logger.info(`File '${key}' deleted successfully from DB`) // Log success
    if (response.$metadata.httpStatusCode !== 204) {
      throw new Error('Failed to delete file from S3')
    }

    res.status(200).json({ message: `File '${key}' deleted successfully` })
  } catch (error) {
    logger.error('Error deleting file:', error)
    res.status(500).json({ error })
  }
})

router.put('/files/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!status) {
    return res.status(400).send('Status is required')
  }

  try {
    await knex('files').where({ id }).update({ status })
    logger.info(`Status updated for file ID ${id}: ${status}`) // Log success
    res.status(200).send('Status updated successfully')
  } catch (err) {
    logger.error('Error updating status:', err) // Log error
    res.status(500).send('Failed to update status')
  }
})

router.get('/files', async (req, res) => {
  const { page = 1, limit = 10 } = req.query // Add pagination

  try {
    const files = await knex('files')
      .select('*')
      .limit(limit)
      .offset((page - 1) * limit)

    logger.info(`Fetched ${files.length} files`) // Log success
    res.status(200).json(files)
  } catch (err) {
    logger.error('Error fetching files:', err) // Log error
    res.status(500).send('Failed to fetch files')
  }
})

router.post('/split-audio', upload.single('file'), async (req, res) => {
  const { duration = 30, organization_id = 1, user_id = 1 } = req.body

  if (!req.file) {
    return res.status(400).send({ error: 'No file uploaded' })
  }

  const s3FileUrl = req.file.location // Get the file's S3 URL from multer-s3
  const inputPath = `temp-${Date.now()}.wav`
  const outputDir = `output-${Date.now()}`
  const zipPath = `${outputDir}.zip`

  try {
    // Download the file from S3
    const response = await axios({
      url: s3FileUrl,
      method: 'GET',
      responseType: 'stream'
    })
    const writer = fs.createWriteStream(inputPath)
    response.data.pipe(writer)

    // Wait for the file to finish writing
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve) // Call resolve when the file is fully written
      writer.on('error', reject) // Call reject if an error occurs
    })

    // Check and convert to WAV if necessary
    let wavPath = inputPath
    if (!inputPath.endsWith('.wav')) {
      wavPath = `${inputPath}.wav`
      await convertToWav(inputPath, wavPath)
      fs.unlinkSync(inputPath) // Remove original file
    }

    // Get audio duration
    const durationSeconds = await getAudioDuration(wavPath)

    // Create output directory for split files
    fs.mkdirSync(outputDir, { recursive: true })

    // FFmpeg command to split audio
    const command = `ffmpeg -i "${wavPath}" -f segment -segment_time ${duration} -c copy "${outputDir}/output%03d.wav"`
    await new Promise((resolve, reject) => {
      exec(command, (error) => (error ? reject(error) : resolve()))
    })

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

    // Log service usage
    await knex('service_usage').insert({
      organization_id,
      user_id,
      service: 'Audio Processing',
      audio_duration: durationSeconds / 60, // Convert to minutes
      created_at: new Date()
    })

    // Cleanup local files
    if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath)

    // Respond with the S3 URL of the ZIP file
    res
      .status(201)
      .json({ message: 'Audio split and zipped successfully', zipUrl })
  } catch (error) {
    console.error('Error processing audio:', error)
    res.status(500).json({ error: 'Failed to process audio file' })
  } finally {
    // Cleanup
    fs.rmSync(outputDir, { recursive: true, force: true })
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
    if (fs.existsSync(outputDir))
      fs.rmSync(outputDir, { recursive: true, force: true })
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)
  }
})

router.post('/split-transcribe', async (req, res) => {
  const {
    fileUrl,
    language = 'en',
    doubleModel = false,
    duration = 5000,
    organization_id = 1,
    user_id = 1
  } = req.body

  if (!fileUrl) {
    return res.status(400).send('No file URL provided')
  }

  const outputDir = `output/${Date.now()}`
  let inputPath = fileUrl.split('/').pop()

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
      writer.on('finish', resolve) // Call resolve when the file is fully written
      writer.on('error', reject) // Call reject if an error occurs
    })

    // Validate the file format using FFmpeg
    const fileInfo = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, { path: ffprobe.path }, (err, metadata) => {
        if (err) return reject(err)
        resolve(metadata)
      })
    })

    // Check if the file is a valid audio file
    if (
      !fileInfo.streams ||
      fileInfo.streams.length === 0 ||
      fileInfo.streams[0].codec_type !== 'audio'
    ) {
      throw new Error('The file is not a valid audio file.')
    }

    // Log the file details
    logger.info('File details:', {
      format: fileInfo.format.format_name,
      codec: fileInfo.streams[0].codec_name,
      duration: fileInfo.streams[0].duration
    })

    let durationSeconds = await getAudioDuration(inputPath)
    let totalCost = 0

    // Log service usage
    await knex('service_usage').insert({
      organization_id,
      user_id,
      service: 'Audio Processing',
      audio_duration: durationSeconds / 60, // Convert to minutes
      created_at: new Date()
    })

    // Convert to WAV if necessary
    logger.info('Converting to WAV format...' + inputPath)
    if (!inputPath.endsWith('.wav')) {
      const wavPath = `${inputPath}.wav`
      await convertToWav(inputPath, wavPath)

      if (!fs.existsSync(wavPath)) {
        throw new Error('WAV conversion failed: Output file not created.')
      }

      fs.unlinkSync(inputPath) // Remove original file
      inputPath = wavPath
    }

    // Validate the converted WAV file
    const wavFileInfo = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, { path: ffprobe.path }, (err, metadata) => {
        if (err) return reject(err)
        resolve(metadata)
      })
    })

    // Check if the file is a valid WAV file
    if (
      !wavFileInfo.streams ||
      wavFileInfo.streams.length === 0 ||
      wavFileInfo.streams[0].codec_type !== 'audio' ||
      wavFileInfo.format.format_name !== 'wav'
    ) {
      throw new Error('The file is not a valid WAV file.')
    }

    // Log the WAV file details
    logger.info('WAV file details:', {
      format: wavFileInfo.format.format_name,
      codec: wavFileInfo.streams[0].codec_name,
      duration: wavFileInfo.streams[0].duration
    })

    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true })

    // FFmpeg command to split audio
    const command = `ffmpeg -i "${inputPath}" -f segment -segment_time ${duration} -c copy ${outputDir}/output%03d.wav`
    await new Promise((resolve, reject) => {
      exec(command, (error) => (error ? reject(error) : resolve()))
    })

    // Verify that split files were created
    const files = fs
      .readdirSync(outputDir)
      .filter((file) => file.endsWith('.wav'))

    if (files.length === 0) {
      throw new Error(
        'No valid WAV files were created after splitting the audio.'
      )
    }

    // Transcribe each file
    const whisperTranscriptions = []

    for (const file of files) {
      const filePath = path.join(outputDir, file)
      const transcription = await transcribeWithWhisper(filePath, language)
      const textFilePath = filePath.replace(/\.wav$/, '.txt')
      fs.writeFileSync(textFilePath, transcription)
      whisperTranscriptions.push({ file, transcription })
    }

    totalCost += await calculateCost({
      service: 'Transcription',
      provider: 'OpenAI',
      duration: durationSeconds
    })
    const whisperTranscription = whisperTranscriptions
      .map((t) => t.transcription)
      .join('\n')

    // Save the transcription as a .txt file
    const txtFileName = `transcriptions/${path.basename(fileUrl, path.extname(fileUrl))}-whisper-transcription.txt`
    const txtFilePath = `temp-${Date.now()}.txt`
    fs.writeFileSync(txtFilePath, whisperTranscription)
    // Upload the .txt file to S3
    const whisperTxtFileUrl = await uploadFileToS3({
      bucketName: process.env.AWS_S3_BUCKET,
      key: txtFileName,
      body: fs.createReadStream(txtFilePath),
      contentType: 'text/plain'
    })
    fs.unlinkSync(txtFilePath)

    const responseObject = {
      message: 'Transcription completed successfully',
      whisperTranscriptions,
      whisperTranscription,
      whisperTxtFileUrl
    }
    // Google transcription (if doubleModel is true)
    if (doubleModel) {
      const googleTranscriptions = []
      for (const file of files) {
        const filePath = path.join(outputDir, file)
        const googleTranscription =
          duration <= 60
            ? await transcribeWithGoogle1Minute(filePath, {
                language,
                translate: false
              })
            : await transcribeWithGoogle(filePath, {
                language,
                translate: false
              })
        googleTranscriptions.push({ file, googleTranscription })
      }

      const googleTranscription = googleTranscriptions
        .map((t) => t.googleTranscription.transcription)
        .join('\n')

      // Save the transcription as a .txt file
      const txtFileName = `transcriptions/${path.basename(fileUrl, path.extname(fileUrl))}-google-transcription.txt`
      const txtFilePath = `temp-${Date.now()}.txt`
      fs.writeFileSync(txtFilePath, googleTranscription)
      // Upload the .txt file to S3
      const googleTxtFileUrl = await uploadFileToS3({
        bucketName: process.env.AWS_S3_BUCKET,
        key: txtFileName,
        body: fs.createReadStream(txtFilePath),
        contentType: 'text/plain'
      })
      responseObject.googleTxtFileUrl = googleTxtFileUrl
      responseObject.googleTranscriptions = googleTranscriptions
      responseObject.googleTranscription = googleTranscription
      totalCost += await calculateCost({
        service: 'Transcription',
        provider: 'Google',
        duration: durationSeconds
      })
    }
    //Delete temp files
    fs.unlinkSync(inputPath)
    fs.unlinkSync(txtFilePath)
    fs.rmSync(outputDir, { recursive: true, force: true })

    // Log the usage to the database
    await logUsage({
      organization_id,
      service: 'Transcribe',
      audio_duration: durationSeconds,
      cost: totalCost
    })

    responseObject.totalMinutes = durationSeconds / 60
    responseObject.totalCost = totalCost
    logger.info(`Transcription completed successfully for file: ${fileUrl}`) // Log success
    res.json(responseObject)
  } catch (error) {
    logger.error('Error processing request:', error) // Log error
    res.status(500).send({ error: 'Failed to process audio file' })
  } finally {
    // Cleanup
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
    if (fs.existsSync(outputDir))
      fs.rmSync(outputDir, { recursive: true, force: true })
  }
})

// Route: Transcribe Audio
router.post('/transcribe', async (req, res) => {
  const {
    fileUrl,
    targetLanguage = 'en',
    language = 'en',
    doubleModel = false,
    organization_id = 1,
    user_id = 1
  } = req.body

  if (!fileUrl) {
    logger.error('fileUrl is required')
    return res.status(400).send({ error: 'fileUrl is required' })
  }

  const tempDir = `temp-${Date.now()}`
  fs.mkdirSync(tempDir, { recursive: true })
  let inputPath = path.join(tempDir, path.basename(fileUrl))
  let txtFilePath, wavPath

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
      writer.on('finish', resolve) // Call resolve when the file is fully written
      writer.on('error', reject) // Call reject if an error occurs
    })

    let durationSeconds = await getAudioDuration(inputPath)
    let totalMinutes = 0
    let totalCost = 0

    // Convert to WAV if necessary
    if (!inputPath.endsWith('.wav')) {
      wavPath = `${inputPath}.wav`
      await convertToWav(inputPath, wavPath)
      fs.unlinkSync(inputPath)
      inputPath = wavPath
    }

    // Transcribe the audio file
    const whisperTranscription = await transcribeWithWhisper(
      inputPath,
      language
    )
    totalMinutes += durationSeconds
    totalCost += await calculateCost({
      service: 'Transcription',
      provider: 'OpenAI',
      duration: durationSeconds
    })

    // Save the transcription as a .txt file
    const txtFileName = `transcriptions/${path.basename(fileUrl, path.extname(fileUrl))}-whisper-transcription.txt`
    txtFilePath = path.join(tempDir, `${Date.now()}-whisper.txt`)
    fs.writeFileSync(txtFilePath, whisperTranscription)

    // Upload the .txt file to S3
    const whisperTxtFileUrl = await uploadFileToS3({
      bucketName: process.env.AWS_S3_BUCKET,
      key: txtFileName,
      body: fs.createReadStream(txtFilePath),
      contentType: 'text/plain'
    })

    const responseObject = {
      message: 'Transcription successful',
      whisperTranscription,
      whisperTxtFileUrl
    }

    // Google transcription (if doubleModel is true)
    if (doubleModel) {
      const googleResult = await transcribeWithGoogle(inputPath, targetLanguage)
      totalMinutes += durationSeconds
      totalCost += await calculateCost({
        service: 'Transcribe',
        provider: 'Google',
        duration: durationSeconds
      })
      // Save the transcription as a .txt file
      const googleTxtFileName = `transcriptions/${path.basename(fileUrl, path.extname(fileUrl))}-google-transcription.txt`
      const googleTxtFilePath = path.join(tempDir, `${Date.now()}-google.txt`)
      fs.writeFileSync(googleTxtFilePath, googleResult.transcription)

      // Upload the .txt file to S3
      const googleTxtFileUrl = await uploadFileToS3({
        bucketName: process.env.AWS_S3_BUCKET,
        key: googleTxtFileName,
        body: fs.createReadStream(googleTxtFilePath),
        contentType: 'text/plain'
      })

      responseObject.googleTranscript = googleResult.transcription
      responseObject.googleTxtFileUrl = googleTxtFileUrl
    }

    responseObject.totalMinutes = totalMinutes
    responseObject.totalCost = totalCost

    // Log the usage to the database
    await logUsage({
      organization_id,
      user_id,
      service: 'Transcribe',
      audio_duration: totalMinutes,
      cost: totalCost
    })
    fs.rmSync(tempDir, { recursive: true, force: true })
    logger.info(`Transcription completed successfully for file: ${fileUrl}`) // Log success
    await knex('files').where({ path: fileUrl }).update({
      transcriptStatus: 'available',
      transcriptionFilePath: whisperTxtFileUrl
    })
    res.json(responseObject)
  } catch (error) {
    console.error('error :>> ', error)
    await knex('files').where({ path: fileUrl }).update({
      transcriptStatus: 'failed'
    })
    logger.error('Error processing request:') // Log error
    res.status(500).send({ error: 'Failed to transcribe audio file' })
  } finally {
    // Cleanup
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
    if (fs.existsSync(txtFilePath)) fs.unlinkSync(txtFilePath)
    if (fs.existsSync(tempDir))
      fs.rmSync(tempDir, { recursive: true, force: true })
    if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath)
  }
})

router.post('/translate-audio', async (req, res) => {
  const {
    fileUrl,
    language,
    targetLanguage = 'en',
    isMultiModel = false,
    organization_id = 1
  } = req.body

  if (!fileUrl || !targetLanguage) {
    return res
      .status(400)
      .json({ error: 'fileUrl and targetLanguage are required.' })
  }

  const inputPath = `temp-${Date.now()}.wav`

  try {
    // Download the file from S3
    const response = await axios({
      url: fileUrl,
      method: 'GET',
      responseType: 'stream'
    })
    const writer = fs.createWriteStream(inputPath)
    response.data.pipe(writer)
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve) // Call resolve when the file is fully written
      writer.on('error', reject) // Call reject if an error occurs
    })
    // Transcribe the audio file
    const transcription = await transcribeWithWhisper(inputPath, language)

    let translations = {}
    let totalTokens = 0
    let totalCost = 0

    // Whisper translation
    const whisperResult = await translateWithWhisper(transcription, language)
    translations.whisper = whisperResult.text
    totalTokens += whisperResult.usage.total_tokens || 0
    totalCost += await calculateCost({
      service: 'Translation',
      provider: 'OpenAI',
      tokens: whisperResult.usage.total_tokens || 0
    })

    // Google translation (if isMultiModel is true)
    if (isMultiModel) {
      const googleResult = await translateWithGoogle(
        transcription,
        targetLanguage
      )
      translations.google = googleResult.translation
      totalTokens += googleResult.tokens || 0
      totalCost += await calculateCost({
        service: 'Translation',
        provider: 'Google',
        tokens: googleResult.tokens || 0
      })
    }

    // Log the usage to the database
    await logUsage({
      organization_id,
      service: 'Translation',
      tokens_used: totalTokens,
      cost: totalCost
    })

    logger.info(`Translation completed successfully for file: ${fileUrl}`) // Log success
    res.status(200).json({
      message: 'Translation successful',
      translations,
      totalTokens,
      totalCost
    })
  } catch (error) {
    logger.error('Error during translation:', error) // Log error
    res.status(500).json({ error: 'Failed to translate the text.' })
  } finally {
    // Cleanup
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
  }
})

router.post('/translate-text', async (req, res) => {
  const {
    fileUrl,
    targetLanguage = 'en',
    isMultiModel = false,
    organization_id = 1
  } = req.body
  if (!fileUrl || !targetLanguage) {
    return res
      .status(400)
      .json({ error: 'fileUrl and targetLanguage are required.' })
  }

  const tempFilePath = `temp-${Date.now()}.txt`

  try {
    // Download the .txt file from S3
    const response = await axios({
      url: fileUrl,
      method: 'GET',
      responseType: 'stream'
    })
    const writer = fs.createWriteStream(tempFilePath)
    response.data.pipe(writer)

    // Wait for the file to finish writing
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve) // Call resolve when the file is fully written
      writer.on('error', reject) // Call reject if an error occurs
    })

    // Read the content of the .txt file
    const text = fs.readFileSync(tempFilePath, 'utf-8')

    let translations = {}
    let totalTokens = 0
    let totalCost = 0

    // Perform Whisper translation
    const whisperResult = await translateWithWhisper(text, targetLanguage)
    translations.whisper = whisperResult.text
    totalTokens += whisperResult.usage.total_tokens || 0
    totalCost += await calculateCost({
      service: 'Translation',
      provider: 'OpenAI',
      tokens: whisperResult.usage.total_tokens || 0
    })
    fs.unlinkSync(tempFilePath) // Remove the temporary .txt file
    // Save the transcription as a .txt file
    const txtFileName = `translations/${path.basename(fileUrl, path.extname(fileUrl))}-whisper-translation.txt`
    const txtFilePath = `temp-${Date.now()}.txt`
    fs.writeFileSync(txtFilePath, whisperResult.text)
    // Upload the .txt file to S3
    const whisperTxtFileUrl = await uploadFileToS3({
      bucketName: process.env.AWS_S3_BUCKET,
      key: txtFileName,
      body: fs.createReadStream(txtFilePath),
      contentType: 'text/plain'
    })
    await knex('files').where({ transcriptionFilePath: fileUrl }).update({
      translationStatus: 'available',
      translationFilePath: whisperTxtFileUrl
    })

    // Use Google Translate if isMultiModel is true
    const responseObject = {
      message: 'Translation successful',
      translations,
      totalTokens,
      totalCost,
      whisperTxtFileUrl
    }
    if (isMultiModel) {
      const googleResult = await translateWithGoogle(text, targetLanguage)
      translations.google = googleResult.translation
      totalTokens += googleResult.tokens || 0
      totalCost += await calculateCost({
        service: 'Translation',
        provider: 'Google',
        tokens: googleResult.tokens || 0
      })
      // Save the transcription as a .txt file
      const txtFileName = `translations/${path.basename(fileUrl, path.extname(fileUrl))}-google-translation.txt`
      const txtFilePath = `temp-${Date.now()}.txt`
      fs.writeFileSync(txtFilePath, googleResult.translation)
      // Upload the .txt file to S3
      const googleTxtFileUrl = await uploadFileToS3({
        bucketName: process.env.AWS_S3_BUCKET,
        key: txtFileName,
        body: fs.createReadStream(txtFilePath),
        contentType: 'text/plain'
      })
      responseObject.googleTxtFileUrl = googleTxtFileUrl
    }

    // Log the usage to the database
    await logUsage({
      organization_id,
      service: 'Translation',
      tokens_used: totalTokens,
      cost: totalCost
    })
    fs.unlinkSync(txtFilePath) // Remove the temporary .txt file
    logger.info(`Translation completed successfully for file: ${fileUrl}`) // Log success
    res.status(200).json(responseObject)
  } catch (error) {
    logger.error('Error during translation:', error) // Log error
    await knex('files').where({ path: fileUrl }).update({
      translationStatus: 'failed'
    })
    res.status(500).json({ error: 'Failed to translate the text.' })
  } finally {
    // Cleanup
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
  }
})

router.post('/detect-language', async (req, res) => {
  const { fileUrl, organization_id = 1 } = req.body

  if (!fileUrl) {
    logger.error('fileUrl is required')
    return res.status(400).send('fileUrl is required')
  }

  let inputPath = `temp-${Date.now()}.wav`
  let snippetPath = `${inputPath}_snippet.wav`

  try {
    // Download the file from S3
    const response = await axios({
      url: fileUrl,
      method: 'GET',
      responseType: 'stream'
    })
    const writer = fs.createWriteStream(inputPath)
    response.data.pipe(writer)
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
    logger.info(`File downloaded successfully: ${inputPath}`)

    let totalCost = 0
    let durationSeconds = await getAudioDuration(inputPath)
    logger.info(`Audio duration: ${durationSeconds} seconds`)

    // Convert to WAV if necessary
    if (!inputPath.endsWith('.wav')) {
      const wavPath = `${inputPath}.wav`
      await convertToWav(inputPath, wavPath)
      fs.unlinkSync(inputPath)
      inputPath = wavPath
      logger.info(`File converted to WAV: ${inputPath}`)
    }

    // Extract a 30-second snippet for language detection
    if (durationSeconds < 30) {
      logger.warn(
        'Audio file is shorter than 30 seconds. Using the full file for language detection.'
      )
      snippetPath = inputPath // Use the full file instead of extracting a snippet
    } else {
      const command = `ffmpeg -i "${inputPath}" -t 30 -ac 1 -ar 16000 "${snippetPath}"`
      await new Promise((resolve, reject) =>
        exec(command, (error) => (error ? reject(error) : resolve()))
      )
      logger.info(`30-second snippet extracted: ${snippetPath}`)
      logger.info(`Snippet file size: ${fs.statSync(snippetPath).size} bytes`)
    }

    // Validate the WAV file
    validateWavFile(snippetPath)

    // Detect language using Deepgram
    const { detectedLanguage, languageConfidence } =
      await detectLanguage(snippetPath)

    totalCost += await calculateCost({
      service: 'Detect Language',
      provider: 'Deepgram',
      duration: durationSeconds / 60
    })

    // Log the usage to the database
    await logUsage({
      organization_id,
      service: 'Transcribe',
      audio_duration: durationSeconds / 60,
      cost: totalCost
    })

    logger.info(`Language detected successfully for file: ${fileUrl}`)
    res.json({
      message: 'Language detected successfully',
      language: detectedLanguage,
      confidence: languageConfidence,
      totalCost
    })
    fs.unlinkSync(inputPath)
  } catch (error) {
    logger.error('Error detecting language:', error)
    res.status(500).send({
      error: 'Failed to detect language',
      message: error.message,
      language: undefined,
      languageCode: undefined,
      confidence: undefined
    })
  } finally {
    // Cleanup
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
    if (fs.existsSync(snippetPath) && snippetPath !== inputPath)
      fs.unlinkSync(snippetPath)
  }
})

// Route: Convert File to WAV
router.post('/convert-to-wav', async (req, res) => {
  const {
    fileUrl,
    bucketName = process.env.AWS_S3_BUCKET,
    organization_id = 1,
    user_id = 1
  } = req.body

  if (!fileUrl) {
    return res.status(400).json({ error: 'File URL is required.' })
  }

  const tempInputPath = `temp-${Date.now()}-${path.basename(fileUrl)}` // Temporary input file path
  const tempOutputPath = tempInputPath.replace(path.extname(fileUrl), '.wav') // Temporary output file path

  try {
    // Download the file from S3
    const response = await axios({
      url: fileUrl,
      method: 'GET',
      responseType: 'stream'
    })
    const writer = fs.createWriteStream(tempInputPath)
    response.data.pipe(writer)
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve) // Call resolve when the file is fully written
      writer.on('error', reject) // Call reject if an error occurs
    })
    // Get the duration of the audio file
    const durationSeconds = await getAudioDuration(tempInputPath)

    // Convert the file to WAV
    await convertToWav(tempInputPath, tempOutputPath)

    // Calculate the cost of the conversion
    const totalCost = await calculateCost({
      provider: 'Internal',
      service: 'Audio Processing',
      duration: durationSeconds
    })

    // Log the service usage to the database
    await knex('service_usage').insert({
      organization_id,
      user_id,
      service: 'Audio Processing',
      audio_duration: durationSeconds / 60, // Convert to minutes
      created_at: new Date()
    })

    // Upload the converted WAV file to S3
    const wavKey = `converted/${path.basename(fileUrl).replace(path.extname(fileUrl), '.wav')}` // Same name but with .wav extension
    const wavUrl = await uploadFileToS3({
      bucketName,
      key: wavKey,
      body: fs.createReadStream(tempOutputPath),
      contentType: 'audio/wav'
    })
    logger.info(`File converted successfully: ${wavUrl}`) // Log success
    // Cleanup local files
    fs.unlinkSync(tempInputPath)
    fs.unlinkSync(tempOutputPath)

    // Return the S3 URL of the uploaded WAV file
    res.status(201).json({
      message: 'File converted successfully',
      wavUrl,
      totalCost,
      durationSeconds
    })
  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).json({ error: 'Failed to convert audio file' })
  } finally {
    // Ensure cleanup even if an error occurs
    if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath)
    if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath)
  }
})

router.post('/create-text-file', async (req, res) => {
  const {
    text,
    folder = 'text-files',
    fileName = 'file',
    organization_id = 1,
    user_id = 1
  } = req.body

  if (!text) {
    return res.status(400).json({ error: 'Missing text content' })
  }

  const timestamp = Date.now()
  const textFileName = `${fileName}-${timestamp}.txt` // Generate a unique file name
  const tempFilePath = `temp-${textFileName}` // Temporary local file path

  try {
    // Write the text string to a temporary file
    fs.writeFileSync(tempFilePath, text)

    // Upload the text file to S3
    const s3Key = `${folder}/${textFileName}` // Folder and file name in S3
    const s3Url = await uploadFileToS3({
      bucketName: process.env.AWS_S3_BUCKET,
      key: s3Key,
      body: fs.createReadStream(tempFilePath),
      contentType: 'text/plain'
    })

    // Log the service usage to the database
    await knex('service_usage').insert({
      organization_id,
      user_id,
      service: 'File Processing',
      audio_duration: 0, // No audio duration for text files
      created_at: new Date()
    })

    // Cleanup the temporary file
    fs.unlinkSync(tempFilePath)
    logger.info(`Text file created and uploaded successfully: ${s3Url}`) // Log success
    // Return the S3 URL of the uploaded text file
    res
      .status(201)
      .json({ message: 'Text file created and uploaded successfully', s3Url })
  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).json({ error: 'Failed to create and upload text file' })
  } finally {
    // Ensure cleanup even if an error occurs
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
  }
})

export default router
