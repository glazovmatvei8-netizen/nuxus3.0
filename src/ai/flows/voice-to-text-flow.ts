
'use server';
/**
 * @fileOverview A Genkit flow for transcribing voice messages to text.
 * Optimized for high-speed multi-language processing.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VoiceToTextInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "An audio recording, as a data URI that must include a MIME type and use Base64 encoding."
    ),
});
export type VoiceToTextInput = z.infer<typeof VoiceToTextInputSchema>;

const VoiceToTextOutputSchema = z.object({
  text: z.string().describe("The transcribed text from the audio."),
});
export type VoiceToTextOutput = z.infer<typeof VoiceToTextOutputSchema>;

/**
 * Transcribes voice messages precisely using AI.
 * Guaranteed to return [Звук не распознан] on fail.
 */
export async function transcribeVoice(input: VoiceToTextInput): Promise<VoiceToTextOutput> {
  return voiceToTextFlow(input);
}

const voiceToTextPrompt = ai.definePrompt({
  name: 'voiceToTextPrompt',
  input: { schema: VoiceToTextInputSchema },
  output: { schema: VoiceToTextOutputSchema },
  prompt: `You are an integrated neural module of the Nuxus communication system. 
Transcribe this signal with 100% fidelity. 
- Ignore background hum or static.
- Return only the text spoken.
- If audio is silent, return "[Звук не распознан]".
- Preserve the emotional tone and punctuation.

Audio Signal: {{media url=audioDataUri}}`,
});

const voiceToTextFlow = ai.defineFlow(
  {
    name: 'voiceToTextFlow',
    inputSchema: VoiceToTextInputSchema,
    outputSchema: VoiceToTextOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await voiceToTextPrompt(input);
      if (!output) throw new Error('Empty signal');
      return output;
    } catch (e) {
      console.warn("Nuxus Neural: Transcription node timeout.");
      return { text: "[Звук не распознан]" };
    }
  }
);
