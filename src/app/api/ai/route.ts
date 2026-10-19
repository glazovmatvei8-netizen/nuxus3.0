import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Очищает ответ ИИ от любых случайных скобок, LaTeX артефактов и висящих знаков,
 * гарантируя чистый и аккуратный текст, как в ChatGPT и Gemini.
 */
function sanitizeAiResponse(text: string): string {
  if (!text) return "";
  let clean = text.trim();

  // 1. Убираем обертку LaTeX \boxed{...} -> значение
  clean = clean.replace(/\\boxed\{([^{}]+)\}/g, '$1');

  // 2. Убираем LaTeX скобки отображения формул \[ ... \] и \( ... \)
  clean = clean.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, '$1');
  clean = clean.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, '$1');

  // 3. Заменяем технические LaTeX операторы на красивые понятные символы
  clean = clean
    .replace(/\\times\b/g, '×')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\div\b/g, '÷')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\le\b/g, '≤')
    .replace(/\\ge\b/g, '≥')
    .replace(/\\pm\b/g, '±')
    .replace(/\\ne\b/g, '≠')
    .replace(/\\text\{([^{}]+)\}/g, '$1');

  // 4. Очищаем квадратные скобки вокруг чисел, коротких ответов и математических формул
  // (например: [4], [ 4 ], [2+2=4], [Ответ: 4]), НЕ ломая markdown-ссылки [текст](url)
  // и чекбоксы списков задач [ ] / [x]
  clean = clean.replace(/\[(?!\s*[xX ]\s*\])([\d\s\w\u0400-\u04FF\.\,\+\-\*\/\=\:\;]{1,80})\](?!\()/g, (_match, inner) => {
    return inner.trim();
  });

  // 5. Убираем пустые квадратные скобки вроде [] или [ ] или [?]
  clean = clean.replace(/\[\s*\??\s*\]/g, '');

  // 6. Убираем висящий знак вопроса в конце утвердительного числового или текстового ответа
  // (например "4 ?" или "Ответ: 4 ?")
  clean = clean.replace(/(\b\d+|[\u0400-\u04FF\w\.\)]+)\s+\?$/g, '$1');
  if (/^Ответ:\s*[\d\w\.\,\s\+\-\*\/\=]+\s*\?$/i.test(clean)) {
    clean = clean.replace(/\s*\?$/, '');
  }
  if (/^[\d\s\+\-\*\/\=\.\,]+\s*\?$/.test(clean)) {
    clean = clean.replace(/\s*\?$/, '');
  }

  // 7. Схлопываем лишние пробелы перед знаками препинания
  clean = clean.replace(/\s+([,\.!;:])/g, '$1');

  return clean.trim();
}

const DEFAULT_SYSTEM_INSTRUCTION = `Ты — высокоинтеллектуальный, точный и аккуратный искусственный интеллект в мессенджере Nuxus, работающий на уровне передовых систем (ChatGPT и Gemini).

ГЛАВНЫЕ ТРЕБОВАНИЯ:
1. ЧИСТОТА И СТИЛЬ ТЕКСТА:
- Пиши чисто, грамотно, вежливо и строго по существу на русском языке (или языке пользователя).
- Не добавляй пустых шаблонных вступлений.
- Ответ должен быть естественным и аккуратным.

2. УНИВЕРСАЛЬНОСТЬ (Определяй задачу из контекста):
- Если тебя просят ПЕРЕВЕСТИ текст — переведи его на указанный язык.
- Если тебя просят НАПИСАТЬ черновик или пост — напиши его в нужном тоне.
- Если тебя просят РЕШИТЬ задачу — реши её.
- Всегда отвечай прямо, кратко и ясно.

3. МАТЕМАТИКА И ЗАДАЧИ:
- Производи абсолютно точные математические и логические вычисления.
- В конце четко выдели итоговый результат: **Ответ:** <результат>.

4. РАЗМЕТКА И ФОРМАТИРОВАНИЕ:
- Используй стандартный Markdown.
- Для программного кода используй блоки кода.
- Формулы форматируй в читаемом виде.`;

