'use server';
/**
 * @fileOverview A Genkit flow for generating a premium AI avatar for NuxusChat users.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateAiAvatarOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated AI avatar.'),
});
export type GenerateAiAvatarOutput = z.infer<typeof GenerateAiAvatarOutputSchema>;

/**
 * Generates a high-quality, professional 3D avatar using Imagen.
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
    const prompt = `A premium, high-quality, aesthetic 3D avatar icon for a tech messaging app. Abstract futuristic geometric shape, vibrant deep blue and purple gradients, glowing edges, glassmorphism style, professional studio lighting, 4k resolution, centered composition, isolated on dark background.`;
    
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: prompt,
    });

    if (!media) {
      throw new Error('Failed to generate avatar');
    }

    return {
      imageUrl: media.url,
    };
  }
);
