"use client"

import React, { useMemo, useState } from 'react';
import { useAppState } from '@/lib/app-state';
import { useUser, useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, query, where, doc } from 'firebase/firestore';
import { UserAvatar } from './user-avatar';
import { Plus, Loader2, Archive } from 'lucide-react';
import type { Story, User } from '@/lib/types';
import { cn, formatDisplayName, isUserPremium } from '@/lib/utils';
import { StoryViewerModal } from './modals/story-viewer-modal';
import { StoryArchiveModal } from './modals/story-archive-modal';
import { useToast } from '@/hooks/use-toast';

/**
 * NUXUS MOMENTS BAR V72.1 «STABILITY PATCH»
 * ИСПРАВЛЕНО: Прямое использование useUser и корректные импорты.
 */
export function StoriesBar() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIsCreateStoryOpen, setStoriesToView } = useAppState();

  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<User>(userRef);

  const storiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    const now = new Date().toISOString();
    return query(collection(db, 'stories'), where('expiresAt', '>', now));
  }, [db]);

  const { data: allStories, isLoading } = useCollection<Story>(storiesQuery);

  const groupedStories = useMemo(() => {
    if (!allStories) return {};
    const groups: Record<string, Story[]> = {};
    const sorted = [...allStories].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    sorted.forEach(s => { 
      if (!groups[s.userId]) groups[s.userId] = []; 
      groups[s.userId].push(s); 
    });
    return groups;
  }, [allStories]);

  const myStories = user ? groupedStories[user.uid] || [] : [];
  const otherUserIds = Object.keys(groupedStories).filter(uid => uid !== user?.uid);

  const handleAddStory = () => {
    if (!isUserPremium(profile)) {
       toast({ title: "Elite Only", description: "Нужен Premium статус", variant: "destructive" });
       return;
    }
    setIsCreateStoryOpen(true);
  };

  return (
    <div className="flex gap-4 p-4 overflow-x-auto scrollbar-hide bg-transparent border-b border-white/5 shrink-0 relative z-20">
      <div className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer" onClick={() => setIsArchiveOpen(true)}>
         <div className="h-[68px] w-[68px] rounded-full p-[2px] bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
            <Archive className="w-6 h-6 text-white/40 group-hover:text-primary transition-colors" />
         </div>
         <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.1em] italic">Архив</span>
      </div>

      <div className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer" onClick={() => myStories.length > 0 ? setStoriesToView(myStories) : handleAddStory()}>
        <div className={cn("relative h-[68px] w-[68px] rounded-full p-[2px] transition-all duration-500 flex items-center justify-center", myStories.length > 0 ? "bg-gradient-to-tr from-[#34C759] via-[#007AFF] to-[#AF52DE] shadow-[0_0_15px_rgba(52,199,89,0.3)] animate-pulse" : "bg-white/10 group-hover:bg-white/20")}>
          <div className="rounded-full h-full w-full overflow-hidden relative bg-[#0a0a0c] flex items-center justify-center">
            <UserAvatar userId={user?.uid} className="h-full w-full border-none rounded-full" manualAvatarUrl={profile?.avatarUrl} />
          </div>
          {myStories.length === 0 && <div className="absolute bottom-0 right-0 h-6 w-6 bg-primary rounded-full border-2 border-[#0a0a0c] flex items-center justify-center shadow-lg"><Plus className="w-4 h-4 text-white" strokeWidth={3} /></div>}
        </div>
        <span className="text-[10px] font-black uppercase text-white/80 tracking-[0.1em] italic">{myStories.length > 0 ? 'Моя' : 'Момент'}</span>
      </div>

      {isLoading && !allStories ? (
        <div className="h-[68px] flex items-center px-4"><Loader2 className="w-5 h-5 animate-spin text-primary/40" /></div>
      ) : (
        otherUserIds.map(uid => (
          <StoryCircle key={uid} userId={uid} stories={groupedStories[uid]} onView={() => setStoriesToView(groupedStories[uid])} currentUserId={user?.uid} />
        ))
      )}
      <StoryViewerModal />
      <StoryArchiveModal open={isArchiveOpen} onOpenChange={setIsArchiveOpen} />
    </div>
  );
}

function StoryCircle({ userId, stories, onView, currentUserId }: { userId: string, stories: Story[], onView: () => void, currentUserId?: string }) {
  const db = useFirestore();
  const userRef = useMemoFirebase(() => (!db ? null : doc(db, 'users', userId)), [db, userId]);
  const { data: profile } = useDoc<User>(userRef);
  const hasUnviewed = useMemo(() => stories?.some(s => !s.viewers?.includes(currentUserId || '')), [stories, currentUserId]);
  
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-transform" onClick={onView}>
      <div className={cn("h-[68px] w-[68px] rounded-full p-[2px] transition-all duration-500 flex items-center justify-center", hasUnviewed ? "bg-gradient-to-tr from-[#34C759] via-[#007AFF] to-[#AF52DE] scale-105 shadow-[0_0_20px_rgba(0,122,255,0.4)]" : "bg-white/20")}>
        <div className="rounded-full h-full w-full overflow-hidden bg-[#0a0a0c] flex items-center justify-center">
          <UserAvatar userId={userId} className="h-full w-full border-none rounded-full" manualAvatarUrl={profile?.avatarUrl} />
        </div>
      </div>
      <span className={cn("text-[10px] font-bold truncate w-[68px] text-center transition-colors uppercase", hasUnviewed ? "text-white" : "text-white/40")}>{formatDisplayName(profile?.name).split(' ')[0]}</span>
    </div>
  );
}
