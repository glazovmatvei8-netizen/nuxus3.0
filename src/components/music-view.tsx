
"use client"

import React, { useState } from 'react';
import { useAppState } from '@/lib/app-state';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Music, Play, Plus, Star, TrendingUp, Radio, Headphones, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Track } from '@/lib/types';

/**
 * ГЛОБАЛЬНАЯ МЕДИАТЕКА NUXUS V3.0 (HI-FI STREAMS)
 * ИСПРАВЛЕНО: Путь импорта useAppState.
 */
const NUXUS_LIBRARY: Track[] = [
  { 
    id: 'm1', 
    title: 'Midnight Lofi', 
    artist: 'Nuxus Ambient', 
    url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_180873742b.mp3', 
    coverUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=400&h=400&auto=format&fit=crop', 
    duration: 180 
  },
  { 
    id: 'm2', 
    title: 'Cyberpunk Drive', 
    artist: 'Synth-Wave Core', 
    url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3', 
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&h=400&auto=format&fit=crop', 
    duration: 215 
  },
  { 
    id: 'm3', 
    title: 'Phonk Signal', 
    artist: 'Shadow Runner', 
    url: 'https://cdn.pixabay.com/audio/2023/09/18/audio_83456723.mp3', 
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&h=400&auto=format&fit=crop', 
    duration: 145 
  },
  { 
    id: 'm4', 
    title: 'Neon Dreams', 
    artist: 'Vector Graphics', 
    url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_7ac345bd67.mp3', 
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&h=400&auto=format&fit=crop', 
    duration: 260 
  },
  { 
    id: 'm5', 
    title: 'Quantum Chill', 
    artist: 'Deep Space Beats', 
    url: 'https://cdn.pixabay.com/audio/2021/11/25/audio_912345bc89.mp3', 
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&h=400&auto=format&fit=crop', 
    duration: 320 
  }
];

export default function MusicView() {
  const { setCurrentTrack, setIsPlayingMusic, currentTrack } = useAppState();
  const [search, setSearch] = useState('');

  const filteredTracks = NUXUS_LIBRARY.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.artist.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-4 pt-6 pb-2 shrink-0">
        <h1 className="text-[28px] md:text-[32px] font-black text-white tracking-tight mb-6 flex items-center gap-3 italic uppercase">
          Music <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20 not-italic">HI-FI FLOW</span>
        </h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input 
            placeholder="Треки, артисты, плейлисты..." 
            className="pl-10 bg-[#1c1c1e] border-none rounded-2xl h-12 text-[15px] focus:ring-1 focus:ring-primary/40" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4">
          <MusicTab icon={TrendingUp} label="Тренды" active />
          <MusicTab icon={Zap} label="Энергия" />
          <MusicTab icon={Headphones} label="Концентрация" />
          <MusicTab icon={Radio} label="Радио" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 space-y-1 pb-40">
          {filteredTracks.map(track => (
            <div 
              key={track.id} 
              className={cn(
                "flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group",
                currentTrack?.id === track.id && "bg-primary/10 border border-primary/20 shadow-[0_0_20px_rgba(139,92,247,0.1)]"
              )}
              onClick={() => {
                setCurrentTrack(track);
                setIsPlayingMusic(true);
              }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-white/5 shadow-md bg-white/5">
                  {track.coverUrl ? (
                    <img src={track.coverUrl} className="w-full h-full object-cover" alt={track.title} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Music className="w-5 h-5 opacity-20" /></div>
                  )}
                  <div className={cn(
                    "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity",
                    currentTrack?.id === track.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    <Play className="w-5 h-5 text-white fill-current" />
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={cn("font-bold text-[15px] truncate", currentTrack?.id === track.id ? "text-primary" : "text-white")}>
                    {track.title}
                  </span>
                  <span className="text-[12px] text-muted-foreground/60 truncate font-medium uppercase tracking-wider">{track.artist}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white rounded-full">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {filteredTracks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <Music className="w-16 h-16 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-center">Сигнал не найден</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function MusicTab({ icon: Icon, label, active }: { icon: any, label: string, active?: boolean }) {
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
