'use server';
/**
 * @fileOverview A Genkit flow for generating AI videos using Veo 2.0.
 * Optimized for stable polling and quota efficiency.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const GenerateAiVideoInputSchema = z.object({
  photoDataUri: z.string().optional().describe("Reference image as data URI."),
  prompt: z.string().optional().describe("Text description for the video."),
});
export type GenerateAiVideoInput = z.infer<typeof GenerateAiVideoInputSchema>;

const GenerateAiVideoOutputSchema = z.object({
  videoDataUri: z.string().describe("The generated MP4 video as a data URI."),
});
export type GenerateAiVideoOutput = z.infer<typeof GenerateAiVideoOutputSchema>;

/**
 * Synthesizes cinematic video using Veo 2.0 model.
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
    const basePrompt = input.prompt || 'cinematic motion, smooth animation, high quality, 4k, aesthetic';
    
    const promptParts: any[] = [{ text: basePrompt }];
    if (input.photoDataUri) {
      promptParts.push({ media: { url: input.photoDataUri } });
    }

    try {
      let { operation } = await ai.generate({
        model: googleAI.model('veo-2.0-generate-001'),
        prompt: promptParts,
        config: {
          aspectRatio: '16:9',
          durationSeconds: 5,
        },
      });

      if (!operation) {
        throw new Error('Signal lost: Model did not return an operation.');
      }

      // Polling for completion with increased delay to respect quotas
      let attempts = 0;
      while (!operation.done && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 8000)); // 8s delay between checks
        operation = await ai.checkOperation(operation);
        attempts++;
      }

      if (operation.error) {
        throw new Error('Failed to generate video: ' + operation.error.message);
      }

      const videoPart = operation.output?.message?.content.find((p) => !!p.media);
      if (!videoPart || !videoPart.media?.url) {
        throw new Error('Signal error: Video data not found.');
      }

      const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
      const baseUrl = videoPart.media.url;
      const signedUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}key=${apiKey}`;

      const fetch = (await import('node-fetch')).default;
      const response = await fetch(signedUrl);
      
      if (!response.ok) {
        throw new Error(`Signal error: Failed to fetch video (${response.status})`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      return {
        videoDataUri: `data:video/mp4;base64,${base64}`,
      };
    } catch (err: any) {
      console.error("AI Video Error:", err);
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        throw new Error("Лимит видео-квот исчерпан. Попробуйте через несколько минут.");
      }
      throw err;
    }
  }
);
