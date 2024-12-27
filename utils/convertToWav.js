import { exec } from "child_process";

const convertToWav = async (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        const command = `ffmpeg -i "${inputPath}" -ac 1 -ar 16000 "${outputPath}"`;
        console.log("Running FFmpeg command:", command);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("FFmpeg error:", stderr);
                return reject(new Error("Failed to convert audio to WAV format."));
            }
            //console.log("FFmpeg output:", stdout);
            resolve();
        });
    });
};

export default convertToWav;