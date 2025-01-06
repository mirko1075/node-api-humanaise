import express from 'express'
import consoleRoutes from './console/index.js'

const router = express.Router()

// Mount routes
router.use('/console', consoleRoutes) // /api/v1/console

export default router
