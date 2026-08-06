
"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { X, Eye, Heart, Smile, Loader2, Share2, Send } from 'lucide-react';
import { useAppState } from '@/lib/store';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase/provider';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Story, User } from '@/lib/types';
import { cn, formatDisplayName } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

const STORY_REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '💯', '👏'];

/**
 * STORY VIEWER MODAL V5.2.0
 * FIXED: Direct imports from provider.
 */
export function StoryViewerModal() {
  const { user } = useUser();
  const db = useFirestore();
  const { storiesToView, setStoriesToView } = useAppState();
  const { toast } = useToast();
  
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStory = storiesToView?.[index];
  const storyUserRef = useMemoFirebase(() => (!db || !currentStory) ? null : doc(db, 'users', currentStory.userId), [db, currentStory]);
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
    if (progress >= 100) {
      next();
    }
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
      setProgress(p => {
        if (p >= 100) return 100;
        return p + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [storiesToView, index, isPaused, currentStory, hasError, showReactions]);

  useEffect(() => {
    if (!db || !user || !currentStory || currentStory.viewers.includes(user.uid)) return;
    updateDoc(doc(db, 'stories', currentStory.id), {
      viewers: arrayUnion(user.uid)
    });
  }, [db, user, currentStory]);

  const handleReaction = async (emoji: string) => {
    if (!db || !user || !currentStory) return;
    const storyRef = doc(db, 'stories', currentStory.id);
    const hasReacted = currentStory.reactions?.[emoji]?.includes(user.uid);
    
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }

    if (hasReacted) {
      await updateDoc(storyRef, { [`reactions.${emoji}`]: arrayRemove(user.uid) });
    } else {
      await updateDoc(storyRef, { [`reactions.${emoji}`]: arrayUnion(user.uid) });
    }
    setShowReactions(false);
  };

  const handleShare = async () => {
    if (!currentStory) return;
    const shareUrl = `${window.location.origin}/?ref=${currentStory.userId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nuxus Moment',
          text: `Посмотрите момент от ${storyUser?.name || 'пользователя Nuxus'}`,
          url: shareUrl,
        });
      } catch (e) {
        console.warn("Share failed");
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({ title: "Ссылка скопирована", description: "Отправьте её друзьям для входа в Ядро." });
    }
  };

  if (!storiesToView || !currentStory) return null;

  return (
    <Dialog open={!!storiesToView} onOpenChange={(o) => !o && setStoriesToView(null)}>
      <DialogPortal>
        <DialogOverlay className="bg-black/95 backdrop-blur-3xl z-[2000]" />
        <DialogContent className="max-w-[100vw] w-full h-[100dvh] p-0 bg-transparent border-none overflow-hidden z-[2100] rounded-none outline-none flex items-center justify-center">
          <DialogTitle className="sr-only">Просмотр Момента</DialogTitle>
          
          <div className="relative w-full h-full md:max-w-[450px] md:h-[90vh] md:rounded-[2rem] md:overflow-hidden bg-[#0a0a0c] shadow-2xl flex flex-col items-center justify-center">
            
            {/* Progress Bars */}
            <div className="absolute top-4 left-4 right-4 z-[2200] flex gap-1.5 px-2">
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
            <div className="absolute top-10 left-0 right-0 z-[2200] flex items-center justify-between px-6">
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
                <Button variant="ghost" size="icon" className="text-white h-10 w-10 rounded-full hover:bg-white/10" onClick={handleShare}><Share2 className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" className="text-white h-10 w-10 rounded-full hover:bg-white/10" onClick={() => setStoriesToView(null)}><X className="w-6 h-6" /></Button>
              </div>
            </div>

            {/* Media Content */}
            <div 
              className="w-full h-full flex items-center justify-center bg-black"
              onMouseDown={() => setIsPaused(true)}
              onMouseUp={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
            >
              {hasError ? (
                <div className="flex flex-col items-center gap-4 text-white/40">
                  <X className="w-12 h-12" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Ошибка загрузки момента</p>
                </div>
              ) : currentStory.contentType === 'video' ? (
                <video 
                  src={currentStory.content} 
                  className="w-full h-full object-contain" 
                  autoPlay 
                  muted 
                  playsInline 
                  onEnded={next}
                  onError={() => setHasError(true)}
                />
              ) : (
                <img 
                  src={currentStory.content} 
                  className="w-full h-full object-contain" 
                  alt="Story"
                  onError={() => setHasError(true)}
                />
              )}
            </div>

            {/* Navigation Overlay */}
            <div className="absolute inset-0 z-[2150] flex">
              <div className="flex-1 h-full cursor-pointer" onClick={prev} />
              <div className="flex-1 h-full cursor-pointer" onClick={next} />
            </div>

            {/* Caption */}
            {currentStory.caption && (
              <div className="absolute bottom-32 left-0 right-0 z-[2200] px-8 text-center pointer-events-none">
                <p className="text-white text-lg font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
                  {currentStory.caption}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="absolute bottom-10 left-0 right-0 z-[2200] flex items-center justify-between px-8">
              <div className="flex gap-2">
                <Popover open={showReactions} onOpenChange={setShowReactions}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-xl text-white hover:bg-white/20">
                      <Smile className="w-6 h-6" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-auto p-2 bg-black/80 backdrop-blur-3xl border-white/10 rounded-full flex gap-1 mb-4">
                    {STORY_REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(emoji)}
                        className="text-2xl p-2 hover:scale-125 active:scale-90 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
                
                {currentStory.userId === user?.uid && (
                  <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-6 py-2.5 rounded-full border border-white/10">
                    <Eye className="w-4 h-4 text-white" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{currentStory.viewers?.length || 0}</span>
                  </div>
                )}
              </div>

              {/* Reactions Display */}
              {currentStory.reactions && Object.entries(currentStory.reactions).some(([_, uids]) => uids.length > 0) && (
                <div className="flex gap-1.5">
                  {Object.entries(currentStory.reactions).map(([emoji, uids]) => uids.length > 0 && (
                    <div key={emoji} className="flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 px-2 py-1 shadow-xl">
                      <span className="text-sm">{emoji}</span>
                      <span className="text-[10px] font-black text-white">{uids.length}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
