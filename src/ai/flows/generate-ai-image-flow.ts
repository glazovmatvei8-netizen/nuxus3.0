
'use server';
/**
 * @fileOverview A Genkit flow for generating high-quality AI images.
 * Updated to Genkit 1.x stable API and stable model.
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
    const enhancedPrompt = `High-quality aesthetic professional digital art: ${input.prompt}. Cinematic lighting, 4k, masterpiece details.`;
    
    try {
      const response = await ai.generate({
        model: 'googleai/imagen-3-fast',
        prompt: enhancedPrompt,
      });

      const media = response.media;

      if (!media || !media.url) {
        throw new Error('Signal lost during image synthesis.');
      }

      return {
        imageUrl: media.url,
      };
    } catch (err: any) {
      console.error("AI Image Generation Error:", err);
      throw new Error("Failed to generate image. Please check API quota.");
    }
  }
);
