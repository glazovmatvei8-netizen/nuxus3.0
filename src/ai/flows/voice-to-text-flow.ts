
"use server"
/**
 * @fileOverview A Genkit flow for transcribing voice messages to text.
 * V5.9.0: Ultra-sensitive mode for short and quiet signals.
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
 * Updated V5.9.0: Enhanced for 1-2 second clips.
 */
export async function transcribeVoice(input: VoiceToTextInput): Promise<VoiceToTextOutput> {
  return voiceToTextFlow(input);
}

const voiceToTextPrompt = ai.definePrompt({
  name: 'voiceToTextPrompt',
  input: { schema: VoiceToTextInputSchema },
  output: { schema: VoiceToTextOutputSchema },
  prompt: `You are the neural heart of Nuxus Kernel. 
Task: Convert audio to text with ABSOLUTE SENSITIVITY.

STRICT RULES:
1. Even if the clip is 1 second, try to hear: "Да", "Нет", "Ок", "Чё".
2. If there is even a faint whisper, transcribe it.
3. Ignore static noise but DON'T ignore quiet human speech.
4. If you hear absolutely nothing human, return "[Сигнал не распознан]".
5. Only return the text, no explanations.

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
      
      if (!output || !output.text.trim() || output.text === 'null' || output.text.includes('null')) {
        throw new Error('Neural gap');
      }

      return output;
    } catch (e: any) {
      console.error("Nuxus V5.9 Transcription Failure:", e.message || e);
      return { text: "[Сигнал не распознан]" };
    }
  }
);
