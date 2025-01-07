import process from 'node:process'
import fs from 'fs'
import axios from 'axios'
import logger from './logger.js'

export const validateWavFile = (filePath) => {
  const header = fs.readFileSync(filePath, { length: 44 }) // WAV header is 44 bytes
  const riffHeader = header.slice(0, 4).toString()
  const waveHeader = header.slice(8, 12).toString()

  if (riffHeader !== 'RIFF' || waveHeader !== 'WAVE') {
    throw new Error('Invalid WAV file: Missing RIFF or WAVE header')
  }

  logger.info('WAV file is valid')
}

export const languageDetector = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('File does not exist')
    }

    // Log file details
    const stats = fs.statSync(filePath)
    logger.info(`File size: ${stats.size} bytes`)
    logger.info(`File path: ${filePath}`)

    // Read the audio file
    const audioData = fs.readFileSync(filePath)

    // Log the first 100 bytes of the file (for debugging)
    logger.info(
      `First 100 bytes of file: ${audioData.slice(0, 100).toString('hex')}`
    )

    // Send the audio data to Deepgram
    const response = await axios.post(
      'https://api.deepgram.com/v1/listen',
      audioData,
      {
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/wav' // Ensure this matches the file format
        },
        params: {
          detect_language: true
        }
      }
    )

    // Extract language detection results
    console.log(
      'response.data :>> ',
      JSON.stringify(response.data.results.channels[0])
    )
    const { detected_language, language_confidence } =
      response.data.results.channels[0]
    return {
      detectedLanguage: detected_language,
      languageConfidence: language_confidence
    }
  } catch (error) {
    if (error.response) {
      // Deepgram API returned an error
      const { err_msg, err_code } = error.response.data
      throw new Error(`Deepgram API error: ${err_msg} (code: ${err_code})`)
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response received from Deepgram')
    } else {
      // Something went wrong while setting up the request
      throw new Error(`Error in languageDetector: ${error.message}`)
    }
  }
}
