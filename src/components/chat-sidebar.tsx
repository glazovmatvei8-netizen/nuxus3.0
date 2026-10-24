"use client"

import React, { useState, useMemo, memo, useEffect } from 'react';
import { useAppState } from '@/lib/app-state';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, Search, Star, MessageSquare, Loader2, 
  Trash2, Archive, LogOut, ShieldCheck, Edit3,
  CheckCircle2, BellOff, Edit, Zap
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { StoriesBar } from './stories-bar';
import type { User as UserType, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useAuth } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { collection, query, where, doc, limit, orderBy, updateDoc, deleteDoc } from 'firebase/firestore';
import { formatDisplayName, cn, decryptSignal, isUserPremium, triggerHaptic } from '@/lib/utils';
import { format } from 'date-fns';
import { signOut } from 'firebase/auth';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';

const ChatListItem = memo(({ 
  chat, isActive, otherId, onClick, currentUserId, draft
}: any) => {
  const db = useFirestore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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

  const previewText = useMemo(() => {
    if (!mounted) return '...';
    if (draft) return `Черновик: ${draft}`;
    if (!lastMsg) return 'Сигнал отсутствует';
    if (lastMsg.contentType !== 'text') return `[Медиа пакет]`;
    return decryptSignal(lastMsg.content);
  }, [lastMsg, mounted, draft]);

  const displayName = useMemo(() => {
    if (!mounted) return '...';
    if (chat.type === 'saved') return 'DATA ARCHIVE';
    if (chat.type === 'private') return formatDisplayName(otherProfile?.name, otherProfile?.username);
    return formatDisplayName(chat.name, chat.username);
  }, [chat, otherProfile, mounted]);

  return (
    <div className="px-3 py-0.5">
      <ContextMenu>
        <ContextMenuTrigger>
          <div 
            onClick={onClick}
            className={cn(
              "relative flex items-center gap-4 p-4 rounded-[2rem] transition-all duration-300 cursor-pointer group",
              isActive ? "bg-primary/10 border border-primary/20 sonic-glow" : "hover:bg-white/[0.04]"
            )}
          >
            <div className="relative shrink-0">
              <UserAvatar 
                userId={otherId || (chat.type === 'saved' ? currentUserId : null)} 
                className="h-14 w-14 rounded-[1.4rem] border border-white/10" 
                manualAvatarUrl={chat.type !== 'private' && chat.type !== 'saved' ? chat.avatarUrl : otherProfile?.avatarUrl} 
                fallbackName={displayName} 
              />
              {isUnread && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-4 border-[#121212] sonic-glow" />
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-black text-[15px] truncate text-white tracking-tight italic">
                    {displayName}
                  </span>
                  {isPremium && <Zap className="w-3 h-3 text-primary fill-current animate-pulse" />}
                </div>
                <span className="text-[9px] text-white/20 font-black whitespace-nowrap">
                  {lastMsg?.sentAt ? format(new Date(lastMsg.sentAt), 'HH:mm') : ''}
                </span>
              </div>
              <p className={cn("text-[13px] truncate font-bold tracking-tight", draft ? "text-primary italic" : "text-white/40")}>
                {previewText}
              </p>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56 mig-glass-heavy rounded-2xl p-2">
          <ContextMenuItem className="gap-3 py-3 rounded-xl font-black text-[10px] uppercase text-white"><CheckCircle2 className="w-4 h-4 text-primary" /> Прочитано</ContextMenuItem>
          <ContextMenuItem className="gap-3 py-3 rounded-xl font-black text-[10px] uppercase text-white"><Archive className="w-4 h-4 text-primary" /> В архив</ContextMenuItem>
          <ContextMenuItem className="gap-3 py-3 rounded-xl font-black text-[10px] uppercase text-red-500"><Trash2 className="w-4 h-4" /> Удалить</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
});
ChatListItem.displayName = 'ChatListItem';

export default function ChatSidebar() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId, setIsSearchOpen, localDrafts } = useAppState();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user?.uid]);
  
  const { data: chats, isLoading } = useCollection<Chat>(chatsQuery);

  const sortedChats = useMemo(() => {
    if (!chats) return [];
    return [...chats].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [chats]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <header className="px-6 pt-12 pb-4 space-y-6 shrink-0">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">MIG</h1>
              <div className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-full flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                 <span className="text-[10px] font-black text-primary uppercase tracking-widest italic">V210</span>
              </div>
           </div>
           <Button variant="ghost" size="icon" className="h-12 w-12 rounded-[1.2rem] bg-white/[0.03] border border-white/5 text-white hover:bg-primary/20" onClick={() => setIsCreateModalOpen(true)}>
             <Plus className="w-6 h-6" strokeWidth={3} />
           </Button>
        </div>

        <div className="relative group cursor-pointer" onClick={() => setIsSearchOpen(true)}>
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-hover:text-primary transition-colors" />
          <div className="w-full h-14 bg-white/[0.04] rounded-[1.5rem] border border-white/10 pl-16 flex items-center text-sm font-black uppercase text-white/20 tracking-widest italic shadow-inner">
            Search Network...
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1 no-scrollbar">
        <div className="flex flex-col">
          <StoriesBar />
          
          <div className="pb-32 mt-2">
             {isLoading ? (
               <div className="flex flex-col items-center justify-center py-20 opacity-20">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
               </div>
             ) : sortedChats.length > 0 ? (
               sortedChats.map(chat => (
                 <ChatListItem 
                   key={chat.id} 
                   chat={chat} 
                   isActive={currentChatId === chat.id} 
                   onClick={() => setCurrentChatId(chat.id)}
                   currentUserId={user?.uid} 
                   draft={localDrafts[chat.id]}
                   otherId={chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null} 
                 />
               ))
             ) : (
               <div className="flex flex-col items-center justify-center py-32 opacity-10">
                  <MessageSquare className="w-16 h-16 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]">Сигналы не обнаружены</p>
               </div>
             )}
          </div>
        </div>
      </ScrollArea>
      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </div>
  );
}