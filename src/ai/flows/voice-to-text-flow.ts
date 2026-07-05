'use server';
/**
 * @fileOverview A Genkit flow for transcribing voice messages to text.
 * Uses Gemini 1.5 Flash for high-speed multi-language audio processing.
 *
 * - transcribeVoice - A function that handles the transcription process.
 * - VoiceToTextInput - The input type for the function.
 * - VoiceToTextOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VoiceToTextInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "An audio recording, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type VoiceToTextInput = z.infer<typeof VoiceToTextInputSchema>;

const VoiceToTextOutputSchema = z.object({
  text: z.string().describe("The transcribed text from the audio."),
});
export type VoiceToTextOutput = z.infer<typeof VoiceToTextOutputSchema>;

/**
 * Transcribes voice messages precisely using AI.
 */
export async function transcribeVoice(input: VoiceToTextInput): Promise<VoiceToTextOutput> {
  return voiceToTextFlow(input);
}

const voiceToTextPrompt = ai.definePrompt({
  name: 'voiceToTextPrompt',
  input: { schema: VoiceToTextInputSchema },
  output: { schema: VoiceToTextOutputSchema },
  prompt: `You are an expert transcription engine for the Nuxus messaging app.
Your task is to transcribe the following audio recording exactly as it is spoken.
If the audio is silent or contains only noise, return "[Звук не распознан]".
Audio: {{media url=audioDataUri}}`,
});

const voiceToTextFlow = ai.defineFlow(
  {
    name: 'voiceToTextFlow',
    inputSchema: VoiceToTextInputSchema,
    outputSchema: VoiceToTextOutputSchema,
  },
  async (input) => {
    const { output } = await voiceToTextPrompt(input);
    if (!output) {
      throw new Error('AI failed to transcribe the signal.');
    }
    return output;
  }
);
