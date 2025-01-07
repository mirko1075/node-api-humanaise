import audioService from '../services/audioService.js'
import logger from '../utils/logger.js'
import process from 'node:process'

const audioController = {
  /**
   *
   * @param {*} req
   * @param {*} res
   * @returns  {String} - URL of the converted file
   * @throws {Error} - If the file URL is not provided
   * @throws {Error} - If the audio conversion fails
   * @throws {Error} - If the audio upload fails
   * @throws {Error} - If the audio deletion fails
   * @throws {Error} - If the audio duration is not a number
   * @throws {Error} - If the audio duration is less than 1
   * @throws {Error} - If the audio duration is greater than 60
   * @throws {Error} - If the audio duration is not an integer
   * @throws {Error} - If the audio duration is not a multiple of 60
   */
  async convertToWav(req, res) {
    const {
      fileUrl,
      bucketName = process.env.AWS_S3_BUCKET,
      organization_id = 1,
      user_id = 1
    } = req.body

    if (!fileUrl) {
      return res.status(400).json({ error: 'File URL is required.' })
    }

    try {
      const result = await audioService.convertToWav({
        fileUrl,
        bucketName,
        organizationId: organization_id,
        userId: user_id
      })

      res.status(201).json(result)
    } catch (error) {
      logger.error('Error in convertToWavController:', error)
      res.status(500).json({ error: 'Failed to convert audio file.' })
    }
  }
}

export default audioController
