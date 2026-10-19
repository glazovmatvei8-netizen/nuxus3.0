<<<<<<< HEAD

'use server';
/**
 * @fileOverview AI Summary Stub (DEACTIVATED)
 */

export async function chatConversationSummary(input: any): Promise<{ summary: string }> {
  return { summary: "Система ИИ отключена." };
=======
import { aiService } from '@/services/ai-service';

export async function chatConversationSummary(input: {
  messages: { senderName: string; content: string }[];
}): Promise<{ summary: string }> {
  try {
    const summary = await aiService.summarizeChat(input.messages || []);
    return { summary };
  } catch (e) {
    console.error('chatConversationSummary error:', e);
    throw e;
  }
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
}
