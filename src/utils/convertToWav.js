import logger from './logger.js'
import path from 'path'
import fs from 'fs/promises'

/**
 * Convert an audio file to WAV format using FFmpeg.
 * @param {string} inputPath - Path to the input audio file.
 * @returns {Promise<string>} - Path to the converted WAV file.
 */
import { spawn } from 'child_process'

export const convertToWav = async (inputPath) => {
  const wavPath = inputPath.replace(path.extname(inputPath), '.wav')

  try {
    // Ensure the input file exists
    await fs.access(inputPath)

    logger.info(
      `Running FFmpeg command: ffmpeg -i "${inputPath}" -ar 16000 -ac 1 "${wavPath}"`
    )

    // Use `spawn` to run the FFmpeg command
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i',
        inputPath,
        '-ar',
        '16000',
        '-ac',
        '1',
        wavPath
      ])

      ffmpeg.stdout.on('data', (data) => {
        logger.info(`FFmpeg output: ${data}`)
      })

      ffmpeg.stderr.on('data', (data) => {
        logger.error(`FFmpeg error: ${data}`)
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          logger.info(`Converted audio to WAV: ${wavPath}`)
          resolve()
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`))
        }
      })

      ffmpeg.on('error', (err) => {
        logger.error('Error spawning FFmpeg process:', err)
        reject(new Error('Failed to convert audio to WAV format.'))
      })
    })

    return wavPath
  } catch (error) {
    logger.error('Error in convertToWav:', error)
    throw new Error('Failed to convert audio to WAV format.')
  }
}

export default convertToWav
