
"use client"

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, orderBy, limit } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Plus, Loader2 } from 'lucide-react';
import { CreateStoryModal } from './modals/create-story-modal';
import { StoryViewerModal } from './modals/story-viewer-modal';
import { cn } from '@/lib/utils';
import type { Story } from '@/lib/types';

export function StoriesBar() {
  const { user } = useUser();
  const db = useFirestore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedUserStories, setSelectedUserStories] = useState<Story[] | null>(null);

  const storiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    const now = new Date().toISOString();
    return query(
      collectionGroup(db, 'stories'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc'),
      limit(100)
    );
  }, [db]);

  const { data: allStories, isLoading } = useCollection<Story>(storiesQuery);

  const groupedStories = useMemo(() => {
    if (!allStories) return {};
    return allStories.reduce((acc, story) => {
      if (!acc[story.userId]) acc[story.userId] = [];
      acc[story.userId].push(story);
      return acc;
    }, {} as Record<string, Story[]>);
  }, [allStories]);

  const userIds = useMemo(() => {
    const ids = Object.keys(groupedStories);
    // Move current user to start
    if (user && ids.includes(user.uid)) {
      return [user.uid, ...ids.filter(id => id !== user.uid)];
    }
    return ids;
  }, [groupedStories, user]);

  return (
    <div className="w-full bg-card border-b border-white/5 px-4 py-3 flex items-center gap-4 overflow-x-auto scrollbar-hide shrink-0">
      {/* Add Story Button */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div 
          onClick={() => setIsCreateOpen(true)}
          className="relative cursor-pointer group"
        >
          <UserAvatar 
            userId={user?.uid} 
            className="h-14 w-14 border-2 border-dashed border-primary/40 group-hover:border-primary transition-all p-0.5"
          />
          <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1 border-2 border-card shadow-lg">
            <Plus className="w-3 h-3 text-white" />
          </div>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Моя</span>
      </div>

      {/* Stories List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-14 w-14">
          <Loader2 className="w-4 h-4 animate-spin text-primary opacity-50" />
        </div>
      ) : (
        userIds.map(uid => {
          if (uid === user?.uid) return null; // Already handled by "+" button logic
          const stories = groupedStories[uid];
          const hasUnseen = stories.some(s => !s.views?.includes(user?.uid || ''));
          const lastStory = stories[stories.length - 1];

          return (
            <div 
              key={uid} 
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
              onClick={() => setSelectedUserStories(stories)}
            >
              <div className={cn(
                "p-0.5 rounded-full border-2 transition-all",
                hasUnseen ? "border-primary" : "border-muted/30 group-hover:border-muted-foreground"
              )}>
                <UserAvatar 
                  userId={uid} 
                  manualAvatarUrl={lastStory.userAvatar}
                  className="h-14 w-14"
                  fallbackName={lastStory.userName}
                />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate w-14 text-center">
                {lastStory.userName.split(' ')[0]}
              </span>
            </div>
          );
        })
      )}

      <CreateStoryModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      {selectedUserStories && (
        <StoryViewerModal 
          stories={selectedUserStories} 
          open={!!selectedUserStories} 
          onOpenChange={(open) => !open && setSelectedUserStories(null)} 
        />
      )}
    </div>
  );
}
