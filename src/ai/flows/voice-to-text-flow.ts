"use server"
/**
 * @fileOverview A Genkit flow for transcribing voice messages to text.
 * V5.8.0: Increased sensitivity and noise cancellation logic.
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
Task: Convert the provided audio signal into text with MAXIMUM SENSITIVITY.

Guidelines:
1. Return ONLY the spoken words.
2. Even if the recording is short (1-2 seconds) or quiet, attempt to recognize words like "Привет", "Да", "Нет", "Слушаю".
3. Filter background white noise and static.
4. Only return "[Звук не распознан]" if there is absolutely no human speech signal.
5. Do NOT add notes like "I can hear..." or "The user said...". Just the text.

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
        throw new Error('Empty signal');
      }

      return output;
    } catch (e: any) {
      console.error("Nuxus Neural Transcription Failure:", e.message || e);
      return { text: "[Звук не распознан]" };
    }
  }
);
