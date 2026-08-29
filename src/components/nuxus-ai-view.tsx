
"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, Loader2, Send, 
  BrainCircuit, RotateCcw, Mic, Wrench
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase'; 
import { collection, query, orderBy, addDoc, serverTimestamp, limit, getDocs, writeBatch, doc } from 'firebase/firestore';
import { askNexusAI } from '@/ai/flows/nuxus-intelligence-flow';
import { cn, isGlobalAdmin } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { NuxusLogo } from './nuxus-logo';
import type { User } from '@/lib/types';

/**
 * NUXUS AI VIEW V63.0 «FIXED IMPORTS»
 * Устранена ошибка (0 , _firebase_provider__WEBPACK_IMPORTED_MODULE_5__.useDoc) is not a function.
 */
export default function NuxusAiView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userProfileRef = useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<User>(userProfileRef);
  const isAdmin = isGlobalAdmin(profile);

  const historyQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'users', user.uid, 'ai_history'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
  }, [db, user?.uid]);

  const { data: messages, isLoading: isHistoryLoading } = useCollection<{role: 'user' | 'model', content: string}>(historyQuery);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking]);

  const handleSend = async () => {
    if (!input.trim() || isThinking || !db || !user) return;
    
    const userMsg = input.trim();
    setInput('');
    setIsThinking(true);

    try {
      const historyRef = collection(db, 'users', user.uid, 'ai_history');
      await addDoc(historyRef, {
        role: 'user',
        content: userMsg,
        createdAt: serverTimestamp(),
      });

      const flowHistory = (messages || []).map(m => ({
        role: m.role,
        content: m.content
      }));

      const { response } = await askNexusAI(userMsg, flowHistory);

      await addDoc(historyRef, {
        role: 'model',
        content: response,
        createdAt: serverTimestamp(),
      });

    } catch (e: any) {
      toast({ title: "Сбой нейронной сети", variant: "destructive" });
    } finally {
      setIsThinking(false);
    }
  };

  const clearHistory = async () => {
    if (!db || !user) return;
    try {
      const snap = await getDocs(collection(db, 'users', user.uid, 'ai_history'));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      toast({ title: "Память очищена" });
    } catch (e) {
      toast({ title: "Сбой очистки", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020205] overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.1)_0%,transparent_60%)] pointer-events-none" />
      
      <header className="px-6 pt-12 pb-6 shrink-0 z-30 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
               <BrainCircuit className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="flex flex-col text-left">
               <h1 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Nuxus AI Studio</h1>
               <span className="text-[7px] font-black text-primary uppercase tracking-[0.4em] mt-1">NODE: DEEPSEEK 4 FLASH</span>
            </div>
         </div>
         <Button variant="ghost" size="icon" onClick={clearHistory} className="h-10 w-10 rounded-xl text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all">
           <RotateCcw className="w-4 h-4" />
         </Button>
      </header>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto py-10 px-4 md:px-8 space-y-12 min-h-full flex flex-col">
          {isHistoryLoading && !messages ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-40">
               <Loader2 className="w-8 h-8 animate-spin text-primary" />
               <p className="text-[10px] font-black uppercase tracking-widest">Загрузка памяти...</p>
            </div>
          ) : messages && messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-16 animate-in fade-in zoom-in-95 duration-1000 my-auto">
               <div className="relative">
                  <div className="absolute -inset-16 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
                  <NuxusLogo size={160} />
               </div>
               <div className="space-y-6 max-w-lg relative z-10">
                  <h3 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-tight">
                    Я — твой узел <br/><span className="text-primary">Yandex AI</span>
                  </h3>
               </div>
            </div>
          ) : (
            <div className="space-y-12 pb-20">
              {messages?.map((msg, i) => (
                <div key={i} className={cn("flex w-full flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500", msg.role === 'user' ? "items-end" : "items-start")}>
                   <div className={cn(
                     "p-6 rounded-[2.5rem] shadow-2xl relative border-2 max-w-[90%] md:max-w-[80%]",
                     msg.role === 'user' 
                      ? "bg-primary/10 border-primary/20 text-white rounded-br-none" 
                      : "bg-white/[0.03] border-white/5 text-white/90 rounded-bl-none backdrop-blur-xl"
                   )}>
                      <p className="text-[16px] font-medium leading-relaxed whitespace-pre-wrap text-left">{msg.content}</p>
                   </div>
                   <div className="flex items-center gap-2 px-6">
                      <span className="text-[8px] font-black uppercase text-white/20 tracking-[0.2em]">
                        {msg.role === 'user' ? 'Узел' : 'DeepSeek 4'}
                      </span>
                   </div>
                </div>
              ))}
              
              {isThinking && (
                <div className="flex flex-col gap-4 items-start animate-in fade-in duration-300">
                   <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] rounded-bl-none flex items-center gap-6 shadow-2xl backdrop-blur-md">
                      <div className="flex gap-2.5">
                         <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                         <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                         <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">Yandex резонанс...</span>
                   </div>
                </div>
              )}
            </div>
          )}
          <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>

      <div className="shrink-0 z-30 pb-[calc(2.5rem+env(safe-area-inset-bottom))] px-6 pt-4">
        <div className="max-w-3xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 blur-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-1000" />
          <div className="relative bg-white/[0.04] backdrop-blur-3xl border-2 border-white/10 rounded-[3.5rem] p-3 flex items-end gap-3 shadow-[0_30px_100px_rgba(0,0,0,0.8)] focus-within:border-primary/40 transition-all duration-500 group-hover:border-white/20">
             <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full text-white/20 hover:text-white shrink-0 hover:bg-white/5 transition-all">
                <Mic className="w-6 h-6" />
             </Button>
             <Textarea 
               placeholder="Спросите у ИИ..." 
               value={input}
               onChange={e => setInput(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
               className="bg-transparent border-none focus-visible:ring-0 text-white min-h-[48px] max-h-60 py-3.5 px-2 resize-none text-[17px] font-medium tracking-tight scrollbar-hide flex-1 placeholder:text-white/20"
             />
             <Button 
               onClick={handleSend}
               disabled={!input.trim() || isThinking}
               className={cn(
                 "h-12 w-12 rounded-full shrink-0 shadow-2xl active:scale-90 transition-all duration-500",
                 input.trim() ? "bg-primary text-white scale-105 shadow-primary/30" : "bg-white/5 text-white/10"
               )}
             >
               {isThinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
