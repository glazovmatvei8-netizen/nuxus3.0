
"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { X, ChevronLeft, ChevronRight, Eye, MoreHorizontal, Loader2 } from 'lucide-react';
import { useAppState } from '@/lib/store';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import type { Story, User } from '@/lib/types';
import { cn, formatDisplayName } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export function StoryViewerModal() {
  const { user } = useUser();
  const db = useFirestore();
  const { storiesToView, setStoriesToView } = useAppState();
  
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStory = storiesToView?.[index];
  const storyUserRef = useMemoFirebase(() => (!db || !currentStory) ? null : doc(db, 'users', currentStory.userId), [db, currentStory]);
  const { data: storyUser } = useDoc<User>(storyUserRef);

  const next = useCallback(() => {
    if (!storiesToView) return;
    if (index < storiesToView.length - 1) {
      setIndex(prev => prev + 1);
      setProgress(0);
    } else {
      setStoriesToView(null);
    }
  }, [index, storiesToView, setStoriesToView]);

  const prev = useCallback(() => {
    if (index > 0) {
      setIndex(prev => prev - 1);
      setProgress(0);
    }
  }, [index]);

  useEffect(() => {
    if (!storiesToView) {
      setIndex(0);
      setProgress(0);
      return;
    }

    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const duration = currentStory?.contentType === 'video' ? 10000 : 5000;
    const interval = 50;
    const step = (interval / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          next();
          return 0;
        }
        return p + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [storiesToView, index, isPaused, next, currentStory]);

  // Mark as viewed
  useEffect(() => {
    if (!db || !user || !currentStory || currentStory.viewers.includes(user.uid)) return;
    updateDoc(doc(db, 'stories', currentStory.id), {
      viewers: arrayUnion(user.uid)
    });
  }, [db, user, currentStory]);

  if (!storiesToView || !currentStory) return null;

  return (
    <Dialog open={!!storiesToView} onOpenChange={(o) => !o && setStoriesToView(null)}>
      <DialogContent className="max-w-[100vw] w-full h-[100dvh] p-0 bg-black border-none overflow-hidden z-[2000] rounded-none outline-none">
        <DialogTitle className="sr-only">Просмотр Момента</DialogTitle>
        
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Progress Bars */}
          <div className="absolute top-4 left-4 right-4 z-[2100] flex gap-1.5 px-2">
            {storiesToView.map((_, i) => (
              <div key={i} className="h-[3px] flex-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-75 ease-linear" 
                  style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-10 left-0 right-0 z-[2100] flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <UserAvatar userId={currentStory.userId} className="h-10 w-10 border-2 border-white/20" manualAvatarUrl={storyUser?.avatarUrl} />
              <div className="flex flex-col">
                <span className="text-white font-black text-sm uppercase tracking-wider">{formatDisplayName(storyUser?.name || '...')}</span>
                <span className="text-[9px] text-white/60 font-bold uppercase">
                  {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true, locale: ru })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-white h-10 w-10" onClick={() => setStoriesToView(null)}><X className="w-6 h-6" /></Button>
            </div>
          </div>

          {/* Media Content */}
          <div 
            className="w-full h-full"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {currentStory.contentType === 'video' ? (
              <video 
                src={currentStory.content} 
                className="w-full h-full object-cover" 
                autoPlay 
                muted 
                playsInline 
                onEnded={next}
              />
            ) : (
              <img src={currentStory.content} className="w-full h-full object-cover" />
            )}
          </div>

          {/* Navigation Overlay */}
          <div className="absolute inset-0 z-[2050] flex">
            <div className="flex-1 h-full cursor-pointer" onClick={prev} />
            <div className="flex-1 h-full cursor-pointer" onClick={next} />
          </div>

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-20 left-0 right-0 z-[2100] px-8 text-center">
              <p className="text-white text-lg font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Footer (Viewers) */}
          {currentStory.userId === user?.uid && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2100] flex items-center gap-2 bg-black/40 backdrop-blur-xl px-6 py-2.5 rounded-full border border-white/10">
              <Eye className="w-4 h-4 text-white" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{currentStory.viewers?.length || 0}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
