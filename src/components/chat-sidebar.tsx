
"use client"

import React, { useState, useMemo, memo, useRef, useEffect } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, SquarePen, Ghost, Search, Star, Pin, PinOff, Archive, Lock, Trash2, MessageCircle, WifiOff, Loader2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { ChatEditorModal } from './modals/chat-editor-modal';
import { AdminPanelModal } from './modals/admin-panel-modal';
import { StoriesBar } from './stories-bar';
import type { User, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, limit, orderBy, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { formatDisplayName, cn, isGlobalAdmin, decryptSignal } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

const ChatListItem = memo(({ 
  chat, isActive, otherId, isPinned, onPinToggle, onClick, onMarkUnread, onDelete, onArchive, currentUserId
}: any) => {
  const db = useFirestore();
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const isVerticalScroll = useRef(false);
  const directionDecided = useRef(false);

  const userProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<User>(userProfileRef);

  const lastMessageQuery = useMemoFirebase(() => {
    if (!db || !chat.id) return null;
    return query(collection(db, 'chats', chat.id, 'messages'), orderBy('sentAt', 'desc'), limit(1));
  }, [db, chat.id]);
  const { data: lastMessages } = useCollection<Message>(lastMessageQuery);
  const lastMsg = lastMessages?.[0];

  const finalDisplayName = useMemo(() => {
    if (chat.id === 'saved_messages') return 'Избранное';
    if (chat.type === 'private') {
      const myMeta = chat.metadata?.[currentUserId || ''];
      if (myMeta?.customName) return myMeta.customName;
      if (otherProfile?.name) return formatDisplayName(otherProfile.name);
    }
    return formatDisplayName(chat.name || otherProfile?.name || 'Аккаунт');
  }, [chat, otherProfile, currentUserId]);

  const displayTime = useMemo(() => {
    const date = chat.lastMessageAt ? new Date(chat.lastMessageAt) : new Date(chat.createdAt);
    try { return format(date, 'HH:mm'); } catch (e) { return ''; }
  }, [chat.lastMessageAt, chat.createdAt]);

  const isUnread = (lastMsg && !lastMsg.isRead && lastMsg.senderId !== currentUserId) || chat.isManualUnread;

  const decryptedPreview = useMemo(() => {
    if (!lastMsg) return 'Нет сообщений';
    if (lastMsg.contentType !== 'text') return `[Сигнал: ${lastMsg.contentType.toUpperCase()}]`;
    return decryptSignal(lastMsg.content);
  }, [lastMsg]);

  const messagePrefix = useMemo(() => {
    if (!lastMsg) return null;
    if (lastMsg.senderId === currentUserId) return <span className="text-primary/60 font-black mr-1 shrink-0">Вы:</span>;
    if (chat.type !== 'private') return <span className="text-primary/60 font-black mr-1 shrink-0">{lastMsg.senderName?.split(' ')[0]}:</span>;
    return null;
  }, [lastMsg, currentUserId, chat.type]);

  const isEncrypted = lastMsg?.contentType === 'text' && lastMsg?.content?.startsWith('NX_');

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    directionDecided.current = false;
    isHorizontalSwipe.current = false;
    isVerticalScroll.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isVerticalScroll.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    if (!directionDecided.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) + 5) {
        isVerticalScroll.current = true;
        directionDecided.current = true;
        setOffsetX(0);
        return;
      }
      if (Math.abs(deltaX) > 10) {
        isHorizontalSwipe.current = true;
        setIsDragging(true);
        directionDecided.current = true;
      }
    }

    if (isHorizontalSwipe.current) {
      const newOffset = Math.max(-160, Math.min(160, deltaX));
      setOffsetX(newOffset);
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (!isHorizontalSwipe.current) { setOffsetX(0); return; }
    if (offsetX > 60) setOffsetX(160);
    else if (offsetX < -60) setOffsetX(-160);
    else setOffsetX(0);
    isHorizontalSwipe.current = false;
  };

  const resetSwipe = () => { setOffsetX(0); setIsDragging(false); };

  return (
    <div className="relative overflow-hidden touch-pan-y select-none bg-transparent border-none px-2 py-0.5 max-w-full" style={{ WebkitTouchCallout: 'none' }}>
      {/* Swipe Actions Background */}
      <div className={cn("absolute inset-y-0 left-2 flex h-[calc(100%-4px)] z-0 transition-opacity duration-200 rounded-[2rem] overflow-hidden", offsetX > 10 ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <button onClick={(e) => { e.stopPropagation(); onMarkUnread(chat.id); resetSwipe(); }} className="w-20 bg-blue-600/80 backdrop-blur-xl flex flex-col items-center justify-center text-white gap-1 active:brightness-125 transition-all">
          <MessageCircle className="w-5 h-5 fill-current" />
          <span className="text-[8px] font-black uppercase tracking-widest">Сигнал</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onPinToggle(chat.id); resetSwipe(); }} className="w-20 bg-green-600/80 backdrop-blur-xl flex flex-col items-center justify-center text-white gap-1 active:brightness-125 transition-all">
          <Pin className="w-5 h-5 fill-current" />
          <span className="text-[8px] font-black uppercase tracking-widest">{isPinned ? 'Снять' : 'Закрепить'}</span>
        </button>
      </div>

      <div className={cn("absolute inset-y-0 right-2 flex h-[calc(100%-4px)] z-0 transition-opacity duration-200 rounded-[2rem] overflow-hidden", offsetX < -10 ? "opacity-100" : "opacity-0 pointer-events-none")} style={{ width: '160px' }}>
        <div className="flex h-full w-full">
          <button onClick={(e) => { e.stopPropagation(); onArchive(chat.id, !!chat.isArchived); resetSwipe(); }} className="flex-1 bg-orange-600/80 backdrop-blur-xl flex flex-col items-center justify-center text-white gap-1 active:brightness-125 transition-all">
            <Archive className="w-5 h-5 fill-current" />
            <span className="text-[8px] font-black uppercase tracking-widest">Архив</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(chat.id); resetSwipe(); }} className="flex-1 bg-red-600/80 backdrop-blur-xl flex flex-col items-center justify-center text-white gap-1 active:brightness-125 transition-all">
            <Trash2 className="w-5 h-5 fill-current" />
            <span className="text-[8px] font-black uppercase tracking-widest">Удалить</span>
          </button>
        </div>
      </div>

      <div 
        className={cn(
          "relative z-10 bg-white/[0.03] backdrop-blur-md border border-white/[0.05] shadow-sm will-change-transform w-full select-none rounded-[2rem]", 
          !isDragging && "transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)"
        )}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={Math.abs(offsetX) > 10 ? resetSwipe : onClick}
      >
        <ContextMenu>
          <ContextMenuTrigger disabled={Math.abs(offsetX) > 10 || isDragging}>
            <div className={cn(
              "flex items-center gap-4 px-4 py-4 cursor-pointer transition-all duration-500 border border-transparent group relative w-full h-[92px] select-none rounded-[2rem] overflow-hidden", 
              isActive && Math.abs(offsetX) < 5 ? 'bg-primary/15 border-white/10 shadow-[0_0_25px_rgba(168,85,247,0.15)] scale-[0.98]' : 'hover:bg-white/[0.05] active:scale-[0.97]'
            )}>
              <div className="relative shrink-0">
                <UserAvatar userId={otherId} manualAvatarUrl={otherProfile?.avatarUrl || chat.avatarUrl} className="h-[64px] w-[64px] border-2 border-white/10 transition-all duration-500 group-hover:scale-105" fallbackName={finalDisplayName} showOnlineStatus />
                {isUnread && <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-pulse" />}
              </div>
              
              <div className="flex-1 min-w-0 h-full flex flex-col justify-center pr-2">
                <div className="flex items-center justify-between mb-0.5 w-full">
                  <span className="font-black text-[17px] truncate flex items-center gap-2 tracking-tight italic text-white/90">
                    {finalDisplayName} 
                    {otherProfile?.isPremium && <Star className="w-3.5 h-3.5 text-accent fill-accent" />}
                    {isPinned && <Pin className="w-3 h-3 text-primary rotate-45 ml-1" />}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 overflow-hidden w-full">
                  <p className="text-[13px] text-muted-foreground/70 truncate flex items-center font-medium min-w-0 flex-1">
                    {isEncrypted && <Lock className="w-3.5 h-3.5 shrink-0 text-primary/40 mr-1.5" />}
                    {messagePrefix}
                    <span className="truncate">{decryptedPreview}</span>
                  </p>
                  <span className="text-[11px] text-primary/60 font-black tracking-widest tabular-nums shrink-0 ml-2">{displayTime}</span>
                </div>
              </div>
              
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-r-full shadow-[0_0_20px_rgba(168,85,247,0.8)]" />
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64 bg-[#0a0a0c]/95 backdrop-blur-3xl border-white/10 rounded-[1.8rem] shadow-2xl p-1.5">
            <ContextMenuItem onClick={() => onMarkUnread(chat.id)} className="gap-3 py-3 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
              <MessageCircle className="w-4 h-4 text-[#007AFF]" /> {chat.isManualUnread ? 'Пометить прочитанным' : 'Пометить непрочитанным'}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onPinToggle(chat.id)} className="gap-3 py-3 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
              {isPinned ? <><PinOff className="w-4 h-4 text-green-500" /> Открепить</> : <><Pin className="w-4 h-4 text-green-500" /> Закрепить</>}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onArchive(chat.id, !!chat.isArchived)} className="gap-3 py-3 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
              <Archive className="w-4 h-4 text-orange-500" /> {chat.isArchived ? 'Извлечь из архива' : 'В архив'}
            </ContextMenuItem>
            <ContextMenuSeparator className="bg-white/5 mx-2" />
            <ContextMenuItem onClick={() => onDelete(chat.id)} className="gap-3 py-3 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl text-red-500 hover:bg-red-500/10 transition-all">
              <Trash2 className="w-4 h-4" /> Удалить аккаунт (чат)
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </div>
  );
});
ChatListItem.displayName = 'ChatListItem';

