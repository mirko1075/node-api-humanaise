import fileService from '../services/fileService.js'
import logger from '../utils/logger.js'
import audioService from '../services/audioService.js'
const fileController = {
  /**
   * Split an audio file into segments and zip them
   * @param {*} req
   * @param {*} res
   * @returns {String} - URL of the zipped file
   * @throws {Error} - If the file is not uploaded
   * @throws {Error} - If the audio processing fails
   * @throws {Error} - If the audio splitting fails
   * @throws {Error} - If the audio zipping fails
   * @throws {Error} - If the audio upload fails
   * @throws {Error} - If the audio deletion fails
   * @throws {Error} - If the audio conversion fails
   * @throws {Error} - If the audio duration is not a number
   * @throws {Error} - If the audio duration is less than 1
   * @throws {Error} - If the audio duration is greater than 60
   * @throws {Error} - If the audio duration is not an integer
   * @throws {Error} - If the audio duration is not a multiple of 60
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
  },
  /**
   * Upload a file to S3 and save the file record in the database
   * @param {*} req
   * @param {*} res
   * @returns {Object} - File record
   * @throws {Error} - If no file is uploaded
   * @throws {Error} - If the file upload fails
   */
  async uploadFile(req, res) {
    if (!req.file) {
      return res.status(400).send({ error: 'No file uploaded' })
    }

    try {
      const { originalname, mimetype, buffer } = req.file
      const organizationId = req.body.organization_id || 1
      const userId = req.body.user_id || 1

      // Delegate to service layer
      const fileRecord = await fileService.uploadAndSaveFile({
        originalname,
        mimetype,
        buffer,
        organizationId,
        userId
      })

      logger.info(`File uploaded successfully: ${originalname}`)
      res.status(201).json(fileRecord) // Respond with file record
    } catch (error) {
      logger.error('Error uploading file:', error)
      res.status(500).send('Failed to upload file')
    }
  },
  /**
   * Delete a file from S3 and the database
   * @param {*} req
   * @param {*} res
   * @returns {Object} - Success message
   * @throws {Error} - If the file key is not provided
   * @throws {Error} - If the file deletion fails
   * @throws {Error} - If the file record is not found
   * @throws {Error} - If the file record deletion fails
   * @throws {Error} - If the file record update fails
   */
  async deleteFile(req, res) {
    const { key, id } = req.body

    if (!key) {
      return res.status(400).json({ error: 'File key is required' })
    }

    try {
      // Delegate deletion logic to the service
      await fileService.deleteFile({ key, id })

      logger.info(`File '${key}' deleted successfully`)
      res.status(200).json({ message: `File '${key}' deleted successfully` })
    } catch (error) {
      logger.error('Error deleting file:', error)
      res.status(500).json({ error: 'Failed to delete file' })
    }
  },
  /**
   * Update the status of a file
   * @param {*} req
   * @param {*} res
   * @returns {Object} - Success message
   * @throws {Error} - If the status is not provided
   * @throws {Error} - If the file status update fails
   * @throws {Error} - If the file record is not found
   * @throws {Error} - If the file record update fails
   */
  async updateFileStatus(req, res) {
    const { id } = req.params
    const { status } = req.body

    if (!status) {
      return res.status(400).json({ error: 'Status is required' })
    }

    try {
      // Delegate the update logic to the service
      await fileService.updateStatus(id, status)

      logger.info(`Status updated for file ID ${id}: ${status}`)
      res.status(200).json({ message: 'Status updated successfully' })
    } catch (error) {
      logger.error('Error updating file status:', error)
      res.status(500).json({ error: 'Failed to update status' })
    }
  },

  /**
   * Get a list of files
   * @param {*} req
   * @param {*} res
   * @returns {Array} - List of files
   * @throws {Error} - If the files cannot be fetched
   * @throws {Error} - If the files are not found
   * @throws {Error} - If the files cannot be listed
   * @throws {Error} - If the files cannot be retrieved
   */
  async getFiles(req, res) {
    const { page = 1, limit = 10 } = req.query

    try {
      // Delegate fetching logic to the service
      const files = await fileService.getFiles({ page, limit })

      logger.info(`Fetched ${files.length} files`)
      res.status(200).json(files)
    } catch (error) {
      logger.error('Error fetching files:', error)
      res.status(500).json({ error: 'Failed to fetch files' })
    }
  },
  /**
   * Create a text file
   * @param {*} req
   * @param {*} res
   * @returns {Object} - Text file record
   * @throws {Error} - If the text content is not provided
   * @throws {Error} - If the text file creation fails
   * @throws {Error} - If the text file record is not saved
   * @throws {Error} - If the text file record update fails
   * @throws {Error} - If the text file record is not found
   * @throws {Error} - If the text file record is not deleted
   * @throws {Error} - If the text file record is not updated
   */
  async createTextFile(req, res) {
    const {
      text,
      folder = 'text-files',
      fileName = 'file',
      organization_id = 1,
      user_id = 1
    } = req.body

    if (!text) {
      return res.status(400).json({ error: 'Missing text content' })
    }

    try {
      const result = await fileService.createTextFile({
        text,
        folder,
        fileName,
        organizationId: organization_id,
        userId: user_id
      })

      res.status(201).json(result)
    } catch (error) {
      logger.error('Error in createTextFileController:', error)
      res.status(500).json({ error: 'Failed to create and upload text file.' })
    }
  }
}

export default fileController
