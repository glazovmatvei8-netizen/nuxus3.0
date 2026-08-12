"use client"

import React, { useState, useMemo, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, Search, Star, Pin, MessageSquare, ChevronDown, Settings2, Users, Radio, ShieldCheck, UserPlus, LogOut, Loader2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { StoriesBar } from './stories-bar';
import type { User as UserType, Message, Chat, User } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc } from '@/firebase';
import { collection, query, where, doc, limit, orderBy } from 'firebase/firestore';
import { formatDisplayName, cn, decryptSignal, isUserPremium, isGlobalAdmin } from '@/lib/utils';
import { format } from 'date-fns';
import { useTranslations } from '@/hooks/use-translations';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';
import { AdminPanelModal } from './modals/admin-panel-modal';

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
          "relative flex items-center gap-4 p-4 rounded-[2.2rem] transition-all duration-300 cursor-pointer group",
          isActive 
            ? "bg-white/[0.08] shadow-2xl border border-white/10" 
            : "hover:bg-white/5"
        )}
      >
        <div className="relative shrink-0">
          <UserAvatar 
            userId={otherId} 
            className="h-14 w-14 rounded-2xl border border-white/10 shadow-lg group-hover:scale-105 transition-transform" 
            manualAvatarUrl={chat.type !== 'private' ? chat.avatarUrl : otherProfile?.avatarUrl} 
            fallbackName={chat.name} 
            showOnlineStatus 
          />
          {isUnread && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-[#030306] shadow-[0_0_10px_rgba(var(--primary),1)]" />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn("font-black text-[15px] truncate italic tracking-tight uppercase", isActive ? "text-white" : "text-white/90")}>
                {formatDisplayName(chat.name || otherProfile?.name, chat.username)}
              </span>
              {isPremium && <Star className="w-3.5 h-3.5 text-primary fill-primary animate-pulse" />}
              {isPinned && <Pin className="w-3 h-3 text-white/20" />}
            </div>
            <span className="text-[10px] text-white/20 font-black whitespace-nowrap tracking-widest">
              {chat.lastMessageAt ? format(new Date(chat.lastMessageAt), 'HH:mm') : ''}
            </span>
          </div>
          <p className="text-[13px] text-white/40 truncate font-medium tracking-tight">
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

  const userProfileRef = useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<UserType>(userProfileRef);

  const chatsQuery = useMemo(() => {
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
    if (confirm("Переключиться на этот аккаунт? Текущая сессия будет завершена.")) {
      setActiveAccountIndex(idx);
      signOut(auth!);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Account Switcher Header */}
      <div className="px-6 pt-12 pb-4 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-[2.2rem] cursor-pointer hover:bg-white/10 transition-all shadow-2xl group backdrop-blur-xl">
               <div className="flex items-center gap-4 min-w-0">
                  <UserAvatar userId={user?.uid} className="h-11 w-11 border-2 border-white/10 group-hover:border-primary/40 transition-all" manualAvatarUrl={profile?.avatarUrl} />
                  <div className="flex flex-col text-left min-w-0">
                     <span className="font-black text-sm text-white truncate leading-tight uppercase italic tracking-tight">{formatDisplayName(profile?.name, profile?.username)}</span>
                     <span className="text-[10px] text-primary/60 font-black uppercase tracking-[0.2em] mt-0.5 italic">Online Control</span>
                  </div>
               </div>
               <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                  <ChevronDown className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
               </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-[320px] bg-[#0a0a0c]/98 backdrop-blur-[60px] border-white/10 rounded-[3rem] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.8)] z-[1000] outline-none">
             <div className="p-3 space-y-2">
                {[0, 1, 2, 3, 4].map(i => (
                  <DropdownMenuItem 
                    key={i} 
                    onClick={() => handleSlotSwitch(i)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl transition-all font-black uppercase text-[10px] tracking-[0.2em] italic",
                      activeAccountIndex === i ? "bg-primary/20 text-primary border border-primary/20 shadow-lg" : "hover:bg-white/5 text-white/20"
                    )}
                  >
                     <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border-2", activeAccountIndex === i ? "bg-primary/10 border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.2)]" : "bg-white/5 border-white/5")}>
                           {activeAccountIndex === i ? <Star className="w-5 h-5 text-primary fill-primary animate-pulse" /> : <Plus className="w-5 h-5" />}
                        </div>
                        <span className="truncate max-w-[150px]">{slotNames[i] || `Пустой слот`}</span>
                     </div>
                     {activeAccountIndex === i && <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),1)]" />}
                  </DropdownMenuItem>
                ))}
             </div>
             
             {isGlobalAdmin(profile) && (
               <>
                 <DropdownMenuSeparator className="bg-white/5 mx-4" />
                 <DropdownMenuItem onClick={() => setIsAdminOpen(true)} className="gap-4 py-5 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest text-red-500 hover:bg-red-500/10">
                    <ShieldCheck className="w-6 h-6" /> Панель Управления
                 </DropdownMenuItem>
               </>
             )}
             
             <DropdownMenuSeparator className="bg-white/5 mx-4" />
             <DropdownMenuItem onClick={() => signOut(auth!)} className="gap-4 py-5 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white/20 hover:text-white hover:bg-white/5">
                <LogOut className="w-6 h-6" /> Завершить сессию
             </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-8 pb-6 flex items-center justify-between">
        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">{t('app.chats')}</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-12 w-12 rounded-2xl bg-white/5 border border-white/5 hover:bg-primary/20 hover:text-primary hover:border-primary/20 transition-all shadow-xl" 
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
        </Button>
      </div>

      <div className="px-8 mb-6">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
          <input 
            placeholder={t('sidebar.search')} 
            className="w-full h-14 bg-white/5 border border-white/5 rounded-[1.5rem] pl-14 text-[16px] font-medium placeholder:text-white/10 focus:outline-none focus:border-primary/40 focus:bg-white/[0.08] transition-all shadow-inner"
            onClick={() => setIsSearchOpen(true)}
            readOnly
          />
        </div>
      </div>

      <StoriesBar />

      <ScrollArea className="flex-1 mt-2">
        <div className="pb-32">
           {isChatsLoading ? (
             <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest italic">Синхронизация...</p>
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
             <div className="flex flex-col items-center justify-center py-20 opacity-10 space-y-4">
                <MessageSquare className="w-20 h-20" />
                <p className="text-xs font-black uppercase tracking-[0.5em]">{t('sidebar.noResults')}</p>
             </div>
           )}
        </div>
      </ScrollArea>
      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <AdminPanelModal open={isAdminOpen} onOpenChange={setIsAdminOpen} />
    </div>
  );
}
