import { aiService } from '@/services/ai-service';

export async function askNexusAI(prompt: string, history: any[] = []) {
  try {
    const text = await aiService.chat(prompt, history);
    return {
      response: text,
      nodeUsed: 'GEMINI-3.8-FLASH',
    };
  } catch (e) {
    console.error('askNexusAI error:', e);
    throw e;
  }
}
