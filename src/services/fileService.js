import path from 'path'
import fs from 'fs'
import process from 'node:process'
import transliterate from 'transliteration'
import knex from '../config/knex.js'
import { uploadFileToS3, deleteFileFromS3 } from '../utils/aws.js'
import logger from '../utils/logger.js'
import calculateCostAndLogUsage from '../utils/costAndUsageTracker.js'

const fileService = {
  /**
   * Handles file upload and saves record to the database
   * @param {Object} fileData
   * @param {string} fileData.originalname - Original file name
   * @param {string} fileData.mimetype - MIME type of the file
   * @param {Buffer} fileData.buffer - File buffer
   * @param {number} fileData.organizationId - Organization ID
   * @param {number} fileData.userId - User ID
   * @returns {Object} - Uploaded file record
   */
  async uploadAndSaveFile({
    originalname,
    mimetype,
    buffer,
    organizationId,
    userId
  }) {
    try {
      const timestamp = Date.now()
      const fileExtension = path.extname(originalname) // Get file extension
      const safeName = transliterate.slugify(
        path.basename(originalname, fileExtension)
      ) // Transliterate name
      const truncatedName = safeName.slice(0, 10) || 'file' // Limit to 10 characters

      const s3Key = `uploads/${organizationId}/${timestamp}_${truncatedName}${fileExtension}`
      const s3Params = {
        bucketName: process.env.AWS_S3_BUCKET,
        key: s3Key,
        body: buffer,
        contentType: mimetype
      }

      // Upload file to S3
      await uploadFileToS3(s3Params)

      const filePath = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`

      // Save file metadata to the database
      const [fileRecord] = await knex('files')
        .insert({
          name: `${timestamp}_${truncatedName}${fileExtension}`,
          path: filePath,
          organization_id: organizationId,
          user_id: userId,
          status: 'pending'
        })
        .returning('*')

      return {
        id: fileRecord.id,
        name: fileRecord.name,
        path: fileRecord.path
      }
    } catch (error) {
      throw new Error(`Failed to upload and save file: ${error.message}`)
    }
  },

  /**
   * Delete a file from S3 and the database
   * @param {Object} params
   * @param {String} params.key - The S3 key of the file
   * @param {Number} params.id - The ID of the file in the database
   */
  async deleteFile({ key, id }) {
    try {
      // Delete the file from S3
      const s3Params = {
        bucketName: process.env.AWS_S3_BUCKET,
        key: key
      }
      const response = await deleteFileFromS3(s3Params)

      if (response.$metadata.httpStatusCode !== 204) {
        throw new Error('Failed to delete file from S3')
      }
      logger.info(`File '${key}' deleted successfully from S3`)

      // Delete the file record from the database
      await knex('files').where({ id }).del()
      logger.info(`File '${key}' deleted successfully from DB`)
    } catch (error) {
      logger.error(`Error deleting file '${key}':`, error)
      throw new Error(error.message)
    }
  },

  /**
   * Update the status of a file in the database
   * @param {Number} id - File ID
   * @param {String} status - New status for the file
   */
  async updateStatus(id, status) {
    try {
      const rowsAffected = await knex('files').where({ id }).update({ status })

      if (rowsAffected === 0) {
        throw new Error(`File with ID ${id} not found`)
      }

      logger.info(`Status successfully updated for file ID ${id}`)
    } catch (error) {
      logger.error('Error updating file status:', error)
      throw new Error('Failed to update file status')
    }
  },

  /**
   * Fetch paginated files from the database
   * @param {Object} options
   * @param {Number} options.page - Current page number
   * @param {Number} options.limit - Number of records per page
   * @returns {Array} - List of files
   */
  async getFiles({ page, limit }) {
    try {
      const offset = (page - 1) * limit

      const files = await knex('files').select('*').limit(limit).offset(offset)

      logger.info(`Retrieved ${files.length} files from database`)
      return files
    } catch (error) {
      logger.error('Error fetching files from database:', error)
      throw new Error('Failed to fetch files')
    }
  },

  createTextFile: async ({
    text,
    folder,
    fileName,
    organizationId,
    userId
  }) => {
    const timestamp = Date.now()
    const textFileName = `${fileName}-${timestamp}.txt` // Generate a unique file name
    const tempFilePath = `temp-${textFileName}` // Temporary local file path

    try {
      // Write the text to a temporary file
      fs.writeFileSync(tempFilePath, text)

      // Upload the file to S3
      const s3Key = `${folder}/${textFileName}`
      const s3Url = await uploadFileToS3({
        bucketName: process.env.AWS_S3_BUCKET,
        key: s3Key,
        body: fs.createReadStream(tempFilePath),
        contentType: 'text/plain'
      })

      // Log service usage and calculate cost
      const bytes = fs.statSync(tempFilePath).size
      const cost = await calculateCostAndLogUsage({
        serviceId: 7, // Assuming "File Processing" is service ID 7
        organizationId,
        userId,
        audioDuration: 0, // No audio duration for text files
        bytes,
        status: 'completed'
      })

      logger.info(`Text file created and uploaded successfully: ${s3Url}`)

      return {
        message: 'Text file created and uploaded successfully',
        s3Url,
        cost
      }
    } catch (error) {
      logger.error('Error in createTextFile service:', error)
      throw new Error('Failed to create and upload text file.')
    } finally {
      // Cleanup temporary file
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
    }
  }
}

export default fileService
