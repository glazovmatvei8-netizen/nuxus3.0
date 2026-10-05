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
 * NUXUS MOMENTS BAR V93.0 «REPLICA MASTER»
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
    <div className="flex gap-6 p-4 px-6 overflow-x-auto scrollbar-hide bg-transparent shrink-0 relative z-20">
      
      {/* АРХИВ - REPLICA */}
      <div className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer" onClick={() => setIsArchiveOpen(true)}>
         <div className="h-16 w-16 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center transition-all group-hover:bg-white/[0.08]">
            <Archive className="w-7 h-7 text-muted-foreground/40" />
         </div>
         <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest italic">АРХИВ</span>
      </div>

      {/* MOMENT (STORIES) - REPLICA */}
      <div className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer" onClick={() => myStories.length > 0 ? setStoriesToView(myStories) : handleAddStory()}>
        <div className="relative h-16 w-16 rounded-full border border-white/10 p-0.5 transition-all group-hover:scale-105">
          <div className="rounded-full h-full w-full overflow-hidden bg-white/5 flex items-center justify-center">
            <UserAvatar userId={user?.uid} className="h-full w-full border-none rounded-full" manualAvatarUrl={profile?.avatarUrl} />
          </div>
          {myStories.length === 0 && (
             <div className="absolute bottom-0 right-0 h-5 w-5 bg-primary rounded-full border-2 border-[#121212] flex items-center justify-center shadow-lg">
                <Plus className="w-3.5 h-3.5 text-white" strokeWidth={4} />
             </div>
          )}
        </div>
        <span className="text-[10px] font-black uppercase text-white tracking-widest italic">{myStories.length > 0 ? 'MOMENT' : 'MOMENT'}</span>
      </div>

      {isLoading && !allStories ? (
        <div className="h-16 flex items-center px-4"><Loader2 className="w-5 h-5 animate-spin text-primary/40" /></div>
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
    <div className="flex flex-col items-center gap-2 shrink-0 cursor-pointer active:scale-95 transition-transform" onClick={onView}>
      <div className={cn("h-16 w-16 rounded-full p-0.5 border transition-all", hasUnviewed ? "border-primary" : "border-white/10")}>
        <div className="rounded-full h-full w-full overflow-hidden bg-white/5 flex items-center justify-center">
          <UserAvatar userId={userId} className="h-full w-full border-none rounded-full" manualAvatarUrl={profile?.avatarUrl} />
        </div>
      </div>
      <span className={cn("text-[10px] font-bold truncate w-16 text-center uppercase tracking-tight", hasUnviewed ? "text-white" : "text-muted-foreground/40")}>
        {formatDisplayName(profile?.name).split(' ')[0]}
      </span>
    </div>
  );
}