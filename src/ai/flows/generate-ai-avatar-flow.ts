
'use server';
/**
 * @fileOverview A Genkit flow for generating a premium AI avatar for Nuxus users.
 * Updated to Imagen 3 Fast for maximum stability.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateAiAvatarOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated AI avatar.'),
});
export type GenerateAiAvatarOutput = z.infer<typeof GenerateAiAvatarOutputSchema>;

/**
 * Generates a high-quality, professional 3D avatar using Imagen 3 Fast.
 */
export async function generateAiAvatar(): Promise<GenerateAiAvatarOutput> {
  return generateAiAvatarFlow();
}

const generateAiAvatarFlow = ai.defineFlow(
  {
    name: 'generateAiAvatarFlow',
    inputSchema: z.void(),
    outputSchema: GenerateAiAvatarOutputSchema,
  },
  async () => {
    const prompt = `A premium, high-quality, aesthetic 3D avatar icon for a futuristic messaging app. Abstract geometric shape, vibrant neon gradients of purple and cyan, glowing edges, glassmorphism style, professional studio lighting, 4k resolution, centered composition, isolated on dark background.`;
    
    try {
      const { media } = await ai.generate({
        model: 'googleai/imagen-3-fast',
        prompt: prompt,
      });

      if (!media) {
        throw new Error('Failed to generate avatar');
      }

      return {
        imageUrl: media.url,
      };
    } catch (e: any) {
      console.error("AI Avatar Error:", e);
      throw new Error("Avatar synthesis restricted or failed. Try again in a moment.");
    }
  }
);
