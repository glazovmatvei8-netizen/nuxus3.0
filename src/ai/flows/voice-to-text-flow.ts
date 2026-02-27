
'use server';
/**
 * @fileOverview A Genkit flow for transcribing voice messages to text.
 * Only available for Premium users in the UI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VoiceToTextInputSchema = z.object({
  audioDataUri: z.string().describe("The audio data URI (base64) to transcribe."),
});
export type VoiceToTextInput = z.infer<typeof VoiceToTextInputSchema>;

const VoiceToTextOutputSchema = z.object({
  text: z.string().describe("The transcribed text from the voice message."),
});
export type VoiceToTextOutput = z.infer<typeof VoiceToTextOutputSchema>;

export async function transcribeVoice(input: VoiceToTextInput): Promise<VoiceToTextOutput> {
  return voiceToTextFlow(input);
}

const voiceToTextFlow = ai.defineFlow(
  {
    name: 'voiceToTextFlow',
    inputSchema: VoiceToTextInputSchema,
    outputSchema: VoiceToTextOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      prompt: [
        { text: "Transcribe the following audio message into text. Provide only the transcription, no extra commentary. Language is usually Russian or English." },
        { media: { url: input.audioDataUri } }
      ],
      output: { schema: VoiceToTextOutputSchema }
    });

    if (!output) {
      throw new Error('Failed to transcribe audio');
    }

    return output;
  }
);
