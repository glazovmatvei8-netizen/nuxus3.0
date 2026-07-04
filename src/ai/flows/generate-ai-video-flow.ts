
'use server';
/**
 * @fileOverview A Genkit flow for generating AI videos using Veo model.
 * Updated V2.1: Robust signal fetching and URL signing.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const GenerateAiVideoInputSchema = z.object({
  photoDataUri: z.string().optional().describe("The source photo data URI to animate."),
  prompt: z.string().optional().describe("Description of the video content."),
});
export type GenerateAiVideoInput = z.infer<typeof GenerateAiVideoInputSchema>;

const GenerateAiVideoOutputSchema = z.object({
  videoDataUri: z.string().describe("The generated video as a data URI."),
});
export type GenerateAiVideoOutput = z.infer<typeof GenerateAiVideoOutputSchema>;

/**
 * Animates a photo or generates video from text using the Veo 2.0 model.
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
      const basePrompt = input.prompt || 'cinematic smooth animation, high quality, realistic motion, professional lighting, 4k detail';
      
      const promptParts: any[] = [{ text: basePrompt }];
      if (input.photoDataUri) {
        promptParts.push({ media: { url: input.photoDataUri } });
      }

      // VEO 2.0 is the most stable wide-release cinema model
      let { operation } = await ai.generate({
        model: googleAI.model('veo-2.0-generate-001'),
        prompt: promptParts,
        config: {
          aspectRatio: '16:9',
          durationSeconds: 5,
          personGeneration: 'allow_all'
        },
      });

      if (!operation) {
        throw new Error('Signal lost: Model did not return an operation.');
      }

      let attempts = 0;
      const maxAttempts = 60; 
      while (!operation.done && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        operation = await ai.checkOperation(operation);
        attempts++;
      }

      if (operation.error) {
        throw new Error('failed to generate video: ' + operation.error.message);
      }

      if (!operation.done) {
        throw new Error('Timeout: Video generation is taking too long. Synthesis aborted.');
      }

      const videoPart = operation.output?.message?.content.find((p) => !!p.media);
      if (!videoPart || !videoPart.media?.url) {
        throw new Error('Signal error: Video data not found in model output.');
      }

      const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error("System error: GOOGLE_API_KEY is missing in environment.");
      }

      // CRITICAL FIX: Ensure correct parameter joining for API key
      const videoUrl = videoPart.media.url;
      const separator = videoUrl.includes('?') ? '&' : '?';
      const signedUrl = `${videoUrl}${separator}key=${apiKey}`;

      const fetch = (await import('node-fetch')).default;
      const response = await fetch(signedUrl);
      
      if (!response.ok) {
        throw new Error(`Signal error: Failed to fetch generated video (HTTP ${response.status})`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      return {
        videoDataUri: `data:video/mp4;base64,${base64}`,
      };
    } catch (err: any) {
      console.error("Veo 2.0 Cinema Error:", err);
      throw new Error(err.message || "Unknown error during video synthesis.");
    }
  }
);
