const exec = require("child_process").exec;

const convertToWav = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        const command = `ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}"`;
        exec(command, (error) => {
            if (error) return reject(new Error("Failed to convert audio to WAV format."));
            resolve(outputPath);
        });
    });
};

module.exports = convertToWav;