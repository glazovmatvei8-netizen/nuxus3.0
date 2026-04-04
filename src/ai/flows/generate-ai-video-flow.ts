
'use server';
/**
 * @fileOverview A Genkit flow for generating AI videos using Veo model.
 * Optimized for stability and API key validation.
 *
 * - generateAiVideo - A function that animates a static image.
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
 * Uses veo-2.0-generate-001 for broad stability.
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
    // Note: Veo generation can take up to a minute.
    
    let { operation } = await ai.generate({
      model: googleAI.model('veo-2.0-generate-001'),
      prompt: [
        { text: 'cinematic smooth animation, high quality, realistic motion' },
        { media: { url: input.photoDataUri } }
      ],
      config: {
        aspectRatio: '16:9',
        durationSeconds: 5
      },
    });

    if (!operation) {
      throw new Error('Signal lost: Model did not return an operation.');
    }

    // Wait until the operation completes. 
    let attempts = 0;
    while (!operation.done && attempts < 20) {
      operation = await ai.checkOperation(operation);
      if (!operation.done) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      attempts++;
    }

    if (operation.error) {
      throw new Error('failed to generate video: ' + operation.error.message);
    }

    const videoPart = operation.output?.message?.content.find((p) => !!p.media);
    if (!videoPart || !videoPart.media?.url) {
      throw new Error('Signal error: Video data not found in model output.');
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("System error: GOOGLE_GENAI_API_KEY is missing in environment.");
    }

    // Since we need to return a data URI for the client
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
  }
);
