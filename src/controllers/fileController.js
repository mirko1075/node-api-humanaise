import fileService from '../services/fileService.js'
import logger from '../utils/logger.js'

const fileController = {
  /**
   * Upload a file to S3 and the database
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
   * Get paginated files
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
  }
}

export default fileController
