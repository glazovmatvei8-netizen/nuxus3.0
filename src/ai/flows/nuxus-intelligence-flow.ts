
'use server';
/**
 * NX-AI Neural Nexus Flow v3.0
 * ПОДДЕРЖКА: Исключительно Yandex AI Studio (OpenAI SDK).
 * ОБНОВЛЕНО: Строгое соответствие вашему коду и prompt_id.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import OpenAI from 'openai';

const IntelligenceInputSchema = z.object({
  prompt: z.string(),
  modelNode: z.enum(['gemini', 'yandex', 'deepseek']).default('yandex'),
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
 * Теперь Yandex — основной узел.
 */
export async function askNexusAI(prompt: string, history: any[] = [], modelNode: 'gemini' | 'yandex' | 'deepseek' = 'yandex') {
  return nuxusIntelligenceFlow({ prompt, history, modelNode });
}

/**
 * ПРЯМОЙ ВЫЗОВ ВАШЕЙ МОДЕЛИ YANDEX (OpenAI SDK)
 */
async function callYandex(promptText: string) {
  const apiKey = process.env.YANDEX_API_KEY;
  const projectId = process.env.YANDEX_PROJECT_ID || 'b1gjfj178i38ae393ieb';

  if (!apiKey || apiKey.trim() === '') {
    return "ОШИБКА: API ключ Yandex не найден в .env. Пожалуйста, пропишите его.";
  }

  try {
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://ai.api.cloud.yandex.net/v1',
      defaultHeaders: {
        'OpenAI-Project': projectId
      }
    });

    /**
     * ВАШ КОД ИЗ YANDEX AI STUDIO
     */
    const response = await (client as any).responses.create({
      prompt: {
        id: 'fvt6koqsf13kvd2bkrmc'
      },
      input: promptText
    });

    // Результат берем из output_text, как в вашем примере
    return response.output_text || "Сигнал получен, но расшифровка пуста.";
  } catch (e: any) {
    console.error("[NUXUS AI] Yandex Critical Error:", e.message || e);
    return `Сбой связи с узлом Yandex AI: ${e.message || 'Проверьте API ключ'}`;
  }
}

const nuxusIntelligenceFlow = ai.defineFlow(
  {
    name: 'nuxusIntelligenceFlow',
    inputSchema: IntelligenceInputSchema,
    outputSchema: IntelligenceOutputSchema,
  },
  async (input) => {
    // В текущей версии мы всегда используем Yandex, так как вы просили убрать Gemini
    const result = await callYandex(input.prompt);

    return {
      response: result,
      nodeUsed: "YANDEX AI STUDIO"
    };
  }
);
