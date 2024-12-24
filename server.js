const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const upload = multer({ dest: "uploads/" });

// Enable trust proxy
app.set("trust proxy", 1);

// Security Features
app.use((req, res, next) => {
    const apiKey = req.header("x-api-key");
    if (apiKey !== process.env.API_KEY) {
        return res.status(403).send({ error: "Unauthorized" });
    }
    next();
});

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests, please try again later.",
});
app.use(limiter);

app.use(cors({ origin: ["https://www.make.com"], methods: ["POST", "GET"] }));
app.use(morgan("combined"));

// File Splitting Endpoint
app.post("/split-audio", upload.single("file"), (req, res) => {
    const inputPath = req.file.path;
    const outputDir = `output/${Date.now()}`;
    const duration = req.body.duration || 30;

    fs.mkdirSync(outputDir, { recursive: true });

    const command = `ffmpeg -i ${inputPath} -f segment -segment_time ${duration} -c copy ${outputDir}/output%03d.wav`;

    exec(command, (error) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).send({ error: error.message });
        }

        const zipPath = `${outputDir}.zip`;
        const archive = archiver("zip", { zlib: { level: 9 } });
        const output = fs.createWriteStream(zipPath);

        archive.pipe(output);
        archive.directory(outputDir, false);
        archive.finalize();

        output.on("close", () => {
            const absoluteZipPath = path.resolve(zipPath);

            res.sendFile(absoluteZipPath, (err) => {
                if (err) {
                    console.error("Error sending file:", err);
                    return res.status(500).send("Error sending file.");
                }

                fs.unlinkSync(absoluteZipPath);
                fs.rmSync(outputDir, { recursive: true, force: true });
                fs.rmSync(inputPath, { force: true });
            });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
