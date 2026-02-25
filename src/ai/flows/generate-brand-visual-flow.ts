'use server';
/**
 * @fileOverview A Genkit flow for generating a conceptual brand image for NuxusChat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateBrandVisualInputSchema = z.object({
  promptSuffix: z.string().optional().describe('Optional details to add to the generation prompt.'),
});
export type GenerateBrandVisualInput = z.infer<typeof GenerateBrandVisualInputSchema>;

const GenerateBrandVisualOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated brand visual.'),
});
export type GenerateBrandVisualOutput = z.infer<typeof GenerateBrandVisualOutputSchema>;

/**
 * Generates a high-quality brand visual using Imagen.
 */
export async function generateBrandVisual(input: GenerateBrandVisualInput): Promise<GenerateBrandVisualOutput> {
  return generateBrandVisualFlow(input);
}

const generateBrandVisualFlow = ai.defineFlow(
  {
    name: 'generateBrandVisualFlow',
    inputSchema: GenerateBrandVisualInputSchema,
    outputSchema: GenerateBrandVisualOutputSchema,
  },
  async (input) => {
    const prompt = `A professional, high-quality, aesthetic 3D render of a futuristic mobile messaging app interface named NuxusChat. Deep blue and purple theme, vibrant glassmorphism effects, clean typography, glowing message bubbles, floating 3D icons, premium feel, 4k resolution. ${input.promptSuffix || ''}`;
    
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: prompt,
    });

    if (!media) {
      throw new Error('Failed to generate brand visual');
    }

    return {
      imageUrl: media.url,
    };
  }
);
