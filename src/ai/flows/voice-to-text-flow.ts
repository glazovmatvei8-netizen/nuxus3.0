
'use server';
/**
 * @fileOverview A Genkit flow for transcribing voice messages to text.
 * Uses Gemini 1.5 Flash for high-speed multi-language audio processing.
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

/**
 * Transcribes voice messages accurately.
 */
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
        { text: "System: You are an expert transcription engine. Transcribe the audio precisely. If there is no speech, return '[Звук не распознан]'." },
        { media: { url: input.audioDataUri } }
      ],
      output: { schema: VoiceToTextOutputSchema }
    });

    if (!output) {
      throw new Error('Signal lost during processing.');
    }

    return output;
  }
);
