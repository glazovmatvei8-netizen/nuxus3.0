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
    <div className="flex flex-col h-full bg-card/20 backdrop-blur-2xl overflow-hidden">
      <div className="p-6 space-y-6 shrink-0 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-4 cursor-pointer group min-w-0"
            onClick={() => setIsSettingsOpen(true)}
          >
            <UserAvatar 
              userId={user?.uid} 
              className="h-12 w-12 border-2 border-primary/40 ring-2 ring-primary/10 ring-offset-4 ring-offset-background group-hover:scale-110 transition-all duration-500 shrink-0"
              fallbackName={displayName}
              manualAvatarUrl={profile?.avatarUrl}
            />
            <div className="flex flex-col min-w-0">
              <span className="font-black text-sm uppercase tracking-tighter group-hover:text-primary transition-colors truncate flex items-center gap-1">
                {displayName}
                {isPremium && <Star className="w-3 h-3 text-accent fill-accent" />}
              </span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest truncate">
                {displayUsername}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-white/5 hover:text-primary shrink-0 transition-all" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input 
            placeholder="Поиск..." 
            className="pl-11 bg-white/5 border-white/5 rounded-2xl h-12 focus:ring-1 focus:ring-primary/40 transition-all w-full placeholder:uppercase placeholder:text-[10px] placeholder:font-black placeholder:tracking-widest"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="px-3 py-3 shrink-0">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-11 bg-white/5 rounded-2xl p-1 gap-1 border border-white/5">
            <TabsTrigger value="all" className="rounded-xl text-[10px] font-black uppercase tracking-tighter data-[state=active]:bg-primary">Все</TabsTrigger>
            <TabsTrigger value="private" className="rounded-xl text-[10px] font-black uppercase tracking-tighter data-[state=active]:bg-primary">Чаты</TabsTrigger>
            <TabsTrigger value="group" className="rounded-xl text-[10px] font-black uppercase tracking-tighter data-[state=active]:bg-primary">Группы</TabsTrigger>
            <TabsTrigger value="channel" className="rounded-xl text-[10px] font-black uppercase tracking-tighter data-[state=active]:bg-primary">Инфо</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        {isChatsLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
          </div>
        ) : (
          <div className="space-y-2 pb-24">
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
                  "flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all duration-300 group relative border border-transparent",
                  chats?.find(c => c.type === 'saved')?.id === currentChatId ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'hover:bg-white/5 text-foreground'
                )}
              >
                <div className="h-12 w-12 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0 shadow-inner">
                  {isCreatingSaved ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bookmark className="w-6 h-6 text-accent" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-black text-sm uppercase tracking-tighter">Избранное</span>
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

      <div className="absolute bottom-6 left-0 w-full px-6 pointer-events-none">
        <Button 
          className="w-full rounded-2xl h-14 shadow-2xl shadow-primary/40 bg-gradient-to-r from-primary to-primary/80 font-black uppercase tracking-widest pointer-events-auto transition-transform hover:scale-[1.02] active:scale-95 group"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
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
        "flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all duration-300 group relative border border-transparent",
        isActive ? 'bg-primary text-white shadow-xl shadow-primary/30 z-10' : 'hover:bg-white/5 text-foreground'
      )}
    >
      <div className="relative shrink-0">
        <UserAvatar 
          userId={otherId} 
          manualAvatarUrl={manualAvatarUrl || otherProfile?.avatarUrl || chat.avatarUrl}
          className="h-12 w-12 rounded-2xl" 
          fallbackName={finalDisplayName}
        />
        {(status === 'в сети' || isTyping) && !isOtherDeleted && !isGlobalResult && (
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-accent rounded-full border-[3px] border-background animate-pulse" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-black text-sm uppercase tracking-tighter truncate flex items-center gap-1">
            {finalDisplayName}
            {isOtherPremium && <Star className="w-3 h-3 text-accent fill-accent shrink-0" />}
            {isPinned && <Pin className="w-3 h-3 rotate-45 shrink-0" />}
          </span>
          <div className="flex items-center gap-1">
            {onTogglePin && (
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-7 w-7 rounded-xl md:opacity-0 group-hover:opacity-100 transition-all",
                  isPinned ? "text-accent" : "text-muted-foreground"
                )}
                onClick={onTogglePin}
              >
                <Pin className={cn("w-3.5 h-3.5", isPinned && "fill-accent")} />
              </Button>
            )}
            {unreadCount > 0 && !isActive && (
              <Badge variant="default" className="bg-accent text-accent-foreground rounded-lg h-5 min-w-5 flex items-center justify-center text-[10px] font-black px-1 border-none">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className={cn(
            "text-[10px] uppercase font-bold tracking-widest truncate transition-colors",
            isActive ? 'text-white/80' : (isTyping || status === 'в сети' ? 'text-accent' : 'text-muted-foreground/60')
          )}>
            {isTyping ? (
              <span className="flex items-center gap-0.5">печатает<span className="animate-typing-dot">.</span><span className="animate-typing-dot [animation-delay:0.2s]">.</span><span className="animate-typing-dot [animation-delay:0.4s]">.</span></span>
            ) : status}
          </div>
          {isGlobalResult && <div className="text-[9px] font-black opacity-40 uppercase tracking-tighter">{chat.username}</div>}
        </div>
      </div>
    </div>
  );
}