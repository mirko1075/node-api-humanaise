import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import process from "node:process";
import rateLimiter from "./middleware/rateLimiter.js";
import apiKeyAuth from "./middleware/apiKeyAuth.js";
import consoleAudioRoutes from "./routes/console/console-audio.js";
import webAudioRoutes from "./routes/console/console-audio.js";
import authRoutes from "./routes/auth/auth.js";
import userRoutes from "./routes/user/user.js";
import { errorHandler } from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";

dotenv.config();
const app = express();

// Enable trust proxy
app.set("trust proxy", 1);

// Security Features
app.use(rateLimiter);
app.use(express.json());
app.use(cors({ origin: ["https://www.make.com", "http://localhost:3001"], methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(morgan("combined"));

// File Splitting Endpoint
app.use('/api/v1/web/auth', authRoutes);
app.use("/api/v1/web/audio", webAudioRoutes);
app.use("/api/v1/console/user", apiKeyAuth, userRoutes);
app.use("/api/v1/console/audio", apiKeyAuth, consoleAudioRoutes);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));