import axios from "axios";
import { createReadStream } from "fs";

const detectLanguage = async (filePath) => {
  console.log("Detecting language with Deepgram for file:", filePath);
  try {
      const fileStream = createReadStream(filePath);

      const response = await axios.post("https://api.deepgram.com/v1/listen", fileStream, {
          headers: {
              // eslint-disable-next-line no-undef
              "Authorization": `Token ${process.env.DEEPGRAM_API_KEY}`,
              "Content-Type": "audio/wav",
          },
          params: {
              detect_language: true,
          },
      });

      // Extract the detected language and confidence
      const detectedLanguage = response.data.results.channels[0].detected_language;
      const languageConfidence = response.data.results.channels[0].language_confidence;
      const languageCode = response.data.results.channels[0].languageCode;
      console.log('response.data.results.channels[0] :>> ', response.data.results.channels[0]);
      console.log("Detected language:", detectedLanguage, "Confidence:", languageConfidence);
      return { detectedLanguage, languageConfidence, languageCode }; // Return both detected language and confidence
  } catch (error) {
      console.error("Error in Deepgram detection:", error.response?.data || error.message);
      throw new Error("Failed to detect language.");
  }
};

export default detectLanguage;
