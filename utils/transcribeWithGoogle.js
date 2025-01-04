import { SpeechClient } from '@google-cloud/speech'
import fs from 'fs'
import uploadToGCS from './uploadToGCS.js'
import process from 'node:process'
import dotenv from 'dotenv'
dotenv.config()
// Initialize the Google Cloud Speech-to-Text client
const speechClient = new SpeechClient()
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

if (!fs.existsSync(credentialsPath)) {
  console.error(`Error: File does not exist at ${credentialsPath}`)
} else {
  console.log('Success: File exists and is accessible.')
}
const transcribeWithGoogle1Minute = async (
  filePath,
  options = { language: 'en' }
) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }
    console.log(`Transcribing audio file: ${filePath}`)
    const audioBytes = fs.readFileSync(filePath).toString('base64')

    const audio = {
      content: audioBytes
    }
    const { language } = options
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: language, // Default language code
      punctuation: true
    }
    // Speech-to-Text request
    const request = {
      audio: audio,
      config: config
    }
    console.log('Calling speechClient.recognize()...')
    const [response] = await speechClient.recognize(request)
    console.log('response:', response)
    const transcription = response.results
      .map((result) => result.alternatives[0].transcript)
      .join('\n')

    console.log('transcription:', transcription)
    return { transcription }
  } catch (error) {
    console.error('Error during transcription:', error.message)
    throw new Error('Failed to transcribe the audio.')
  }
}

const translateText = async (text, language) => {
  // Stub for translation - replace with a real translation implementation
  console.log(`Translating text to ${language}:`, text)
  return `Translated text in ${language}: ${text}`
}

async function transcribeWithGoogle(filePath, language, translate) {
  try {
    const bucketName = process.env.GCS_BUCKET_NAME // Ensure you set this in your environment
    if (!bucketName) {
      throw new Error('GCS bucket name is not configured in the environment.')
    }
    // Upload file to GCS
    const gcsUri = await uploadToGCS(filePath, bucketName)

    console.log(`Transcribing file with GCS URI: ${gcsUri}`)

    // Config for the transcription
    const request = {
      audio: {
        uri: gcsUri // Use GCS URI
      },
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: language, // Replace with your desired language code
        translate: translate,
        punctuation: true
      }
    }
    console.log('request :>> ', request)
    // Call LongRunningRecognize
    console.log('Calling LongRunningRecognize...')
    const [operation] = await speechClient.longRunningRecognize(request)

    // Wait for the operation to complete
    console.log('Waiting for transcription to complete...')
    const [response] = await operation.promise()
    console.log('response :>> ', JSON.stringify(response))
    // Extract and return transcription results
    const transcription = response.results
      .map((result) => result.alternatives[0].transcript)
      .join('\n')
    if (translate) {
      const translatedText = await translateText(transcription, language)
      return { transcription, translation: translatedText }
    }
    console.log('transcription:', transcription)
    return { transcription }
  } catch (error) {
    console.error('Error during transcription:', error)
    throw new Error('Failed to transcribe the audio.')
  }
}

export { transcribeWithGoogle1Minute, transcribeWithGoogle }
