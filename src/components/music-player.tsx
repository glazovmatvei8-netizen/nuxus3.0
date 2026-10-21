"use client"

import React, { useRef, useEffect, useState } from 'react';
import { useAppState } from '@/lib/app-state';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, Volume2, X, Music, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

/**
 * MUSIC PLAYER V5.9.0
 */
export function MusicPlayer() {
  const { currentTrack, setCurrentTrack, isPlayingMusic, setIsPlayingMusic } = useAppState();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState([80]);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume[0] / 100;
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    const audio = audioRef.current;
    
    const playNewTrack = async () => {
      try {
        setHasError(false);
        setIsBuffering(true);
        audio.pause();
        audio.src = currentTrack.url;
        audio.load();
        
        if (isPlayingMusic) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              setIsBuffering(false);
            }).catch(e => {
              console.error("Nuxus Audio: Play blocked", e);
              setIsPlayingMusic(false);
            });
          }
        }
      } catch (e) {
        console.error("Audio track loading error:", e);
        setHasError(true);
        setIsPlayingMusic(false);
      }
    };

    playNewTrack();
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    
    if (isPlayingMusic) {
      audioRef.current.play().catch((err) => {
        console.error("Audio play error in music-player:", err);
        setIsPlayingMusic(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlayingMusic]);

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-[126px] md:bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[650px] h-[64px] md:h-[76px] bg-[#1c1c1e]/90 backdrop-blur-[40px] border border-white/10 rounded-2xl md:rounded-[2.5rem] flex items-center px-3 md:px-5 z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-10 duration-500">
      <audio 
        ref={audioRef} 
        onTimeUpdate={(e) => {
          const p = (e.currentTarget.currentTime / e.currentTarget.duration) * 100;
          if (!isNaN(p)) setProgress(p);
        }}
        onEnded={() => setIsPlayingMusic(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onError={() => setHasError(true)}
      />
      
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-lg relative group bg-white/5">
          {currentTrack.coverUrl ? (
            <img src={currentTrack.coverUrl} className="w-full h-full object-cover" alt="Cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Music className="w-4 h-4 opacity-20" /></div>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-[13px] md:text-[14px] text-white truncate leading-tight">{currentTrack.title}</span>
          <span className="text-[9px] md:text-[10px] text-primary/60 truncate font-black uppercase tracking-widest mt-0.5">{currentTrack.artist}</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 flex-1 px-2 md:px-4">
        <div className="flex items-center gap-3 md:gap-5">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/20 hover:text-white transition-colors hidden sm:flex"><SkipBack className="w-4 h-4 fill-current" /></Button>
          
          <Button 
            className="h-9 w-9 md:h-11 md:w-11 rounded-full bg-white text-black hover:bg-white/90 shadow-xl transition-transform active:scale-90"
            onClick={() => setIsPlayingMusic(!isPlayingMusic)}
          >
            {isBuffering ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            ) : isPlayingMusic ? (
              <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" />
            ) : (
              <Play className="w-4 h-4 md:w-5 md:h-5 fill-current ml-0.5" />
            )}
          </Button>
          
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/20 hover:text-white transition-colors hidden sm:flex"><SkipForward className="w-4 h-4 fill-current" /></Button>
        </div>
        
        <div className="w-full max-w-[150px] md:max-w-[200px] h-[2px] md:h-[3px] bg-white/5 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-primary shadow-[0_0_10px_rgba(139,92,247,0.8)] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0 justify-end">
        <div className="hidden lg:flex items-center gap-2 group">
          <Volume2 className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
          <div className="w-16">
            <Slider value={volume} onValueChange={setVolume} max={100} step={1} />
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 text-white/20 hover:text-red-500 transition-colors" onClick={() => { setCurrentTrack(null); setIsPlayingMusic(false); }}>
          <X className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
      </div>
    </div>
  );
}