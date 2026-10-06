"use client"

import React, { useMemo, useState } from 'react';
import { useAppState } from '@/lib/app-state';
import { useUser, useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, query, where, doc } from 'firebase/firestore';
import { UserAvatar } from './user-avatar';
import { Plus, Loader2, Archive, Zap } from 'lucide-react';
import type { Story, User } from '@/lib/types';
import { cn, formatDisplayName, isUserPremium } from '@/lib/utils';
import { StoryViewerModal } from './modals/story-viewer-modal';
import { StoryArchiveModal } from './modals/story-archive-modal';
import { CreateStoryModal } from './modals/create-story-modal';
import { useToast } from '@/hooks/use-toast';

/**
 * NUXUS MOMENTS BAR V98.0 «FULLY FUNCTIONAL»
 */
export function StoriesBar() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIsCreateStoryOpen, setStoriesToView, isCreateStoryOpen } = useAppState();

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
    <div className="flex gap-6 p-4 px-8 overflow-x-auto scrollbar-hide bg-transparent shrink-0 relative z-20">
      
      {/* АРХИВ - REPLICA */}
      <div className="flex flex-col items-center gap-3 shrink-0 group cursor-pointer" onClick={() => setIsArchiveOpen(true)}>
         <div className="h-18 w-18 rounded-[2rem] bg-white/[0.03] border border-white/10 flex items-center justify-center transition-all group-hover:bg-white/[0.08] shadow-xl group-hover:border-primary/20">
            <Archive className="w-8 h-8 text-muted-foreground/40 group-hover:text-primary transition-colors" />
         </div>
         <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-[0.2em] italic">АРХИВ</span>
      </div>

      {/* MOMENT (STORIES) - REPLICA */}
      <div className="flex flex-col items-center gap-3 shrink-0 group cursor-pointer" onClick={() => myStories.length > 0 ? setStoriesToView(myStories) : handleAddStory()}>
        <div className="relative h-18 w-18 rounded-full border-2 border-primary/20 p-1 transition-all group-hover:scale-105 shadow-2xl">
          <div className="rounded-full h-full w-full overflow-hidden bg-black/40 flex items-center justify-center relative">
            <UserAvatar userId={user?.uid} className="h-full w-full border-none rounded-full" manualAvatarUrl={profile?.avatarUrl} />
            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {myStories.length === 0 && (
             <div className="absolute bottom-0 right-0 h-6 w-6 bg-primary rounded-full border-3 border-[#121212] flex items-center justify-center shadow-xl">
                <Plus className="w-4 h-4 text-white" strokeWidth={5} />
             </div>
          )}
          {myStories.length > 0 && (
             <div className="absolute -top-1 -right-1 h-6 w-6 bg-primary rounded-full border-3 border-[#121212] flex items-center justify-center shadow-xl">
                <Zap className="w-3.5 h-3.5 text-white fill-current" />
             </div>
          )}
        </div>
        <span className="text-[10px] font-black uppercase text-white tracking-[0.2em] italic">MOMENT</span>
      </div>

      {isLoading && !allStories ? (
        <div className="h-18 flex items-center px-4"><Loader2 className="w-6 h-6 animate-spin text-primary/40" /></div>
      ) : (
        otherUserIds.map(uid => (
          <StoryCircle key={uid} userId={uid} stories={groupedStories[uid]} onView={() => setStoriesToView(groupedStories[uid])} currentUserId={user?.uid} />
        ))
      )}
      
      <StoryViewerModal />
      <StoryArchiveModal open={isArchiveOpen} onOpenChange={setIsArchiveOpen} />
      <CreateStoryModal open={isCreateStoryOpen} onOpenChange={setIsCreateStoryOpen} />
    </div>
  );
}

function StoryCircle({ userId, stories, onView, currentUserId }: { userId: string, stories: Story[], onView: () => void, currentUserId?: string }) {
  const db = useFirestore();
  const userRef = useMemoFirebase(() => (!db ? null : doc(db, 'users', userId)), [db, userId]);
  const { data: profile } = useDoc<User>(userRef);
  const hasUnviewed = useMemo(() => stories?.some(s => !s.viewers?.includes(currentUserId || '')), [stories, currentUserId]);
  
  return (
    <div className="flex flex-col items-center gap-3 shrink-0 cursor-pointer active:scale-95 transition-all group" onClick={onView}>
      <div className={cn(
        "h-18 w-18 rounded-full p-1 border-2 transition-all shadow-2xl", 
        hasUnviewed ? "border-primary shadow-primary/20" : "border-white/10"
      )}>
        <div className="rounded-full h-full w-full overflow-hidden bg-black/40 flex items-center justify-center border border-white/5">
          <UserAvatar userId={userId} className="h-full w-full border-none rounded-full" manualAvatarUrl={profile?.avatarUrl} />
        </div>
      </div>
      <span className={cn("text-[10px] font-black truncate w-20 text-center uppercase tracking-tight italic", hasUnviewed ? "text-white" : "text-muted-foreground/40")}>
        {formatDisplayName(profile?.name).split(' ')[0]}
      </span>
    </div>
  );
}