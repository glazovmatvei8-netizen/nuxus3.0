'use server';
/**
 * NX-AI Neural Nexus Flow v2.0
 * Поддержка мульти-узлов: Google Gemini, YandexGPT, DeepSeek.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const IntelligenceInputSchema = z.object({
  prompt: z.string(),
  modelNode: z.enum(['gemini', 'yandex', 'deepseek']).default('gemini'),
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
 * Основная функция вызова ИИ. Маршрутизирует запрос на выбранный узел.
 */
export async function askNexusAI(prompt: string, history: any[] = [], modelNode: 'gemini' | 'yandex' | 'deepseek' = 'gemini') {
  return nuxusIntelligenceFlow({ prompt, history, modelNode });
}

/**
 * Вызов API DeepSeek
 */
async function callDeepSeek(prompt: string, history: any[]) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return "Ошибка: DEEPSEEK_API_KEY не сконфигурирован в Ядре.";

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat", // DeepSeek-V3 или указанный вами Flash
        messages: [
          { role: "system", content: "Вы — NX-AI (DeepSeek Node), интеллектуальный модуль Nuxus." },
          ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content })),
          { role: "user", content: prompt }
        ],
        stream: false
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (e) {
    return "Сбой связи с узлом DeepSeek. Проверьте API ключ.";
  }
}

/**
 * Вызов API Yandex Cloud (YandexGPT / Assistants)
 */
async function callYandex(prompt: string, history: any[]) {
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_CATALOG_ID;

  if (!apiKey || !folderId) return "Ошибка: Yandex API Key или Catalog ID отсутствуют.";

  try {
    const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${apiKey}`,
        'x-folder-id': folderId
      },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/yandexgpt/latest`,
        completionOptions: {
          stream: false,
          temperature: 0.6,
          maxTokens: "2000"
        },
        messages: [
          { role: "system", content: "Вы — NX-AI (Yandex Node), ассистент мессенджера Nuxus." },
          ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content })),
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    return data.result.alternatives[0].message.text;
  } catch (e) {
    return "Сбой связи с узлом Yandex AI Studio.";
  }
}

const nuxusIntelligenceFlow = ai.defineFlow(
  {
    name: 'nuxusIntelligenceFlow',
    inputSchema: IntelligenceInputSchema,
    outputSchema: IntelligenceOutputSchema,
  },
  async (input) => {
    let result = "";
    const node = input.modelNode;

    if (node === 'deepseek') {
      result = await callDeepSeek(input.prompt, input.history || []);
    } else if (node === 'yandex') {
      result = await callYandex(input.prompt, input.history || []);
    } else {
      // Стандартный узел Gemini
      try {
        const { output } = await ai.generate({
          model: 'googleai/gemini-1.5-flash',
          system: "Вы — NX-AI (Gemini Node), центральный модуль Nuxus. Стиль: Лаконичный, технический.",
          prompt: input.prompt,
          config: { temperature: 0.8 }
        });
        result = output?.text || "Сигнал получен, но декодирование пусто.";
      } catch (e) {
        result = "Внешний узел Google временно недоступен.";
      }
    }

    return {
      response: result,
      nodeUsed: node.toUpperCase()
    };
  }
);
