
"use client"

import React, { useState, useMemo, useEffect, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { Search, Settings, Plus, Loader2, Bookmark, Pin, Globe, Star, Hexagon, ShieldAlert } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateChatModal } from './modals/create-chat-modal';
import { SettingsModal } from './modals/settings-modal';
import { AdminPanelModal } from './modals/admin-panel-modal';
import type { ChatType, User, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDocs, limit, arrayUnion, arrayRemove, updateDoc, addDoc } from 'firebase/firestore';
import { formatLastSeen, formatDisplayName, cn, isGlobalAdmin, isUserPremium } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useTranslations } from '@/hooks/use-translations';
import { differenceInSeconds, parseISO } from 'date-fns';

const ChatListItem = memo(({ chat, isActive, otherId, cachedDisplayName, manualAvatarUrl, onClick, isPinned, isGlobalResult, onTogglePin, onJoin }: any) => {
  const db = useFirestore();
  const { user } = useUser();
  const { t } = useTranslations();
  
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
  const unreadCount = useMemo(() => (unreadData || []).filter(m => m.senderId !== user?.uid).length, [unreadData, user]);

  const typingUsers = useMemo(() => {
    if (!chat?.typing || !user) return [];
    return Object.entries(chat.typing)
      .filter(([uid, isTyping]) => isTyping && uid !== user.uid)
      .map(([uid]) => uid);
  }, [chat?.typing, user]);

  const isActuallyOnline = useMemo(() => {
    if (!otherProfile?.lastSeen) return false;
    try {
      return Math.abs(differenceInSeconds(new Date(), parseISO(otherProfile.lastSeen))) < 20; 
    } catch (e) { return false; }
  }, [otherProfile?.lastSeen]);

  const status = useMemo(() => {
    if (isGlobalResult) return chat.type === 'group' ? 'Public Group' : 'Public Channel';
    if (chat.type === 'saved') return 'Облачное хранилище';
    if (otherId) return formatLastSeen(otherProfile?.lastSeen, otherProfile?.settings?.privacy?.lastSeenVisibility);
    return chat.type === 'group' ? t('sidebar.groups') : (chat.type === 'channel' ? t('sidebar.channels') : 'Saved');
  }, [isGlobalResult, otherId, otherProfile, chat.type, t]);

  const isTyping = typingUsers.length > 0 && (otherId ? isActuallyOnline : true);
  
  const finalDisplayName = useMemo(() => {
    if (chat.type === 'saved') return 'Избранное';
    return formatDisplayName(otherProfile?.name || cachedDisplayName || chat.name || 'User');
  }, [chat.type, otherProfile?.name, cachedDisplayName, chat.name]);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border border-transparent will-change-transform group",
        isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-muted text-foreground'
      )}
    >
      <div className="relative shrink-0">
        {chat.type === 'saved' ? (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Bookmark className="w-5 h-5 text-white fill-white" />
          </div>
        ) : (
          <UserAvatar userId={otherId} manualAvatarUrl={manualAvatarUrl || otherProfile?.avatarUrl || chat.avatarUrl} className="h-10 w-10" fallbackName={finalDisplayName} />
        )}
        {isActuallyOnline && !isGlobalResult && chat.type !== 'saved' && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-accent rounded-full border-2 border-card" />}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-sm truncate flex items-center gap-1">
            {finalDisplayName}
            {(otherProfile?.isPremium || chat.isPremium) && <Star className="w-3 h-3 text-accent fill-accent shrink-0" />}
            {isPinned && <Pin className="w-3 h-3 rotate-45 shrink-0 text-accent opacity-100" />}
          </span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && !isActive && <Badge variant="default" className="bg-accent text-accent-foreground rounded-full h-4 min-w-4 flex items-center justify-center text-[9px] font-bold px-1 border-none">{unreadCount}</Badge>}
            <button 
              onClick={(e) => { e.stopPropagation(); onTogglePin(chat.id, e); }}
              className={cn(
                "p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10",
                isPinned && "opacity-100 text-accent"
              )}
            >
              <Pin className={cn("w-3 h-3 transition-transform", isPinned ? "rotate-0" : "rotate-45")} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className={cn("text-[9px] uppercase font-bold tracking-widest truncate", isActive ? 'text-white/80' : (isTyping ? 'text-accent' : 'text-muted-foreground/60'))}>
            {isTyping ? `${t('chat.typing')}...` : status}
          </div>
          {isGlobalResult && <Button size="sm" variant="outline" className="h-6 text-[8px] uppercase px-2 rounded-lg" onClick={(e) => { e.stopPropagation(); onJoin(); }}>Join</Button>}
        </div>
      </div>
    </div>
  );
});
ChatListItem.displayName = 'ChatListItem';

