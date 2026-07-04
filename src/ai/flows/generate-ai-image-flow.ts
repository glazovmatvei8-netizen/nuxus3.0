
'use server';
/**
 * @fileOverview A Genkit flow for generating high-quality AI images from text prompts.
 * Updated to Imagen 3 Fast for better accessibility and free-tier support.
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
 * Generates a high-quality aesthetic image using Imagen 3 Fast.
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
    const enhancedPrompt = `A high-quality, aesthetic, professional digital art of: ${input.prompt}. Cinematic lighting, 4k resolution, clean details, masterpiece style.`;
    
    try {
      const { media } = await ai.generate({
        model: 'googleai/imagen-3-fast',
        prompt: enhancedPrompt,
      });

      if (!media || !media.url) {
        throw new Error('Signal lost during image synthesis.');
      }

      return {
        imageUrl: media.url,
      };
    } catch (err: any) {
      console.error("Imagen 3 Fast Error:", err);
      throw new Error(err.message || "Failed to generate image. Please try again.");
    }
  }
);
