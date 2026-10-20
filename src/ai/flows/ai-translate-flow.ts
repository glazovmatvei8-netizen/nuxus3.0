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
}