export default function ChatSidebar({ isArchiveView = false }: { isArchiveView?: boolean }) {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId, setIsSearchOpen, setIsInterceptionRequested } = useAppState();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: currentUserProfile } = useDoc<User>(userProfileRef);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user]);
  const { data: chats } = useCollection<Chat>(chatsQuery);

  const handlePinToggle = async (chatId: string) => {
    if (!db || !user || !userProfileRef) return;
    const isPinned = currentUserProfile?.pinnedChatIds?.includes(chatId);
    await updateDoc(userProfileRef, { pinnedChatIds: isPinned ? arrayRemove(chatId) : arrayUnion(chatId) });
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    toast({ title: isPinned ? "Аккаунт откреплен" : "Аккаунт закреплен" });
  };

  const handleMarkUnread = async (chatId: string) => {
    if (!db) return;
    const cSnap = chats?.find(c => c.id === chatId);
    await updateDoc(doc(db, 'chats', chatId), { isManualUnread: !cSnap?.isManualUnread });
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
  };

  const handleArchive = async (chatId: string, currentStatus: boolean) => {
    if (!db) return;
    await updateDoc(doc(db, 'chats', chatId), { isArchived: !currentStatus });
    toast({ title: currentStatus ? "Восстановлено из архива" : "Отправлено в архив" });
  };

  const handleDelete = async (chatId: string) => {
    if (!db) return;
    if (confirm('Удалить этот аккаунт (чат) навсегда?')) {
      await deleteDoc(doc(db, 'chats', chatId));
      toast({ title: "Аккаунт удален" });
    }
  };

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    let result = [...chats].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    const seenPrivateUsers = new Set();
    result = result.filter(c => {
      if (c.type === 'private') {
        const otherId = c.participantIds?.find(id => id !== user?.uid);
        if (otherId) {
          if (seenPrivateUsers.has(otherId)) return false;
          seenPrivateUsers.add(otherId);
        }
      }
      return true;
    });

    result.sort((a, b) => {
      const aPinned = currentUserProfile?.pinnedChatIds?.includes(a.id) ? 1 : 0;
      const bPinned = currentUserProfile?.pinnedChatIds?.includes(b.id) ? 1 : 0;
      return bPinned - aPinned;
    });

    if (isArchiveView) return result.filter(c => c.isArchived);
    if (activeTab === 'private') return result.filter(c => c.type === 'private' && !c.isArchived);
    if (activeTab === 'groups') return result.filter(c => (c.type === 'group' || c.type === 'channel' || c.type === 'saved') && !c.isArchived);
    return result.filter(c => !c.isArchived);
  }, [chats, activeTab, isArchiveView, currentUserProfile?.pinnedChatIds, user?.uid]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative max-w-full touch-action-pan-y">
      <div className="px-6 pt-8 pb-4 shrink-0 bg-transparent z-20 space-y-6">
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="flex items-center justify-between w-full relative">
            <div className="w-10 h-10" />
            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
              <h1 onClick={() => isGlobalAdmin(currentUserProfile) && setIsAdminPanelOpen(true)} className={cn("text-2xl font-black italic tracking-tight text-white transition-all flex items-center gap-2", isGlobalAdmin(currentUserProfile) ? "cursor-pointer hover:text-primary hover:drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]" : "cursor-default")}>
                {isArchiveView ? 'архив 🐱' : 'чаты 🐱'}
              </h1>
              {!isOnline && (
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-primary animate-pulse ml-[0.4em]">соединение...</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/5 hover:border-primary/40 transition-all group" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
              </Button>
            </div>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <input 
            placeholder="Поиск сообщений..." 
            className="w-full h-12 bg-white/[0.05] border border-white/[0.1] rounded-[1.2rem] pl-12 text-sm font-bold uppercase tracking-widest placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
            onClick={() => setIsSearchOpen(true)}
            readOnly
          />
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-hide px-2">
        <div className="flex flex-col max-w-full">
          {!isArchiveView && (
            <div className="animate-in fade-in slide-in-from-top-10 duration-1000">
              <StoriesBar />
              <div className="px-4 py-4 overflow-x-hidden">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  {[
                    { id: 'all', label: 'ВСЕ' },
                    { id: 'private', label: 'ЛИЧНЫЕ' },
                    { id: 'groups', label: 'СООБЩЕСТВА' }
                  ].map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all whitespace-nowrap border italic", activeTab === tab.id ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(168,85,247,0.4)]" : "text-muted-foreground/50 border-white/[0.08] hover:text-white hover:bg-white/5")}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pb-40 space-y-1.5 overflow-x-hidden">
            {filteredChats.length > 0 ? (
              filteredChats.map(chat => (
                <ChatListItem 
                  key={chat.id} chat={chat} isActive={currentChatId === chat.id} 
                  isPinned={currentUserProfile?.pinnedChatIds?.includes(chat.id)}
                  onPinToggle={handlePinToggle} onMarkUnread={handleMarkUnread} onArchive={handleArchive}
                  onDelete={handleDelete} onClick={() => { setIsInterceptionRequested(false); setCurrentChatId(chat.id); }}
                  currentUserId={user?.uid} otherId={chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null} 
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-24 opacity-20">
                 <Ghost className="w-16 h-16 mb-6 animate-float" />
                 <p className="text-[10px] font-black uppercase tracking-0.5em text-center ml-0.5em">{isArchiveView ? 'АРХИВ ПУСТ' : 'НЕТ ДИАЛОГОВ'}</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <ChatEditorModal open={isEditorModalOpen} onOpenChange={setIsEditorModalOpen} />
      <AdminPanelModal open={isAdminPanelOpen} onOpenChange={setIsAdminPanelOpen} />
    </div>
  );
}
