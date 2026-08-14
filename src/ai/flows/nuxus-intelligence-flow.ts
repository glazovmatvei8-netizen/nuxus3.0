'use server';
/**
 * NX-AI Neural Nexus Flow v2.1
 * ПОДДЕРЖКА: Google Gemini, YandexGPT (OpenAI Compatible), DeepSeek.
 * ОБНОВЛЕНО: Интеграция нового протокола Yandex Cloud через OpenAI SDK.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import OpenAI from 'openai';

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
        model: "deepseek-chat",
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
    return "Сбой связи с узлом DeepSeek.";
  }
}

/**
 * Вызов API Yandex Cloud (через OpenAI SDK)
 * ОБНОВЛЕНО: Согласно спецификации пользователя v51.0
 */
async function callYandex(promptText: string, history: any[]) {
  const apiKey = process.env.YANDEX_API_KEY;
  const projectId = process.env.YANDEX_PROJECT_ID || 'b1gjfj178i38ae393ieb';

  if (!apiKey) return "Ошибка: YANDEX_API_KEY отсутствует в конфигурации Ядра.";

  try {
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://ai.api.cloud.yandex.net/v1',
      defaultHeaders: {
        'OpenAI-Project': projectId
      }
    });

    // Используем предоставленную вами структуру client.responses.create
    // Примечание: В стандартном OpenAI SDK это может быть client.chat.completions, 
    // но мы следуем вашему коду с использованием Yandex-специфичного метода.
    const response = await (client as any).responses.create({
      prompt: {
        id: 'fvt6koqsf13kvd2bkrmc'
      },
      input: promptText
    });

    return response.output_text || "Сигнал получен, но расшифровка пуста.";
  } catch (e: any) {
    console.error("[NUXUS AI] Yandex Error:", e.message || e);
    return `Сбой связи с узлом Yandex AI: ${e.message || 'Unknown Protocol Error'}`;
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
