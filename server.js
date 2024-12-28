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

dotenv.config();
const app = express();

// Enable trust proxy
app.set("trust proxy", 1);

// Security Features
app.use(rateLimiter);
app.use(express.json()); 
app.use(cors({ origin: ["https://www.make.com"], methods: ["POST", "GET"] }));
app.use(morgan("combined"));

// File Splitting Endpoint
app.use('/v1/web/auth', authRoutes);
app.use("/v1/web/audio", webAudioRoutes);
app.use("/v1/console/user", apiKeyAuth, userRoutes);
app.use("/v1/console/audio", apiKeyAuth, consoleAudioRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));