// routes/presigned-url.js
import express from 'express';
import { generatePresignedUrl } from '../aws.js';
import logger from '../logger.js';
import process from 'node:process';

const router = express.Router();

router.get('/presigned-url', async (req, res) => {
  const { fileName, contentType } = req.query;

  if (!fileName || !contentType) {
    return res.status(400).json({ error: 'fileName and contentType are required' });
  }

  try {
    const presignedUrl = await generatePresignedUrl({
      bucketName: process.env.AWS_S3_BUCKET,
      key: `uploads/${fileName}`,
      contentType,
    });
    logger.info(`Generated pre-signed URL for file: ${fileName}`);
    res.json({ presignedUrl });
  } catch (error) {
    logger.error('Error generating pre-signed URL:', error);
    res.status(500).json({ error: 'Failed to generate pre-signed URL' });
  }
});

export default router;