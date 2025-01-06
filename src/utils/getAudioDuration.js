import ffprobe from 'ffprobe-static';
import ffmpeg from 'fluent-ffmpeg';

/**
 * Get the duration of an audio file in seconds.
 * @param {string} filePath - Path to the audio file.
 * @returns {Promise<number>} - Duration in seconds.
 */
export const getAudioDuration = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(filePath)
            .setFfprobePath(ffprobe.path)
            .ffprobe((err, metadata) => {
                if (err) return reject(err);
                const duration = metadata.format.duration; // Duration in seconds
                resolve(duration);
            });
    });
};

export default getAudioDuration;