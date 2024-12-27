import { v2 as TranslateV2 } from '@google-cloud/translate';

const googleTranslate = new TranslateV2.Translate();

export const translateWithGoogle = async (text, targetLanguage) => {
    try {
        const [translation] = await googleTranslate.translate(text, targetLanguage);
        return translation;
    } catch (error) {
        console.error('Error with Google Translate:', error);
        throw new Error('Google Translate failed.');
    }
};