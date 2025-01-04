import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner' // Correct import
import process from 'node:process'

// Initialize S3 Client
export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

// Upload File to S3
export const uploadFileToS3 = async ({
  bucketName,
  key,
  body,
  contentType
}) => {
  if (!bucketName) {
    throw new Error('Bucket name is required')
  }

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType
  }

  try {
    await s3Client.send(new PutObjectCommand(params))
    console.log(`File uploaded successfully: ${key}`)
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
  } catch (err) {
    console.error('Error uploading to S3:', err)
    throw err
  }
}

// Retrieve File from S3
export const getFileFromS3 = async ({ bucketName, key }) => {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key })
  const response = await s3Client.send(command)
  return response.Body
}

// Delete File from S3
export const deleteFileFromS3 = async ({ bucketName, key }) => {
  console.log('bucketName, key :>> ', bucketName, key)
  const command = new DeleteObjectCommand({ Bucket: bucketName, Key: key })
  return s3Client.send(command)
}

// Generate Pre-signed URL for S3 Uploads
export const generatePresignedUrl = async ({
  bucketName,
  key,
  contentType
}) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType
  })
  return getSignedUrl(s3Client, command, { expiresIn: 3600 }) // URL expires in 1 hour
}
