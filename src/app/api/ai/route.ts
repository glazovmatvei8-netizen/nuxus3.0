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
    } = body;

    let systemInstruction =
      "Ты — Nuxus Core AI (Ядро Nuxus 2.0), встроенный квантовый нейро-ассистент суверенного мессенджера Nuxus. " +
      "Отвечай умно, четко, структурированно и по делу на языке собеседника (по умолчанию на русском). " +
      "Ты помогаешь пользователям писать сообщения, переводить тексты, анализировать переписки, генерировать идеи, писать код и отвечать на любые вопросы.";

    let contents: any = prompt;

    if (mode === "chat") {
      const formattedHistory = Array.isArray(history)
        ? history
            .filter((m: any) => m && typeof m.content === "string" && m.content.trim() !== "")
            .slice(-15)
            .map((m: any) => ({
              role: m.role === "assistant" || m.role === "model" ? "model" : "user",
              parts: [{ text: m.content }],
            }))
        : [];

      contents = [
        ...formattedHistory,
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ];
    } else if (mode === "summarize") {
      systemInstruction =
        "Ты — аналитический модуль Nuxus Core AI. Сделай краткую, понятную и структурированную сводку (саммари) переписки на русском языке. Выдели главные темы, договоренности и ключевые мысли по пунктам.";
      const chatTranscript = Array.isArray(messages)
        ? messages.map((m: any) => `${m.senderName || "Узел"}: ${m.content}`).join("\n")
        : prompt;
      contents = `Сделай краткую сводку следующей переписки:\n\n${chatTranscript}`;
    } else if (mode === "draft") {
      systemInstruction =
        "Ты — ИИ-ассистент мессенджера Nuxus. Помоги пользователю составить или улучшить сообщение для отправки в чат. Верни ТОЛЬКО готовый текст сообщения без лишних вступлений и кавычек.";
      const contextText = Array.isArray(messages) && messages.length > 0
        ? `Контекст последних сообщений:\n${messages.map((m: any) => `${m.senderName || "Собеседник"}: ${m.content}`).join("\n")}\n\n`
        : "";
      contents = `${contextText}Задача / черновик пользователя (тон: ${tone}): ${prompt || "Предложи уместный ответ на последнее сообщение."}`;
    } else if (mode === "translate") {
      systemInstruction =
        `Ты — нейро-переводчик Nuxus Core. Переведи текст на ${targetLang} язык. Сохраняй стиль и смысл оригинала. Верни ТОЛЬКО переведенный текст без пояснений.`;
      contents = prompt;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const text = response.text || "Сигнал обработан, но ответ пуст.";

    return NextResponse.json(
      {
        text,
        model: "gemini-3.8-flash",
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
