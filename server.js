const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config(); // To use environment variables

const app = express();
const upload = multer({ dest: "uploads/" });

// ---------------------- Security Features ---------------------- //

// 1. API Key Authentication
app.use((req, res, next) => {
    const apiKey = req.header("x-api-key");
    console.log('apiKey :>> ', apiKey, process.env.API_KEY);
    if (apiKey !== process.env.API_KEY) {
        return res.status(403).send({ error: "Unauthorized" });
    }
    console.log('authorized')
    next();
});

// 2. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: "Too many requests, please try again later.",
});
app.use(limiter);

// 3. CORS
const corsOptions = {
    origin: ["https://www.make.com", "http://localhost"], // Allow requests only from Make.com
    methods: ["POST", "GET"],
};
app.use(cors(corsOptions));

// 4. Logging
app.use(morgan("combined")); // Log all requests

// ---------------------- File Splitting Endpoint ---------------------- //

app.post("/split-audio", upload.single("file"), (req, res) => {
    const inputPath = req.file.path;
    const outputDir = `output/${Date.now()}`;
    const duration = req.body.duration || 30; // Default to 30 seconds

    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true });

    // FFmpeg command to split the file
    const command = `ffmpeg -i ${inputPath} -f segment -segment_time ${duration} -c copy ${outputDir}/output%03d.wav`;

    exec(command, (error) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).send({ error: error.message });
        }

        // Create a zip file
        const zipPath = `${outputDir}.zip`;
        const archive = archiver("zip", { zlib: { level: 9 } });
        const output = fs.createWriteStream(zipPath);

        archive.pipe(output);
        archive.directory(outputDir, false);
        archive.finalize();

        output.on("close", () => {
            try {
                // Convert zipPath to an absolute path
                const absoluteZipPath = path.resolve(zipPath);

                // Send the zip file to the client
                res.sendFile(absoluteZipPath, (err) => {
                    if (err) {
                        console.error("Error sending file:", err);
                        return res.status(500).send("Error sending file.");
                    }

                    // Cleanup after sending the file
                    fs.unlinkSync(absoluteZipPath);
                    fs.rmSync(inputPath, { force: true });
                    fs.rmSync(outputDir, { recursive: true, force: true });
                });
            } catch (err) {
                console.error("Error during cleanup:", err);
                res.status(500).send("Error during cleanup.");
            }
        });
    });
});

// ---------------------- Start the Server ---------------------- //

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
