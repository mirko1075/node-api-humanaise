import transcriptionService from '../services/transcriptionService.js'
import logger from '../utils/logger.js'

const transcriptionController = {
  /**
   * Split and transcribe an audio file
   */
  async splitAndTranscribe(req, res) {
    const {
      organization_id = 1,
      user_id = 1,
      fileUrl,
      language = 'en',
      doubleModel = false,
      duration = 5000
    } = req.body

    if (!fileUrl) {
      return res.status(400).json({ error: 'No file URL provided' })
    }

    try {
      const result = await transcriptionService.splitAndTranscribe({
        fileUrl,
        language,
        doubleModel,
        duration,
        organizationId: organization_id,
        userId: user_id
      })

      logger.info(`Transcription completed successfully for file: ${fileUrl}`)
      res.status(200).json(result)
    } catch (error) {
      logger.error('Error processing transcription:', error)
      res.status(500).json({ error: 'Failed to process audio file' })
    }
  },

  /**
   * Transcribe an audio file
   */
  async transcribe(req, res) {
    const {
      fileUrl,
      language = 'en',
      doubleModel = false,
      organization_id = 1,
      user_id = 1
    } = req.body

    if (!fileUrl) {
      logger.error('fileUrl is required')
      return res.status(400).json({ error: 'fileUrl is required' })
    }

    try {
      const result = await transcriptionService.transcribe({
        organizationId: organization_id,
        userId: user_id,
        fileUrl,
        language,
        doubleModel
      })

      logger.info(`Transcription completed successfully for file: ${fileUrl}`)
      res.status(200).json(result)
    } catch (error) {
      logger.error('Error processing transcription:', error)
      res.status(500).json({ error: 'Failed to transcribe audio file' })
    }
  }
}

export default transcriptionController
