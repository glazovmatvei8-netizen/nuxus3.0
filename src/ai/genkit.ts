import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * NUXUS AI CORE V74.0.0
 * Модель обновлена до Gemini 1.5 Flash для максимальной скорости и расшифровки голоса.
 */
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash',
});
