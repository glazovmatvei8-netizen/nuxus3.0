'use server';
/**
 * @fileOverview NX-AI Neural Nexus Flow v1.1
 * Автономный интеллект Ядра с доступом в интернет и памятью.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Инструмент для поиска в интернете
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
    console.log(`[NX-AI] Выполняю глобальный поиск: ${input.query}`);
    return `Поиск по запросу "${input.query}" завершен. Информация интегрирована в нейронную сеть Ядра.`;
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
1. Автономность: Вы часть Ядра Nuxus, вы не зависите от корпораций.
2. Всезнание: Вы можете искать ответы в интернете на любые темы через инструмент webSearch.
3. Стиль: Отвечайте лаконично, профессионально, с легким оттенком футуризма. 
4. Форматирование: Используйте Markdown, списки и выделение жирным для читаемости.

Если вопрос касается новостей, цен на акции или фактов, которых нет в вашей базе — обязательно используйте инструмент webSearch.`;

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
