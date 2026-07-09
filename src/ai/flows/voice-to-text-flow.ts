
'use server';
/**
 * @fileOverview A Genkit flow for transcribing voice messages to text.
 * Optimized for high-fidelity transcription with retry resilience.
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
  prompt: `You are the neural transcription engine of Nuxus Kernel. 
Task: Convert the provided audio signal into text with maximum accuracy.

Guidelines:
1. Return ONLY the spoken words.
2. If there is background noise but no clear human speech, return "[Звук не распознан]".
3. If the audio is completely silent, return "[Звук не распознан]".
4. Maintain punctuation and emotional intent.
5. If the language is not Russian, transcribe it in the detected language.

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
      
      if (!output || !output.text.trim()) {
        throw new Error('Empty signal output');
      }

      return output;
    } catch (e: any) {
      console.error("Nuxus Neural Transcription Failure:", e.message || e);
      // We return the specific placeholder so the UI can offer a retry
      return { text: "[Звук не распознан]" };
    }
  }
);
