"use client"

import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, Zap, Globe, ShieldCheck, Loader2, Send, 
  Cpu, Activity, Terminal, Wand2, Mic, Ghost, Search, ArrowUpRight, BrainCircuit
} from 'lucide-react';
import { useUser, useFirestore } from '@/firebase/provider';
import { askNexusAI } from '@/ai/flows/nuxus-intelligence-flow';
import { cn, formatDisplayName } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { NuxusLogo } from './nuxus-logo';

/**
 * NEXUS AI TERMINAL V2.0 «GEMINI EDITION»
 * Ультра-современный интерфейс в стиле Gemini.
 */
export default function NuxusAiView() {
  const { user } = useUser();
  const { toast } = useToast();
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.08)_0%,transparent_50%)] pointer-events-none" />
      
      {/* Header */}
      <header className="px-6 pt-12 pb-6 shrink-0 z-20 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-xl">
               <BrainCircuit className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="flex flex-col">
               <h1 className="text-xl font-black text-white italic tracking-tighter uppercase">Nexus AI</h1>
               <span className="text-[7px] font-black text-primary/40 uppercase tracking-[0.4em]">Sovereign Mind v2.0</span>
            </div>
         </div>
         <div className="flex items-center gap-2 opacity-40">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[8px] font-black text-white uppercase tracking-widest">Neural Link Active</span>
         </div>
      </header>

      <ScrollArea className="flex-1 px-4 md:px-20 lg:px-40">
        <div className="max-w-4xl mx-auto py-10 space-y-10">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-12 animate-in fade-in zoom-in-95 duration-1000">
               <div className="relative">
                  <div className="absolute -inset-16 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
                  <NuxusLogo size={180} />
               </div>
               <div className="space-y-4 max-w-lg">
                  <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Чем я могу помочь?</h3>
                  <p className="text-sm text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                    Я — суверенный разум Ядра Nuxus. <br/> Могу анализировать данные, искать в сети и писать код.
                  </p>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                  <QuickCommand icon={Globe} text="Мировые новости" onClick={setInput} />
                  <QuickCommand icon={Cpu} text="Помощь с кодом" onClick={setInput} />
                  <QuickCommand icon={Sparkles} text="Идеи для фото" onClick={setInput} />
               </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex w-full flex-col gap-3 animate-in slide-in-from-bottom-4 duration-500", msg.role === 'user' ? "items-end" : "items-start")}>
               <div className={cn(
                 "p-6 rounded-[2.5rem] shadow-2xl relative border-2 max-w-[85%]",
                 msg.role === 'user' 
                  ? "bg-primary/10 border-primary/20 text-white rounded-br-none" 
                  : "bg-white/[0.03] border-white/5 text-white/90 rounded-bl-none"
               )}>
                  <p className="text-[15px] font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
               </div>
               <span className="text-[8px] font-black uppercase text-white/20 tracking-widest px-4">
                 {msg.role === 'user' ? 'Узел' : 'Nexus AI'}
               </span>
            </div>
          ))}

          {isThinking && (
            <div className="flex flex-col gap-3 items-start animate-in fade-in duration-300">
               <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] rounded-bl-none flex items-center gap-6 shadow-2xl">
                  <div className="flex gap-2">
                     <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                     <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                     <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Синхронизация нейронов...</span>
               </div>
            </div>
          )}
          <div ref={scrollRef} className="h-10" />
        </div>
      </ScrollArea>

      {/* Gemini-Style Input Area */}
      <div className="shrink-0 z-30 pb-[calc(2rem+env(safe-area-inset-bottom))] px-6">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 blur-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-700" />
          <div className="relative bg-white/[0.03] backdrop-blur-3xl border-2 border-white/10 rounded-[3rem] p-3 flex items-end gap-3 shadow-[0_30px_100px_rgba(0,0,0,0.8)] focus-within:border-primary/40 transition-all duration-500">
             <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full text-white/20 hover:text-white shrink-0">
                <Mic className="w-6 h-6" />
             </Button>
             <Textarea 
               ref={textareaRef}
               placeholder="Спросите Nexus AI..." 
               value={input}
               onChange={e => setInput(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
               className="bg-transparent border-none focus-visible:ring-0 text-white min-h-[48px] max-h-40 py-3.5 px-2 resize-none text-[16px] font-medium tracking-tight scrollbar-hide flex-1"
             />
             <Button 
               onClick={handleSend}
               disabled={!input.trim() || isThinking}
               className={cn(
                 "h-12 w-12 rounded-full shrink-0 shadow-2xl active:scale-90 transition-all duration-500",
                 input.trim() ? "bg-primary text-white scale-110" : "bg-white/5 text-white/20"
               )}
             >
               {isThinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
             </Button>
          </div>
          <p className="mt-4 text-center text-[8px] font-black uppercase text-white/10 tracking-[0.4em]">
            Nexus AI может ошибаться. Проверяйте важные сигналы.
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickCommand({ icon: Icon, text, onClick }: { icon: any, text: string, onClick: (t: string) => void }) {
  return (
    <button 
      onClick={() => onClick(text)}
      className="p-5 bg-white/[0.02] border border-white/10 rounded-3xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all text-left flex flex-col gap-4 group"
    >
      <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
         <Icon className="w-5 h-5" />
      </div>
      <span>{text}</span>
    </button>
  );
}
