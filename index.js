import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import dotenv from 'dotenv'
import routes from './src/routes/index.js' // Centralized route manager
import errorHandler from './src/middleware/errorHandler.js' // Centralized error handler
import logger from './src/utils/logger.js'
// Load environment variables from .env
dotenv.config()

// Initialize express app
const app = express()

// Middleware
app.use(helmet()) // Secure HTTP headers
app.use(cors()) // Enable Cross-Origin Resource Sharing
app.use(compression()) // Compress response bodies
app.use(express.json()) // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })) // Parse URL-encoded request bodies
app.use(morgan('combined', { stream: logger.stream })) // Request logging

// Routes
app.use('/api/v1', routes) // Mount all routes under /api/v1

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() })
})

// Error handling middleware
app.use(errorHandler)

// Start the server
const PORT = 4000
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`)
})
