import express from 'express'
import transcriptionController from '../../controllers/transcriptionController.js'

const router = express.Router()

// POST /api/v1/transcription
router.post('/', transcriptionController.transcribe)
router.post('/split-transcribe', transcriptionController.splitAndTranscribe)

export default router
