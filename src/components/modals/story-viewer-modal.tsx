
"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { X, Eye, Heart, Smile, Loader2, Share2, Send } from 'lucide-react';
import { useAppState } from '@/lib/app-state';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Story, User } from '@/lib/types';
import { cn, formatDisplayName } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

const STORY_REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '💯', '👏'];

/**
 * STORY VIEWER MODAL V12.0.1 «HYPER-ENGINE READY»
 * FIXED: Hydration mismatch by deferring relative date formatting to client-side.
 */
export function StoryViewerModal() {
  const { user } = useUser();
  const db = useFirestore();
  const { storiesToView, setStoriesToView } = useAppState();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStory = storiesToView?.[index];
  const storyUserRef = React.useMemo(() => (!db || !currentStory) ? null : doc(db, 'users', currentStory.userId), [db, currentStory]);
  const { data: storyUser } = useDoc<User>(storyUserRef);

  const next = useCallback(() => {
    if (!storiesToView) return;
    if (index < storiesToView.length - 1) {
      setIndex(prev => prev + 1);
      setProgress(0);
      setHasError(false);
    } else {
      setStoriesToView(null);
    }
  }, [index, storiesToView, setStoriesToView]);

  const prev = useCallback(() => {
    if (index > 0) {
      setIndex(prev => prev - 1);
      setProgress(0);
      setHasError(false);
    }
  }, [index]);

  useEffect(() => {
    if (progress >= 100) next();
  }, [progress, next]);

  useEffect(() => {
    if (!storiesToView) {
      setIndex(0);
      setProgress(0);
      setHasError(false);
      return;
    }
    if (isPaused || hasError || showReactions) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const duration = currentStory?.contentType === 'video' ? 10000 : 5000;
    const interval = 50;
    const step = (interval / duration) * 100;
    timerRef.current = setInterval(() => {
      setProgress(p => (p >= 100 ? 100 : p + step));
    }, interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [storiesToView, index, isPaused, currentStory, hasError, showReactions]);

  useEffect(() => {
    if (!db || !user || !currentStory || currentStory.viewers.includes(user.uid)) return;
    updateDoc(doc(db, 'stories', currentStory.id), { viewers: arrayUnion(user.uid) });
  }, [db, user, currentStory]);

  const handleReaction = async (emoji: string) => {
    if (!db || !user || !currentStory) return;
    const storyRef = doc(db, 'stories', currentStory.id);
    const hasReacted = currentStory.reactions?.[emoji]?.includes(user.uid);
    if (hasReacted) {
      await updateDoc(storyRef, { [`reactions.${emoji}`]: arrayRemove(user.uid) });
    } else {
      await updateDoc(storyRef, { [`reactions.${emoji}`]: arrayUnion(user.uid) });
    }
    setShowReactions(false);
  };

  if (!storiesToView || !currentStory) return null;

  return (
    <Dialog open={!!storiesToView} onOpenChange={(o) => !o && setStoriesToView(null)}>
      <DialogPortal>
        <DialogOverlay className="bg-black/95 backdrop-blur-3xl z-[2000]" />
        <DialogContent className="max-w-[100vw] w-full h-[100dvh] p-0 bg-transparent border-none overflow-hidden z-[2100] outline-none flex items-center justify-center">
          <DialogTitle className="sr-only">Просмотр Момента</DialogTitle>
          <div className="relative w-full h-full md:max-w-[450px] md:h-[90vh] md:rounded-[2rem] md:overflow-hidden bg-[#0a0a0c] shadow-2xl flex flex-col items-center justify-center">
            <div className="absolute top-4 left-4 right-4 z-[2200] flex gap-1.5 px-2">
              {storiesToView.map((_, i) => (
                <div key={i} className="h-[3px] flex-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all duration-75 ease-linear" style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }} />
                </div>
              ))}
            </div>
            <div className="absolute top-10 left-0 right-0 z-[2200] flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <UserAvatar userId={currentStory.userId} className="h-10 w-10 border-2 border-white/20" manualAvatarUrl={storyUser?.avatarUrl} />
                <div className="flex flex-col text-left">
                  <span className="text-white font-black text-sm uppercase tracking-wider">{formatDisplayName(storyUser?.name || '...')}</span>
                  <span className="text-[9px] text-white/60 font-bold uppercase">
                    {mounted ? formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true, locale: ru }) : '...'}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-white h-10 w-10 rounded-full" onClick={() => setStoriesToView(null)}><X className="w-6 h-6" /></Button>
            </div>
            <div className="w-full h-full flex items-center justify-center bg-black" onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)}>
              {currentStory.contentType === 'video' ? (
                <video src={currentStory.content} className="w-full h-full object-contain" autoPlay muted playsInline onEnded={next} onError={() => setHasError(true)} />
              ) : (
                <img src={currentStory.content} className="w-full h-full object-contain" alt="Story" onError={() => setHasError(true)} />
              )}
            </div>
            <div className="absolute inset-0 z-[2150] flex">
              <div className="flex-1 h-full" onClick={prev} />
              <div className="flex-1 h-full" onClick={next} />
            </div>
            <div className="absolute bottom-10 left-0 right-0 z-[2200] flex items-center justify-between px-8">
              <Popover open={showReactions} onOpenChange={setShowReactions}>
                <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-white/10 text-white"><Smile className="w-6 h-6" /></Button></PopoverTrigger>
                <PopoverContent className="w-auto p-2 bg-black/80 rounded-full flex gap-1 mb-4">
                  {STORY_REACTIONS.map(emoji => (<button key={emoji} onClick={() => handleReaction(emoji)} className="text-2xl p-2 hover:scale-125 transition-transform">{emoji}</button>))}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
