/* eslint-disable no-console */
import process from 'node:process'
export default (err, req, res) => {
  console.error(err.stack) // Log stack trace
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  })
}
