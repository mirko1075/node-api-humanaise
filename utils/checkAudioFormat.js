const { exec } = require("child_process");

const checkAudioFormat = (filePath) => {
  return new Promise((resolve, reject) => {
      const command = `ffprobe -i "${filePath}" -show_streams -select_streams a -loglevel error`;
      exec(command, (error, stdout) => {
          if (error) {
              return reject(new Error("Unsupported or corrupt audio file."));
          }
          resolve(stdout);
      });
  });
};

module.exports = checkAudioFormat;