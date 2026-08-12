"use client"

import React, { useState, useMemo, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, Search, Star, Pin, MessageSquare, ShieldCheck, Loader2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { StoriesBar } from './stories-bar';
import type { User as UserType, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, limit, orderBy } from 'firebase/firestore';
import { formatDisplayName, cn, decryptSignal, isUserPremium, isGlobalAdmin } from '@/lib/utils';
import { format } from 'date-fns';
import { useTranslations } from '@/hooks/use-translations';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';
import { AdminPanelModal } from './modals/admin-panel-modal';

const ChatListItem = memo(({ 
  chat, isActive, otherId, isPinned, onClick, currentUserId
}: any) => {
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(userProfileRef);

  const lastMessageQuery = useMemoFirebase(() => {
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
    <div className="px-4 py-1">
      <div 
        onClick={onClick}
        className={cn(
          "relative flex items-center gap-5 p-5 rounded-[2.8rem] transition-all duration-500 cursor-pointer group",
          isActive 
            ? "obsidian-glass shadow-2xl" 
            : "hover:bg-white/[0.03]"
        )}
      >
        <div className="relative shrink-0">
          <UserAvatar 
            userId={otherId} 
            className="h-16 w-16 rounded-[2rem] border border-white/5 shadow-xl group-hover:scale-105 transition-transform" 
            manualAvatarUrl={chat.type !== 'private' ? chat.avatarUrl : otherProfile?.avatarUrl} 
            fallbackName={chat.name} 
            showOnlineStatus 
          />
          {isUnread && (
            <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full border-4 border-[#010103] shadow-[0_0_20px_rgba(var(--primary),1)]" />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("font-black text-[15px] truncate italic tracking-tighter uppercase", isActive ? "text-white" : "text-white/80")}>
                {formatDisplayName(chat.name || otherProfile?.name, chat.username)}
              </span>
              {isPremium && <Star className="w-3.5 h-3.5 text-primary fill-primary animate-pulse" />}
              {isPinned && <Pin className="w-3 h-3 text-white/20" />}
            </div>
            <span className="text-[9px] text-white/10 font-black whitespace-nowrap tracking-widest">
              {chat.lastMessageAt ? format(new Date(chat.lastMessageAt), 'HH:mm') : ''}
            </span>
          </div>
          <p className="text-[13px] text-white/30 truncate font-medium tracking-tight">
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
  const auth = useAuth();
  const { t } = useTranslations();
  const { currentChatId, setCurrentChatId, setIsSearchOpen, activeAccountIndex, setActiveAccountIndex, slotNames } = useAppState();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<UserType>(userProfileRef);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user?.uid]);
  const { data: chats, isLoading: isChatsLoading } = useCollection<Chat>(chatsQuery);

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    return [...chats].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [chats]);

  const handleSlotSwitch = (idx: number) => {
    if (idx === activeAccountIndex) return;
    if (confirm("Сменить аккаунт? Текущая сессия будет завершена.")) {
      setActiveAccountIndex(idx);
      signOut(auth!);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <ScrollArea className="flex-1 no-scrollbar">
        <div className="flex flex-col min-h-full pb-40">
          {/* HEADER (Now part of the scroll flow) */}
          <div className="px-6 pt-12 pb-6 space-y-6">
            <div className="flex items-center justify-between">
               <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none opacity-90">{t('app.chats')}</h1>
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-12 w-12 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-primary/20 hover:text-primary transition-all shadow-xl" 
                 onClick={() => setIsCreateModalOpen(true)}
               >
                 <Plus className="w-6 h-6" strokeWidth={3} />
               </Button>
            </div>

            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/10 group-focus-within:text-primary transition-colors" />
              <input 
                placeholder={t('sidebar.search')} 
                className="w-full h-14 obsidian-glass rounded-[2rem] pl-16 text-[15px] font-medium placeholder:text-white/5 focus:outline-none focus:border-primary/40 transition-all shadow-inner"
                onClick={() => setIsSearchOpen(true)}
                readOnly
              />
            </div>
          </div>

          {/* SLOTS (Now part of the scroll flow) */}
          <div className="px-4 pb-4">
            <ScrollArea className="w-full" orientation="horizontal">
               <div className="flex gap-4 px-2 py-1">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer" onClick={() => handleSlotSwitch(i)}>
                      <div className={cn(
                        "h-16 w-16 rounded-[1.8rem] border-2 flex items-center justify-center transition-all active:scale-90 shadow-2xl relative",
                        activeAccountIndex === i ? "border-primary bg-primary/10 shadow-primary/20" : "border-white/5 bg-white/5 opacity-40 hover:opacity-100"
                      )}>
                        {activeAccountIndex === i ? (
                          <UserAvatar userId={user?.uid} className="h-10 w-10 border-none" manualAvatarUrl={profile?.avatarUrl} />
                        ) : (
                          <Plus className="w-6 h-6 text-white/20 group-hover:text-primary transition-colors" />
                        )}
                        {activeAccountIndex === i && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full border-2 border-[#010103] shadow-[0_0_10px_rgba(var(--primary),1)]" />}
                      </div>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest truncate w-16 text-center italic",
                        activeAccountIndex === i ? "text-primary" : "text-white/20"
                      )}>
                        {activeAccountIndex === i ? (profile?.name || 'Active') : (slotNames[i] || `Add account`)}
                      </span>
                    </div>
                  ))}
                  
                  {isGlobalAdmin(profile) && (
                    <div className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer" onClick={() => setIsAdminOpen(true)}>
                       <div className="h-16 w-16 rounded-[1.8rem] border-2 border-red-500/20 bg-red-500/5 flex items-center justify-center transition-all active:scale-90 shadow-2xl group-hover:bg-red-500/10 group-hover:border-red-500/40">
                          <ShieldCheck className="w-6 h-6 text-red-500" />
                       </div>
                       <span className="text-[8px] font-black uppercase tracking-widest text-red-500/40 group-hover:text-red-500 transition-colors italic">Root</span>
                    </div>
                  )}
               </div>
            </ScrollArea>
          </div>

          <StoriesBar />

          {/* CHAT LIST */}
          <div className="mt-2">
             {isChatsLoading ? (
               <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-10">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-widest italic">Syncing...</p>
               </div>
             ) : filteredChats.length > 0 ? (
               filteredChats.map(chat => (
                 <ChatListItem 
                   key={chat.id} 
                   chat={chat} 
                   isActive={currentChatId === chat.id} 
                   onClick={() => setCurrentChatId(chat.id)}
                   currentUserId={user?.uid} 
                   otherId={chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null} 
                 />
               ))
             ) : (
               <div className="flex flex-col items-center justify-center py-32 opacity-5 space-y-6">
                  <MessageSquare className="w-24 h-24" />
                  <p className="text-[10px] font-black uppercase tracking-[1em]">{t('sidebar.noResults')}</p>
               </div>
             )}
          </div>
        </div>
      </ScrollArea>
      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <AdminPanelModal open={isAdminOpen} onOpenChange={setIsAdminOpen} />
    </div>
  );
}
