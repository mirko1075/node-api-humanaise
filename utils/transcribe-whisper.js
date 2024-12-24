const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const translateWithWhisper = async (filePath) => {
  try {
    console.log("Transcribing file:", filePath);

    // Send the WAV file to Whisper
    const fileStream = fs.createReadStream(filePath);
    const formData = new FormData();
    formData.append("file", fileStream);
    formData.append("model", "whisper-1");
    formData.append("language", "de"); // Replace 'de' with desired language
    formData.append("temperature", 0.5);  // Sampling temperature
    formData.append("prompt", "This is an audio transcription task.");

    const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", formData, {
        headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            ...formData.getHeaders(),
        },
    });

    return response.data.text;
} catch (error) {
    console.error("Error transcribing file:", error.response?.data || error.message);
    throw new Error("Failed to transcribe audio.");
}
};

module.exports = translateWithWhisper;