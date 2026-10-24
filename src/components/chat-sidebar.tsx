"use client"

import React, { useState, useMemo, memo, useEffect } from 'react';
import { useAppState } from '@/lib/app-state';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, Search, Star, MessageSquare, Loader2, 
  Trash2, Archive, ShieldCheck, CheckCircle2, Zap
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { StoriesBar } from './stories-bar';
import type { User as UserType, Message, Chat } from '@/lib/types';
import { useFirestore, useUser } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { collection, query, where, doc, limit, orderBy } from 'firebase/firestore';
import { formatDisplayName, cn, decryptSignal, isUserPremium, triggerHaptic } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const ChatListItem = memo(({ 
  chat, isActive, otherId, onClick, currentUserId, draft
}: any) => {
  const db = useFirestore();
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

  const previewContent = useMemo(() => {
    if (!mounted) return '...';
    if (draft) return draft;
    if (!lastMsg) return 'No signals yet';
    if (lastMsg.contentType !== 'text') return `[Media Payload]`;
    return decryptSignal(lastMsg.content);
  }, [lastMsg, mounted, draft]);

  const senderName = useMemo(() => {
    if (!lastMsg) return '';
    if (lastMsg.senderId === currentUserId) return 'Вы: ';
    if (chat.type === 'private') return '';
    return `${lastMsg.senderName.split(' ')[0]}: `;
  }, [lastMsg, currentUserId, chat.type]);

  const displayName = useMemo(() => {
    if (!mounted) return '...';
    if (chat.type === 'saved') return 'Data Archive';
    if (chat.type === 'private') return formatDisplayName(otherProfile?.name, otherProfile?.username);
    return formatDisplayName(chat.name, chat.username);
  }, [chat, otherProfile, mounted]);

  return (
    <div className="px-5 py-2">
      <ContextMenu>
        <ContextMenuTrigger>
          <div 
            onClick={() => { triggerHaptic(); onClick(); }}
            className={cn(
              "relative flex items-center gap-4 p-5 rounded-[2.2rem] transition-all duration-500 cursor-pointer group overflow-hidden border",
              isActive 
                ? "mig-card-active" 
                : "bg-white/[0.04] border-white/[0.05] hover:bg-white/[0.08] hover:border-white/10"
            )}
          >
            <div className="relative shrink-0">
              <UserAvatar 
                userId={otherId || (chat.type === 'saved' ? currentUserId : null)} 
                className="h-14 w-14 rounded-2xl shadow-xl" 
                manualAvatarUrl={chat.type !== 'private' && chat.type !== 'saved' ? chat.avatarUrl : otherProfile?.avatarUrl} 
                fallbackName={displayName} 
              />
              {isUnread && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-[3px] border-[#0a0c12] sonic-glow" />
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-black text-[15px] truncate text-white tracking-tight italic">
                    {displayName}
                  </span>
                  {isPremium && <Zap className="w-3.5 h-3.5 text-primary fill-current animate-pulse-soft" />}
                </div>
                <span className="text-[10px] text-white/30 font-bold whitespace-nowrap">
                  {lastMsg?.sentAt ? format(new Date(lastMsg.sentAt), 'HH:mm') : ''}
                </span>
              </div>
              <p className={cn("text-[13px] truncate font-medium tracking-tight leading-none", draft ? "text-primary italic" : "text-white/50")}>
                {draft && <span className="text-[9px] font-black uppercase mr-1.5 opacity-60">Черновик:</span>}
                <span className="text-primary/70 font-bold">{senderName}</span>
                {previewContent}
              </p>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56 mig-glass rounded-2xl p-2 border-white/10 bg-black/90">
          <ContextMenuItem className="gap-3 py-3 rounded-xl font-bold text-[10px] uppercase text-white"><CheckCircle2 className="w-4 h-4 text-primary" /> Mark Read</ContextMenuItem>
          <ContextMenuItem className="gap-3 py-3 rounded-xl font-bold text-[10px] uppercase text-white"><Archive className="w-4 h-4 text-primary" /> Archive</ContextMenuItem>
          <ContextMenuItem className="gap-3 py-3 rounded-xl font-bold text-[10px] uppercase text-red-500"><Trash2 className="w-4 h-4" /> Delete</ContextMenuItem>
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
      <ScrollArea className="flex-1 no-scrollbar">
        <div className="flex flex-col">
          {/* HEADER IS NOW INSIDE SCROLLAREA */}
          <header className="px-8 pt-12 pb-6 space-y-8 shrink-0">
            <div className="flex items-center justify-between">
               <div className="flex flex-col gap-1">
                  <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">MIG</h1>
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic opacity-60">Genesis 4.1</span>
               </div>
               <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white/[0.04] border border-white/5 text-white hover:bg-primary/20 transition-all" onClick={() => setIsCreateModalOpen(true)}>
                 <Plus className="w-6 h-6" strokeWidth={3} />
               </Button>
            </div>

            <div className="relative group cursor-pointer" onClick={() => setIsSearchOpen(true)}>
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-hover:text-primary transition-colors" />
              <div className="w-full h-14 bg-white/[0.03] rounded-[1.8rem] border border-white/10 pl-16 flex items-center text-[11px] font-black uppercase text-white/30 tracking-[0.2em] italic transition-all group-hover:bg-white/[0.05]">
                Network Scan...
              </div>
            </div>
          </header>

          <StoriesBar />
          
          <div className="pb-40 mt-4">
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
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]">No active signals</p>
               </div>
             )}
          </div>
        </div>
      </ScrollArea>
      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </div>
  );
}
