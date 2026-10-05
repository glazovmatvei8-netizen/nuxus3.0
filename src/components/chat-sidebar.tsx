"use client"

import React, { useState, useMemo, memo, useEffect } from 'react';
import { useAppState } from '@/lib/app-state';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { Plus, Search, Star, Pin, MessageSquare, ShieldCheck, Loader2, Loader } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { StoriesBar } from './stories-bar';
import type { User as UserType, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useAuth } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { collection, query, where, doc, limit, orderBy } from 'firebase/firestore';
import { formatDisplayName, cn, decryptSignal, isUserPremium, isGlobalAdmin } from '@/lib/utils';
import { format } from 'date-fns';
import { useTranslations } from '@/hooks/use-translations';
import { signOut } from 'firebase/auth';
import { AdminPanelModal } from './modals/admin-panel-modal';

const ChatListItem = memo(({ 
  chat, isActive, otherId, isPinned, onClick, currentUserId
}: any) => {
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (!mounted) return '...';
    if (!lastMsg) return 'Нет сообщений';
    if (lastMsg.contentType !== 'text') return `[Вложение]`;
    return decryptSignal(lastMsg.content);
  }, [lastMsg, mounted]);

  const displayTime = useMemo(() => {
    if (!mounted || !chat.lastMessageAt) return '';
    try {
      return format(new Date(chat.lastMessageAt), 'HH:mm');
    } catch (e) {
      return '';
    }
  }, [chat.lastMessageAt, mounted]);

  const displayName = useMemo(() => {
    if (!mounted) return '...';
    if (chat.type === 'saved') return 'Архив Данных';
    if (chat.type === 'private') return formatDisplayName(otherProfile?.name, otherProfile?.username);
    return formatDisplayName(chat.name, chat.username);
  }, [chat, otherProfile, mounted]);

  return (
    <div className="px-4 py-1">
      <div 
        onClick={onClick}
        className={cn(
          "relative flex items-center gap-5 p-5 rounded-[2.8rem] transition-all duration-500 cursor-pointer group",
          isActive 
            ? "bg-primary/5 border border-primary/20 shadow-2xl" 
            : "hover:bg-white/[0.03]"
        )}
      >
        <div className="relative shrink-0">
          <UserAvatar 
            userId={otherId || (chat.type === 'saved' ? currentUserId : null)} 
            className="h-16 w-16 rounded-[2rem] border border-white/5 shadow-xl group-hover:scale-105 transition-transform" 
            manualAvatarUrl={chat.type !== 'private' && chat.type !== 'saved' ? chat.avatarUrl : otherProfile?.avatarUrl} 
            fallbackName={displayName} 
            showOnlineStatus={chat.type === 'private'} 
          />
          {isUnread && (
            <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full border-4 border-background shadow-[0_0_20px_rgba(var(--primary),1)]" />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("font-black text-[15px] truncate italic tracking-tighter uppercase", isActive ? "text-white" : "text-white/80")}>
                {displayName}
              </span>
              {isPremium && <Star className="w-3.5 h-3.5 text-primary fill-primary animate-pulse" />}
              {isPinned && <Pin className="w-3 h-3 text-muted-foreground/40" />}
            </div>
            <span className="text-[9px] text-muted-foreground/30 font-black whitespace-nowrap tracking-widest">
              {displayTime}
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground truncate font-medium tracking-tight">
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
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const hO = () => setIsOnline(true);
    const hF = () => setIsOnline(false);
    window.addEventListener('online', hO);
    window.addEventListener('offline', hF);
    return () => {
      window.removeEventListener('online', hO);
      window.removeEventListener('offline', hF);
    };
  }, []);

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
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <ScrollArea className="flex-1 no-scrollbar">
        <div className="flex flex-col min-h-full pb-60">
          <div className="px-6 pt-12 pb-6 space-y-6">
            <div className="flex items-center justify-between">
               {isOnline ? (
                 <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none opacity-90 animate-in fade-in duration-500">{t('app.chats')}</h1>
               ) : (
                 <div className="flex flex-col gap-1 animate-in slide-in-from-left-4 duration-500">
                    <div className="flex items-center gap-3">
                       <h1 className="text-4xl font-black text-primary italic tracking-tighter uppercase leading-none">Nuxus</h1>
                       <Loader className="w-6 h-6 text-primary animate-spin" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 italic animate-pulse">Подключение...</span>
                 </div>
               )}
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-12 w-12 rounded-2xl bg-card border border-white/5 hover:bg-primary/20 hover:text-primary transition-all shadow-xl" 
                 onClick={() => setIsCreateModalOpen(true)}
               >
                 <Plus className="w-6 h-6" strokeWidth={3} />
               </Button>
            </div>

            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
              <input 
                placeholder={t('sidebar.search')} 
                className="w-full h-14 bg-card rounded-[2rem] pl-16 text-[15px] font-bold text-white placeholder:text-muted-foreground/40 border border-white/5 focus:outline-none focus:border-primary/40 transition-all shadow-inner"
                onClick={() => setIsSearchOpen(true)}
                readOnly
              />
            </div>
          </div>

          <div className="px-4 pb-4">
            <ScrollArea className="w-full" orientation="horizontal">
               <div className="flex gap-4 px-2 py-1">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer" onClick={() => handleSlotSwitch(i)}>
                      <div className={cn(
                        "h-16 w-16 rounded-[1.8rem] border-2 flex items-center justify-center transition-all active:scale-90 shadow-2xl relative",
                        activeAccountIndex === i ? "border-primary bg-primary/10 shadow-primary/20" : "border-white/5 bg-card opacity-40 hover:opacity-100"
                      )}>
                        {activeAccountIndex === i ? (
                          <UserAvatar userId={user?.uid} className="h-10 w-10 border-none" manualAvatarUrl={profile?.avatarUrl} />
                        ) : (
                          <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                        {activeAccountIndex === i && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full border-2 border-background shadow-[0_0_100px_rgba(var(--primary),1)]" />}
                      </div>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest truncate w-16 text-center italic",
                        activeAccountIndex === i ? "text-primary" : "text-muted-foreground"
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

          <div className="mt-2">
             {isChatsLoading && filteredChats.length === 0 ? (
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
                  <MessageSquare className="w-24 h-24 text-muted-foreground" />
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