export default function ChatSidebar() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslations();
  const { currentChatId, setCurrentChatId, forwardingMessage, setForwardingMessage } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ChatType | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [globalSearchResult, setGlobalSearchResult] = useState<Chat | null>(null);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const isAdmin = isGlobalAdmin(profile);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user]);
  const { data: chats } = useCollection<Chat>(chatsQuery);

  const pinnedIds = useMemo(() => profile?.pinnedChatIds || [], [profile]);

  const handleTogglePin = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!db || !user || !userProfileRef) return;
    const isPinned = pinnedIds.includes(chatId);
    
    try {
      await updateDoc(userProfileRef, {
        pinnedChatIds: isPinned ? arrayRemove(chatId) : arrayUnion(chatId)
      });
      toast({ title: isPinned ? "Чат откреплен" : "Чат закреплен" });
    } catch (e) {
      console.error("Pin error:", e);
    }
  };

  const handleOpenSaved = async () => {
    if (!db || !user || !profile) return;
    
    // Check if saved chat exists
    const savedChat = chats?.find(c => c.type === 'saved');
    if (savedChat) {
      setCurrentChatId(savedChat.id);
      return;
    }

    // Create saved chat if doesn't exist
    try {
      const newSavedChat = {
        type: 'saved' as const,
        name: 'Избранное',
        username: `@saved_${user.uid.slice(0, 5)}`,
        participantIds: [user.uid],
        adminIds: [user.uid],
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        avatarUrl: null
      };
      const docRef = await addDoc(collection(db, 'chats'), newSavedChat);
      setCurrentChatId(docRef.id);
      toast({ title: "Чат 'Избранное' готов" });
    } catch (e) {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  const handleChatClick = (chat: Chat) => {
    if (forwardingMessage) {
      if (!db || !user || !profile) return;
      const newMsgData = {
        chatId: chat.id, senderId: user.uid, senderName: profile.name,
        content: forwardingMessage.content, contentType: forwardingMessage.contentType,
        sentAt: new Date().toISOString(), isRead: false, forwardFrom: forwardingMessage.senderName
      };
      addDocumentNonBlocking(collection(db, 'chats', chat.id, 'messages'), newMsgData);
      updateDocumentNonBlocking(doc(db, 'chats', chat.id), { lastMessageAt: new Date().toISOString() });
      setForwardingMessage(null);
      toast({ title: "Сообщение переслано" });
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
        const q = query(collection(db, 'chats'), where('username', '==', searchQuery.toLowerCase()), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const chatData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Chat;
          if (!chatData.participantIds.includes(user?.uid || '')) setGlobalSearchResult(chatData);
          else setGlobalSearchResult(null);
        } else setGlobalSearchResult(null);
      } catch (e) {} finally { setIsSearchingGlobal(false); }
    };
    const timer = setTimeout(searchGlobal, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, db, user?.uid]);

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

  const filteredChats = useMemo(() => {
    return sortedChats.filter(chat => {
      // Show saved messages if search matches or if explicitly in 'all' or 'private' (private is used for saved in filters usually)
      const isSaved = chat.type === 'saved';
      const otherId = chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;
      const chatName = isSaved ? 'Избранное' : (otherId && chat.metadata && chat.metadata[otherId] ? chat.metadata[otherId].name : chat.name);
      
      const matchesTab = activeTab === 'all' || chat.type === activeTab || (activeTab === 'private' && isSaved);
      const matchesSearch = chatName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesTab && matchesSearch;
    });
  }, [sortedChats, activeTab, searchQuery, user]);

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      <div className="p-4 space-y-4 shrink-0 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group min-w-0" onClick={() => setIsSettingsOpen(true)}>
            <div className="relative shrink-0">
               <UserAvatar userId={user?.uid} className="h-11 w-11 border-2 border-primary group-hover:scale-105 transition-all shadow-xl" fallbackName={profile?.name} manualAvatarUrl={profile?.avatarUrl} />
               <div className="absolute -top-1 -left-1 bg-primary p-0.5 rounded-lg"><Hexagon className="w-3 h-3 text-white" /></div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm truncate flex items-center gap-1">{formatDisplayName(profile?.name || user?.displayName)} {isUserPremium(profile) && <Star className="w-3 h-3 text-accent fill-accent" />}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest truncate">{profile?.username || 'Nuxus ID'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-xl text-accent hover:bg-accent/10" onClick={handleOpenSaved} title="Избранное">
              <Bookmark className="w-5 h-5 fill-accent/20" />
            </Button>
            {isAdmin && <Button variant="ghost" size="icon" className="rounded-xl text-primary hover:bg-primary/10" onClick={() => setIsAdminPanelOpen(true)}><ShieldAlert className="w-5 h-5" /></Button>}
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setIsSettingsOpen(true)}><Settings className="w-5 h-5" /></Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('sidebar.search')} className="pl-9 bg-muted border-none rounded-xl h-10 text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>
      <div className="px-3 py-2 shrink-0">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9 bg-muted/50 rounded-xl p-1 gap-1 border border-white/5">
            <TabsTrigger value="all" className="rounded-lg text-[9px] font-bold uppercase tracking-widest">{t('sidebar.all')}</TabsTrigger>
            <TabsTrigger value="private" className="rounded-lg text-[9px] font-bold uppercase tracking-widest">{t('sidebar.private')}</TabsTrigger>
            <TabsTrigger value="group" className="rounded-lg text-[9px] font-bold uppercase tracking-widest">{t('sidebar.groups')}</TabsTrigger>
            <TabsTrigger value="channel" className="rounded-lg text-[9px] font-bold uppercase tracking-widest">{t('sidebar.channels')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ScrollArea className="flex-1 px-3 py-2 scrollbar-hide">
        <div className="space-y-1 pb-24">
          {isSearchingGlobal && <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>}
          {globalSearchResult && <ChatListItem chat={globalSearchResult} isActive={currentChatId === globalSearchResult.id} onClick={() => handleChatClick(globalSearchResult)} isGlobalResult onJoin={async () => { if(!db || !user) return; await updateDoc(doc(db, 'chats', globalSearchResult.id), { participantIds: arrayUnion(user.uid) }); setCurrentChatId(globalSearchResult.id); setSearchQuery(''); setGlobalSearchResult(null); }} />}
          {filteredChats.map(chat => (
            <ChatListItem 
              key={chat.id} chat={chat} isActive={currentChatId === chat.id} 
              otherId={chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null} 
              cachedDisplayName={chat.metadata && user && chat.participantIds?.find((id: string) => id !== user.uid) ? chat.metadata[chat.participantIds.find((id: string) => id !== user.uid)!].name : chat.name} 
              onClick={() => handleChatClick(chat)} isPinned={pinnedIds.includes(chat.id)} onTogglePin={handleTogglePin} 
            />
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-white/5 bg-card">
        <Button className="w-full rounded-xl h-12 font-black uppercase tracking-[0.2em] italic bg-primary shadow-xl" onClick={() => setIsCreateModalOpen(true)}><Plus className="w-5 h-5 mr-2" />{t('sidebar.create')}</Button>
      </div>
      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <AdminPanelModal open={isAdminPanelOpen} onOpenChange={setIsAdminPanelOpen} />
    </div>
  );
}
