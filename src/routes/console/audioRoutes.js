import express from 'express'
import audioController from '../../controllers/audioController.js'

const router = express.Router()

router.post('/convert-to-wav', audioController.convertToWav)

export default router
