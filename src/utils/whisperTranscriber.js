import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import process from 'node:process'
import calculateCostAndLogUsage from './costAndUsageTracker.js'

const whisperTranscriber = async (
  organizationId,
  userId,
  filePath,
  audioDuration,
  language
) => {
  try {
    const serviceId = 1 // Assuming transcription has ID 1 in the database
    // Send the WAV file to Whisper
    const fileStream = fs.createReadStream(filePath)
    const formData = new FormData()
    formData.append('file', fileStream)
    formData.append('model', 'whisper-1')
    formData.append('language', language) // Replace 'en' with desired language
    formData.append('temperature', 0.5) // Sampling temperature
    formData.append('prompt', 'This is an audio transcription task.')

    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        }
      }
    )
    await calculateCostAndLogUsage({
      serviceId, // Assuming transcription has ID 1 in the database
      organizationId,
      userId,
      audioDuration, // 1 minute
      bytes: fs.statSync(filePath).size,
      status: 'completed'
    })
    console.log('response.data :>> ', response.data)
    return response.data.text
  } catch (error) {
    console.error(
      'Error transcribing file:',
      error.response?.data || error.message
    )
    throw new Error('Failed to transcribe audio.')
  }
}

export default whisperTranscriber
