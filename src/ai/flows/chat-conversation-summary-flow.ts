'use server';
/**
 * @fileOverview A Genkit flow for summarizing chat conversations.
 *
 * - chatConversationSummary - A function that provides a concise summary of chat messages.
 * - ChatConversationSummaryInput - The input type for the chatConversationSummary function.
 * - ChatConversationSummaryOutput - The return type for the chatConversationSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/**
 * Schema for the input of the chatConversationSummary flow.
 */
const ChatConversationSummaryInputSchema = z.object({
  chatMessages: z.array(z.object({
    senderName: z.string().describe('The name of the message sender.'),
    text: z.string().describe('The content of the message.'),
  })).describe('An array of chat messages to summarize, each with sender and text.'),
});
export type ChatConversationSummaryInput = z.infer<typeof ChatConversationSummaryInputSchema>;

/**
 * Schema for the output of the chatConversationSummary flow.
 */
const ChatConversationSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the chat conversation.'),
});
export type ChatConversationSummaryOutput = z.infer<typeof ChatConversationSummaryOutputSchema>;

/**
 * Summarizes a given set of chat messages.
 * @param input - The chat messages to summarize.
 * @returns A concise summary of the conversation.
 */
export async function chatConversationSummary(
  input: ChatConversationSummaryInput
): Promise<ChatConversationSummaryOutput> {
  return chatConversationSummaryFlow(input);
}

/**
 * Defines a prompt for summarizing chat conversations.
 */
const summarizeConversationPrompt = ai.definePrompt({
  name: 'summarizeConversationPrompt',
  input: { schema: ChatConversationSummaryInputSchema },
  output: { schema: ChatConversationSummaryOutputSchema },
  prompt: `You are an AI assistant tasked with summarizing chat conversations.
Given a list of chat messages, provide a concise summary of the discussion.

Conversation:
{{#each chatMessages}}
{{{senderName}}}: {{{text}}}
{{/each}}

Please summarize the conversation in a concise manner.`,
});

/**
 * Defines the Genkit flow for summarizing chat conversations.
 */
const chatConversationSummaryFlow = ai.defineFlow(
  {
    name: 'chatConversationSummaryFlow',
    inputSchema: ChatConversationSummaryInputSchema,
    outputSchema: ChatConversationSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeConversationPrompt(input);
    return output!;
  }
);
