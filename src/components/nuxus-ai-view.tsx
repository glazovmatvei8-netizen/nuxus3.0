"use client"

<<<<<<< HEAD
import React from 'react';

/**
 * NUXUS AI VIEW ANNIHILATED V65.0
 */
export default function NuxusAiView() {
  return null;
=======
import React, { useState, useEffect, useRef } from 'react';
import { aiService, AiChatMessage } from '@/services/ai-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn, triggerHaptic } from '@/lib/utils';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  Bot,
  Languages,
  Wand2,
  MessageSquare,
  Loader2,
  Calculator,
  Code2,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';

const STORAGE_KEY = 'nuxus_ai_chat_history_v3';

const QUICK_PROMPTS = [
  { text: 'Сколько будет 2 + 2?', icon: Calculator, label: 'Арифметика' },
  { text: 'Реши квадратное уравнение: x² - 5x + 6 = 0', icon: Calculator, label: 'Алгебра' },
  { text: 'Какова формула кинетической энергии и как ее применять?', icon: BookOpen, label: 'Физика' },
  { text: 'Напиши функцию валидации email на TypeScript', icon: Code2, label: 'Код' },
];

/**
 * Клиентская вспомогательная очистка случайных скобок вокруг цифр
 */
function cleanClientResponse(text: string): string {
  if (!text) return "";
  let clean = text.trim();
  clean = clean.replace(/\\boxed\{([^{}]+)\}/g, '$1');
  clean = clean.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, '$1');
  clean = clean.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, '$1');
  clean = clean.replace(/\[(?!\s*[xX ]\s*\])([\d\s\w\u0400-\u04FF\.\,\+\-\*\/\=\:\;]{1,80})\](?!\()/g, '$1');
  clean = clean.replace(/\[\s*\??\s*\]/g, '');
  clean = clean.replace(/(\b\d+|[\u0400-\u04FF\w\.\)]+)\s+\?$/g, '$1');
  if (/^Ответ:\s*[\d\w\.\,\s\+\-\*\/\=]+\s*\?$/i.test(clean)) {
    clean = clean.replace(/\s*\?$/, '');
  }
  return clean.trim();
}

