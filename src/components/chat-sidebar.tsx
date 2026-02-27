
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { Search, Settings, Plus, Loader2, Bookmark, Pin, PinOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateChatModal } from './modals/create-chat-modal';
import { SettingsModal } from './modals/settings-modal';
import type { ChatType, User, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDocs, addDoc, limit } from 'firebase/firestore';
import { formatLastSeen, formatDisplayName, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function ChatSidebar() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { currentChatId, setCurrentChatId } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ChatType | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatingSaved, setIsCreatingSaved] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<User>(userProfileRef);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid)
    );
  }, [db, user]);
  const { data: chats, isLoading: isChatsLoading } = useCollection<Chat>(chatsQuery);

  const pinnedIds = profile?.pinnedChatIds || [];

  const handleTogglePin = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!userProfileRef || !profile) return;
    
    let newPinned = [...pinnedIds];
    if (newPinned.includes(chatId)) {
      newPinned = newPinned.filter(id => id !== chatId);
      toast({ title: "Чат откреплен" });
    } else {
      if (newPinned.length >= 5) {
        toast({ title: "Лимит достигнут", description: "Максимум 5 закрепленных чатов", variant: "destructive" });
        return;
      }
      newPinned = [chatId, ...newPinned];
      toast({ title: "Чат закреплен" });
    }
    updateDocumentNonBlocking(userProfileRef, { pinnedChatIds: newPinned });
  };

  const handleOpenSavedMessages = async () => {
    if (!db || !user || !profile) return;
    
    const savedChat = chats?.find(c => c.type === 'saved');
    if (savedChat) {
      setCurrentChatId(savedChat.id);
      return;
    }

    setIsCreatingSaved(true);
    try {
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'saved'),
        where('ownerId', '==', user.uid),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setCurrentChatId(snap.docs[0].id);
      } else {
        const newSaved = await addDoc(collection(db, 'chats'), {
          type: 'saved',
          name: 'Избранное',
          username: '@saved',
          ownerId: user.uid,
          participantIds: [user.uid],
          adminIds: [user.uid],
          createdAt: new Date().toISOString(),
          avatarUrl: null
        });
        setCurrentChatId(newSaved.id);
      }
    } catch (e) {
      toast({ title: "Ошибка", description: "Не удалось открыть Избранное", variant: "destructive" });
    } finally {
      setIsCreatingSaved(false);
    }
  };

  const allFilteredChats = (chats || []).filter(chat => {
    if (chat.type === 'saved') return false; 
    const otherId = chat.type === 'private' && user && chat.participantIds
      ? chat.participantIds.find((id: string) => id !== user.uid)
      : null;
      
    const chatName = otherId && chat.metadata && chat.metadata[otherId]
      ? chat.metadata[otherId].name || chat.name
      : chat.name;
    
    const matchesTab = activeTab === 'all' || chat.type === activeTab;
    const matchesSearch = chatName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pinnedChats = allFilteredChats.filter(c => pinnedIds.includes(c.id));
  const unpinnedChats = allFilteredChats.filter(c => !pinnedIds.includes(c.id));

  const displayName = isProfileLoading ? '...' : formatDisplayName(profile?.name || user?.displayName);
  const displayUsername = isProfileLoading ? '...' : (profile?.username || (user?.email ? `@${user.email.split('@')[0]}` : 'Настройте профиль'));

  return (
    <div className="flex flex-col h-full bg-card/30 backdrop-blur-sm overflow-hidden">
      <div className="p-4 border-b border-border/40 space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group min-w-0"
            onClick={() => setIsSettingsOpen(true)}
          >
            <UserAvatar 
              userId={user?.uid} 
              className="h-10 w-10 border-2 border-primary/20 ring-primary/10 ring-offset-2 ring-offset-background group-hover:scale-105 transition-transform shrink-0"
              fallbackName={displayName}
              manualAvatarUrl={profile?.avatarUrl}
            />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors truncate">
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {displayUsername}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/50 shrink-0" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Поиск чатов..." 
            className="pl-9 bg-muted/30 border-muted-foreground/10 rounded-xl h-10 focus:ring-1 focus:ring-primary/40 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="px-2 py-2 border-b border-border/40 shrink-0">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9 bg-transparent p-0 gap-1">
            <TabsTrigger value="all" className="rounded-lg text-[10px] md:text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Все</TabsTrigger>
            <TabsTrigger value="private" className="rounded-lg text-[10px] md:text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Чаты</TabsTrigger>
            <TabsTrigger value="group" className="rounded-lg text-[10px] md:text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Группы</TabsTrigger>
            <TabsTrigger value="channel" className="rounded-lg text-[10px] md:text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Каналы</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 px-2 py-2 overflow-y-auto">
        {isChatsLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-1">
            {activeTab === 'all' && (
              <div
                onClick={handleOpenSavedMessages}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group relative",
                  chats?.find(c => c.type === 'saved')?.id === currentChatId ? 'bg-primary shadow-lg shadow-primary/20 text-white' : 'hover:bg-muted/40 text-foreground'
                )}
              >
                <div className="h-11 w-11 md:h-12 md:w-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  {isCreatingSaved ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bookmark className="w-6 h-6 text-accent" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm">Избранное</span>
                  <div className="text-[10px] text-muted-foreground">Заметки и файлы</div>
                </div>
              </div>
            )}

            {pinnedChats.map(chat => {
              const otherId = chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;
              const chatDisplayName = otherId && chat.metadata && chat.metadata[otherId] ? chat.metadata[otherId].name : chat.name;
              const chatAvatarUrl = otherId && chat.metadata && chat.metadata[otherId] ? chat.metadata[otherId].avatarUrl : chat.avatarUrl;
              return (
                <ChatListItem 
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  otherId={otherId}
                  cachedDisplayName={chatDisplayName}
                  manualAvatarUrl={chatAvatarUrl}
                  onClick={() => setCurrentChatId(chat.id)}
                  isPinned={true}
                  onTogglePin={handleTogglePin}
                />
              );
            })}

            {pinnedChats.length > 0 && unpinnedChats.length > 0 && <div className="h-px bg-border/20 my-2 mx-4" />}

            {unpinnedChats.map(chat => {
              const otherId = chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;
              const chatDisplayName = otherId && chat.metadata && chat.metadata[otherId] ? chat.metadata[otherId].name : chat.name;
              const chatAvatarUrl = otherId && chat.metadata && chat.metadata[otherId] ? chat.metadata[otherId].avatarUrl : chat.avatarUrl;
              return (
                <ChatListItem 
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  otherId={otherId}
                  cachedDisplayName={chatDisplayName}
                  manualAvatarUrl={chatAvatarUrl}
                  onClick={() => setCurrentChatId(chat.id)}
                  isPinned={false}
                  onTogglePin={handleTogglePin}
                />
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 bg-muted/20 backdrop-blur-md border-t border-border/40 shrink-0">
        <Button 
          className="w-full rounded-xl h-11 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          Новый чат
        </Button>
      </div>

      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}

function ChatListItem({ chat, isActive, otherId, cachedDisplayName, manualAvatarUrl, onClick, isPinned, onTogglePin }: any) {
  const db = useFirestore();
  const { user } = useUser();
  const [status, setStatus] = useState<string>('');
  
  const userProfileRef = useMemoFirebase(() => {
    if (!db || !otherId) return null;
    return doc(db, 'users', otherId);
  }, [db, otherId]);
  
  const { data: otherProfile } = useDoc<User>(userProfileRef);

  const unreadQuery = useMemoFirebase(() => {
    if (!db || !chat.id || !user) return null;
    return query(
      collection(db, 'chats', chat.id, 'messages'),
      where('isRead', '==', false)
    );
  }, [db, chat.id, user]);

  const { data: unreadData } = useCollection<Message>(unreadQuery);
  const unreadCount = (unreadData || []).filter(m => m.senderId !== user?.uid).length;

  useEffect(() => {
    const isOtherDeleted = otherProfile?.isBanned || otherProfile?.name?.includes('Удалённый Аккаунт');
    if (otherId) {
      setStatus(formatLastSeen(otherProfile?.lastSeen, otherProfile?.settings?.privacy?.lastSeenVisibility, isOtherDeleted));
    } else {
      setStatus(chat.type === 'group' ? 'Группа' : 'Канал');
    }
  }, [otherId, otherProfile, chat.type]);

  const isTyping = chat?.typing && otherId && chat.typing[otherId];
  const isOtherDeleted = otherProfile?.isBanned || otherProfile?.name?.includes('Удалённый Аккаунт');
  const showTyping = isTyping && !isOtherDeleted;
  
  const finalDisplayName = formatDisplayName(otherProfile?.name || cachedDisplayName || 'Пользователь');

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group relative",
        isActive ? 'bg-primary shadow-lg shadow-primary/20 text-white' : 'hover:bg-muted/40 text-foreground'
      )}
    >
      <div className="relative shrink-0">
        <UserAvatar 
          userId={otherId} 
          manualAvatarUrl={manualAvatarUrl || otherProfile?.avatarUrl}
          className="h-11 w-11 md:h-12 md:w-12 border-2 border-transparent group-hover:border-primary/20 transition-all" 
          fallbackName={finalDisplayName}
        />
        {(status === 'в сети' || showTyping) && !isOtherDeleted && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-accent rounded-full border-2 border-background shadow-sm" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold truncate text-sm flex items-center gap-1">
            {finalDisplayName}
            {isPinned && <Pin className="w-3 h-3 rotate-45" />}
          </span>
          <div className="flex items-center gap-1">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => onTogglePin(e, chat.id)}
            >
              {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
            </Button>
            {unreadCount > 0 && !isActive && (
              <Badge variant="default" className="bg-accent text-white rounded-full h-5 min-w-5 flex items-center justify-center text-[10px] font-bold px-1 animate-in zoom-in-50 duration-200">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className={cn(
            "text-[10px] truncate transition-colors",
            isActive ? 'text-white/80' : (showTyping || status === 'в сети' ? 'text-accent font-bold' : 'text-muted-foreground')
          )}>
            {showTyping ? (
              <span className="flex items-center gap-0.5">
                печатает
                <span className="animate-typing-dot">.</span>
                <span className="animate-typing-dot [animation-delay:0.2s]">.</span>
                <span className="animate-typing-dot [animation-delay:0.4s]">.</span>
              </span>
            ) : status}
          </div>
        </div>
      </div>
    </div>
  );
}
