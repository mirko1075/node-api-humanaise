// utils/ffmpegUtils.js
const { exec } = require("child_process");

function splitAudio(inputPath, outputDir, duration, callback) {
    const command = `ffmpeg -i ${inputPath} -f segment -segment_time ${duration} -c copy ${outputDir}/output%03d.wav`;
    exec(command, callback);
}

module.exports = {
    splitAudio,
};