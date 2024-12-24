const { exec } = require("child_process");

const getAudioDuration = (filePath) => {
  return new Promise((resolve, reject) => {
      const command = `ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv="p=0"`;
      exec(command, (error, stdout) => {
          if (error) {
              return reject(new Error("Failed to get audio duration."));
          }
          resolve(parseFloat(stdout.trim())); // Duration in seconds
      });
  });
};

module.exports = getAudioDuration;