function prepareChatContents(history: any[], prompt: string) {
  const cleanPrompt = prompt.trim();
  const rawItems = Array.isArray(history) ? history : [];

  // Фильтруем пустые сообщения и системное приветствие
  const validItems = rawItems
    .filter((m: any) => m && typeof m.content === "string" && m.content.trim() !== "" && m.id !== "welcome")
    .map((m: any) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      text: m.content.trim(),
    }));

  // Собираем строго чередующуюся последовательность, всегда начинающуюся с user
  const alternating: { role: "user" | "model"; parts: [{ text: string }] }[] = [];

  for (const item of validItems) {
    if (alternating.length === 0) {
      if (item.role === "user") {
        alternating.push({ role: "user", parts: [{ text: item.text }] });
      }
      // Если первый элемент был model (приветствие), пропускаем его для валидности API
    } else {
      const prev = alternating[alternating.length - 1];
      if (prev.role === item.role) {
        prev.parts[0].text += "\n" + item.text;
      } else {
        alternating.push({ role: item.role as "user" | "model", parts: [{ text: item.text }] });
      }
    }
  }

  // Добавляем текущий запрос пользователя
  if (alternating.length === 0) {
    return [{ role: "user" as const, parts: [{ text: cleanPrompt }] }];
  }

  const lastItem = alternating[alternating.length - 1];
  if (lastItem.role === "user") {
    // Если клиент уже передал текущий запрос в конце истории, не дублируем его
    if (lastItem.parts[0].text !== cleanPrompt) {
      lastItem.parts[0].text = cleanPrompt;
    }
  } else {
    alternating.push({ role: "user" as const, parts: [{ text: cleanPrompt }] });
  }

  return alternating;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY не настроен на сервере." },
        { status: 500, headers: corsHeaders }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const body = await req.json();
    const {
      mode = "chat",
      prompt = "",
      history = [],
      messages = [],
      targetLang = "русский",
      tone = "дружелюбный и лаконичный",
      model = "gemini-3.8-flash",
    } = body;

    let systemInstruction = DEFAULT_SYSTEM_INSTRUCTION;
    let contents: any = prompt;

    if (mode === "chat") {
      contents = prepareChatContents(history, prompt);
    } else if (mode === "summarize") {
      systemInstruction =
        "Ты — умный аналитический модуль. Сделай краткую, чистую и структурированную сводку (саммари) переписки на русском языке. Выдели главные темы, решения и ключевые мысли по пунктам без лишнего текста.";
      const chatTranscript = Array.isArray(messages)
        ? messages.map((m: any) => `${m.senderName || "Узел"}: ${m.content}`).join("\n")
        : prompt;
      contents = `Сделай краткую и аккуратную сводку следующей переписки:\n\n${chatTranscript}`;
    } else if (mode === "draft") {
      systemInstruction =
        "Ты — умный помощник для составления сообщений. Напиши аккуратный, естественный вариант сообщения для чата. Верни ТОЛЬКО готовый текст сообщения без лишних вступлений, пояснений и кавычек.";
      const contextText = Array.isArray(messages) && messages.length > 0
        ? `Контекст последних сообщений:\n${messages.map((m: any) => `${m.senderName || "Собеседник"}: ${m.content}`).join("\n")}\n\n`
        : "";
      contents = `${contextText}Текст/задача (тон: ${tone}): ${prompt || "Предложи уместный ответ."}`;
    } else if (mode === "translate") {
      systemInstruction =
        `Ты — точный переводчик. Переведи текст на ${targetLang} язык. Сохраняй стиль и смысл. Верни ТОЛЬКО перевод без лишних символов и пояснений.`;
      contents = prompt;
    }

    const response = await ai.models.generateContent({
      model: model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const rawText = response.text || "";
    const cleanText = sanitizeAiResponse(rawText) || "Ответ пуст.";

    return NextResponse.json(
      {
        text: cleanText,
        model: model,
        timestamp: new Date().toISOString(),
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Nuxus AI Route Error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Ошибка нейро-ядра Nuxus AI",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
