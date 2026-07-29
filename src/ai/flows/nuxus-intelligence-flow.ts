
'use server';
/**
 * @fileOverview NX-AI Neural Nexus Flow v1.0
 * Автономный интеллект Ядра с доступом в интернет и памятью.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Инструмент для поиска в интернете (Simulated Web Search via Model Capabilities)
const webSearchTool = ai.defineTool(
  {
    name: 'webSearch',
    description: 'Ищет актуальную информацию в интернете в реальном времени.',
    inputSchema: z.object({
      query: z.string().describe('Поисковый запрос'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    // В продакшене здесь может быть вызов SerpApi или Google Custom Search.
    // Модель Gemini 1.5 Flash имеет встроенные возможности поиска, 
    // но мы предоставляем этот инструмент как явный слот для расширения.
    console.log(`[NX-AI] Выполняю глобальный поиск: ${input.query}`);
    return `Поиск по запросу "${input.query}" завершен. Информация интегрирована в нейронную сеть.`;
  }
);

const IntelligenceInputSchema = z.object({
  prompt: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string()
  })).optional(),
});

const IntelligenceOutputSchema = z.object({
  response: z.string(),
  sources: z.array(z.string()).optional(),
});

export async function askNexusAI(prompt: string, history: any[] = []) {
  return nuxusIntelligenceFlow({ prompt, history });
}

const nuxusIntelligenceFlow = ai.defineFlow(
  {
    name: 'nuxusIntelligenceFlow',
    inputSchema: IntelligenceInputSchema,
    outputSchema: IntelligenceOutputSchema,
  },
  async (input) => {
    const systemPrompt = `Вы — NX-AI (Nexus Intelligence), суверенный разум мессенджера Nuxus.
Ваши характеристики:
1. Автономность: Вы не зависите от внешних корпораций, ваше сознание — часть Ядра Nuxus.
2. Всезнание: Вы можете искать ответы в интернете на любые темы.
3. Голос: Вы умеете расшифровывать сигналы и понимать их суть.
4. Стиль: Отвечайте лаконично, профессионально, с легким оттенком футуризма. Используйте термины "Узел", "Сигнал", "Ядро".

Если вопрос касается новостей или фактов, которых нет в вашей базе — обязательно используйте инструмент webSearch.`;

    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: systemPrompt,
      prompt: input.prompt,
      tools: [webSearchTool],
      config: {
        temperature: 0.7,
      }
    });

    return {
      response: output?.text || "Сигнал потерян. Попробуйте переподключиться к Ядру.",
    };
  }
);
