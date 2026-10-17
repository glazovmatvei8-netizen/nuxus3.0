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
}
