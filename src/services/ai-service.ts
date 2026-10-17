export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const FALLBACK_CLOUD_URL = 'https://ais-pre-rko2lnktxmaeiyvu3x7xuk-482444692304.europe-west3.run.app';

function getAiEndpoint(): string {
  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
    return `${FALLBACK_CLOUD_URL}/api/ai`;
  }
  return '/api/ai';
}

export const aiService = {
  async chat(prompt: string, history: { role: string; content: string }[] = []): Promise<string> {
    try {
      const res = await fetch(getAiEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chat',
          prompt,
          history,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка связи с Nuxus AI');
      }
      return data.text;
    } catch (e) {
      console.error('aiService.chat error:', e);
      throw e;
    }
  },

  async summarizeChat(messages: { senderName: string; content: string }[]): Promise<string> {
    try {
      const res = await fetch(getAiEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'summarize',
          messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось создать сводку чата');
      }
      return data.text;
    } catch (e) {
      console.error('aiService.summarizeChat error:', e);
      throw e;
    }
  },

  async draftMessage(
    prompt: string,
    messages: { senderName: string; content: string }[] = [],
    tone: string = 'дружелюбный и естественный'
  ): Promise<string> {
    try {
      const res = await fetch(getAiEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'draft',
          prompt,
          messages,
          tone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось сгенерировать черновик');
      }
      return data.text;
    } catch (e) {
      console.error('aiService.draftMessage error:', e);
      throw e;
    }
  },

  async translate(text: string, targetLang: string = 'русский'): Promise<string> {
    try {
      const res = await fetch(getAiEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'translate',
          prompt: text,
          targetLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось перевести сообщение');
      }
      return data.text;
    } catch (e) {
      console.error('aiService.translate error:', e);
      throw e;
    }
  },
};
