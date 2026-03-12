
"use client"

import React, { useState } from 'react';
import { useAppState } from '@/lib/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Music, Play, Plus, MoreVertical, Star, Heart, TrendingUp, Radio, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Track } from '@/lib/types';

/**
 * ГЛОБАЛЬНАЯ МЕДИАТЕКА NUXUS (2015-2026)
 */
const NUXUS_LIBRARY: Track[] = [
  { id: 'm1', title: 'Me gustas tu', artist: 'Manu Chao (Nuxus Remix)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', coverUrl: 'https://picsum.photos/seed/me-gustas/400/400', duration: 210 },
  { id: 'm2', title: '222', artist: 'Hyper-Signal', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', coverUrl: 'https://picsum.photos/seed/222/400/400', duration: 185 },
  { id: 'm3', title: 'Против царя', artist: 'Shadow-Core', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', coverUrl: 'https://picsum.photos/seed/tsar/400/400', duration: 145 },
  { id: 'm4', title: 'Quantum Drift', artist: 'Nuxus Prime', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', coverUrl: 'https://picsum.photos/seed/drift/400/400', duration: 220 },
  { id: 'm5', title: 'Blinding Lights', artist: 'The Weeknd', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', coverUrl: 'https://picsum.photos/seed/weeknd/400/400', duration: 200 },
  { id: 'm6', title: 'Cyberpunk 2077 Night', artist: 'Keanu R.', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', coverUrl: 'https://picsum.photos/seed/cyber/400/400', duration: 310 },
  { id: 'm7', title: 'Phonk Signal', artist: 'Ghostface Playa', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', coverUrl: 'https://picsum.photos/seed/phonk/400/400', duration: 120 },
  { id: 'm8', title: 'Lovely', artist: 'Billie Eilish', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', coverUrl: 'https://picsum.photos/seed/billie/400/400', duration: 201 },
  { id: 'm9', title: 'Starboy', artist: 'The Weeknd', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', coverUrl: 'https://picsum.photos/seed/starboy/400/400', duration: 230 },
  { id: 'm10', title: 'Industry Baby', artist: 'Lil Nas X', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', coverUrl: 'https://picsum.photos/seed/industry/400/400', duration: 212 },
  { id: 'm11', title: 'Heat Waves', artist: 'Glass Animals', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', coverUrl: 'https://picsum.photos/seed/heat/400/400', duration: 238 },
  { id: 'm12', title: 'As It Was', artist: 'Harry Styles', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', coverUrl: 'https://picsum.photos/seed/harry/400/400', duration: 167 },
  { id: 'm13', title: 'The Motto', artist: 'Tiësto', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', coverUrl: 'https://picsum.photos/seed/tiesto/400/400', duration: 164 },
  { id: 'm14', title: 'Enemy', artist: 'Imagine Dragons', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3', coverUrl: 'https://picsum.photos/seed/dragons/400/400', duration: 173 },
  { id: 'm15', title: 'Another Love', artist: 'Tom Odell', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3', coverUrl: 'https://picsum.photos/seed/love/400/400', duration: 244 },
  { id: 'm16', title: 'Bad Habit', artist: 'Steve Lacy', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3', coverUrl: 'https://picsum.photos/seed/habit/400/400', duration: 232 },
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
        <h1 className="text-[32px] font-black text-white tracking-tight mb-6 flex items-center gap-3 italic uppercase">
          Music <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20 not-italic">KERNEL 2.0</span>
        </h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input 
            placeholder="Треки, артисты, альбомы..." 
            className="pl-10 bg-[#1c1c1e] border-none rounded-2xl h-12 text-[15px] focus:ring-1 focus:ring-primary/40" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4">
          <MusicTab icon={TrendingUp} label="Тренды" active />
          <MusicTab icon={Star} label="Новинки" />
          <MusicTab icon={Headphones} label="Подборки" />
          <MusicTab icon={Radio} label="Радио" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 space-y-1 pb-32">
          {filteredTracks.map(track => (
            <div 
              key={track.id} 
              className={cn(
                "flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group",
                currentTrack?.id === track.id && "bg-primary/10 border border-primary/20 shadow-[0_0_20px_rgba(139,92,246,0.1)]"
              )}
              onClick={() => {
                setCurrentTrack(track);
                setIsPlayingMusic(true);
              }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-white/5 shadow-md">
                  <img src={track.coverUrl} className="w-full h-full object-cover" alt={track.title} />
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
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white rounded-full">
                  <Plus className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white rounded-full">
                  <MoreVertical className="w-4 h-4" />
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
