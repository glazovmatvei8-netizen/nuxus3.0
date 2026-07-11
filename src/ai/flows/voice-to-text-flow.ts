
'use server';
/**
 * @fileOverview A Genkit flow for transcribing voice messages to text.
 * Optimized for high-fidelity transcription with retry resilience.
 * V33.1.2: Increased sensitivity for short phrases and noise tolerance.
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
 * Returns "[Звук не распознан]" on clear silence or processing failure.
 */
export async function transcribeVoice(input: VoiceToTextInput): Promise<VoiceToTextOutput> {
  return voiceToTextFlow(input);
}

const voiceToTextPrompt = ai.definePrompt({
  name: 'voiceToTextPrompt',
  input: { schema: VoiceToTextInputSchema },
  output: { schema: VoiceToTextOutputSchema },
  prompt: `You are the advanced neural transcription engine of Nuxus Kernel. 
Task: Convert the provided audio signal into text with maximum sensitivity.

Guidelines:
1. Return ONLY the spoken words.
2. Be extremely sensitive to short phrases (e.g., "Привет", "Да", "Нет", "Ок"). Do NOT treat them as noise.
3. Only return "[Звук не распознан]" if there is absolutely no human speech or the audio is complete silence.
4. Maintain original punctuation and emotional context.
5. Transcribe in the language detected in the audio.

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
      
      if (!output || !output.text.trim() || output.text === 'null') {
        throw new Error('Empty or invalid signal output');
      }

      return output;
    } catch (e: any) {
      console.error("Nuxus Neural Transcription Failure:", e.message || e);
      return { text: "[Звук не распознан]" };
    }
  }
);
