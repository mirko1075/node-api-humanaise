import { languageDetectionService } from '../services/languageDetectionService.js'
import logger from '../utils/logger.js'

const detectLanguageController = {
  /**
   * Detect the language of an audio file
   * @param {*} req
   * @param {*} res
   * @returns {Object} - Language detection result
   * @throws {Error} - If the file URL is not provided
   */
  async detectLanguage(req, res) {
    const { fileUrl, organization_id = 1, user_id = 1 } = req.body

    if (!fileUrl) {
      logger.error('fileUrl is required')
      return res.status(400).json({ error: 'fileUrl is required' })
    }

    try {
      const result = await languageDetectionService.detectLanguage({
        fileUrl,
        organizationId: organization_id,
        userId: user_id
      })

      logger.info(`Language detected successfully for file: ${fileUrl}`)
      res.json(result)
    } catch (error) {
      logger.error('Error detecting language:', error)
      res.status(500).json({
        error: 'Failed to detect language',
        message: error.message,
        language: undefined,
        confidence: undefined,
        totalCost: undefined
      })
    }
  }
}

export default detectLanguageController
