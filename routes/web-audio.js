import express from "express";
import multer from "multer";
import { authenticateToken } from '../middleware/auth.js';


const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Secure file upload route
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    //const { file } = req;
    const { userId } = req.user; // Access user info from the token
  
    try {
      // Process file upload and associate it with the authenticated user
        // For example, save the file to a database or cloud storage
        // Return the uploaded file details
        
      res.json({ message: 'File uploaded successfully', userId });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Failed to upload file.' });
    }
  });


export default router;
