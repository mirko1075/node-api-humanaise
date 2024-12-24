const { spawn } = require('child_process');
const fs = require('fs');

async function splitAudioBySizeAndSilence(inputFile, outputPrefix, targetSizeBytes, tolerance = 10) {
  return new Promise((resolve, reject) => {
    // 1. Estimate segment duration
    const getDurationAndBitrate = new Promise((resolveProbe, rejectProbe) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration:stream=bit_rate',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        inputFile
      ]);
      let ffprobeOutput = '';
      ffprobe.stdout.on('data', (data) => {
        ffprobeOutput += data.toString();
      });
      ffprobe.on('close', (code) => {
        if (code !== 0) {
          rejectProbe(new Error(`FFprobe exited with code ${code}`));
          return;
        }
        const [duration, bitrate] = ffprobeOutput.split('\n').map(Number);
        resolveProbe({ duration, bitrate });
      });
    });

    getDurationAndBitrate
      .then(({ duration, bitrate }) => {
        const estimatedDuration = (targetSizeBytes / (bitrate / 8)) * 8;
        const estimatedSplitPoint = Math.floor(estimatedDuration);

        // 2. Detect silence with ffmpeg
        const ffmpeg = spawn('ffmpeg', [
          '-i', inputFile,
          '-af', 'silencedetect=noise=-30dB:d=1', // Detect silences of at least 1 second
          '-f', 'null',
          '-'
        ]);

        let silenceData = '';
        ffmpeg.stderr.on('data', (data) => {
          silenceData += data.toString();
        });

        ffmpeg.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`FFmpeg exited with code ${code}`));
            return;
          }

          // 3. Parse silence detection output
          const silenceTimestamps = silenceData
            .split('\n')
            .filter(line => line.includes('silence_end') || line.includes('silence_start'))
            .map(line => parseFloat(line.split(': ')[1]));

          // 4. Find the most restrictive silence timestamp
          let splitPoint = 0;
          for (let i = 0; i < silenceTimestamps.length; i++) {
            const timestamp = silenceTimestamps[i];
            if (
              timestamp >= estimatedSplitPoint - tolerance &&
              timestamp <= estimatedSplitPoint + tolerance &&
              timestamp > splitPoint
            ) {
              splitPoint = timestamp;
            }
          }

          // 5. Split audio using ffmpeg
          const outputFile = `${outputPrefix}_1.mp3`;
          const splitProcess = spawn('ffmpeg', [
            '-i', inputFile,
            '-to', splitPoint,
            '-c', 'copy',
            outputFile
          ]);

          splitProcess.on('close', (splitCode) => {
            if (splitCode !== 0) {
              reject(new Error(`FFmpeg split exited with code ${splitCode}`));
            } else {
              // Recursively split the remaining part
              console.log(`Split at ${splitPoint}s`);
              splitAudioBySizeAndSilence(inputFile, `${outputPrefix}_`, targetSizeBytes, tolerance)
                .then(resolve)
                .catch(reject);
            }
          });
        });
      })
      .catch(reject);
  });
}

module.exports = splitAudioBySizeAndSilence ;