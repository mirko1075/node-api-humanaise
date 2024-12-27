import ffmpeg from 'fluent-ffmpeg';

/**
 * Get the duration of an audio file in seconds.
 * @param {string} filePath - Path to the audio file.
 * @returns {Promise<number>} - Duration in seconds.
 */
export function getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                return reject(err);
            }
            const duration = metadata.format.duration; // Duration in seconds
            resolve(duration);
        });
    });
}


export default getAudioDuration;