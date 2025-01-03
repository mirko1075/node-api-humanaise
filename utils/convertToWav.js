import { exec } from "child_process";
import logger from "./logger.js";

const convertToWav = async (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i "${inputPath}" -ac 1 -ar 16000 "${outputPath}"`;
    logger.info("Running FFmpeg command:", command);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error("FFmpeg error:", stderr);
        return reject(new Error("Failed to convert audio to WAV format."));
      }
      resolve();
    });
  });
};

export default convertToWav;