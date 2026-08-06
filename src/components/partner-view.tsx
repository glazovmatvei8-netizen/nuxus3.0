
"use client"

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Code2, Zap, Rocket, ShieldCheck, Cpu, Globe, ArrowRight, MessageSquare, Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NuxusLogo } from './nuxus-logo';

/**
 * PARTNER HUB V1.0 «Spirit Invitation»
 * Специальный раздел для разработчиков ботов.
 */
export default function PartnerView() {
  return (
    <div className="flex flex-col h-full bg-[#020205] overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.1)_0%,transparent_60%)] pointer-events-none" />
      
      <header className="px-6 pt-12 pb-6 shrink-0 z-20 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
               <Code2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col text-left">
               <h1 className="text-xl font-black text-white italic tracking-tighter uppercase">Partner Hub</h1>
               <span className="text-[7px] font-black text-primary/40 uppercase tracking-[0.4em]">Development Node</span>
            </div>
         </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-10 pb-40 animate-in fade-in duration-700">
          
          <div className="text-center space-y-4">
             <div className="flex justify-center mb-6">
                <div className="relative">
                   <div className="absolute -inset-10 bg-primary/20 blur-[60px] rounded-full animate-pulse" />
                   <NuxusLogo size={140} />
                </div>
             </div>
             <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-tight">
               Присоединяйтесь <br/> к экосистеме <span className="text-primary">NUXUS</span>
             </h2>
             <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em] max-w-xs mx-auto leading-relaxed">
               Ваш бот заслуживает работы на протоколе квантового шифрования.
             </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
             <DevCard 
               icon={Cpu} 
               title="QES API" 
               desc="Прямая интеграция сигналов через защищенное Ядро."
               color="text-primary"
             />
             <DevCard 
               icon={Bot} 
               title="Bot UI Kit" 
               desc="Поддержка кнопок, инлайнов и элитной графики."
               color="text-accent"
             />
             <DevCard 
               icon={ShieldCheck} 
               title="Zero Censorship" 
               desc="Свобода контента для ваших игровых механик."
               color="text-green-500"
             />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                <Sparkles className="w-32 h-32 text-primary" />
             </div>
             <div className="space-y-2 relative z-10 text-left">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Специально для Spirit of the Elements</h3>
                <p className="text-[10px] text-primary/60 font-black uppercase tracking-widest leading-relaxed">
                   Мы фанаты вашей игры и подготовили выделенные мощности для вашего «Духа Стихий». 
                </p>
             </div>
             <Button className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all group-hover:scale-[1.02]">
                Связаться с нами <ArrowRight className="ml-2 w-4 h-4" />
             </Button>
          </div>

          <div className="flex flex-col items-center gap-6 opacity-30 pt-10">
             <div className="flex items-center gap-6">
                <Globe className="w-4 h-4" />
                <Zap className="w-4 h-4" />
                <Rocket className="w-4 h-4" />
             </div>
             <span className="text-[7px] font-black uppercase tracking-[0.8em]">Nuxus Kernel Partners v1.0</span>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}

function DevCard({ icon: Icon, title, desc, color }: any) {
  return (
    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] flex gap-5 hover:bg-white/[0.04] transition-all group">
       <div className={cn("w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 shrink-0 group-hover:scale-110 transition-transform", color)}>
          <Icon className="w-6 h-6" />
       </div>
       <div className="flex flex-col gap-1 text-left">
          <span className="text-sm font-black text-white uppercase italic tracking-widest">{title}</span>
          <span className="text-[10px] text-white/40 font-bold uppercase leading-relaxed">{desc}</span>
       </div>
    </div>
  )
}
