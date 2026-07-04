
'use server';
/**
 * @fileOverview A Genkit flow for generating AI message drafts.
 * Updated to Genkit 1.x stable API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestDraftInputSchema = z.object({
  conversationHistory: z.array(
    z.object({
      sender: z.string(),
      message: z.string(),
    })
  ),
  currentUserInput: z.string(),
});
export type SuggestDraftInput = z.infer<typeof SuggestDraftInputSchema>;

const SuggestDraftOutputSchema = z.object({
  draftMessage: z.string().describe('The suggested message draft.'),
});
export type SuggestDraftOutput = z.infer<typeof SuggestDraftOutputSchema>;

export async function suggestMessageDraft(input: SuggestDraftInput): Promise<SuggestDraftOutput> {
  return aiMessageDraftingFlow(input);
}

const aiMessageDraftingPrompt = ai.definePrompt({
  name: 'aiMessageDraftingPrompt',
  input: { schema: SuggestDraftInputSchema },
  output: { schema: SuggestDraftOutputSchema },
  prompt: `Based on history:
{{#each conversationHistory}}
{{this.sender}}: {{this.message}}
{{/each}}
Current: {{{currentUserInput}}}
Suggest concise natural reply.`,
});

const aiMessageDraftingFlow = ai.defineFlow(
  {
    name: 'aiMessageDraftingFlow',
    inputSchema: SuggestDraftInputSchema,
    outputSchema: SuggestDraftOutputSchema,
  },
  async (input) => {
    const { output } = await aiMessageDraftingPrompt(input);
    if (!output) throw new Error("AI failed to draft message.");
    return output;
  }
);
