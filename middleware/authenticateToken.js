import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import process from 'node:process';
dotenv.config();

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user details to the request
    next();
  } catch (error) {
    console.error('Token authentication failed:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

export default authenticateToken;
