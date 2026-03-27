
'use server';
/**
 * @fileOverview A Genkit flow for generating high-quality AI images from text prompts.
 * Uses Imagen 4.0 for premium visual synthesis.
 *
 * - generateAiImage - Main function to generate an image.
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
 * Generates a high-quality aesthetic image using Imagen 4.0.
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
    // Enhance the prompt for premium aesthetics
    const enhancedPrompt = `A high-quality, aesthetic, professional digital art of: ${input.prompt}. Cinematic lighting, 4k resolution, clean details, masterpiece style.`;
    
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: enhancedPrompt,
    });

    if (!media || !media.url) {
      throw new Error('Signal lost during image synthesis.');
    }

    return {
      imageUrl: media.url,
    };
  }
);