export default function NuxusAiView() {
  const { toast } = useToast();

  // Chat state
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [failedMessage, setFailedMessage] = useState<AiChatMessage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content:
              'Привет! Я нейросетевой ассистент Nuxus. Помогу решить задачу, написать текст или перевести что угодно. Просто спроси!',
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.error('Failed to load AI chat history:', e);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
      } catch (e) {
        console.error('Failed to save AI chat history:', e);
      }
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendChat = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || isLoading) return;

    triggerHaptic();
    const userMsg: AiChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    // Передаем только предыдущую историю (без приветствия), чтобы избежать дублей
    const historyToSend = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const reply = await aiService.chat(textToSend, historyToSend, selectedModel);
      const cleanReply = cleanClientResponse(reply);

      const aiMsg: AiChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: cleanReply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      console.error('Nuxus AI chat error:', e);
      setFailedMessage({
        id: `failed_${Date.now()}`,
        role: 'user',
        content: textToSend,
        createdAt: new Date().toISOString(),
      });
      toast({
        title: 'Сбой нейро-узла',
        description: 'Произошла ошибка. Нажмите кнопку повтора.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (failedMessage) {
      handleSendChat(failedMessage.content);
      setFailedMessage(null);
    }
  };

  const handleClearHistory = () => {
    triggerHaptic();
    const initial: AiChatMessage[] = [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'История диалога очищена. Задайте любую задачу или вопрос!',
        createdAt: new Date().toISOString(),
      },
    ];
    setMessages(initial);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch (e) {
      console.error('Failed to reset AI history:', e);
    }
    toast({ title: 'История диалога очищена' });
  };


  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: 'Скопировано в буфер обмена' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0d] text-white overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-10 pb-4 border-b border-white/5 bg-[#0e0e12]/95 backdrop-blur-xl shrink-0">
        <div className="flex items-center justify-between mb-4 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-[0_0_25px_rgba(229,142,56,0.25)]">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black italic uppercase tracking-tight text-white">
                  NUXUS AI
                </h1>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ONLINE
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-primary" /> Универсальный ИИ-ассистент
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearHistory}
              title="Очистить историю"
              className="h-9 w-9 rounded-xl bg-white/[0.03] border border-white/5 text-white/50 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            {/* Compact Model Selector */}
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => {
                  if (e.target.value !== 'gemini-3.8-flash') {
                    toast({ title: 'Требуется подписка', description: 'Данная модель доступна в Nuxus Plus / One+' });
                    return;
                  }
                  setSelectedModel(e.target.value);
                }}
                className="h-9 rounded-xl bg-white/[0.03] border border-white/5 text-white text-[10px] font-black uppercase px-2 focus:outline-none focus:border-primary"
              >
                <option value="gemini-3.8-flash">3.8 Flash</option>
                <option value="gemini-1.5-pro">3.0 Pro</option>
                <option value="gemini-1.5-pro-4">4.0 Plus</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* CHAT AREA */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4 pb-6 max-w-3xl mx-auto">
          {/* Quick Prompts */}
          {messages.length <= 1 && (
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_PROMPTS.map((q, idx) => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendChat(q.text)}
                      className="text-left p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 text-xs font-medium text-white/80 flex flex-col justify-between transition-all group hover:border-primary/30"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                          <Icon className="w-3 h-3" /> {q.label}
                        </span>
                        <Send className="w-3 h-3 text-white/20 group-hover:text-primary transition-colors" />
                      </div>
                      <span className="line-clamp-2 text-[13px] leading-snug">{q.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}
              >
                <div className="flex items-center gap-1.5 px-2">
                  {!isUser && <Bot className="w-3.5 h-3.5 text-primary" />}
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                    {isUser ? 'Вы' : 'Nuxus AI'}
                  </span>
                </div>
                <div
                  className={cn(
                    'relative group max-w-[92%] sm:max-w-[85%] rounded-3xl px-5 py-3.5 text-sm leading-relaxed break-words border transition-all',
                    isUser
                      ? 'bg-primary text-white border-white/10 rounded-br-md whitespace-pre-wrap font-medium shadow-md shadow-primary/10'
                      : 'bg-[#151519] text-white/95 border-white/10 rounded-bl-md shadow-xl shadow-black/40'
                  )}
                >
                  {isUser ? (
                    m.content
                  ) : (
                    <div className="markdown-body space-y-2 text-[14px] leading-relaxed text-white/95">
                      <Markdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          strong: ({ children }) => <strong className="font-bold text-white text-primary/90">{children}</strong>,
                          code: ({ inline, className, children, ...props }: any) => {
                            if (inline) {
                              return (
                                <code className="bg-white/10 text-primary px-1.5 py-0.5 rounded text-xs font-mono font-semibold" {...props}>
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <div className="my-3 rounded-2xl bg-black/80 border border-white/10 p-3.5 overflow-x-auto relative group/code">
                                <code className="text-xs font-mono text-emerald-400 block leading-relaxed" {...props}>
                                  {children}
                                </code>
                              </div>
                            );
                          },
                        }}
                      >
                        {m.content}
                      </Markdown>
                    </div>
                  )}

                  {!isUser && (
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                      <button
                        onClick={() => handleCopy(m.content, m.id)}
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white/40 hover:text-primary transition-colors"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Скопировано
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Копировать ответ
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2.5 text-xs text-primary font-bold px-3 py-2 bg-white/[0.02] rounded-2xl border border-white/5 w-fit">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Nuxus AI думает...</span>
            </div>
          )}

          {failedMessage && (
            <div className="flex items-center justify-between gap-2.5 text-xs text-red-400 font-bold px-3 py-2 bg-red-500/10 rounded-2xl border border-red-500/20">
              <span>Запрос не прошел.</span>
              <Button size="sm" variant="outline" onClick={handleRetry} className="h-7 text-xs border-red-500/30 hover:bg-red-500/20">
                Повторить
              </Button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input Bar */}
      <div className="p-4 pb-28 md:pb-5 border-t border-white/5 bg-[#0e0e12]/98 shrink-0">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendChat();
              }
            }}
            placeholder="Задайте вопрос, попросите перевести текст или составить черновик..."
            className="flex-1 h-12 rounded-2xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 text-sm px-4 focus-visible:ring-primary"
          />
          <Button
            onClick={() => handleSendChat()}
            disabled={isLoading || !input.trim()}
            className="h-12 w-12 rounded-2xl bg-primary hover:bg-primary/90 text-white shrink-0 shadow-lg shadow-primary/25 disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
}
