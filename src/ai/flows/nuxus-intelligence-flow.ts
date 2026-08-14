'use server';
/**
 * NX-AI Neural Nexus Flow v6.5
 * ПОДДЕРЖКА: Yandex AI Studio (Agent Integration).
 * МОДЕЛЬ: DeepSeek 4 Flash.
 * ПРОТОКОЛ: OpenAI Custom (Yandex Cloud).
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
 * Основная функция вызова ИИ через вашего Агента в Yandex AI Studio.
 */
export async function askNexusAI(prompt: string, history: any[] = []) {
  return nuxusIntelligenceFlow({ prompt, history });
}

/**
 * ПРЯМОЙ ВЫЗОВ АГЕНТА ПО ВАШЕМУ КОДУ
 */
async function callYandexAgent(promptText: string) {
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID || 'b1gjfj178i38ae393ieb'; 
  const agentId = process.env.YANDEX_PROJECT_ID || 'fvt6koqsf13kvd2bkrmc';   

  if (!apiKey || apiKey.trim() === '') {
    return "ОШИБКА: API ключ Yandex не найден в .env. Пожалуйста, проверьте конфигурацию.";
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
     * ВЫЗОВ АГЕНТА СТРОГО ПО ШАБЛОНУ С ФОТО
     */
    const response = await (client as any).responses.create({
      prompt: {
        id: agentId
      },
      input: promptText
    });

    // Извлекаем ответ строго из output_text
    return response.output_text || "Сигнал получен, но ответ пуст.";
  } catch (e: any) {
    console.error("[NUXUS AI] Yandex Agent Error:", e.message || e);
    return `Сбой связи с DeepSeek (Yandex): ${e.message || 'Проверьте настройки ключа и баланс в Yandex Cloud'}`;
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
