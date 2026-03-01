
"use client"

import React, { useState, useMemo, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, Bookmark, Pin, Star, 
  Check, CheckCheck,
  MessageSquare, Shield, Lock, CirclePlus, SquarePen,
  Search
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { AdminPanelModal } from './modals/admin-panel-modal';
import type { User, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, limit, collectionGroup } from 'firebase/firestore';
import { formatDisplayName, cn, isGlobalAdmin } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { differenceInSeconds, format } from 'date-fns';

const ChatListItem = memo(({ chat, isActive, otherId, cachedDisplayName, manualAvatarUrl, onClick, isPinned, user }: any) => {
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
    if (!db || !chat.id || !user) return null;
    return query(
      collection(db, 'chats', chat.id, 'messages'),
      where('isRead', '==', false)
    );
  }, [db, chat.id, user]);

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
    if (differenceInSeconds(now, date) < 604800) return format(date, 'eeeee');
    return format(date, 'dd.MM');
  }, [chat.lastMessageAt, chat.createdAt]);

  return (
    <div
      onClick={() => onClick(unreadCount)}
      className={cn(
        "flex items-center gap-3 px-4 py-2 cursor-pointer transition-all border-none group relative",
        isActive ? 'bg-white/10' : 'active:bg-white/[0.05]'
      )}
    >
      <div className="relative shrink-0">
        {chat.type === 'saved' ? (
          <div className="h-[52px] w-[52px] rounded-full bg-[#007AFF] flex items-center justify-center shadow-lg">
            <Bookmark className="w-6 h-6 text-white fill-white" />
          </div>
        ) : (
          <UserAvatar userId={otherId} manualAvatarUrl={manualAvatarUrl || otherProfile?.avatarUrl || chat.avatarUrl} className="h-[52px] w-[52px]" fallbackName={finalDisplayName} />
        )}
      </div>
      <div className="flex-1 min-w-0 border-b border-white/[0.03] pb-2 h-full flex flex-col justify-center">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-[16px] text-white truncate">
              {finalDisplayName}
            </span>
            {otherProfile?.isPremium && (
              <div className="bg-[#007AFF] rounded-full p-0.5 shrink-0">
                <Check className="w-2 h-2 text-white stroke-[4]" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {lastMsg?.senderId === user?.uid && (
              lastMsg?.isRead ? <CheckCheck className="w-3.5 h-3.5 text-[#007AFF]" /> : <Check className="w-3.5 h-3.5 text-muted-foreground/40" />
            )}
            <span className="text-[13px] text-muted-foreground/60 font-medium">{displayTime}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[14px] text-muted-foreground/60 truncate leading-snug">
            {lastMsg?.contentType === 'text' ? lastMsg.content : (lastMsg ? `[${lastMsg.contentType}]` : 'Нет сообщений')}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <Badge className={cn(
                "rounded-full h-5 min-w-5 flex items-center justify-center text-[11px] font-bold px-1.5 border-none",
                "bg-[#007AFF] text-white"
              )}>
                {unreadCount > 1000 ? '1K' : unreadCount}
              </Badge>
            )}
            {isPinned && <Pin className="w-3.5 h-3.5 rotate-45 text-muted-foreground/40" />}
          </div>
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
  const [activeTab, setActiveTab] = useState<'all' | 'private' | 'channels' | 'bots'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user]);
  const { data: chats } = useCollection<Chat>(chatsQuery);

  const unreadMessagesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collectionGroup(db, 'messages'), where('isRead', '==', false));
  }, [db, user]);
  const { data: allUnreadMessages } = useCollection<Message>(unreadMessagesQuery);

  const stats = useMemo(() => {
    if (!allUnreadMessages || !chats || !user) return { private: 0, channels: 0 };
    const unreadFromOthers = allUnreadMessages.filter(m => m.senderId !== user.uid);
    const privateChatIds = chats.filter(c => c.type === 'private' || c.type === 'saved').map(c => c.id);
    const channelChatIds = chats.filter(c => c.type === 'channel').map(c => c.id);
    return {
      private: unreadFromOthers.filter(m => privateChatIds.includes(m.chatId)).length,
      channels: unreadFromOthers.filter(m => channelChatIds.includes(m.chatId)).length
    };
  }, [allUnreadMessages, chats, user]);

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
    if (activeTab === 'channels') result = result.filter(c => c.type === 'channel');
    if (activeTab === 'private') result = result.filter(c => c.type === 'private' || c.type === 'saved');
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

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-[13px] border border-white/5">
            Изм.
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2 mr-1">
              <div className="w-6 h-6 rounded-full border border-background bg-accent/20 overflow-hidden" />
              <div className="w-6 h-6 rounded-full border border-background bg-primary/20 overflow-hidden" />
              <div className="w-6 h-6 rounded-full border border-background bg-blue-500/20 overflow-hidden" />
            </div>
            <div className="flex items-center gap-1.5" onClick={() => isGlobalAdmin(profile) && setIsAdminPanelOpen(true)}>
              <Lock className="w-3.5 h-3.5 text-white" />
              <h1 className="text-[17px] font-black text-white tracking-tight">Чаты 🐱</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-5 h-5 text-white" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20">
              <SquarePen className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          {[
            { id: 'all', label: 'Все' },
            { id: 'private', label: 'Личные', badge: stats.private > 0 ? stats.private.toString() : null, color: 'blue' },
            { id: 'channels', label: 'Каналы', badge: stats.channels > 0 ? stats.channels.toString() : null, color: 'grey' },
            { id: 'bots', label: 'Боты' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[14px] font-bold transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-white/20 text-white" : "text-muted-foreground/60 hover:text-white"
              )}
            >
              {tab.label}
              {tab.badge && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px]",
                  tab.color === 'blue' ? "bg-[#007AFF] text-white" : "bg-[#3a3a3c] text-white/60"
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-hide">
        <div className="pb-32">
          {filteredChats.length > 0 ? (
            filteredChats.map(chat => (
              <ChatListItem 
                key={chat.id} 
                chat={chat} 
                isActive={currentChatId === chat.id} 
                user={user}
                otherId={chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null} 
                cachedDisplayName={chat.metadata && user && chat.participantIds?.find((id: string) => id !== user.uid) ? chat.metadata[chat.participantIds.find((id: string) => id !== user.uid)!].name : chat.name} 
                onClick={() => handleChatClick(chat)} 
                isPinned={pinnedIds.includes(chat.id)} 
              />
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
      <AdminPanelModal open={isAdminPanelOpen} onOpenChange={setIsAdminPanelOpen} />
    </div>
  );
}
