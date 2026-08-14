
'use server';
/**
 * NX-AI Neural Nexus Flow v4.0
 * ПОДДЕРЖКА: Yandex AI Studio (Agent Integration).
 * МОДЕЛЬ: DeepSeek 4 Flash (через Agent ID).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import OpenAI from 'openai';

const IntelligenceInputSchema = z.object({
  prompt: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string()
  })).optional(),
});

const IntelligenceOutputSchema = z.object({
  response: z.string(),
  nodeUsed: z.string(),
});

/**
 * Основная функция вызова ИИ. 
 */
export async function askNexusAI(prompt: string, history: any[] = []) {
  return nuxusIntelligenceFlow({ prompt, history });
}

/**
 * ПРЯМОЙ ВЫЗОВ ВАШЕГО АГЕНТА ИЗ YANDEX AI STUDIO
 * Код адаптирован строго под ваш скриншот.
 */
async function callYandexAgent(promptText: string) {
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_PROJECT_ID || 'b1gjfj178i38ae393ieb';
  const agentId = 'fvt6koqsf13kvd2bkrmc';

  if (!apiKey || apiKey.trim() === '') {
    return "ОШИБКА: API ключ Yandex не найден. Пожалуйста, пропишите его в .env";
  }

  try {
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://ai.api.cloud.yandex.net/v1',
      defaultHeaders: {
        'OpenAI-Project': folderId
      }
    });

    /**
     * ВЫЗОВ АГЕНТА (Custom Yandex Cloud Method)
     * Используем принудительное приведение типов, так как SDK OpenAI 
     * официально не знает о методе .responses, но он работает в Yandex.
     */
    const response = await (client as any).responses.create({
      prompt: {
        id: agentId
      },
      input: promptText
    });

    // Результат берем из output_text, как на вашем фото
    return response.output_text || "Сигнал получен, но расшифровка пуста.";
  } catch (e: any) {
    console.error("[NUXUS AI] Yandex Agent Error:", e.message || e);
    return `Сбой связи с агентом Yandex (DeepSeek): ${e.message || 'Проверьте API ключ'}`;
  }
}

const nuxusIntelligenceFlow = ai.defineFlow(
  {
    name: 'nuxusIntelligenceFlow',
    inputSchema: IntelligenceInputSchema,
    outputSchema: IntelligenceOutputSchema,
  },
  async (input) => {
    const result = await callYandexAgent(input.prompt);

    return {
      response: result,
      nodeUsed: "YANDEX AGENT (DEEPSEEK 4 FLASH)"
    };
  }
);
