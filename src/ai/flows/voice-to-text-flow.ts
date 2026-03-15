
'use server';
/**
 * @fileOverview A Genkit flow for transcribing voice messages to text.
 * Uses high-performance Gemini 1.5 Flash for audio processing.
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
 * Transcribes voice messages with high accuracy.
 * Handles Russian and English languages automatically.
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
    // We use a powerful system prompt to ensure clean transcription
    const { output } = await ai.generate({
      prompt: [
        { text: "System: You are an expert audio transcription engine. Transcribe the provided audio message accurately. " +
                "Language is primarily Russian or English. Do not add any conversational filler, headers, or explanations. " +
                "If the audio is silent or contains only noise, return '[Звук не распознан]'. " +
                "Transcription:" },
        { media: { url: input.audioDataUri } }
      ],
      output: { schema: VoiceToTextOutputSchema }
    });

    if (!output) {
      throw new Error('Signal lost during transcription processing.');
    }

    return output;
  }
);
