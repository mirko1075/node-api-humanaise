import axios from 'axios'; // Assuming you're using Whisper through an API
import process from 'node:process';
import dotenv from 'dotenv';
dotenv.config();
export const translateWithWhisper = async (text, language) => {
  try {
      const OPENAI_API_URL = process.env.OPENAI_API_URL;
      const API_KEY = process.env.OPENAI_API_KEY;

      const prompt = `Translate the following text to English:\n\n${text}`;

      const payload = {
          model: 'gpt-4', // Adjust based on your model
          messages: [
              { role: 'system', content: 'You are a translator from ' + language + ' language to English.' },
              { role: 'user', content: prompt },
          ],
      };

      const response = await axios.post(OPENAI_API_URL, payload, {
          headers: {
              Authorization: `Bearer ${API_KEY}`,
              'Content-Type': 'application/json',
          },
      });
      console.log('response.data :>> ', response.data);
      return response.data.choices[0].message.content.trim();
  } catch (error) {
      console.error('Error with GPT translation:', error);
      throw new Error('GPT translation failed.');
  }
};