import audioService from '../services/audioService.js'
import logger from '../utils/logger.js'

const audioController = {
  /**
   * Split audio file into smaller segments and return a ZIP of the files
   */
  async splitAudio(req, res) {
    const {
      duration = 30,
      organization_id = 1,
      user_id = 1,
      fileUrl
    } = req.body

    if (!fileUrl) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    try {
      // Delegate the splitting and processing logic to the service
      const zipUrl = await audioService.splitAndZipAudio({
        fileUrl,
        duration,
        organizationId: organization_id,
        userId: user_id
      })

      logger.info(`Audio split and zipped successfully: ${zipUrl}`)
      res
        .status(201)
        .json({ message: 'Audio split and zipped successfully', zipUrl })
    } catch (error) {
      logger.error('Error processing audio:', error)
      res.status(500).json({ error: 'Failed to process audio file' })
    }
  }
}

export default audioController
