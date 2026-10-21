
"use client"

import React, { useState, useMemo, memo, useEffect } from 'react';
import { useAppState } from '@/lib/app-state';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, Search, Star, MessageSquare, Loader2, 
  Trash2, Archive, LogOut, ShieldCheck, Edit3,
  CheckCircle2, BellOff
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';

const ChatListItem = memo(({ 
  chat, isActive, otherId, onClick, currentUserId
}: any) => {
  const db = useFirestore();
  const { toast } = useToast();
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
    } catch (e) { return ''; }
  }, [chat.lastMessageAt, mounted]);

  const displayName = useMemo(() => {
    if (!mounted) return '...';
    if (chat.type === 'saved') return 'Архив Данных';
    if (chat.type === 'private') return formatDisplayName(otherProfile?.name, otherProfile?.username);
    return formatDisplayName(chat.name, chat.username);
  }, [chat, otherProfile, mounted]);

  const handleToggleUnread = async () => {
    if (!db) return;
    triggerHaptic();
    await updateDoc(doc(db, 'chats', chat.id), { isManualUnread: !chat.isManualUnread });
    toast({ title: chat.isManualUnread ? "Прочитано" : "Помечено как непрочитанное" });
  };

  const handleArchive = async () => {
    if (!db) return;
    triggerHaptic();
    await updateDoc(doc(db, 'chats', chat.id), { isArchived: true });
    toast({ title: "Чат отправлен в архив" });
  };

  const handleDelete = async () => {
    if (!db) return;
    if (confirm("Выйти из этого чата навсегда?")) {
      triggerHaptic();
      await deleteDoc(doc(db, 'chats', chat.id));
      toast({ title: "Чат удален" });
    }
  };

  return (
    <div className="px-4 py-0.5">
      <ContextMenu>
        <ContextMenuTrigger>
          <div 
            onClick={onClick}
            className={cn(
              "relative flex items-center gap-4 p-4 rounded-[2.5rem] transition-all duration-300 cursor-pointer group",
              isActive ? "bg-white/[0.03]" : "hover:bg-white/[0.01]"
            )}
          >
            <div className="relative shrink-0">
              <UserAvatar 
                userId={otherId || (chat.type === 'saved' ? currentUserId : null)} 
                className="h-14 w-14 rounded-full border border-white/5 shadow-xl" 
                manualAvatarUrl={chat.type !== 'private' && chat.type !== 'saved' ? chat.avatarUrl : otherProfile?.avatarUrl} 
                fallbackName={displayName} 
              />
              {isUnread && (
                <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-primary rounded-full border-4 border-[#121212] shadow-[0_0_10px_rgba(229,142,56,0.6)]" />
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-[15px] truncate text-white uppercase tracking-tight italic">
                    {displayName}
                  </span>
                  {isPremium && <Star className="w-3 h-3 text-primary fill-primary animate-pulse" />}
                </div>
                <span className="text-[10px] text-muted-foreground/40 font-medium whitespace-nowrap">
                  {displayTime}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground/60 truncate font-medium tracking-tight">
                {decryptedPreview}
              </p>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56 bg-[#121212]/95 backdrop-blur-xl border-white/10 rounded-2xl p-2 shadow-2xl">
          <ContextMenuItem onClick={handleToggleUnread} className="gap-3 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest text-white">
            <CheckCircle2 className="w-4 h-4 text-primary" /> Пометить как {chat.isManualUnread ? 'прочитанное' : 'непрочитанное'}
          </ContextMenuItem>
          <ContextMenuItem onClick={handleArchive} className="gap-3 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest text-white">
            <Archive className="w-4 h-4 text-primary" /> В архив
          </ContextMenuItem>
          <ContextMenuItem className="gap-3 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest text-white">
            <BellOff className="w-4 h-4 text-primary" /> Без звука
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDelete} className="gap-3 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest text-red-500">
            <Trash2 className="w-4 h-4" /> Удалить
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <div className="h-[1px] w-full bg-white/[0.03] mt-0.5" />
    </div>
  );
});
ChatListItem.displayName = 'ChatListItem';

export default function ChatSidebar() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { 
    currentChatId, setCurrentChatId, setIsSearchOpen, 
    activeAccountIndex, setActiveAccountIndex, setIs2FAVerified,
    slotNames, setSlotName 
  } = useAppState();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editSlotIndex, setEditSlotIndex] = useState<number | null>(null);
  const [tempSlotName, setTempSlotName] = useState('');

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<UserType>(userProfileRef);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid), where('isArchived', '==', false));
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

  const handleSlotSwitch = async (idx: number) => {
    if (idx === activeAccountIndex && user) return;
    triggerHaptic();
    if (confirm("Переключить активный узел?")) {
      setIs2FAVerified(false);
      setActiveAccountIndex(idx);
      localStorage.setItem('nuxus_active_account_v59', idx.toString());
      if (auth) await signOut(auth);
    }
  };

  const handleEditSlot = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    setEditSlotIndex(idx);
    setTempSlotName(slotNames[idx]);
  };

  const saveSlotName = () => {
    if (editSlotIndex !== null) {
      setSlotName(editSlotIndex, tempSlotName.trim() || `Слот ${editSlotIndex + 1}`);
      setEditSlotIndex(null);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    if (confirm("Отключить текущий узел от Ядра?")) {
      triggerHaptic();
      setIs2FAVerified(false);
      await signOut(auth);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] overflow-hidden">
      <ScrollArea className="flex-1 no-scrollbar">
        <div className="flex flex-col min-h-full pb-60">
          <div className="px-6 pt-16 pb-6 space-y-8">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-black text-primary italic tracking-tighter uppercase leading-none">ЧАТЫ</h1>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest italic">V185.0</span>
                  </div>
               </div>
               <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg" onClick={handleLogout}>
                    <LogOut className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/5 text-white shadow-lg" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="w-5 h-5" strokeWidth={3} />
                  </Button>
               </div>
            </div>

            <div className="relative group" onClick={() => setIsSearchOpen(true)}>
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30" />
              <div className="w-full h-14 bg-white/[0.03] rounded-[2.5rem] pl-16 flex items-center text-[15px] font-bold text-muted-foreground/40 border border-white/5 shadow-inner cursor-pointer">
                Поиск...
              </div>
            </div>
          </div>

          <div className="px-4 pb-4">
            <ScrollArea className="w-full" orientation="horizontal">
               <div className="flex gap-5 px-2 py-1">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer" onClick={() => handleSlotSwitch(i)}>
                      <div className={cn(
                        "h-16 w-16 rounded-full flex items-center justify-center transition-all relative",
                        activeAccountIndex === i && user ? "nuxus-orbit-active" : "bg-white/[0.03] border border-white/10 hover:border-primary/40"
                      )}>
                        {(activeAccountIndex === i && user) && <div className="nuxus-orbit-dot" />}
                        {(activeAccountIndex === i && user) ? (
                          <div className="p-0.5 rounded-full bg-[#121212] h-[calc(100%-4px)] w-[calc(100%-4px)] flex items-center justify-center relative">
                            <UserAvatar userId={user?.uid} className="h-full w-full border-none shadow-inner" manualAvatarUrl={profile?.avatarUrl} />
                            <button onClick={(e) => handleEditSlot(i, e)} className="absolute -bottom-1 -right-1 h-5 w-5 bg-[#1C1C1E] border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                               <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-0.5 relative">
                             <Plus className="w-6 h-6 text-muted-foreground/40 group-hover:text-primary" />
                             <button onClick={(e) => handleEditSlot(i, e)} className="absolute -bottom-1 -right-1 h-5 w-5 bg-[#1C1C1E] border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                               <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest truncate w-16 text-center",
                        activeAccountIndex === i && user ? "text-primary" : "text-white/20"
                      )}>
                        {slotNames[i]}
                      </span>
                    </div>
                  ))}
               </div>
            </ScrollArea>
          </div>

          <StoriesBar />

          <div className="mt-4">
             {isChatsLoading ? (
               <div className="flex flex-col items-center justify-center py-20 opacity-10">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
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
               <div className="flex flex-col items-center justify-center py-32 opacity-5">
                  <MessageSquare className="w-16 h-16 text-muted-foreground" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-6">Сигналы отсутствуют</p>
               </div>
             )}
          </div>
        </div>
      </ScrollArea>
      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      
      <Dialog open={editSlotIndex !== null} onOpenChange={(o) => !o && setEditSlotIndex(null)}>
         <DialogContent className="max-w-xs bg-[#0a0a0c] border-white/10 rounded-[2rem] p-6 text-center shadow-2xl">
            <DialogHeader>
               <DialogTitle className="text-lg font-black uppercase italic text-white text-center">Имя узла</DialogTitle>
            </DialogHeader>
            <div className="py-4">
               <Input 
                 value={tempSlotName} 
                 onChange={e => setTempSlotName(e.target.value)} 
                 maxLength={12}
                 className="bg-white/5 border-white/10 h-12 rounded-xl text-center font-black uppercase tracking-widest"
                 autoFocus
               />
            </div>
            <DialogFooter className="flex flex-col gap-2">
               <Button onClick={saveSlotName} className="w-full h-12 rounded-xl bg-primary text-white font-black uppercase italic tracking-widest">Сохранить</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
