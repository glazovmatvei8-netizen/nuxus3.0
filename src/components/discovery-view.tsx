
"use client"

import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, Orbit, CircleDollarSign, TowerControl, 
  Satellite, Microscope, Atom, ChevronRight,
  Sparkles, Layers
} from 'lucide-react';
import { useAppState } from '@/lib/app-state';
import { cn } from '@/lib/utils';

/**
 * NAVIGATOR EXPLORE V95.0 «MASTER REPLICA»
 * Полное визуальное соответствие референсу.
 */
export default function DiscoveryView() {
  const [search, setSearch] = useState('');
  const { setCurrentChatId, setActiveView } = useAppState();

  return (
    <div className="flex flex-col h-full bg-[#121212] overflow-hidden relative">
      {/* Top Header */}
      <div className="px-8 pt-12 pb-4 shrink-0 text-center">
        <h1 className="text-3xl font-black text-primary italic tracking-tighter uppercase">
          EXPLORE
        </h1>
      </div>

      <div className="px-8 pb-6 shrink-0">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]/40" />
          <Input 
            placeholder="Поиск узлов, каналов, пользователей..." 
            className="bg-[#1C1C1E] border-none h-12 rounded-full pl-12 text-sm font-bold text-white placeholder:text-[#8E8E93]/60 focus:ring-1 focus:ring-primary/40 transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-8 pb-40 space-y-10 animate-in fade-in duration-700">
          
          {/* RECOMMENDED NODES */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-black uppercase text-[#8E8E93] tracking-[0.15em] px-1">
              Рекомендуемые узлы
            </h3>
            <ScrollArea className="w-full pb-4">
              <div className="flex gap-4">
                <RecommendCard 
                  icon={<Orbit className="w-8 h-8 text-blue-400" />} 
                  title="Космическая Станция '^Аврора'" 
                  onClick={() => {}}
                />
                <RecommendCard 
                  icon={<CircleDollarSign className="w-8 h-8 text-yellow-500" />} 
                  title="Торговый путь 'Кеплер'" 
                  onClick={() => {}}
                />
                <RecommendCard 
                  icon={<TowerControl className="w-8 h-8 text-primary" />} 
                  title="Звездный маяк" 
                  onClick={() => {}}
                />
              </div>
            </ScrollArea>
          </section>

          {/* CATEGORIES */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-black uppercase text-[#8E8E93] tracking-[0.15em] px-1">
              Категории
            </h3>
            <div className="space-y-2">
              <CategoryItem icon={Satellite} label="Связь и Коммуникации" />
              <CategoryItem icon={GoldBarsIcon} label="Торговля и Ресурсы" />
              <CategoryItem icon={Microscope} label="Наука и Исследования" />
            </div>
          </section>

          {/* ACTIVE EVENTS */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-black uppercase text-[#8E8E93] tracking-[0.15em] px-1">
              Активные События
            </h3>
            <div className="nuxus-event-card p-6 flex items-center gap-6 group cursor-pointer hover:bg-[#1C1C1E]/80 transition-all">
               <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                  <Atom className="w-8 h-8 text-primary relative z-10" />
               </div>
               <div className="flex flex-col text-left">
                  <span className="text-[16px] font-black text-white italic tracking-tight uppercase group-hover:text-primary transition-colors">
                    Квантовый Симпозиум
                  </span>
                  <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest mt-1">
                    28.08.2028 13:18:46
                  </span>
               </div>
            </div>
          </section>

        </div>
      </ScrollArea>
    </div>
  );
}

function RecommendCard({ icon, title, onClick }: any) {
  return (
    <div className="min-w-[160px] p-5 bg-[#1C1C1E] border border-white/[0.03] rounded-[2.5rem] flex flex-col gap-4 shadow-xl group">
       <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center group-hover:bg-primary/5 transition-all">
          {icon}
       </div>
       <div className="flex flex-col gap-1 text-left">
          <span className="text-[12px] font-black text-white italic uppercase leading-tight line-clamp-2 min-h-[32px]">
            {title}
          </span>
          <button 
            onClick={onClick}
            className="mt-2 text-[8px] font-black uppercase tracking-[0.2em] text-primary/60 hover:text-primary transition-colors text-left"
          >
            Присоединиться
          </button>
       </div>
    </div>
  );
}

function CategoryItem({ icon: Icon, label }: any) {
  return (
    <div className="flex items-center justify-between p-5 bg-[#1C1C1E]/60 rounded-[2rem] border border-white/[0.03] hover:bg-[#1C1C1E] transition-all cursor-pointer group">
       <div className="flex items-center gap-5">
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center text-[#8E8E93] group-hover:text-primary transition-colors">
             <Icon className="w-5 h-5" />
          </div>
          <span className="text-[13px] font-black text-white italic uppercase tracking-tight">
            {label}
          </span>
       </div>
       <ChevronRight className="w-4 h-4 text-[#8E8E93]/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </div>
  );
}

function GoldBarsIcon(props: any) {
  return (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 17 2-2 4 4"/><path d="m9 18 3 3 4-4"/><path d="m13 14 8-8"/><path d="m18 6 3 3"/></svg>
  );
}
