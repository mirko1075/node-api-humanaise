import express from 'express'
import upload from '../../middleware/multer.js'
import fileController from '../../controllers/fileController.js'

const router = express.Router()

router.get('/', fileController.getFiles)
router.post('/upload', upload.single('file'), fileController.uploadFile)
router.delete('/delete', fileController.deleteFile)
router.put('/:id/status', fileController.updateFileStatus)
router.post('/split', upload.single('file'), fileController.splitAudio)
router.post('/create-text-file', fileController.createTextFile)

export default router
