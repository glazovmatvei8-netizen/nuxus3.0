
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, Zap, Globe, ShieldCheck, Loader2, Send, 
  Cpu, Activity, Terminal, Wand2, Mic, Ghost
} from 'lucide-react';
import { useUser, useFirestore } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { askNexusAI } from '@/ai/flows/nuxus-intelligence-flow';
import { cn, formatDisplayName } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

/**
 * NEXUS AI TERMINAL V1.0
 * Прямой доступ к суверенному интеллекту Ядра.
 */
export default function NuxusAiView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking]);

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsThinking(true);

    try {
      const { response } = await askNexusAI(userMsg, messages);
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (e: any) {
      toast({ title: "Сбой нейронной сети", description: e.message, variant: "destructive" });
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020205] overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.1)_0%,transparent_50%)] pointer-events-none" />
      
      <header className="px-6 pt-12 pb-6 shrink-0 border-b border-white/5 bg-black/20 backdrop-blur-xl z-20">
        <div className="flex items-center justify-between">
          <div className="flex flex-col text-left">
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
              NX-AI <span className="text-[8px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20 tracking-[0.3em] font-black">SOVEREIGN</span>
            </h1>
            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] ml-1 mt-1 flex items-center gap-2">
              <Activity className="w-2 h-2 text-green-500" /> Neural Link Active
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xl">
             <Cpu className="w-6 h-6 text-primary animate-pulse" />
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1 px-4">
        <div className="p-4 space-y-6 pb-32">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-8 animate-in fade-in zoom-in-95 duration-1000">
               <div className="relative">
                  <div className="absolute -inset-10 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
                  <Terminal className="w-20 h-20 text-primary/40 relative z-10" />
               </div>
               <div className="space-y-3">
                  <h3 className="text-xl font-black text-white uppercase italic tracking-widest">Инициализация Разума</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] max-w-[240px] leading-relaxed">
                    Я — суверенный интеллект Ядра. Спрашивайте о чем угодно, я найду ответ в сети.
                  </p>
               </div>
               <div className="grid grid-cols-1 gap-3 w-full max-w-xs">
                  <QuickCommand text="Найди последние новости технологий" onClick={setInput} />
                  <QuickCommand text="Как работает шифрование QES?" onClick={setInput} />
                  <QuickCommand text="Напиши код на Python для анализа данных" onClick={setInput} />
               </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
               <div className={cn(
                 "max-w-[85%] p-5 rounded-[2rem] shadow-2xl relative border animate-in slide-in-from-bottom-2 duration-500",
                 msg.role === 'user' 
                  ? "bg-primary text-white border-primary/20 rounded-br-none" 
                  : "bg-white/5 backdrop-blur-xl border-white/10 text-white rounded-bl-none"
               )}>
                  <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                  <div className="mt-2 flex items-center gap-2 opacity-30">
                     <span className="text-[8px] font-black uppercase tracking-widest">{msg.role === 'user' ? 'Узел' : 'NX-AI'}</span>
                  </div>
               </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-in fade-in duration-300">
               <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem] rounded-bl-none flex items-center gap-4">
                  <div className="flex gap-1">
                     <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                     <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                     <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">Анализ сигналов...</span>
               </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 bg-transparent shrink-0 z-30 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto relative">
          <div className="absolute -inset-2 bg-primary/10 blur-xl opacity-50 rounded-[2.5rem]" />
          <div className="relative bg-white/5 border border-white/10 rounded-[2.2rem] p-2 flex items-end gap-2 shadow-2xl backdrop-blur-3xl">
             <Textarea 
               placeholder="Запрос к Интеллекту..." 
               value={input}
               onChange={e => setInput(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
               className="bg-transparent border-none focus-visible:ring-0 text-white min-h-[56px] max-h-40 py-4 px-4 resize-none text-sm font-bold tracking-tight scrollbar-hide"
             />
             <Button 
               onClick={handleSend}
               disabled={!input.trim() || isThinking}
               className="h-12 w-12 rounded-2xl bg-primary text-white shrink-0 shadow-lg active:scale-90 transition-all"
             >
               {isThinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickCommand({ text, onClick }: { text: string, onClick: (t: string) => void }) {
  return (
    <button 
      onClick={() => onClick(text)}
      className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-primary/10 hover:text-primary transition-all text-left flex items-center gap-3"
    >
      <Zap className="w-3.5 h-3.5" /> {text}
    </button>
  );
}
