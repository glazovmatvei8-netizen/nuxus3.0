"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { Search, Settings, Plus, Loader2, Bookmark, Pin, Globe, Star } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateChatModal } from './modals/create-chat-modal';
import { SettingsModal } from './modals/settings-modal';
import type { ChatType, User, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDocs, addDoc, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
import { formatLastSeen, formatDisplayName, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function ChatSidebar() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { currentChatId, setCurrentChatId, forwardingMessage, setForwardingMessage } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ChatType | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatingSaved, setIsCreatingSaved] = useState(false);
  const [globalSearchResult, setGlobalSearchResult] = useState<Chat | null>(null);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

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

  const handleTogglePin = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!db || !user || !userProfileRef) return;
    const isPinned = pinnedIds.includes(chatId);
    updateDocumentNonBlocking(userProfileRef, {
      pinnedChatIds: isPinned ? arrayRemove(chatId) : arrayUnion(chatId)
    });
    toast({ title: isPinned ? "Чат откреплен" : "Чат закреплен" });
  };

  const handleChatClick = async (chat: Chat) => {
    if (forwardingMessage) {
      if (!db || !user || !profile) return;
      
      const newMsgData: any = {
        chatId: chat.id,
        senderId: user.uid,
        senderName: profile.name,
        content: forwardingMessage.content,
        contentType: forwardingMessage.contentType,
        sentAt: new Date().toISOString(),
        isRead: false,
        forwardFrom: forwardingMessage.senderName
      };

      addDocumentNonBlocking(collection(db, 'chats', chat.id, 'messages'), newMsgData);
      updateDocumentNonBlocking(doc(db, 'chats', chat.id), { lastMessageAt: new Date().toISOString() });
      
      setForwardingMessage(null);
      setCurrentChatId(chat.id);
      toast({ title: "Сообщение переслано" });
      return;
    }
    
    setCurrentChatId(chat.id);
  };

  useEffect(() => {
    const searchGlobal = async () => {
      if (!db || !searchQuery.startsWith('@') || searchQuery.length < 3) {
        setGlobalSearchResult(null);
        return;
      }

      setIsSearchingGlobal(true);
      try {
        const q = query(
          collection(db, 'chats'),
          where('username', '==', searchQuery.toLowerCase()),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const chatData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Chat;
          if (!chatData.participantIds.includes(user?.uid || '')) {
            setGlobalSearchResult(chatData);
          } else {
            setGlobalSearchResult(null);
          }
        } else {
          setGlobalSearchResult(null);
        }
      } catch (e) {
        console.error("Global search error:", e);
      } finally {
        setIsSearchingGlobal(false);
      }
    };

    const timer = setTimeout(searchGlobal, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, db, user?.uid]);

  const handleOpenSavedMessages = async () => {
    if (!db || !user || !profile) return;
    
    const savedChat = chats?.find(c => c.type === 'saved');
    if (savedChat) {
      handleChatClick(savedChat);
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
        handleChatClick({ id: snap.docs[0].id, ...snap.docs[0].data() } as any);
      } else {
        const newSaved = await addDoc(collection(db, 'chats'), {
          type: 'saved',
          name: 'Избранное',
          username: '@saved',
          ownerId: user.uid,
          participantIds: [user.uid],
          adminIds: [user.uid],
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
          avatarUrl: null
        });
        handleChatClick({ id: newSaved.id } as any);
      }
    } catch (e) {
      toast({ title: "Ошибка", description: "Не удалось открыть Избранное", variant: "destructive" });
    } finally {
      setIsCreatingSaved(false);
    }
  };

  const sortedChats = useMemo(() => {
    if (!chats) return [];
    return [...chats].sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id);
      const bPinned = pinnedIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [chats, pinnedIds]);

  const filteredChats = sortedChats.filter(chat => {
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

  const displayName = isProfileLoading ? '...' : formatDisplayName(profile?.name || user?.displayName);
  const displayUsername = isProfileLoading ? '...' : (profile?.username || (user?.email ? `@${user.email.split('@')[0]}` : 'Настройте профиль'));
  const isPremium = profile?.isPremium && profile.premiumUntil && new Date(profile.premiumUntil) > new Date();

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      <div className="p-4 space-y-4 shrink-0 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group min-w-0"
            onClick={() => setIsSettingsOpen(true)}
          >
            <UserAvatar 
              userId={user?.uid} 
              className="h-10 w-10 border border-primary group-hover:scale-105 transition-all"
              fallbackName={displayName}
              manualAvatarUrl={profile?.avatarUrl}
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm truncate flex items-center gap-1">
                {displayName}
                {isPremium && <Star className="w-3 h-3 text-accent fill-accent" />}
              </span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest truncate">
                {displayUsername}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Поиск..." 
            className="pl-9 bg-muted border-none rounded-xl h-10 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="px-3 py-2 shrink-0">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9 bg-muted rounded-xl p-1 gap-1">
            <TabsTrigger value="all" className="rounded-lg text-[9px] font-bold uppercase tracking-widest">Все</TabsTrigger>
            <TabsTrigger value="private" className="rounded-lg text-[9px] font-bold uppercase tracking-widest">Чаты</TabsTrigger>
            <TabsTrigger value="group" className="rounded-lg text-[9px] font-bold uppercase tracking-widest">Группы</TabsTrigger>
            <TabsTrigger value="channel" className="rounded-lg text-[9px] font-bold uppercase tracking-widest">Инфо</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        {isChatsLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary opacity-50" />
          </div>
        ) : (
          <div className="space-y-1 pb-24">
            {globalSearchResult && (
              <div className="mb-4">
                <div className="px-3 py-1 text-[10px] font-black text-primary flex items-center gap-1 uppercase tracking-widest mb-1">
                  <Globe className="w-3 h-3" /> Глобальный результат
                </div>
                <ChatListItem 
                  chat={globalSearchResult}
                  isActive={currentChatId === globalSearchResult.id}
                  onClick={() => handleChatClick(globalSearchResult)}
                  isGlobalResult
                />
              </div>
            )}

            {activeTab === 'all' && searchQuery.length === 0 && (
              <div
                onClick={handleOpenSavedMessages}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                  chats?.find(c => c.type === 'saved')?.id === currentChatId ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-muted text-foreground'
                )}
              >
                <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                  {isCreatingSaved ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bookmark className="w-5 h-5 text-accent" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm">Избранное</span>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground/60">Личные заметки</div>
                </div>
              </div>
            )}

            {filteredChats.map(chat => {
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
                  onClick={() => handleChatClick(chat)}
                  isPinned={pinnedIds.includes(chat.id)}
                  onTogglePin={(e: any) => handleTogglePin(chat.id, e)}
                />
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-white/5 bg-card">
        <Button 
          className="w-full rounded-xl h-11 font-bold uppercase tracking-widest"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Новый чат
        </Button>
      </div>

      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}

function ChatListItem({ chat, isActive, otherId, cachedDisplayName, manualAvatarUrl, onClick, isPinned, isGlobalResult, onTogglePin }: any) {
  const db = useFirestore();
  const { user } = useUser();
  const [status, setStatus] = useState<string>('');
  
  const userProfileRef = useMemoFirebase(() => {
    if (!db || !otherId) return null;
    return doc(db, 'users', otherId);
  }, [db, otherId]);
  
  const { data: otherProfile } = useDoc<User>(userProfileRef);

  const unreadQuery = useMemoFirebase(() => {
    if (!db || !chat.id || !user || isGlobalResult) return null;
    return query(
      collection(db, 'chats', chat.id, 'messages'),
      where('isRead', '==', false)
    );
  }, [db, chat.id, user, isGlobalResult]);

  const { data: unreadData } = useCollection<Message>(unreadQuery);
  const unreadCount = (unreadData || []).filter(m => m.senderId !== user?.uid).length;

  useEffect(() => {
    if (isGlobalResult) {
      setStatus(chat.type === 'group' ? 'Группа' : 'Канал');
      return;
    }
    const isOtherDeleted = otherProfile?.isBanned || otherProfile?.name?.includes('Удалённый Аккаунт');
    if (otherId) {
      setStatus(formatLastSeen(otherProfile?.lastSeen, otherProfile?.settings?.privacy?.lastSeenVisibility, isOtherDeleted));
    } else {
      setStatus(chat.type === 'group' ? 'Группа' : (chat.type === 'channel' ? 'Канал' : 'Избранное'));
    }
  }, [otherId, otherProfile, chat.type, isGlobalResult]);

  const isOtherDeleted = otherProfile?.isBanned || otherProfile?.name?.includes('Удалённый Аккаунт');
  const isTyping = chat?.typing && otherId && chat.typing[otherId] && !isOtherDeleted;
  const isOtherPremium = otherProfile?.isPremium && otherProfile?.premiumUntil && new Date(otherProfile.premiumUntil) > new Date();
  
  const finalDisplayName = formatDisplayName(otherProfile?.name || cachedDisplayName || chat.name || 'Юзер');

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
        isActive ? 'bg-primary text-white shadow-lg shadow-primary/20 z-10' : 'hover:bg-muted text-foreground'
      )}
    >
      <div className="relative shrink-0">
        <UserAvatar 
          userId={otherId} 
          manualAvatarUrl={manualAvatarUrl || otherProfile?.avatarUrl || chat.avatarUrl}
          className="h-10 w-10" 
          fallbackName={finalDisplayName}
        />
        {(status === 'в сети' || isTyping) && !isOtherDeleted && !isGlobalResult && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-accent rounded-full border-2 border-card" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-sm truncate flex items-center gap-1">
            {finalDisplayName}
            {isOtherPremium && <Star className="w-3 h-3 text-accent fill-accent shrink-0" />}
            {isPinned && <Pin className="w-3 h-3 rotate-45 shrink-0 opacity-60" />}
          </span>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && !isActive && (
              <Badge variant="default" className="bg-accent text-accent-foreground rounded-full h-4 min-w-4 flex items-center justify-center text-[9px] font-bold px-1 border-none">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className={cn(
            "text-[9px] uppercase font-bold tracking-widest truncate",
            isActive ? 'text-white/80' : (isTyping || status === 'в сети' ? 'text-accent' : 'text-muted-foreground/60')
          )}>
            {isTyping ? (
              <span className="flex items-center gap-0.5">печатает<span className="animate-typing-dot">.</span><span className="animate-typing-dot [animation-delay:0.2s]">.</span><span className="animate-typing-dot [animation-delay:0.4s]">.</span></span>
            ) : status}
          </div>
          {isPinned && !isActive && (
             <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 text-muted-foreground"
                onClick={(e) => onTogglePin(e)}
              >
                <Pin className="w-3 h-3" />
              </Button>
          )}
        </div>
      </div>
    </div>
  );
}