<<<<<<< HEAD

'use server';
/**
 * NX-AI ANNIHILATED V65.0
 * Все нейронные узлы стерты из Ядра навсегда.
 */
export async function askNexusAI(prompt: string, history: any[] = []) {
  return {
    response: "AI Node Annihilated",
    nodeUsed: "NONE"
  };
=======
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
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
}
