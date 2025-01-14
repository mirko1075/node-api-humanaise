import express from 'express'
import multer from 'multer'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import transcribeWithWhisper from '../../utils/transcribe-whisper.js'
import convertToWav from '../../utils/convertToWav.js'
import detectLanguage from '../../utils/detectLanguage.js'
import convertToMp3 from '../../utils/convertToMp3.js'
import archiver from 'archiver'
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

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

// Route: Split Audio
router.post('/split-audio', upload.single('file'), async (req, res) => {
  const inputPath = req.file.path
  const outputDir = `output/${Date.now()}`
  const duration = req.body.duration || 30
  const organization_id = req.body.organization_id || 1 // Define organization_id
  const user_id = req.body.user_id || 1 // Define user_id
  let durationSeconds = await getAudioDuration(inputPath)
  try {
    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true })

    // FFmpeg command to split audio
    const command = `ffmpeg -i ${inputPath} -f segment -segment_time ${duration} -c copy ${outputDir}/output%03d.wav`

    await new Promise((resolve, reject) => {
      exec(command, (error) => {
        if (error) return reject(error)
        resolve()
      })
    })

    // Create a zip file
    const zipPath = `${outputDir}.zip`
    const archive = archiver('zip', { zlib: { level: 9 } })
    const output = fs.createWriteStream(zipPath)

    archive.pipe(output)
    archive.directory(outputDir, false)
    archive.finalize()

    output.on('close', async () => {
      const absoluteZipPath = path.resolve(zipPath)
      await knex('service_usage').insert({
        organization_id,
        user_id,
        service: 'Audio Processing',
        audio_duration: durationSeconds / 60, // Convert to minutes
        timestamp: new Date()
      })

      res.sendFile(absoluteZipPath, (err) => {
        if (err) {
          console.error('Error sending file:', err)
          return res.status(500).send('Error sending file.')
        }

        // Cleanup
        fs.unlinkSync(absoluteZipPath)
        fs.rmSync(outputDir, { recursive: true, force: true })
        fs.rmSync(inputPath, { force: true })
      })
    })
  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).send({ error: 'Failed to process audio file' })
  }
})

