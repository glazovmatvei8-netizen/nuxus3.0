
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { X, ChevronLeft, ChevronRight, Eye, MoreHorizontal, Trash2 } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';
import type { Story } from '@/lib/types';

interface StoryViewerProps {
  stories: Story[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoryViewerModal({ stories, open, onOpenChange }: StoryViewerProps) {
  const { user } = useUser();
  const db = useFirestore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const activeStory = stories[currentIndex];
  const isMyStory = user && activeStory.userId === user.uid;

  const nextStory = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onOpenChange(false);
    }
  }, [currentIndex, stories.length, onOpenChange]);

  const prevStory = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // View logic
  useEffect(() => {
    if (open && activeStory && user && !isMyStory && !activeStory.views?.includes(user.uid)) {
      const storyRef = doc(db, 'users', activeStory.userId, 'stories', activeStory.id);
      updateDoc(storyRef, {
        views: arrayUnion(user.uid)
      }).catch(e => console.error("Error updating views:", e));
    }
  }, [open, activeStory, user, isMyStory, db]);

  // Progress timer
  useEffect(() => {
    if (!open) return;
    const duration = 5000; // 5 seconds per story
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          nextStory();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [open, currentIndex, nextStory]);

  const handleDelete = () => {
    if (!db || !activeStory) return;
    if (confirm('Удалить эту историю?')) {
      deleteDocumentNonBlocking(doc(db, 'users', activeStory.userId, 'stories', activeStory.id));
      if (stories.length === 1) onOpenChange(false);
      else nextStory();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-black border-none p-0 overflow-hidden h-screen sm:h-[85vh] sm:rounded-[3rem] flex flex-col">
        <DialogHeader className="sr-only"><DialogTitle>Просмотр истории</DialogTitle></DialogHeader>
        
        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 flex gap-1 z-50">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-50"
                style={{ 
                  width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-50">
          <div className="flex items-center gap-3">
            <UserAvatar 
              userId={activeStory.userId} 
              manualAvatarUrl={activeStory.userAvatar} 
              className="h-10 w-10 border-2 border-white/20"
              fallbackName={activeStory.userName}
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white drop-shadow-md">{activeStory.userName}</span>
              <span className="text-[10px] text-white/60 font-medium">{new Date(activeStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isMyStory && (
              <Button variant="ghost" size="icon" className="bg-white/10 hover:bg-white/20 rounded-full text-white" onClick={handleDelete}>
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="bg-white/10 hover:bg-white/20 rounded-full text-white" onClick={() => onOpenChange(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Media Content */}
        <div className="flex-1 relative flex items-center justify-center bg-black">
          {activeStory.contentType === 'image' ? (
            <img src={activeStory.content} className="w-full h-full object-contain" />
          ) : (
            <video src={activeStory.content} className="w-full h-full object-contain" autoPlay loop playsInline />
          )}

          {/* Navigation Overlay */}
          <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-12 w-12 bg-black/20 hover:bg-black/40 rounded-full text-white" onClick={(e) => { e.stopPropagation(); prevStory(); }}>
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 bg-black/20 hover:bg-black/40 rounded-full text-white" onClick={(e) => { e.stopPropagation(); nextStory(); }}>
              <ChevronRight className="w-8 h-8" />
            </Button>
          </div>

          {/* Caption */}
          {activeStory.caption && (
            <div className="absolute bottom-16 left-0 right-0 p-8 text-center bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white text-lg font-medium drop-shadow-lg">{activeStory.caption}</p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        {isMyStory && (
          <div className="p-6 bg-black flex items-center gap-2 shrink-0 border-t border-white/5">
            <Eye className="w-4 h-4 text-white/60" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/60">Просмотров: {activeStory.views?.length || 0}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
