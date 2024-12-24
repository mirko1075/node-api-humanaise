const { exec } = require('child_process');

const validateAudioContent = async (filePath) => {
    const command = `ffmpeg -i "${filePath}" -af volumedetect -f null /dev/null`;
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            const volumeMatch = stderr.match(/mean_volume:\s*(-?\d+(\.\d+)?)/);
            if (volumeMatch) {
                const meanVolume = parseFloat(volumeMatch[1]);
                resolve(meanVolume > -50); // Skip files with volume below -50dB.
            } else {
                resolve(false);
            }
        });
    });
};


module.exports = validateAudioContent;