// Route: Split and Transcribe
router.post('/split-transcribe', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded')
  }
  console.log('Called split and transcript')
  let inputPath = req.file.path
  const originalLanguage = req.body.language || 'en'
  const doubleModel = req.body.doubleModel || false
  const organization_id = req.body.organization_id || 1 // Define organization_id
  const user_id = req.body.user_id || 1 // Define user_id
  const outputDir = `output/${Date.now()}`
  const duration = req.body.duration || 5000
  let durationSeconds = await getAudioDuration(inputPath)

  try {
    let totalCost = 0
    await knex('service_usage').insert({
      organization_id,
      user_id,
      service: 'Audio Processing',
      audio_duration: durationSeconds / 60, // Convert to minutes
      created_at: new Date()
    })
    totalCost += await calculateCost({
      service: 'Transcription',
      provider: 'OpenAI',
      duration: durationSeconds
    })
    // Check if input is already a WAV file
    console.log('Input file info:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype
    })
    if (!inputPath.endsWith('.wav')) {
      console.log('Converting input file to WAV...')
      const wavPath = `${inputPath}.wav`
      await convertToWav(inputPath, wavPath)

      if (!fs.existsSync(wavPath)) {
        throw new Error('WAV conversion failed: Output file not created.')
      }

      fs.unlinkSync(inputPath) // Remove original file
      inputPath = wavPath
    }

    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true })
    console.log('Output directory created')
    // FFmpeg command to split audio
    const command = `ffmpeg -i "${inputPath}" -f segment -segment_time ${duration} -c copy ${outputDir}/output%03d.wav`
    console.log('Calling command to split audio:', command)
    await new Promise((resolve, reject) => {
      exec(command, (error) => {
        if (error) return reject(error)
        resolve()
      })
    })

    // Transcribe each file
    const files = fs
      .readdirSync(outputDir)
      .filter((file) => file.endsWith('.wav'))
    const whisperTranscriptions = []

    // Whisper transcription
    for (const file of files) {
      const filePath = path.join(outputDir, file)
      console.log('Transcribing file with Whisper:', filePath)
      const transcription = await transcribeWithWhisper(
        filePath,
        originalLanguage
      ) // No conversion here
      whisperTranscriptions.push({ file: file, transcription })
      console.log('Transcription with Whisper:', transcription)
    }
    totalCost += await calculateCost({
      service: 'Transcription',
      provider: 'OpenAI',
      duration: durationSeconds
    })
    console.log('Whisper transcriptions:', whisperTranscriptions)
    const whisperTranscription = whisperTranscriptions
      .map((t) => t.transcription)
      .join('\n')
    const responseObject = {
      message: 'Transcription completed successfully',
      whisperTranscriptions,
      whisperTranscription
    }

    //Google transcription
    if (doubleModel) {
      durationSeconds *= 2
      totalCost += await calculateCost({
        service: 'Transcription',
        provider: 'Google',
        duration: durationSeconds
      })
      const googleTranscriptions = []
      for (const file of files) {
        const filePath = path.join(outputDir, file)
        console.log(`Audio duration: ${duration} seconds`)
        let googleTranscription = ''
        console.log('Transcribing file with Google:', filePath)
        if (duration <= 60) {
          googleTranscription = await transcribeWithGoogle1Minute(filePath, {
            originalLanguage,
            translate: false
          }) // No conversion here
        } else {
          googleTranscription = await transcribeWithGoogle(filePath, {
            originalLanguage,
            translate: false
          }) // No conversion here
        }
        googleTranscriptions.push({ file: file, googleTranscription })
      }
      console.log('Google transcriptions:', googleTranscriptions)
      const googleTranscription = googleTranscriptions
        .map((t) => t.googleTranscription.transcription)
        .join('\n')
      responseObject.googleTranscriptions = googleTranscriptions
      responseObject.googleTranscription = googleTranscription
    }

    // Log the usage to the database
    await logUsage({
      organization_id,
      service: 'Transcription',
      audio_duration: durationSeconds,
      cost: totalCost
    })
    responseObject.totalMinutes = durationSeconds / 60
    responseObject.totalCost = totalCost
    // Return combined transcriptions
    res.json({ ...responseObject })
  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).send({ error: 'Failed to process audio file' })
  } finally {
    // Cleanup
    fs.rmSync(inputPath, { force: true })
    fs.rmSync(outputDir, { recursive: true, force: true })
  }
})

// Route: Transcribe Audio
router.post('/transcribe', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded')
  }
  let targetLanguage = req.body.targetLanguage || 'en'
  let inputPath = req.file.path
  const originalLanguage = req.body.language || 'en'
  const doubleModel = req.body.doubleModel || false
  const organization_id = req.body.organization_id || 1 // Define organization_id
  const user_id = req.body.user_id || 1 // Define user_id
  let durationSeconds = await getAudioDuration(inputPath)

  try {
    let totalMinutes = 0
    let totalCost = 0

    // If the file is not a WAV file, convert it
    if (!inputPath.endsWith('.wav')) {
      const wavPath = `${inputPath}.wav`
      await convertToWav(inputPath, wavPath)
      fs.unlinkSync(inputPath) // Remove original file
      inputPath = wavPath

      await knex('service_usage').insert({
        organization_id,
        user_id,
        service: 'Audio Processing',
        audio_duration: durationSeconds / 60, // Convert to minutes
        created_at: new Date()
      })
    }

    // Transcribe the audio file
    const whisperTranscription = await transcribeWithWhisper(
      inputPath,
      originalLanguage
    )
    totalMinutes += durationSeconds
    totalCost += await calculateCost({
      service: 'Transcription',
      provider: 'OpenAI',
      duration: durationSeconds
    })

    const responseObject = {
      message: 'Transcription successful',
      whisperTranscription
    }
    if (doubleModel) {
      const googleResult = await transcribeWithGoogle(inputPath, {
        language: targetLanguage,
        translate: false
      })
      totalMinutes += durationSeconds
      totalCost += await calculateCost({
        service: 'Transcription',
        provider: 'Google',
        duration: durationSeconds
      })
      responseObject.googleTranscript = googleResult.transcription
    }
    responseObject.totalMinutes = totalMinutes
    responseObject.totalCost = totalCost
    // Cleanup
    fs.unlinkSync(inputPath)
    // Log the usage to the database
    await logUsage({
      organization_id,
      service: 'Transcription',
      audio_duration: totalMinutes,
      cost: totalCost
    })

    res.json(responseObject)
  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).send({ error: 'Failed to transcribe audio file' })
  }
})

