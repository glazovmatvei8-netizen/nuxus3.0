"use client"

import React, { useState, useMemo, memo, useRef, useEffect } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, Search, Star, Pin, PinOff, Archive, Lock, Trash2, MessageCircle, Activity, LayoutGrid, Users, User, ChevronRight, Zap, Shield, ChevronDown, UserPlus, Check, X, MessageSquare, Bell, BellOff, Eraser, Edit3, Sparkles, Cpu
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { AdminPanelModal } from './modals/admin-panel-modal';
import { StoriesBar } from './stories-bar';
import type { User as UserType, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc } from '@/firebase';
import { collection, query, where, doc, limit, orderBy, updateDoc, arrayUnion, arrayRemove, deleteDoc, setDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { formatDisplayName, cn, isGlobalAdmin, decryptSignal, isUserPremium } from '@/lib/utils';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

/**
 * CHAT SIDEBAR V26.0 «OBSIDIAN VOID»
 * Улучшенный список чатов с акцентом на глубину и премиальность.
 */

const ChatListItem = memo(({ 
  chat, isActive, otherId, isPinned, onClick, currentUserId
}: any) => {
  const db = useFirestore();

  const userProfileRef = useMemo(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(userProfileRef);

  const lastMessageQuery = useMemo(() => {
    if (!db || !chat.id) return null;
    return query(collection(db, 'chats', chat.id, 'messages'), orderBy('sentAt', 'desc'), limit(1));
  }, [db, chat.id]);
  const { data: lastMessages } = useCollection<Message>(lastMessageQuery);
  const lastMsg = lastMessages?.[0];

  const isSavedMessages = chat.id.startsWith('saved_');
  const isPremium = useMemo(() => isUserPremium(otherProfile), [otherProfile]);
  const isUnread = (lastMsg && !lastMsg.isRead && lastMsg.senderId !== currentUserId) || chat.isManualUnread;

  const decryptedPreview = useMemo(() => {
    if (!lastMsg) return isSavedMessages ? 'Личное хранилище данных' : 'Сигнал отсутствует';
    if (lastMsg.contentType !== 'text') return `[Медиа: ${lastMsg.contentType.toUpperCase()}]`;
    return decryptSignal(lastMsg.content);
  }, [lastMsg, isSavedMessages]);

  return (
    <div className="px-5 py-1.5 no-ios-select">
      <div 
        onClick={onClick}
        className={cn(
          "quantum-card transition-all duration-500 cursor-pointer group hover:bg-white/[0.08] active:scale-[0.98]",
          isActive ? "bg-primary/10 border-primary/40 shadow-2xl ring-1 ring-primary/20" : "bg-white/[0.02]"
        )}
      >
        <div className="flex items-center gap-5 px-5 py-4 h-[96px] relative overflow-hidden">
           <div className="relative shrink-0">
             <UserAvatar userId={otherId} className="h-16 w-16 rounded-[2rem] border border-white/10" manualAvatarUrl={chat.type !== 'private' ? chat.avatarUrl : otherProfile?.avatarUrl} fallbackName={chat.name} showOnlineStatus />
             {isUnread && <div className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-primary rounded-full border-[3px] border-[#020205] shadow-[0_0_20px_rgba(168,85,247,1)] animate-pulse" />}
           </div>

           <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
              <div className="flex items-center justify-between gap-2">
                 <div className="flex items-center gap-2 min-w-0">
                    <span className="font-black text-[17px] text-white italic tracking-tighter truncate uppercase leading-none">{formatDisplayName(chat.name || otherProfile?.name)}</span>
                    {isPremium && <Star className="w-4 h-4 text-accent fill-accent shrink-0 animate-pulse" />}
                    {isPinned && <Pin className="w-3.5 h-3.5 text-primary rotate-45 shrink-0" />}
                 </div>
                 <span className="text-[10px] text-white/20 font-black tabular-nums tracking-widest">{chat.lastMessageAt ? format(new Date(chat.lastMessageAt), 'HH:mm') : ''}</span>
              </div>
              <p className="text-[13px] text-muted-foreground/60 truncate font-semibold italic leading-snug">
                 {decryptedPreview}
              </p>
           </div>
           
           {isActive && (
             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-r-full shadow-[0_0_25px_rgba(168,85,247,1)] animate-in slide-in-from-left-4" />
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
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
      <ScrollArea className="flex-1">
        <div className="px-8 pt-12 pb-6 space-y-10 animate-in fade-in duration-1000">
          <div className="flex items-center justify-between relative">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 quantum-card flex items-center justify-center border-primary/20 bg-black">
                   <Activity className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase ml-1">СИГНАЛЫ</h1>
             </div>
             <Button 
               variant="ghost" 
               size="icon" 
               className="h-12 w-12 rounded-2xl ethereal-panel border-white/10 hover:border-primary/40 group shadow-2xl" 
               onClick={() => setIsCreateModalOpen(true)}
             >
               <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-700" />
             </Button>
          </div>

          <div className="relative group px-1">
            <div className="absolute -inset-1 bg-primary/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
              <input 
                placeholder="СКАНИРОВАНИЕ СЕТИ..." 
                className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-2xl pl-14 text-[11px] font-black uppercase tracking-[0.5em] placeholder:text-muted-foreground/20 focus:outline-none focus:border-primary/40 transition-all shadow-inner"
                onClick={() => setIsSearchOpen(true)}
                readOnly
              />
            </div>
          </div>
        </div>

        <StoriesBar />

        <div className="pb-40 space-y-1 mt-6">
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
             <div className="flex flex-col items-center justify-center py-32 opacity-10 space-y-6">
                <Cpu className="w-24 h-24 text-primary" />
                <p className="text-[12px] font-black uppercase tracking-[0.6em]">ЭФИР ПУСТ</p>
             </div>
           )}
        </div>
      </ScrollArea>
      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </div>
  );
}
