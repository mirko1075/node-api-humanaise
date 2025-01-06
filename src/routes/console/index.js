import express from 'express'
import audioRoutes from './audioRoutes.js'
import fileRoutes from './fileRoutes.js'
import translationRoutes from './translationRoutes.js'
import transcriptionRoute from './transcriptionRoute.js'
const router = express.Router()

// Mount routes
router.use('/audio', audioRoutes) // /api/v1/audio
router.use('/files', fileRoutes) // /api/v1/files
router.use('/transcriptions', transcriptionRoute) // /api/v1/translations
router.use('/translations', translationRoutes) // /api/v1/translations

export default router
