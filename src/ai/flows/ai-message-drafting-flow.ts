'use server';
/**
 * @fileOverview A Genkit flow for generating AI message drafts based on conversation context.
 *
 * - suggestMessageDraft - A function that suggests a message draft or reply.
 * - SuggestDraftInput - The input type for the suggestMessageDraft function.
 * - SuggestDraftOutput - The return type for the suggestMessageDraft function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestDraftInputSchema = z.object({
  conversationHistory: z.array(
    z.object({
      sender: z.string().describe('The name or identifier of the message sender.'),
      message: z.string().describe('The content of the message.'),
    })
  ).describe('A list of recent messages in the conversation to provide context.'),
  currentUserInput: z.string().describe('The current partial message the user has typed.'),
});
export type SuggestDraftInput = z.infer<typeof SuggestDraftInputSchema>;

const SuggestDraftOutputSchema = z.object({
  draftMessage: z.string().describe('The suggested message draft or reply.'),
});
export type SuggestDraftOutput = z.infer<typeof SuggestDraftOutputSchema>;

export async function suggestMessageDraft(input: SuggestDraftInput): Promise<SuggestDraftOutput> {
  return aiMessageDraftingFlow(input);
}

const aiMessageDraftingPrompt = ai.definePrompt({
  name: 'aiMessageDraftingPrompt',
  input: { schema: SuggestDraftInputSchema },
  output: { schema: SuggestDraftOutputSchema },
  prompt: `You are a helpful assistant that suggests message drafts for a chat application.
Based on the following conversation history and the user's current input, suggest a contextually relevant message draft.

Conversation History:
{{#each conversationHistory}}
{{this.sender}}: {{this.message}}
{{/each}}

User's current input: {{{currentUserInput}}}

Suggest a draft message that completes or expands on the user's input, or provides a relevant reply to the last message in the conversation.
Be concise and natural. Only output the suggested message, nothing else.`,
});

const aiMessageDraftingFlow = ai.defineFlow(
  {
    name: 'aiMessageDraftingFlow',
    inputSchema: SuggestDraftInputSchema,
    outputSchema: SuggestDraftOutputSchema,
  },
  async (input) => {
    const { output } = await aiMessageDraftingPrompt(input);
    return output!;
  }
);
