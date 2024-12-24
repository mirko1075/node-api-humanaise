import { exec } from "child_process";

const convertToWav = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        const command = `ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}"`;
        exec(command, (error) => {
            if (error) return reject(new Error("Failed to convert audio to WAV format."));
            console.log('outputPath :>> ', outputPath);
            const fileName = outputPath.split('/').pop();
            resolve({fileName, file:outputPath});
        });
    });
};

export default convertToWav;