import fs from 'fs'
import path from 'path'
import process from 'node:process'
import translationService from '../services/translationService.js'
import logger from '../utils/logger.js'
import { uploadFileToS3 } from '../utils/aws.js'

const translationController = {
  /**
   * Translate audio content
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
