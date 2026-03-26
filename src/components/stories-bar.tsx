
"use client"

import React, { useMemo } from 'react';
import { useAppState } from '@/lib/store';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { UserAvatar } from './user-avatar';
import { Plus, Loader2 } from 'lucide-react';
import type { Story, User } from '@/lib/types';
import { cn, formatDisplayName } from '@/lib/utils';
import { StoryViewerModal } from './modals/story-viewer-modal';

export function StoriesBar() {
  const { user } = useUser();
  const db = useFirestore();
  const { setIsCreateStoryOpen, setStoriesToView } = useAppState();

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const storiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    const now = new Date().toISOString();
    return query(
      collection(db, 'stories'),
      where('expiresAt', '>', now)
    );
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

  return (
    <div className="flex gap-4 p-4 overflow-x-auto scrollbar-hide bg-transparent border-b border-white/5 shrink-0 relative z-20">
      {/* Кнопка "Моя история" */}
      <div className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer" onClick={() => myStories.length > 0 ? setStoriesToView(myStories) : setIsCreateStoryOpen(true)}>
        <div className={cn(
          "relative h-[64px] w-[64px] rounded-full p-[2px] transition-all",
          myStories.length > 0 ? "bg-gradient-to-tr from-primary to-accent scale-105" : "bg-white/10 hover:bg-white/20"
        )}>
          <div className="rounded-full h-full w-full overflow-hidden relative bg-[#0a0a0c]">
            <UserAvatar 
              userId={user?.uid} 
              className="h-full w-full border-none" 
              manualAvatarUrl={profile?.avatarUrl}
              fallbackName={profile?.name || profile?.username || 'Я'}
            />
          </div>
          {myStories.length === 0 && (
            <div className="absolute bottom-0 right-0 h-5 w-5 bg-primary rounded-full border-2 border-[#0a0a0c] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Plus className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-[0.2em] truncate w-[64px] text-center">
          {myStories.length > 0 ? 'Моя' : 'Момент'}
        </span>
      </div>

      {isLoading && !allStories ? (
        <div className="h-[64px] flex items-center px-4"><Loader2 className="w-5 h-5 animate-spin text-primary/40" /></div>
      ) : (
        otherUserIds.map(uid => (
          <StoryCircle 
            key={uid} 
            userId={uid} 
            stories={groupedStories[uid]} 
            onView={() => setStoriesToView(groupedStories[uid])} 
          />
        ))
      )}
      <StoryViewerModal />
    </div>
  );
}

function StoryCircle({ userId, stories, onView }: { userId: string, stories: Story[], onView: () => void }) {
  const db = useFirestore();
  const userRef = useMemoFirebase(() => (!db ? null : doc(db, 'users', userId)), [db, userId]);
  const { data: profile } = useDoc<User>(userRef);

  const hasStories = stories && stories.length > 0;

  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-transform" onClick={onView}>
      <div className={cn(
        "h-[64px] w-[64px] rounded-full p-[2px] bg-gradient-to-tr transition-all",
        hasStories ? "from-primary to-accent" : "from-white/10 to-white/10"
      )}>
        <div className="rounded-full h-full w-full overflow-hidden bg-[#0a0a0c]">
          <UserAvatar 
            userId={userId} 
            className="h-full w-full border-none" 
            manualAvatarUrl={profile?.avatarUrl}
            fallbackName={profile?.name || profile?.username}
          />
        </div>
      </div>
      <span className="text-[10px] font-bold text-white/80 truncate w-[64px] text-center">
        {formatDisplayName(profile?.name || profile?.username)}
      </span>
    </div>
  );
}
