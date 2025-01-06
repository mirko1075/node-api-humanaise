import express from 'express'
import translationController from '../../controllers/translationController.js'

const router = express.Router()

// POST /api/v1/translation/audio
router.post('/audio', translationController.translateAudio)
router.post('/text', translationController.translateText)

export default router
