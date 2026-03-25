"use client"

import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gamepad2, TrendingUp, Star, Play, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const GAMES = [
  { 
    id: 'g1', 
    title: 'Giga Clicker', 
    description: 'Легендарная кликалка Ядра', 
    url: 'https://gptunnel.ru/s/webapp/69c2328e0ce4179a01700d39',
    coverUrl: 'https://picsum.photos/seed/click/600/400',
    category: 'Arcade'
  }
];

export default function GamesView() {
  const [activeGameUrl, setActiveGameUrl] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  if (activeGameUrl) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
        <div className="h-14 bg-[#1c1c1e] border-b border-white/10 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-white uppercase tracking-widest">Nuxus Game Engine</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setActiveGameUrl(null)} className="h-10 w-10 rounded-full text-white/60 hover:text-white">
            <X className="w-6 h-6" />
          </Button>
        </div>
        <iframe src={activeGameUrl} className="flex-1 w-full border-none" allow="autoplay; gamepad; microphone" />
      </div>
    );
  }

  const filteredGames = GAMES.filter(g => 
    g.title.toLowerCase().includes(search.toLowerCase()) || 
    g.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-4 pt-6 pb-2 shrink-0">
        <h1 className="text-[28px] md:text-[32px] font-black text-white tracking-tight mb-6 flex items-center gap-3 italic uppercase">
          Games <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20 not-italic">PLATFORM</span>
        </h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input 
            placeholder="Поиск игр по названию..." 
            className="pl-10 bg-[#1c1c1e] border-none rounded-2xl h-12 text-[15px] focus:ring-1 focus:ring-primary/40" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4">
          <GameTab icon={TrendingUp} label="Тренды" active />
          <GameTab icon={Star} label="Новинки" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 space-y-6 pb-40">
          <div className="grid grid-cols-1 gap-4">
            {filteredGames.map(game => (
              <div 
                key={game.id} 
                className="group relative h-48 rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl cursor-pointer hover:scale-[1.02] transition-all active:scale-95"
                onClick={() => setActiveGameUrl(game.url)}
              >
                <img src={game.coverUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={game.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1 block">{game.category}</span>
                      <h3 className="text-xl font-black text-white uppercase italic">{game.title}</h3>
                      <p className="text-[10px] text-white/60 font-bold uppercase mt-1">{game.description}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30 group-hover:rotate-[360deg] transition-transform duration-700">
                      <Play className="w-6 h-6 text-white fill-current" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredGames.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <Gamepad2 className="w-16 h-16 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-center">Сигнал потерян</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function GameTab({ icon: Icon, label, active }: { icon: any, label: string, active?: boolean }) {
  return (
    <button className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
      active ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-white/5 text-muted-foreground hover:bg-white/10"
    )}>
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}
