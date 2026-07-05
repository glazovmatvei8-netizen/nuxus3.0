'use server';
/**
 * @fileOverview A Genkit flow for generating high-quality AI images.
 * Optimized for Free Tier quotas using Imagen 3 Fast.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateAiImageInputSchema = z.object({
  prompt: z.string().describe('The description of the image to generate.'),
});
export type GenerateAiImageInput = z.infer<typeof GenerateAiImageInputSchema>;

const GenerateAiImageOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated image.'),
});
export type GenerateAiImageOutput = z.infer<typeof GenerateAiImageOutputSchema>;

/**
 * Synthesizes a high-quality aesthetic image.
 * Uses imagen-3-fast for maximum availability on free quotas.
 */
export async function generateAiImage(input: GenerateAiImageInput): Promise<GenerateAiImageOutput> {
  return generateAiImageFlow(input);
}

const generateAiImageFlow = ai.defineFlow(
  {
    name: 'generateAiImageFlow',
    inputSchema: GenerateAiImageInputSchema,
    outputSchema: GenerateAiImageOutputSchema,
  },
  async (input) => {
    const enhancedPrompt = `High-quality professional digital art: ${input.prompt}. Cinematic lighting, 4k, masterpiece details, aesthetic composition.`;
    
    try {
      const response = await ai.generate({
        model: 'googleai/imagen-3-fast',
        prompt: enhancedPrompt,
      });

      const media = response.media;

      if (!media || !media.url) {
        throw new Error('Signal lost during image synthesis. The AI nodes are busy.');
      }

      return {
        imageUrl: media.url,
      };
    } catch (err: any) {
      console.error("AI Image Generation Error:", err);
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        throw new Error("Квота ИИ исчерпана. Пожалуйста, подождите 60 секунд перед следующим сигналом.");
      }
      throw new Error(`Ошибка синтеза: ${err.message || 'Unknown signal error'}`);
    }
  }
);
