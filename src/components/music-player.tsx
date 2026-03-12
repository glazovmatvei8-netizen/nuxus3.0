
"use client"

import React, { useRef, useEffect, useState } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, Volume2, X, Maximize2, Music, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

export function MusicPlayer() {
  const { currentTrack, setCurrentTrack, isPlayingMusic, setIsPlayingMusic } = useAppState();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState([80]);
  const [isBuffering, setIsBuffering] = useState(false);

  // Обработка смены трека и воспроизведения
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    const audio = audioRef.current;

    // При смене трека загружаем новый ресурс
    const playTrack = async () => {
      try {
        if (isPlayingMusic) {
          await audio.play();
        } else {
          audio.pause();
        }
      } catch (e) {
        console.warn("Nuxus Music: Playback prevented by browser policy or error", e);
        setIsPlayingMusic(false);
      }
    };

    playTrack();
  }, [currentTrack, isPlayingMusic, setIsPlayingMusic]);

  // Управление громкостью
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100;
    }
  }, [volume]);

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-[100px] md:bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-[800px] h-[76px] bg-[#1c1c1e]/95 backdrop-blur-[50px] border border-white/10 rounded-[2.5rem] flex items-center px-5 z-[100] shadow-[0_30px_60px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-10 duration-500">
      <audio 
        ref={audioRef} 
        src={currentTrack.url} 
        onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
        onEnded={() => setIsPlayingMusic(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        autoPlay={isPlayingMusic}
      />
      
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="h-12 w-12 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-lg relative group">
          <img src={currentTrack.coverUrl} className="w-full h-full object-cover" alt="Cover" />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-[14px] text-white truncate leading-tight">{currentTrack.title}</span>
          <span className="text-[10px] text-primary/60 truncate font-black uppercase tracking-widest mt-0.5">{currentTrack.artist}</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 flex-1 px-4">
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white transition-colors"><SkipBack className="w-5 h-5 fill-current" /></Button>
          
          <Button 
            className="h-11 w-11 rounded-full bg-white text-black hover:bg-white/90 shadow-2xl shadow-white/10 transition-transform active:scale-90"
            onClick={() => setIsPlayingMusic(!isPlayingMusic)}
          >
            {isBuffering ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlayingMusic ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </Button>
          
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white transition-colors"><SkipForward className="w-5 h-5 fill-current" /></Button>
        </div>
        
        <div className="w-full max-w-[200px] h-[3px] bg-white/5 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-primary shadow-[0_0_10px_rgba(139,92,246,0.8)] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="hidden md:flex items-center gap-4 flex-1 justify-end">
        <div className="flex items-center gap-2 group">
          <Volume2 className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
          <div className="w-20">
            <Slider value={volume} onValueChange={setVolume} max={100} step={1} />
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-10 w-10 text-white/20 hover:text-red-500 transition-colors ml-2" onClick={() => { setCurrentTrack(null); setIsPlayingMusic(false); }}>
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="md:hidden flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-10 w-10 text-white/40" onClick={() => { setCurrentTrack(null); setIsPlayingMusic(false); }}>
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
