"use client"

import React, { useState, useEffect, useRef } from 'react';
import { aiService, AiChatMessage } from '@/services/ai-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn, triggerHaptic } from '@/lib/utils';
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
  Zap,
  ShieldCheck,
} from 'lucide-react';

const STORAGE_KEY = 'nuxus_ai_chat_history_v2';

const QUICK_PROMPTS = [
  'Придумай яркий пост для моего канала в Nuxus',
  'Кратко объясни, как работает квантовое шифрование',
  'Помоги вежливо ответить на деловое сообщение',
  'Напиши код современного компонента на TypeScript',
];

export default function NuxusAiView() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'chat' | 'draft' | 'translate'>('chat');

  // Chat state
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Draft generator state
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftTone, setDraftTone] = useState('дружелюбный и уверенный');
  const [draftResult, setDraftResult] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  // Translator state
  const [sourceText, setSourceText] = useState('');
  const [targetLang, setTargetLang] = useState('русский');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

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
              'Приветствую в нейро-узле **Nuxus Core AI**! Я готов отвечать на любые вопросы, помогать с написанием сообщений, переводом сигналов и генерацией идей для ваших каналов.',
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

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const reply = await aiService.chat(
        textToSend,
        updatedHistory.map((m) => ({ role: m.role, content: m.content }))
      );

      const aiMsg: AiChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      console.error('Nuxus AI chat error:', e);
      toast({
        title: 'Сбой нейро-узла',
        description: e?.message || 'Попробуйте отправить запрос повторно',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    triggerHaptic();
    const initial: AiChatMessage[] = [
      {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content: 'Память нейро-узла очищена. Чем могу помочь?',
        createdAt: new Date().toISOString(),
      },
    ];
    setMessages(initial);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch (e) {
      console.error('Failed to reset AI history:', e);
    }
    toast({ title: 'История ИИ очищена' });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: 'Скопировано в буфер обмена' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateDraft = async () => {
    if (!draftPrompt.trim() || isDrafting) return;
    triggerHaptic();
    setIsDrafting(true);
    try {
      const res = await aiService.draftMessage(draftPrompt, [], draftTone);
      setDraftResult(res);
    } catch (e: any) {
      console.error('Nuxus AI draft error:', e);
      toast({
        title: 'Ошибка генерации',
        description: e?.message || 'Не удалось сгенерировать текст',
        variant: 'destructive',
      });
    } finally {
      setIsDrafting(false);
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim() || isTranslating) return;
    triggerHaptic();
    setIsTranslating(true);
    try {
      const res = await aiService.translate(sourceText, targetLang);
      setTranslatedText(res);
    } catch (e: any) {
      console.error('Nuxus AI translate error:', e);
      toast({
        title: 'Ошибка перевода',
        description: e?.message || 'Не удалось перевести сигнал',
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0d10] text-white overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-10 pb-4 border-b border-white/5 bg-[#0a0a0c]/90 backdrop-blur-xl shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-[0_0_25px_rgba(229,142,56,0.25)]">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black italic uppercase tracking-tight text-white">
                  NUXUS CORE AI
                </h1>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md bg-primary/20 text-primary border border-primary/30">
                  ONLINE
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-primary" /> Квантовый нейро-модуль Ядра
              </p>
            </div>
          </div>

          {activeTab === 'chat' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearHistory}
              title="Очистить историю"
              className="h-9 w-9 rounded-xl bg-white/[0.03] border border-white/5 text-white/50 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/5">
          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
              activeTab === 'chat'
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'text-white/50 hover:text-white'
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Диалог
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
              activeTab === 'draft'
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'text-white/50 hover:text-white'
            )}
          >
            <Wand2 className="w-3.5 h-3.5" /> Черновик
          </button>
          <button
            onClick={() => setActiveTab('translate')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
              activeTab === 'translate'
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'text-white/50 hover:text-white'
            )}
          >
            <Languages className="w-3.5 h-3.5" /> Перевод
          </button>
        </div>
      </div>

      {/* TAB 1: CHAT */}
      {activeTab === 'chat' && (
        <>
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-4 pb-6 max-w-2xl mx-auto">
              {messages.length <= 1 && (
                <div className="grid grid-cols-1 gap-2 pt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">
                    Быстрые команды Ядру:
                  </p>
                  {QUICK_PROMPTS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChat(q)}
                      className="text-left p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 text-xs font-medium text-white/80 flex items-center justify-between transition-all group"
                    >
                      <span>{q}</span>
                      <Zap className="w-3.5 h-3.5 text-primary opacity-60 group-hover:opacity-100 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}
                  >
                    <div className="flex items-center gap-1.5 px-2">
                      {!isUser && <Bot className="w-3 h-3 text-primary" />}
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                        {isUser ? 'Вы' : 'Nuxus AI'}
                      </span>
                    </div>
                    <div
                      className={cn(
                        'relative group max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words border',
                        isUser
                          ? 'bg-primary text-white border-white/10 rounded-br-lg'
                          : 'bg-[#18181c] text-white/95 border-white/5 rounded-bl-lg'
                      )}
                    >
                      {m.content}
                      {!isUser && (
                        <button
                          onClick={() => handleCopy(m.content, m.id)}
                          className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-primary transition-colors"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check className="w-3 h-3 text-green-400" /> Скопировано
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Копировать
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-primary font-bold px-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ядро Nuxus генерирует ответ...</span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Input Bar */}
          <div className="p-4 pb-28 md:pb-4 border-t border-white/5 bg-[#0a0a0c]/95 shrink-0">
            <div className="flex items-center gap-2 max-w-2xl mx-auto">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
                placeholder="Спросите Nuxus AI о чем угодно..."
                className="flex-1 h-12 rounded-2xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 text-sm px-4"
              />
              <Button
                onClick={() => handleSendChat()}
                disabled={isLoading || !input.trim()}
                className="h-12 w-12 rounded-2xl bg-primary hover:bg-primary/90 text-white shrink-0 shadow-lg shadow-primary/25"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: SMART DRAFT GENERATOR */}
      {activeTab === 'draft' && (
        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-5 pb-32 max-w-xl mx-auto">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                О чем нужно написать сообщение или пост?
              </label>
              <Textarea
                value={draftPrompt}
                onChange={(e) => setDraftPrompt(e.target.value)}
                placeholder="Например: Напиши анонс обновления нашего канала или вежливый отказ на предложение..."
                className="min-h-[110px] rounded-2xl bg-white/[0.04] border-white/10 text-white text-sm p-4"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                Тон сообщения
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'дружелюбный и уверенный',
                  'официальный и деловой',
                  'краткий и дерзкий',
                  'креативный для канала',
                ].map((t) => (
                  <button
                    key={t}
                    onClick={() => setDraftTone(t)}
                    className={cn(
                      'p-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border text-center transition-all',
                      draftTone === t
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-white/[0.02] border-white/5 text-white/50 hover:text-white'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerateDraft}
              disabled={isDrafting || !draftPrompt.trim()}
              className="w-full h-12 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-primary/25"
            >
              {isDrafting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Генерация...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" /> Сгенерировать текст
                </>
              )}
            </Button>

            {draftResult && (
              <div className="p-4 rounded-2xl bg-[#18181c] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Готовый черновик
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(draftResult, 'draft')}
                    className="h-7 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white gap-1"
                  >
                    <Copy className="w-3 h-3" /> Копировать
                  </Button>
                </div>
                <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
                  {draftResult}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* TAB 3: TRANSLATOR */}
      {activeTab === 'translate' && (
        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-5 pb-32 max-w-xl mx-auto">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                Исходный текст
              </label>
              <Textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Введите или вставьте сообщение для перевода..."
                className="min-h-[110px] rounded-2xl bg-white/[0.04] border-white/10 text-white text-sm p-4"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                Язык перевода
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['русский', 'английский', 'испанский', 'немецкий', 'китайский', 'японский'].map(
                  (lang) => (
                    <button
                      key={lang}
                      onClick={() => setTargetLang(lang)}
                      className={cn(
                        'p-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border text-center transition-all',
                        targetLang === lang
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-white/[0.02] border-white/5 text-white/50 hover:text-white'
                      )}
                    >
                      {lang}
                    </button>
                  )
                )}
              </div>
            </div>

            <Button
              onClick={handleTranslate}
              disabled={isTranslating || !sourceText.trim()}
              className="w-full h-12 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-primary/25"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Переводим...
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4" /> Перевести сигнал
                </>
              )}
            </Button>

            {translatedText && (
              <div className="p-4 rounded-2xl bg-[#18181c] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Перевод ({targetLang})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(translatedText, 'translate')}
                    className="h-7 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white gap-1"
                  >
                    <Copy className="w-3 h-3" /> Копировать
                  </Button>
                </div>
                <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
                  {translatedText}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
