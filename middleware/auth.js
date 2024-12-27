import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import process from 'node:process';
import { verifyAuth0Token } from '../utils/auth0.js';
dotenv.config();

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token is required.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });

    req.user = user; // Add user info to the request object
    next();
  });
};

export const authenticateAuth0Token = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
      return res.status(401).json({ error: 'No token provided' });
  }

  try {
      const user = await verifyAuth0Token(token);
      req.user = user; // Attach decoded user data to the request
      next();
  // eslint-disable-next-line no-unused-vars
  } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
  }
};