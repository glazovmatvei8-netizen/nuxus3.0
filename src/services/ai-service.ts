
'use client';

/**
 * NUXUS AI SERVICE V220.0
 * Restored: Intelligence logic now works via Kernel API Bridge (/api/ai).
 */

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'model';
  content: string;
  createdAt: string;
}

export const aiService = {
  /**
   * Universal AI Signal Transmitter (Chat)
   */
  async chat(prompt: string, history: any[] = [], model = 'gemini-3.8-flash'): Promise<string> {
    try {
      const response = await fetch('/api/ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'chat', prompt, history, model }),
      });

      if (!response.ok) throw new Error('Kernel API Node Offline');
      const data = await response.json();
      return data.text || "No signal received.";
    } catch (e: any) {
      console.error("AI Node Error:", e);
      throw e;
    }
  },

  /**
   * Analytical Signal Summary
   */
  async summarizeChat(messages: { senderName: string; content: string }[]): Promise<string> {
    try {
      const response = await fetch('/api/ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'summarize', messages }),
      });

      const data = await response.json();
      return data.text || "Analysis failed.";
    } catch (e) {
      console.error("Summarization Error:", e);
      return "Summarization currently disabled.";
    }
  },

  /**
   * Signal Drafting Module
   */
  async draftMessage(prompt: string, messages: { senderName: string; content: string }[], tone?: string): Promise<string> {
    try {
      const response = await fetch('/api/ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'draft', prompt, messages, tone }),
      });

      const data = await response.json();
      return data.text || "Drafting failed.";
    } catch (e) {
      console.error("Drafting Error:", e);
      return "";
    }
  },

  /**
   * QES Translation Proxy
   */
  async translate(text: string, targetLang: string): Promise<string> {
    try {
      const response = await fetch('/api/ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'translate', prompt: text, targetLang }),
      });

      const data = await response.json();
      return data.text || text;
    } catch (e) {
      console.error("Translation Error:", e);
      return text;
    }
  }
};
