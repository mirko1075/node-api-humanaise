import fs from 'fs'
import path from 'path'
import process from 'node:process'
import translationService from '../services/translationService.js'
import logger from '../utils/logger.js'
import { uploadFileToS3 } from '../utils/aws.js'

const translationController = {
  /**
   * Translate audio from a file
   * @param {*} req
   * @param {*} res
   * @returns {Object} - Translation result
   * @throws {Error} - If the file URL is not provided
   * @throws {Error} - If the translation fails
   * @throws {Error} - If the translation result is not saved
   * @throws {Error} - If the translation result is not updated
   * @throws {Error} - If the translation result is not found
   * @throws {Error} - If the translation result is not deleted
   */
  async translateAudio(req, res) {
    const {
      fileUrl,
      language,
      targetLanguage = 'en',
      isMultiModel = false,
      organization_id = 1
    } = req.body

    if (!fileUrl || !targetLanguage) {
      logger.error('fileUrl and targetLanguage are required.')
      return res.status(400).json({
        error: 'fileUrl and targetLanguage are required.'
      })
    }

    try {
      const result = await translationService.translateAudio({
        fileUrl,
        language,
        targetLanguage,
        isMultiModel,
        organizationId: organization_id
      })

      logger.info(`Translation completed successfully for file: ${fileUrl}`)
      res.status(200).json(result)
    } catch (error) {
      logger.error('Error during translation:', error)
      res.status(500).json({ error: 'Failed to translate the text.' })
    }
  },
  /**
   * Translate text from a file
   * @param {*} req
   * @param {*} res
   * @returns {Object} - Translation result
   * @throws {Error} - If the file URL is not provided
   * @throws {Error} - If the translation fails
   * @throws {Error} - If the translation result is not saved
   * @throws {Error} - If the translation result is not updated
   * @throws {Error} - If the translation result is not found
   * @throws {Error} - If the translation result is not deleted
   * @throws {Error} - If the target language is not provided
   */
  async translateText(req, res) {
    const {
      fileUrl,
      targetLanguage = 'en',
      isMultiModel = false,
      organization_id = 1,
      user_id = 1
    } = req.body

    if (!fileUrl || !targetLanguage) {
      logger.error('fileUrl and targetLanguage are required.')
      return res.status(400).json({
        error: 'fileUrl and targetLanguage are required.'
      })
    }

    try {
      const result = await translationService.translateText({
        organizationId: organization_id,
        userId: user_id,
        fileUrl,
        targetLanguage,
        isMultiModel
      })

      logger.info(`Translation completed successfully for file: ${fileUrl}`)
      res.status(200).json(result)
    } catch (error) {
      logger.error('Error during translation:', error)
      res.status(500).json({ error: 'Failed to translate the text.' })
    }
  },
  /**
   * Upload a translation to S3
   * @param {*} req
   * @param {*} res
   * @returns {String} - URL of the uploaded translation
   * @throws {Error} - If the translation is not provided
   * @throws {Error} - If the file URL is not provided
   * @throws {Error} - If the model is not provided
   * @throws {Error} - If the translation upload fails
   */
  async uploadTranslation({ translation, fileUrl, model }) {
    const txtFileName = `translations/${path.basename(fileUrl, path.extname(fileUrl))}-${model}-translation.txt`
    const txtFilePath = path.join('temp', txtFileName)
    fs.writeFileSync(txtFilePath, translation)

    const s3Url = await uploadFileToS3({
      bucketName: process.env.AWS_S3_BUCKET,
      key: txtFileName,
      body: fs.createReadStream(txtFilePath),
      contentType: 'text/plain'
    })

    fs.unlinkSync(txtFilePath)
    return s3Url
  }
}

export default translationController
