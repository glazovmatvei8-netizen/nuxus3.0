
'use server';
/**
 * @fileOverview A Genkit flow for translating chat messages using Gemini.
 *
 * - translateMessage - A function that translates text to a target language.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslateMessageInputSchema = z.object({
  text: z.string().describe('The message text to translate.'),
  targetLang: z.string().default('Russian').describe('The target language for translation.'),
});
export type TranslateMessageInput = z.infer<typeof TranslateMessageInputSchema>;

const TranslateMessageOutputSchema = z.object({
  translatedText: z.string().describe('The translated content.'),
});
export type TranslateMessageOutput = z.infer<typeof TranslateMessageOutputSchema>;

export async function translateMessage(input: TranslateMessageInput): Promise<TranslateMessageOutput> {
  return aiTranslateFlow(input);
}

const translatePrompt = ai.definePrompt({
  name: 'translatePrompt',
  input: { schema: TranslateMessageInputSchema },
  output: { schema: TranslateMessageOutputSchema },
  prompt: `You are a high-precision translation engine. 
Translate the following text into {{{targetLang}}}. 
Maintain the original tone, emojis, and formatting. 
If the text is already in {{{targetLang}}}, return it as is.

Text to translate:
{{{text}}}`,
});

const aiTranslateFlow = ai.defineFlow(
  {
    name: 'aiTranslateFlow',
    inputSchema: TranslateMessageInputSchema,
    outputSchema: TranslateMessageOutputSchema,
  },
  async (input) => {
    const { output } = await translatePrompt(input);
    return output!;
  }
);
