import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import process from "node:process";
import rateLimiter from "./middleware/rateLimiter.js";
import apiKeyAuth from "./middleware/apiKeyAuth.js";
import audioRoutes from "./routes/audio.js";

dotenv.config();
const app = express();

// Enable trust proxy
app.set("trust proxy", 1);

// Security Features
app.use(apiKeyAuth);
app.use(rateLimiter);

app.use(cors({ origin: ["https://www.make.com"], methods: ["POST", "GET"] }));
app.use(morgan("combined"));

// File Splitting Endpoint
app.use("/v1/audio", audioRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));