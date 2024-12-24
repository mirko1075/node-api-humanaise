const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const transcribeFile = async (filePath) => {
    try {
        const fileStream = fs.createReadStream(filePath);

        const formData = new FormData();
        formData.append("file", fileStream);
        formData.append("model", "whisper-1"); // Whisper API model
        formData.append("language", "en");    // Set language if known

        const response = await axios.post(process.env.OPENAI_TRANSCRIPTION_URL, formData, {
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                ...formData.getHeaders(),
            },
        });

        return response.data.text; // Return the transcribed text
    } catch (error) {
        console.error("Error transcribing file:", error.response?.data || error.message);
        throw new Error("Failed to transcribe audio.");
    }
};

module.exports = transcribeFile;