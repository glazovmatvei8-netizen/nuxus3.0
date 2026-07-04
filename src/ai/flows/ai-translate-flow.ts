
'use server';
/**
 * @fileOverview A Genkit flow for translations.
 * Updated to Genkit 1.x stable API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslateMessageInputSchema = z.object({
  text: z.string(),
  targetLang: z.string().default('Russian'),
});
export type TranslateMessageInput = z.infer<typeof TranslateMessageInputSchema>;

const TranslateMessageOutputSchema = z.object({
  translatedText: z.string(),
});
export type TranslateMessageOutput = z.infer<typeof TranslateMessageOutputSchema>;

export async function translateMessage(input: TranslateMessageInput): Promise<TranslateMessageOutput> {
  return aiTranslateFlow(input);
}

const translatePrompt = ai.definePrompt({
  name: 'translatePrompt',
  input: { schema: TranslateMessageInputSchema },
  output: { schema: TranslateMessageOutputSchema },
  prompt: `Translate to {{{targetLang}}}: {{{text}}}`,
});

const aiTranslateFlow = ai.defineFlow(
  {
    name: 'aiTranslateFlow',
    inputSchema: TranslateMessageInputSchema,
    outputSchema: TranslateMessageOutputSchema,
  },
  async (input) => {
    const { output } = await translatePrompt(input);
    if (!output) throw new Error("AI translation failed.");
    return output;
  }
);
