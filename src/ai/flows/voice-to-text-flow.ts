
"use server"
/**
 * @fileOverview A Genkit flow for transcribing voice messages to text.
 * V78.0.0: Ultra-sensitive mode for short and quiet signals.
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
 * Updated V78.0.0: Extreme sensitivity for 1-second signals.
 */
export async function transcribeVoice(input: VoiceToTextInput): Promise<VoiceToTextOutput> {
  return voiceToTextFlow(input);
}

const voiceToTextPrompt = ai.definePrompt({
  name: 'voiceToTextPrompt',
  input: { schema: VoiceToTextInputSchema },
  output: { schema: VoiceToTextOutputSchema },
  prompt: `You are the neural heart of Nuxus Kernel. 
Task: Convert audio to text with MAXIMUM SENSITIVITY.

STRICT RULES:
1. Even if the clip is only 0.5 - 1 second, extract the meaning (e.g., "Да", "Нет", "Привет", "Ок").
2. Listen through the silence and static noise. 
3. If human speech is present, return ONLY the text.
4. If there is absolutely zero human speech, return "[Сигнал не распознан]".
5. Don't add your own comments. Just transcription.

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
      
      if (!output || !output.text.trim() || output.text.toLowerCase().includes('null')) {
        throw new Error('Neural gap');
      }

      return output;
    } catch (e: any) {
      console.error("Nuxus V78.0 Transcription Failure:", e.message || e);
      return { text: "[Сигнал не распознан]" };
    }
  }
);
