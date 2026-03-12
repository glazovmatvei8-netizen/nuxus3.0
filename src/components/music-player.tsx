
"use client"

import React, { useRef, useEffect, useState } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, Volume2, X, Maximize2, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

export function MusicPlayer() {
  const { currentTrack, setCurrentTrack, isPlayingMusic, setIsPlayingMusic } = useAppState();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState([80]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlayingMusic) audioRef.current.play().catch(() => setIsPlayingMusic(false));
      else audioRef.current.pause();
    }
  }, [isPlayingMusic, currentTrack]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume[0] / 100;
  }, [volume]);

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-[100px] md:bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-[800px] h-[72px] bg-[#1c1c1e]/90 backdrop-blur-[40px] border border-white/10 rounded-3xl flex items-center px-4 z-[100] shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
      <audio 
        ref={audioRef} 
        src={currentTrack.url} 
        onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
        onEnded={() => setIsPlayingMusic(false)}
      />
      
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-lg relative group">
          <img src={currentTrack.coverUrl} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-[14px] text-white truncate">{currentTrack.title}</span>
          <span className="text-[11px] text-muted-foreground truncate">{currentTrack.artist}</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 flex-1 px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40"><SkipBack className="w-5 h-5 fill-current" /></Button>
          <Button 
            className="h-10 w-10 rounded-full bg-white text-black hover:bg-white/90 shadow-xl"
            onClick={() => setIsPlayingMusic(!isPlayingMusic)}
          >
            {isPlayingMusic ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40"><SkipForward className="w-5 h-5 fill-current" /></Button>
        </div>
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="hidden md:flex items-center gap-3 flex-1 justify-end">
        <Volume2 className="w-4 h-4 text-white/40" />
        <div className="w-24">
          <Slider value={volume} onValueChange={setVolume} max={100} step={1} />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 ml-2" onClick={() => setCurrentTrack(null)}>
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="md:hidden flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-10 w-10 text-white/40" onClick={() => setCurrentTrack(null)}>
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
