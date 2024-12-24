import express from "express";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import translateWithWhisper from "../utils/transcribe-whisper.js";
import convertToWav from "../utils/convertToWav.js";
import detectLanguage from "../utils/detectLanguage.js";
import archiver from "archiver";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Route: Split Audio
router.post("/split-audio", upload.single("file"), async (req, res) => {
    const inputPath = req.file.path;
    const outputDir = `output/${Date.now()}`;
    const duration = req.body.duration || 30;

    try {
        // Create output directory
        fs.mkdirSync(outputDir, { recursive: true });

        // FFmpeg command to split audio
        const command = `ffmpeg -i ${inputPath} -f segment -segment_time ${duration} -c copy ${outputDir}/output%03d.wav`;

        await new Promise((resolve, reject) => {
            exec(command, (error) => {
                if (error) return reject(error);
                resolve();
            });
        });

        // Create a zip file
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

                // Cleanup
                fs.unlinkSync(absoluteZipPath);
                fs.rmSync(outputDir, { recursive: true, force: true });
                fs.rmSync(inputPath, { force: true });
            });
        });
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send({ error: "Failed to process audio file" });
    }
});

// Route: Split and Transcribe
router.post("/split-transcribe", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded");
    }

    let inputPath = req.file.path;
    const outputDir = `output/${Date.now()}`;
    const duration = req.body.duration || 5000;
    const language = req.body.language || "en";

    try {
        // Check if input is already a WAV file
        if (!inputPath.endsWith(".wav")) {
            console.log("Converting input file to WAV...");
            const wavPath = `${inputPath}.wav`;
            await convertToWav(inputPath, wavPath);
            fs.unlinkSync(inputPath); // Remove original file
            inputPath = wavPath;
        }

        // Create output directory
        fs.mkdirSync(outputDir, { recursive: true });

        // FFmpeg command to split audio
        const command = `ffmpeg -i "${inputPath}" -f segment -segment_time ${duration} -c copy ${outputDir}/output%03d.wav`;

        await new Promise((resolve, reject) => {
            exec(command, (error) => {
                if (error) return reject(error);
                resolve();
            });
        });

        // Transcribe each file
        const files = fs.readdirSync(outputDir).filter((file) => file.endsWith(".wav"));
        const transcriptions = [];
        for (const file of files) {
            const filePath = path.join(outputDir, file);
            const transcription = await translateWithWhisper(filePath, language); // No conversion here
            transcriptions.push({ file: file, transcription });
        }
        const transcription = transcriptions.map((t) => t.transcription).join("\n");
        // Cleanup
        fs.rmSync(inputPath, { force: true });
        fs.rmSync(outputDir, { recursive: true, force: true });

        // Return combined transcriptions
        res.json({
            message: "Transcription completed successfully",
            transcriptions,
            transcription
        });
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send({ error: "Failed to process audio file" });
    }
});

router.post("/detect-language", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded");
    }

    let inputPath = req.file.path;
    try {
        if (!inputPath.endsWith(".wav")) {
            console.log("Converting input file to WAV...");
            const wavPath = `${inputPath}.wav`;
            await convertToWav(inputPath, wavPath);
            fs.unlinkSync(inputPath); // Remove original file
            inputPath = wavPath;
        }

        const snippetPath = `${inputPath}_snippet.wav`;
        // Extract the first half minute using FFmpeg
        const command = `ffmpeg -i "${inputPath}" -t 30 -c copy "${snippetPath}"`;
        await new Promise((resolve, reject) => {
            exec(command, (error) => {
                if (error) return reject(error);
                resolve();
            });
        });

        const { detectedLanguage, languageConfidence } = await detectLanguage(snippetPath);

        // Cleanup
        fs.unlinkSync(inputPath);
        fs.unlinkSync(snippetPath);

        res.json({
            message: "Language detected successfully",
            language: detectedLanguage,
            confidence: languageConfidence,
        });
    } catch (error) {
        console.error("Error detecting language:", error);
        res.status(500).send({ error: "Failed to detect language" });
    }
});

export default router;
