
"use client"

import React, { useState, useMemo, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, Search, Star, Pin, MessageSquare, ChevronRight, Settings2, Users, Radio
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { StoriesBar } from './stories-bar';
import type { User as UserType, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc } from '@/firebase';
import { collection, query, where, doc, limit, orderBy } from 'firebase/firestore';
import { formatDisplayName, cn, decryptSignal, isUserPremium } from '@/lib/utils';
import { format } from 'date-fns';
import { useTranslations } from '@/hooks/use-translations';

const ChatListItem = memo(({ 
  chat, isActive, otherId, isPinned, onClick, currentUserId
}: any) => {
  const db = useFirestore();
  const { t } = useTranslations();

  const userProfileRef = useMemo(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(userProfileRef);

  const lastMessageQuery = useMemo(() => {
    if (!db || !chat.id) return null;
    return query(collection(db, 'chats', chat.id, 'messages'), orderBy('sentAt', 'desc'), limit(1));
  }, [db, chat.id]);
  const { data: lastMessages } = useCollection<Message>(lastMessageQuery);
  const lastMsg = lastMessages?.[0];

  const isPremium = useMemo(() => isUserPremium(otherProfile), [otherProfile]);
  const isUnread = (lastMsg && !lastMsg.isRead && lastMsg.senderId !== currentUserId) || chat.isManualUnread;

  const decryptedPreview = useMemo(() => {
    if (!lastMsg) return 'Нет сообщений';
    if (lastMsg.contentType !== 'text') return `[Вложение]`;
    return decryptSignal(lastMsg.content);
  }, [lastMsg]);

  return (
    <div className="px-3 py-1">
      <div 
        onClick={onClick}
        className={cn(
          "relative flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 cursor-pointer group",
          isActive 
            ? "bg-white/[0.08] shadow-lg border border-white/5" 
            : "hover:bg-white/5"
        )}
      >
        <div className="relative shrink-0">
          <UserAvatar 
            userId={otherId} 
            className="h-14 w-14 rounded-2xl border border-white/5 shadow-md" 
            manualAvatarUrl={chat.type !== 'private' ? chat.avatarUrl : otherProfile?.avatarUrl} 
            fallbackName={chat.name} 
            showOnlineStatus 
          />
          {isUnread && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-[#0a0a0c] shadow-lg" />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn("font-bold text-[16px] truncate", isActive ? "text-white" : "text-white/90")}>
                {formatDisplayName(chat.name || otherProfile?.name, chat.username)}
              </span>
              {isPremium && <Star className="w-4 h-4 text-blue-400 fill-blue-400" />}
              {isPinned && <Pin className="w-3 h-3 text-white/20" />}
            </div>
            <span className="text-[11px] text-white/20 font-bold whitespace-nowrap">
              {chat.lastMessageAt ? format(new Date(chat.lastMessageAt), 'HH:mm') : ''}
            </span>
          </div>
          <p className="text-[14px] text-white/40 truncate font-medium">
            {decryptedPreview}
          </p>
        </div>
      </div>
    </div>
  );
});
ChatListItem.displayName = 'ChatListItem';

export default function ChatSidebar() {
  const { user } = useUser();
  const db = useFirestore();
  const { t } = useTranslations();
  const { currentChatId, setCurrentChatId, setIsSearchOpen } = useAppState();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const chatsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user?.uid]);
  const { data: chats } = useCollection<Chat>(chatsQuery);

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    return [...chats].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [chats]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <div className="px-6 pt-10 pb-4 shrink-0 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-white tracking-tight">{t('app.chats')}</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-12 w-12 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10" 
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-6 h-6 text-white" />
          </Button>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-blue-500 transition-colors" />
          <input 
            placeholder={t('sidebar.search')} 
            className="w-full h-12 bg-white/5 border border-white/5 rounded-2xl pl-12 text-[15px] font-medium placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 transition-all shadow-inner"
            onClick={() => setIsSearchOpen(true)}
            readOnly
          />
        </div>
      </div>

      <StoriesBar />

      <ScrollArea className="flex-1 mt-4">
        <div className="pb-32 space-y-1">
           {filteredChats.map(chat => (
             <ChatListItem 
               key={chat.id} 
               chat={chat} 
               isActive={currentChatId === chat.id} 
               onClick={() => setCurrentChatId(chat.id)}
               currentUserId={user?.uid} 
               otherId={chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null} 
             />
           ))}
           {(!filteredChats || filteredChats.length === 0) && (
             <div className="flex flex-col items-center justify-center py-20 opacity-20 space-y-4">
                <MessageSquare className="w-16 h-16" />
                <p className="text-sm font-bold uppercase tracking-[0.4em]">{t('sidebar.noResults')}</p>
             </div>
           )}
        </div>
      </ScrollArea>
      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </div>
  );
}
