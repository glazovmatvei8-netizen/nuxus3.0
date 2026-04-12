
'use server';
/**
 * @fileOverview A Genkit flow for generating AI videos using Veo 3.0 model.
 * Enhanced stability and error handling for V4.0.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const GenerateAiVideoInputSchema = z.object({
  photoDataUri: z.string().describe("The source photo data URI to animate."),
});
export type GenerateAiVideoInput = z.infer<typeof GenerateAiVideoInputSchema>;

const GenerateAiVideoOutputSchema = z.object({
  videoDataUri: z.string().describe("The generated video as a data URI."),
});
export type GenerateAiVideoOutput = z.infer<typeof GenerateAiVideoOutputSchema>;

/**
 * Animates a photo using Veo model.
 * Uses veo-3.0-generate-preview for maximum quality and stability.
 */
export async function generateAiVideo(input: GenerateAiVideoInput): Promise<GenerateAiVideoOutput> {
  return generateAiVideoFlow(input);
}

const generateAiVideoFlow = ai.defineFlow(
  {
    name: 'generateAiVideoFlow',
    inputSchema: GenerateAiVideoInputSchema,
    outputSchema: GenerateAiVideoOutputSchema,
  },
  async (input) => {
    try {
      let { operation } = await ai.generate({
        model: googleAI.model('veo-3.0-generate-preview'),
        prompt: [
          { text: 'cinematic smooth animation, high quality, realistic motion, subtle movement, 4k detail' },
          { media: { url: input.photoDataUri } }
        ],
        config: {
          aspectRatio: '16:9',
          personGeneration: 'allow_all'
        },
      });

      if (!operation) {
        throw new Error('Signal lost: Model did not return an operation.');
      }

      // Polling loop with better exit conditions
      let attempts = 0;
      const maxAttempts = 40; // 40 * 5s = 200 seconds max
      while (!operation.done && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        operation = await ai.checkOperation(operation);
        attempts++;
      }

      if (operation.error) {
        throw new Error('failed to generate video: ' + operation.error.message);
      }

      if (!operation.done) {
        throw new Error('Timeout: Video generation is taking too long. Try again later.');
      }

      const videoPart = operation.output?.message?.content.find((p) => !!p.media);
      if (!videoPart || !videoPart.media?.url) {
        throw new Error('Signal error: Video data not found in model output.');
      }

      const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error("System error: GOOGLE_API_KEY is missing in environment.");
      }

      // Fetch video and convert to data URI
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${videoPart.media.url}&key=${apiKey}`);
      
      if (!response.ok) {
        throw new Error(`Signal error: Failed to fetch generated video (HTTP ${response.status})`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      return {
        videoDataUri: `data:video/mp4;base64,${base64}`,
      };
    } catch (err: any) {
      console.error("Veo 3.0 Error:", err);
      throw new Error(err.message || "Unknown error during video synthesis.");
    }
  }
);
