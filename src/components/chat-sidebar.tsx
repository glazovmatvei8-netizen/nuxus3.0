
"use client"

import React, { useState, useMemo, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Search, Plus, Bookmark, Pin, Star, 
  MoreHorizontal, Check, CheckCheck,
  MessageSquare, Shield
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { SettingsModal } from './modals/settings-modal';
import { AdminPanelModal } from './modals/admin-panel-modal';
import type { User, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, limit } from 'firebase/firestore';
import { formatDisplayName, cn, isGlobalAdmin } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { differenceInSeconds, format } from 'date-fns';

const ChatListItem = memo(({ chat, isActive, otherId, cachedDisplayName, manualAvatarUrl, onClick, isPinned, isGlobalResult, user }: any) => {
  const db = useFirestore();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!db || !otherId) return null;
    return doc(db, 'users', otherId);
  }, [db, otherId]);
  
  const { data: otherProfile } = useDoc<User>(userProfileRef);

  const lastMessageQuery = useMemoFirebase(() => {
    if (!db || !chat.id) return null;
    return query(collection(db, 'chats', chat.id, 'messages'), where('sentAt', '<=', new Date().toISOString()), limit(1));
  }, [db, chat.id]);
  
  const { data: lastMessages } = useCollection<Message>(lastMessageQuery);
  const lastMsg = lastMessages?.[0];

  const unreadQuery = useMemoFirebase(() => {
    if (!db || !chat.id || !user || isGlobalResult) return null;
    return query(
      collection(db, 'chats', chat.id, 'messages'),
      where('isRead', '==', false)
    );
  }, [db, chat.id, user, isGlobalResult]);

  const { data: unreadData } = useCollection<Message>(unreadQuery);
  const unreadCount = useMemo(() => (unreadData || []).filter(m => m.senderId !== user?.uid).length, [unreadData, user]);

  const finalDisplayName = useMemo(() => {
    if (chat.type === 'saved') return 'Избранное';
    return formatDisplayName(otherProfile?.name || cachedDisplayName || chat.name || 'User');
  }, [chat.type, otherProfile?.name, cachedDisplayName, chat.name]);

  const displayTime = useMemo(() => {
    const date = chat.lastMessageAt ? new Date(chat.lastMessageAt) : new Date(chat.createdAt);
    const now = new Date();
    if (differenceInSeconds(now, date) < 86400) return format(date, 'HH:mm');
    return 'вчера';
  }, [chat.lastMessageAt, chat.createdAt]);

  return (
    <div
      onClick={() => onClick(unreadCount)}
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-none group relative",
        isActive ? 'bg-white/5' : 'hover:bg-white/[0.03]'
      )}
    >
      <div className="relative shrink-0">
        {chat.type === 'saved' ? (
          <div className="h-14 w-14 rounded-full bg-[#007AFF] flex items-center justify-center shadow-lg">
            <Bookmark className="w-7 h-7 text-white fill-white" />
          </div>
        ) : (
          <UserAvatar userId={otherId} manualAvatarUrl={manualAvatarUrl || otherProfile?.avatarUrl || chat.avatarUrl} className="h-14 w-14" fallbackName={finalDisplayName} />
        )}
      </div>
      <div className="flex-1 min-w-0 border-b border-white/[0.05] pb-3 h-full">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-bold text-[16px] text-white truncate flex items-center gap-1">
            {finalDisplayName}
            {(otherProfile?.isPremium || chat.isPremium) && <Star className="w-3 h-3 text-accent fill-accent shrink-0" />}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {lastMsg?.senderId === user?.uid && (
              lastMsg?.isRead ? <CheckCheck className="w-4 h-4 text-[#007AFF]" /> : <Check className="w-4 h-4 text-muted-foreground/60" />
            )}
            <span className="text-[13px] text-muted-foreground/60 font-medium">{displayTime}</span>
            {isPinned && <Pin className="w-3.5 h-3.5 rotate-45 text-muted-foreground/40" />}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[14px] text-muted-foreground/60 truncate leading-snug">
            {lastMsg?.contentType === 'text' ? lastMsg.content : (lastMsg ? `[${lastMsg.contentType}]` : 'Нет сообщений')}
          </p>
          {unreadCount > 0 && (
            <Badge className="bg-[#3a3a3c] text-white rounded-full h-5 min-w-5 flex items-center justify-center text-[11px] font-bold px-1.5 border-none">
              {unreadCount}
            </Badge>
          )}
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
  const { currentChatId, setCurrentChatId, forwardingMessage, setForwardingMessage } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'channels'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user]);
  const { data: chats } = useCollection<Chat>(chatsQuery);

  const pinnedIds = useMemo(() => profile?.pinnedChatIds || [], [profile]);

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
    let result = sortedChats;

    if (activeTab === 'channels') {
      result = result.filter(c => c.type === 'channel');
    }

    if (searchQuery.trim()) {
      result = result.filter(chat => {
        const isSaved = chat.type === 'saved';
        const otherId = chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;
        const chatName = isSaved ? 'Избранное' : (otherId && chat.metadata && chat.metadata[otherId] ? chat.metadata[otherId].name : chat.name);
        return chatName?.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    return result;
  }, [sortedChats, searchQuery, user, activeTab]);

  const isUnreadFilter = activeTab === 'unread';

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-4 pt-6 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[28px] font-black text-white tracking-tight">Чаты</h1>
          <div className="flex items-center gap-2">
            {isGlobalAdmin(profile) && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20"
                onClick={() => setIsAdminPanelOpen(true)}
              >
                <Shield className="w-5 h-5 text-primary" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full bg-white/[0.08] hover:bg-white/10"
              onClick={() => setIsSettingsOpen(true)}
            >
              <MoreHorizontal className="w-6 h-6 text-white" />
            </Button>
            <Button 
              size="icon" 
              className="h-10 w-10 rounded-xl bg-[#007AFF] hover:bg-[#007AFF]/90 shadow-lg shadow-blue-500/20"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-7 h-7 text-white" />
            </Button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input 
            placeholder="Люди, чаты и сообщения" 
            className="pl-10 bg-[#1c1c1e] border-none rounded-xl h-10 text-[15px] placeholder:text-muted-foreground/40 text-white focus-visible:ring-0" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>

        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide border-b border-white/[0.05]">
          {['all', 'unread', 'channels'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "text-[15px] font-bold pb-2.5 transition-all relative whitespace-nowrap",
                activeTab === tab ? "text-white" : "text-muted-foreground/60"
              )}
            >
              {tab === 'all' ? 'Все' : tab === 'unread' ? 'Непрочитанные' : 'Каналы'}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#007AFF] rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-hide">
        <div className="pb-24">
          {filteredChats.length > 0 ? (
            filteredChats.map(chat => (
              <UnreadFilterWrapper 
                key={chat.id} 
                chat={chat} 
                user={user} 
                enabled={isUnreadFilter}
              >
                <ChatListItem 
                  chat={chat} 
                  isActive={currentChatId === chat.id} 
                  user={user}
                  otherId={chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null} 
                  cachedDisplayName={chat.metadata && user && chat.participantIds?.find((id: string) => id !== user.uid) ? chat.metadata[chat.participantIds.find((id: string) => id !== user.uid)!].name : chat.name} 
                  onClick={() => handleChatClick(chat)} 
                  isPinned={pinnedIds.includes(chat.id)} 
                />
              </UnreadFilterWrapper>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">Здесь пока пусто</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <AdminPanelModal open={isAdminPanelOpen} onOpenChange={setIsAdminPanelOpen} />
    </div>
  );
}

// Helper to handle unread filtering logic properly
function UnreadFilterWrapper({ children, chat, user, enabled }: { children: React.ReactNode, chat: Chat, user: any, enabled: boolean }) {
  const db = useFirestore();
  const unreadQuery = useMemoFirebase(() => {
    if (!db || !chat.id || !user) return null;
    return query(collection(db, 'chats', chat.id, 'messages'), where('isRead', '==', false));
  }, [db, chat.id, user]);
  
  const { data: unreadData } = useCollection<Message>(unreadQuery);
  const unreadCount = (unreadData || []).filter(m => m.senderId !== user?.uid).length;

  if (enabled && unreadCount === 0) return null;
  return <>{children}</>;
}