router.post('/translate', async (req, res) => {
  const targetLanguage = req.body.targetLanguage || 'en'
  const { text, language, isMultiModel } = req.body
  const organization_id = req.body.organization_id || 1 // Define organization_id
  // Validate input
  if (!text || !language) {
    return res.status(400).json({ error: 'Text and language are required.' })
  }

  try {
    let translations = {}
    let googleResult = {}
    let totalTokens = 0
    let totalCost = 0
    // Perform Whisper translation
    // Use Whisper for translation
    const whisperResult = await translateWithWhisper(text, language)
    console.log('whisperResult :>> ', whisperResult)
    translations.whisper = whisperResult.text
    totalTokens += whisperResult.usage.total_tokens || 0
    totalCost += await calculateCost({
      service: 'Translation',
      provider: 'OpenAI',
      tokens: whisperResult.usage.total_tokens || 0
    })

    // Use Google Translate if isMultiModel is true
    if (isMultiModel) {
      googleResult = await translateWithGoogle(text, targetLanguage)
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
      tokens_used: totalTokens || 0,
      cost: totalCost || 0
    })

    res.status(200).json({
      message: 'Translation successful',
      translations,
      totalTokens,
      totalCost
    })
  } catch (error) {
    console.error('Error during translation:', error)
    res.status(500).json({ error: 'Failed to translate the text.' })
  }
})

router.post('/detect-language', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded')
  }
  const organization_id = req.body.organization_id || 1 // Define organization_id
  let inputPath = req.file.path
  let totalCost = 0
  let durationSeconds = await getAudioDuration(inputPath)

  try {
    console.log('Input path for language detection:', inputPath)
    console.log('Input file info:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype
    })
    if (!inputPath.endsWith('.wav')) {
      console.log('Converting input file to WAV...')
      const wavPath = `${inputPath}.wav`
      await convertToWav(inputPath, wavPath)

      if (!fs.existsSync(wavPath)) {
        throw new Error('WAV conversion failed: Output file not created.')
      }

      fs.unlinkSync(inputPath) // Remove original file
      inputPath = wavPath
    }

    const snippetPath = `${inputPath}_snippet.wav`
    console.log('Extracting 30-second snippet for language detection...')
    const command = `ffmpeg -i "${inputPath}" -t 100 -c copy "${snippetPath}"`

    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Error extracting snippet:', stderr)
          return reject(error)
        }
        console.log('Snippet extracted:', stdout)
        resolve()
      })
    })

    if (!fs.existsSync(snippetPath)) {
      throw new Error('Snippet extraction failed: Output file not created.')
    }

    const { detectedLanguage, languageConfidence, languageCode } =
      await detectLanguage(snippetPath)

    totalCost += await calculateCost({
      service: 'Detect Language',
      provider: 'Deepgram',
      duration: durationSeconds / 60
    })
    await logUsage({
      organization_id,
      service: 'Transcription',
      audio_duration: durationSeconds / 60,
      cost: totalCost || 0,
      created_at: new Date().getTime()
    })

    // Cleanup
    fs.unlinkSync(inputPath)
    fs.unlinkSync(snippetPath)
    res.json({
      message: 'Language detected successfully',
      language: detectedLanguage,
      languageCode: languageCode,
      confidence: languageConfidence
    })
  } catch (error) {
    console.error('Error detecting language:', error)
    res.status(500).send({
      error: 'Failed to detect language',
      message: error,
      language: undefined,
      languageCode: undefined,
      confidence: undefined
    })
  }
})

