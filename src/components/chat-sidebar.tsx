
"use client"

import React, { useState } from 'react';
import { useAppState } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Settings, Plus, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateChatModal } from './modals/create-chat-modal';
import { SettingsModal } from './modals/settings-modal';
import type { ChatType } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';

export default function ChatSidebar() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ChatType | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: profile } = useDoc(userProfileRef);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid)
    );
  }, [db, user]);
  const { data: chats, isLoading } = useCollection(chatsQuery);

  const filteredChats = (chats || []).filter(chat => {
    const chatName = chat.type === 'private' && chat.metadata && user
      ? chat.metadata[chat.participantIds.find((id: string) => id !== user.uid)]?.name || chat.name
      : chat.name;
    
    const matchesTab = activeTab === 'all' || chat.type === activeTab;
    const matchesSearch = chatName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-card/30 backdrop-blur-sm">
      <div className="p-4 border-b border-border/40 space-y-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Avatar className="h-10 w-10 border-2 border-primary/20 ring-primary/10 ring-offset-2 ring-offset-background group-hover:scale-105 transition-transform">
              <AvatarImage src={profile?.avatarUrl || ''} />
              <AvatarFallback className="bg-primary text-white uppercase font-bold">
                {profile?.name?.slice(0, 2) || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors truncate">
                {profile?.name || 'Loading...'}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {profile?.username || '...'}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/50" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search messages or people" 
            className="pl-9 bg-muted/30 border-muted-foreground/10 rounded-xl h-10 focus:ring-1 focus:ring-primary/40"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="px-2 py-2 border-b border-border/40">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9 bg-transparent p-0 gap-1">
            <TabsTrigger value="all" className="rounded-lg text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">All</TabsTrigger>
            <TabsTrigger value="private" className="rounded-lg text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Chats</TabsTrigger>
            <TabsTrigger value="group" className="rounded-lg text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Groups</TabsTrigger>
            <TabsTrigger value="channel" className="rounded-lg text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Feeds</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 px-2 py-2">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-1">
            {filteredChats.map(chat => {
              const otherId = chat.type === 'private' && user ? chat.participantIds.find((id: string) => id !== user.uid) : null;
              const chatDisplayName = otherId && chat.metadata ? chat.metadata[otherId]?.name : chat.name;
              const chatDisplayUsername = otherId && chat.metadata ? chat.metadata[otherId]?.username : chat.username;
              const chatDisplayAvatar = otherId && chat.metadata ? chat.metadata[otherId]?.avatarUrl : chat.avatarUrl;
              
              const isActive = currentChatId === chat.id;

              return (
                <div
                  key={chat.id}
                  onClick={() => setCurrentChatId(chat.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                    isActive ? 'bg-primary shadow-lg shadow-primary/20 text-white' : 'hover:bg-muted/40 text-foreground'
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-transparent group-hover:border-primary/20 transition-all">
                      <AvatarImage src={chatDisplayAvatar || ''} />
                      <AvatarFallback className={`${isActive ? 'bg-white/20' : 'bg-primary/10 text-primary'} uppercase font-bold`}>
                        {chatDisplayName?.slice(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate text-sm">{chatDisplayName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs truncate ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                        {chat.description || chatDisplayUsername}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 bg-muted/20 backdrop-blur-md border-t border-border/40">
        <Button 
          className="w-full rounded-xl h-11 shadow-lg shadow-primary/20 flex items-center gap-2 group"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          New Conversation
        </Button>
      </div>

      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}
