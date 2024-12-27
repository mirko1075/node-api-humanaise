import { SpeechClient } from "@google-cloud/speech";
import fs from "fs";

const credentialsPath = '/etc/secrets/google-credentials.json';

if (!fs.existsSync(credentialsPath)) {
  console.error(`Error: File does not exist at ${credentialsPath}`);
} else {
  console.log('Success: File exists and is accessible.');
}

// Initialize the Google Cloud Speech-to-Text client
const speechClient = new SpeechClient();

const transcribeWithGoogle = async (filePath, options = { translate: false, language: "en" }) => {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const audioBytes = fs.readFileSync(filePath).toString("base64");

        const audio = {
            content: audioBytes,
        };

        const config = {
            encoding: "LINEAR16",
            sampleRateHertz: 16000,
            languageCode: options.language, // Default language code
            
        };

        // Speech-to-Text request
        const request = {
            audio: audio,
            config: config,
        };

        const [response] = await speechClient.recognize(request);

        const transcription = response.results
            .map((result) => result.alternatives[0].transcript)
            .join("\n");

        if (options.translate) {
            const translatedText = await translateText(transcription, options.language);
            return { transcription, translation: translatedText };
        }

        return { transcription };

    } catch (error) {
        console.error("Error during transcription:", error.message);
        throw new Error("Failed to transcribe the audio.");
    }
};

const translateText = async (text, language) => {
    // Stub for translation - replace with a real translation implementation
    console.log(`Translating text to ${language}:`, text);
    return `Translated text in ${language}: ${text}`;
};

export default transcribeWithGoogle;
