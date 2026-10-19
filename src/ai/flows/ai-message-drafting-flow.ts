<<<<<<< HEAD

'use server';
/**
 * @fileOverview AI Drafting Stub (DEACTIVATED)
 */
export async function suggestMessageDraft(input: any): Promise<{ draftMessage: string }> {
  return { draftMessage: "" };
=======
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
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
}
