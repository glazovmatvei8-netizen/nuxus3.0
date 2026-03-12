
"use client"

import React, { useState } from 'react';
import { useAppState } from '@/lib/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Music, Play, Plus, MoreVertical, Star, Heart, TrendingUp, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Track } from '@/lib/types';

const MOCK_TRACKS: Track[] = [
  { id: '1', title: 'Quantum Drift', artist: 'Nuxus Core', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', coverUrl: 'https://picsum.photos/seed/music1/300/300', duration: 240 },
  { id: '2', title: 'Cyber Pulse', artist: 'Neon Signal', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', coverUrl: 'https://picsum.photos/seed/music2/300/300', duration: 180 },
  { id: '3', title: 'Deep Space', artist: 'Prime Admin', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', coverUrl: 'https://picsum.photos/seed/music3/300/300', duration: 300 },
  { id: '4', title: 'Hyper Drive', artist: 'VncNode', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', coverUrl: 'https://picsum.photos/seed/music4/300/300', duration: 215 },
  { id: '5', title: 'Neural Network', artist: 'AI Ghost', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', coverUrl: 'https://picsum.photos/seed/music5/300/300', duration: 195 },
];

export default function MusicView() {
  const { setCurrentTrack, setIsPlayingMusic, currentTrack } = useAppState();
  const [search, setSearch] = useState('');

  const filteredTracks = MOCK_TRACKS.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.artist.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-4 pt-6 pb-2 shrink-0">
        <h1 className="text-[32px] font-black text-white tracking-tight mb-6 flex items-center gap-3">
          Музыка <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20">BETA</span>
        </h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input 
            placeholder="Треки, исполнители, альбомы" 
            className="pl-10 bg-[#1c1c1e] border-none rounded-2xl h-12 text-[15px]" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4">
          <MusicTab icon={TrendingUp} label="Тренды" active />
          <MusicTab icon={Heart} label="Для вас" />
          <MusicTab icon={Radio} label="Радио" />
          <MusicTab icon={Star} label="Новинки" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 space-y-1 pb-32">
          {filteredTracks.map(track => (
            <div 
              key={track.id} 
              className={cn(
                "flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group",
                currentTrack?.id === track.id && "bg-primary/10 border border-primary/20"
              )}
              onClick={() => {
                setCurrentTrack(track);
                setIsPlayingMusic(true);
              }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0">
                  <img src={track.coverUrl} className="w-full h-full object-cover" alt={track.title} />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-white fill-current" />
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={cn("font-bold text-[15px] truncate", currentTrack?.id === track.id ? "text-primary" : "text-white")}>
                    {track.title}
                  </span>
                  <span className="text-[12px] text-muted-foreground/60 truncate">{track.artist}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
                  <Plus className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function MusicTab({ icon: Icon, label, active }: { icon: any, label: string, active?: boolean }) {
  return (
    <button className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
      active ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 text-muted-foreground hover:bg-white/10"
    )}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
