import express from 'express'
import upload from '../../middleware/multer.js'
import audioController from '../../controllers/audioController.js'

const router = express.Router()

// POST /api/v1/audio/split
router.post('/split', upload.single('file'), audioController.splitAudio)

export default router