// Route: Convert File to WAV
router.post('/convert-to-wav', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  const organization_id = req.body.organization_id || 1 // Define organization_id
  const user_id = req.body.user_id || 1 // Define user_id
  const durationSeconds = await getAudioDuration(req.file.path)
  const inputPath = req.file.path
  const outputPath = `${inputPath}.wav`

  try {
    // Convert to WAV

    await convertToWav(inputPath, outputPath)
    const totalCost = await calculateCost({
      provider: 'Internal',
      service: 'Audio Processing',
      duration: durationSeconds
    })
    await knex('service_usage').insert({
      organization_id,
      user_id,
      service: 'Audio Processing',
      audio_duration: durationSeconds / 60, // Convert to minutes
      created_at: new Date()
    })
    // Read the converted file data
    const fileData = fs.readFileSync(outputPath)
    const fileName = path.basename(outputPath)

    // Log the response to debug
    const response = {
      name: fileName,
      data: fileData.toString('base64'), // Base64 encode the binary data
      totalCost
    }

    // Cleanup temporary files
    fs.unlinkSync(inputPath) // Original uploaded file
    fs.unlinkSync(outputPath) // Converted file

    // Set explicit JSON response type
    res.setHeader('Content-Type', 'application/json')
    res.json(response)
  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).json({ error: 'Failed to convert audio file' })
  }
})

//route convert to mp3
router.post('/convert-to-mp3', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  const organization_id = req.body.organization_id || 1 // Define organization_id
  const user_id = req.body.user_id || 1 // Define user_id
  const durationSeconds = await getAudioDuration(req.file.path)
  const inputPath = req.file.path
  const outputPath = `${inputPath}.mp3`

  try {
    // Convert to MP3
    await convertToMp3(inputPath, outputPath)
    const totalCost = await calculateCost({
      provider: 'Internal',
      service: 'Audio Processing',
      duration: durationSeconds
    })
    await knex('service_usage').insert({
      organization_id,
      user_id,
      service: 'Audio Processing',
      audio_duration: durationSeconds / 60, // Convert to minutes
      created_at: new Date()
    })
    // Read the converted file data
    const fileData = fs.readFileSync(outputPath)
    const fileName = path.basename(outputPath)

    // Log the response to debug
    const response = {
      name: fileName,
      data: fileData.toString('base64'), // Base64 encode the binary data
      totalCost
    }

    // Cleanup temporary files
    fs.unlinkSync(inputPath) // Original uploaded file
    fs.unlinkSync(outputPath) // Converted file

    // Set explicit JSON response type
    res.setHeader('Content-Type', 'application/json')
    res.json(response)
  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).json({ error: 'Failed to convert audio file' })
  }
})

router.post('/create-text-file', (req, res) => {
  const __dirname = path.resolve()
  if (!fs.existsSync(`${__dirname}/output`)) {
    fs.mkdirSync(`${__dirname}/output`)
  }
  if (!req.body.text) {
    return res.status(400).json({ error: 'Missing text content' })
  }
  if (!req.body.fileName) {
    return res.status(400).json({ error: 'Missing file name' })
  }
  const textString = req.body.text // Assuming the text is sent in the request body
  const fileName = req.body.fileName || 'file' // Default file name
  const nowDate = new Date()
  const day = nowDate.getDate()
  const month = nowDate.getMonth() + 1 // Months are zero-based
  const year = nowDate.getFullYear()
  const timestamp = nowDate.getTime()
  const dirname = `${__dirname}/output/${year}-${month}-${day}/`
  const textFileName = `${fileName}-${timestamp}.txt`
  const organization_id = req.body.organization_id || 1 // Define organization_id
  const user_id = req.body.user_id || 1 // Define user_id
  console.log('Creating text file:', textFileName)
  if (!textString) {
    return res.status(400).json({ error: 'Missing text content' })
  }

  // Ensure the directory exists
  fs.mkdirSync(dirname, { recursive: true })

  // Write the text string to a file
  fs.writeFileSync(dirname + textFileName, textString)

  // Set the appropriate headers for file download
  res.setHeader('Content-Disposition', `attachment; filename="${textFileName}"`)
  res.setHeader('Content-Type', 'text/plain')
  knex('service_usage').insert({
    organization_id,
    user_id,
    service: 'File processing',
    audio_duration: 0, // Convert to minutes
    created_at: new Date()
  })
  // Send the file as the response
  console.log('Sending file:', dirname + textFileName)
  res.sendFile(dirname + textFileName)
})

export default router
