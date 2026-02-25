"use client"

import React, { useState } from 'react';
import { useAppState } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Settings, Plus, Users, Radio, MessageSquare, Filter } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateChatModal } from './modals/create-chat-modal';
import { SettingsModal } from './modals/settings-modal';
import type { ChatType } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

export default function ChatSidebar() {
  const { currentUser, chats, users, currentChatId, setCurrentChatId } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ChatType | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const filteredChats = chats.filter(chat => {
    const matchesTab = activeTab === 'all' || chat.type === activeTab;
    const chatName = chat.type === 'private' 
      ? users[chat.participants.find(p => p !== currentUser?.phone) || '']?.name || 'User'
      : chat.name;
    const matchesSearch = chatName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        chat.username.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  }).sort((a, b) => {
    const aTime = a.messages.length ? a.messages[a.messages.length - 1].time : a.createdAt;
    const bTime = b.messages.length ? b.messages[b.messages.length - 1].time : b.createdAt;
    return bTime - aTime;
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
              <AvatarImage src={currentUser?.avatar || ''} />
              <AvatarFallback className="bg-primary text-white uppercase">{currentUser?.name?.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">{currentUser?.name}</span>
              <span className="text-xs text-muted-foreground">{currentUser?.username}</span>
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
        <div className="space-y-1">
          {filteredChats.map(chat => {
            const isPrivate = chat.type === 'private';
            const otherUser = isPrivate ? users[chat.participants.find(p => p !== currentUser?.phone) || ''] : null;
            const chatName = isPrivate ? otherUser?.name || 'Unknown' : chat.name;
            const chatAvatar = isPrivate ? otherUser?.avatar : chat.avatar;
            const lastMsg = chat.messages[chat.messages.length - 1];
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
                    <AvatarImage src={chatAvatar || ''} />
                    <AvatarFallback className={`${isActive ? 'bg-white/20' : 'bg-primary/10 text-primary'} uppercase font-bold`}>
                      {chatName.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {isPrivate && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate text-sm">{chatName}</span>
                    <span className={`text-[10px] whitespace-nowrap ${isActive ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {lastMsg ? formatDistanceToNow(lastMsg.time, { addSuffix: false }).replace('about ', '') : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {lastMsg ? (lastMsg.type === 'image' ? '🖼️ Photo' : lastMsg.text) : 'No messages yet'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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