<<<<<<< HEAD

'use server';
/**
 * @fileOverview AI Translation Stub (DEACTIVATED)
 */
export async function translateMessage(input: any): Promise<{ translatedText: string }> {
  return { translatedText: input.text || "" };
=======
import { aiService } from '@/services/ai-service';

export async function translateMessage(input: {
  text: string;
  targetLang?: string;
}): Promise<{ translatedText: string }> {
  try {
    const translatedText = await aiService.translate(
      input.text || '',
      input.targetLang || 'русский'
    );
    return { translatedText };
  } catch (e) {
    console.error('translateMessage error:', e);
    throw e;
  }
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
}
