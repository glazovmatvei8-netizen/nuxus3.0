import { aiService } from '@/services/ai-service';

export async function suggestMessageDraft(input: {
  prompt?: string;
  messages?: { senderName: string; content: string }[];
  tone?: string;
}): Promise<{ draftMessage: string }> {
  try {
    const draftMessage = await aiService.draftMessage(
      input.prompt || '',
      input.messages || [],
      input.tone
    );
    return { draftMessage };
  } catch (e) {
    console.error('suggestMessageDraft error:', e);
    throw e;
  }
}
