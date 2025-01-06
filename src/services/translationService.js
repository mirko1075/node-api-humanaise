import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { uploadFileToS3 } from '../utils/aws.js'
import knex from '../config/knex.js'
import process from 'node:process'
import whisperTranscriber from '../utils/whisperTranscriber.js'
import { whisperTranslator } from '../utils/whisperTranslator.js'
import { googleTranslator } from '../utils/googleTranslator.js'
import { calculateCost } from '../../utils/calculateCost.js'
import calculateCostAndLogUsage from '../utils/costAndUsageTracker.js'

const translationService = {
  /**
   * Translate audio content
   * @param {Object} params
   * @param {String} params.fileUrl - URL of the audio file
   * @param {String} params.language - Language of the audio
   * @param {String} params.targetLanguage - Target translation language
   * @param {Boolean} params.isMultiModel - Use multiple translation models
   * @param {Number} params.organizationId - Organization ID
   * @returns {Object} - Translation result
   */
  async translateAudio({ fileUrl, language, targetLanguage, isMultiModel }) {
    const inputPath = `temp-${Date.now()}.wav`
    const translations = {}
    let totalTokens = 0
    let totalCost = 0

    try {
      // Download the file from S3
      const response = await axios({
        url: fileUrl,
        method: 'GET',
        responseType: 'stream'
      })

      const writer = fs.createWriteStream(inputPath)
      response.data.pipe(writer)

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
      })

      // Transcribe audio content
      const transcription = await whisperTranscriber(inputPath, language)

      // Translate using Whisper
      const whisperResult = await whisperTranslator(
        transcription,
        targetLanguage
      )
      translations.whisper = whisperResult.text

      totalTokens += whisperResult.usage.total_tokens || 0
      totalCost += await calculateCost({
        service: 'Translation',
        provider: 'OpenAI',
        tokens: whisperResult.usage.total_tokens || 0
      })

      // Optional: Translate using Google if `isMultiModel` is true
      if (isMultiModel) {
        const googleResult = await googleTranslator(
          transcription,
          targetLanguage
        )
        translations.google = googleResult.translation

        totalTokens += googleResult.tokens || 0
        totalCost += await calculateCost({
          service: 'Translation',
          provider: 'Google',
          tokens: googleResult.tokens || 0
        })
      }

      return {
        message: 'Translation successful',
        translations,
        totalTokens,
        totalCost
      }
    } catch (error) {
      throw new Error(`Translation failed: ${error.message}`)
    } finally {
      // Cleanup
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
    }
  },

  /**
   * Translate text from a file
   * @param {Object} params
   * @param {String} params.fileUrl - URL of the text file
   * @param {String} params.targetLanguage - Target language for translation
   * @param {Boolean} params.isMultiModel - Use multiple translation models
   * @param {Number} params.organizationId - Organization ID
   * @returns {Object} - Translation result
   */
  async translateText({
    organizationId,
    userId,
    fileUrl,
    targetLanguage,
    isMultiModel
  }) {
    const uniqueId = Date.now()
    const tempFilePath = `temp-${uniqueId}-translation.txt`
    const translations = {}
    let totalTokens = 0
    let totalCost = 0
    const openaiServiceId = 1
    const googleServiceId = 2
    try {
      // Download the text file from S3
      const response = await axios({
        url: fileUrl,
        method: 'GET',
        responseType: 'stream'
      })

      const writer = fs.createWriteStream(tempFilePath)
      response.data.pipe(writer)

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
      })
      const bytes = fs.statSync(tempFilePath).size
      // Read the content of the file
      const text = fs.readFileSync(tempFilePath, 'utf-8')

      // Translate with Whisper
      const whisperResult = await whisperTranslator(text, targetLanguage)
      translations.whisper = whisperResult.text

      totalTokens += whisperResult.usage.total_tokens || 0
      totalCost += await calculateCostAndLogUsage({
        serviceId: openaiServiceId,
        organizationId,
        userId,
        tokensUsed: totalTokens || 0,
        status: 'completed',
        bytes
      }).cost

      // Save Whisper translation to S3
      const whisperTxtFileUrl = await this.uploadTranslation(
        organizationId,
        userId,
        whisperResult.text,
        fileUrl,
        'whisper'
      )

      // Optional: Translate with Google
      if (isMultiModel) {
        const googleResult = await googleTranslator(text, targetLanguage)
        translations.google = googleResult.translation

        totalTokens += googleResult.tokens || 0
        totalCost += await calculateCostAndLogUsage({
          serviceId: googleServiceId,
          organizationId,
          userId,
          tokensUsed: totalTokens || 0,
          bytes,
          status: 'completed'
        }).cost

        // Save Google translation to S3
        const googleTxtFileUrl = await this.uploadTranslation({
          translation: googleResult.translation,
          fileUrl,
          model: 'google'
        })

        translations.googleTxtFileUrl = googleTxtFileUrl
      }

      return {
        message: 'Translation successful',
        translations,
        totalTokens,
        totalCost,
        whisperTxtFileUrl
      }
    } catch (error) {
      await knex('files')
        .where({ path: fileUrl })
        .update({ translation_status: 'failed' })
      throw new Error(`Translation failed: ${error.message}`)
    } finally {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
    }
  },

  async uploadTranslation(organizationId, userId, translation, fileUrl, model) {
    try {
      console.log(
        'fileUrl :>> ',
        fileUrl.split('/').pop().split('-')[0].split('_')[1]
      )
      const uniqueId = Date.now()
      // Extract the base file name (without extension) from `fileUrl`
      const baseFileName =
        uniqueId + '-' + fileUrl.split('/').pop().split('-')[0].split('_')[1]

      // Construct the desired S3 key and local temp path
      const txtFileName = `translations/${baseFileName}-${model}-translation.txt` // S3 key
      const txtFilePath = path.join(
        'temp',
        `${baseFileName}-${model}-translation.txt`
      ) // Local temp path

      // Ensure the temp directory exists
      const tempDir = path.dirname(txtFilePath)
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      // Write the translation content to the temporary file
      fs.writeFileSync(txtFilePath, translation)

      // Upload the file to S3
      const s3Url = await uploadFileToS3({
        bucketName: process.env.AWS_S3_BUCKET,
        key: txtFileName,
        body: fs.createReadStream(txtFilePath),
        contentType: 'text/plain'
      })

      // Log the usage
      const fileStats = fs.statSync(txtFilePath)
      await calculateCostAndLogUsage({
        serviceId: 6,
        organizationId,
        userId,
        tokensUsed: 0,
        status: 'completed',
        bytes: fileStats.size
      })

      // Cleanup the temporary file
      fs.unlinkSync(txtFilePath)

      return s3Url
    } catch (error) {
      console.error('Error in uploadTranslation:', error)
      throw error
    }
  }
}

export default translationService
