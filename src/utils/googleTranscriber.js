import { SpeechClient } from '@google-cloud/speech'
import fs from 'fs'
import uploadToGCS from './uploadToGCS.js'
import process from 'node:process'
import dotenv from 'dotenv'
import calculateCostAndLogUsage from './costAndUsageTracker.js'
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
  organizationId,
  userId,
  filePath,
  options = { language: 'en' }
) => {
  try {
    const serviceId = 2 // Assuming transcription has ID 2 in the database
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }
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
    const [response] = await speechClient.recognize(request)
    const transcription = response.results
      .map((result) => result.alternatives[0].transcript)
      .join('\n')
    await calculateCostAndLogUsage({
      serviceId, // Assuming transcription has ID 2 in the database
      organizationId,
      userId,
      audioDuration: 1, // 1 minute
      bytes: audioBytes.length,
      requestMetadata: { audioFormat: 'mp3' },
      status: 'completed'
    })
    return { transcription }
  } catch (error) {
    console.error('Error during transcription:', error.message)
    throw new Error('Failed to transcribe the audio.')
  }
}

async function googleTranscriber(organizationId, userId, filePath, language) {
  try {
    const serviceId = 2 // Assuming transcription has ID 2 in the database
    const bucketName = process.env.GCS_BUCKET_NAME // Ensure you set this in your environment
    if (!bucketName) {
      throw new Error('GCS bucket name is not configured in the environment.')
    }
    // Upload file to GCS
    const gcsUri = await uploadToGCS(filePath, bucketName)

    // Config for the transcription
    const request = {
      audio: {
        uri: gcsUri // Use GCS URI
      },
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: language, // Replace with your desired language code
        punctuation: true
      }
    }
    // Call LongRunningRecognize
    const [operation] = await speechClient.longRunningRecognize(request)

    // Wait for the operation to complete
    const [response] = await operation.promise()
    // Extract and return transcription results
    const transcription = response.results
      .map((result) => result.alternatives[0].transcript)
      .join('\n')
    const cost = calculateCostAndLogUsage({
      serviceId, // Assuming transcription has ID 1 in the database
      organizationId,
      userId,
      audioDuration: 0, // 0 minutes
      bytes: 0, // 0 bytes
      requestMetadata: { audioFormat: 'mp3' },
      status: 'completed'
    })
    console.log('Transcript with Google cost :>> ', cost)

    return { transcription }
  } catch (error) {
    console.error('Error during transcription:', error)
    throw new Error('Failed to transcribe the audio.')
  }
}

export {
  transcribeWithGoogle1Minute,
  googleTranscriber as transcribeWithGoogle
}
