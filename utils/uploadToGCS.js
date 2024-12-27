import { Storage } from '@google-cloud/storage';
import path from 'path';

// Initialize Google Speech-to-Text client
const storageClient = new Storage();

async function uploadToGCS(filePath, bucketName) {
  const fileName = path.basename(filePath);
  const bucket = storageClient.bucket(bucketName);

  console.log(`Uploading file to GCS: ${filePath}`);
  await bucket.upload(filePath, {
      destination: fileName,
      resumable: false,
  });

  console.log(`File uploaded to: gs://${bucketName}/${fileName}`);
  return `gs://${bucketName}/${fileName}`;
}

export default uploadToGCS;