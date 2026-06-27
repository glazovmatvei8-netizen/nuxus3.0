
"use client"

import React, { useState, useMemo, memo, useRef, useEffect } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, Ghost, Search, Star, Pin, PinOff, Archive, Lock, Trash2, MessageCircle, Activity, LayoutGrid, Users, User, ChevronRight
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { AdminPanelModal } from './modals/admin-panel-modal';
import { StoriesBar } from './stories-bar';
import type { User as UserType, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, limit, orderBy, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { formatDisplayName, cn, isGlobalAdmin, decryptSignal } from '@/lib/utils';
import { format } from 'date-fns';
import { useTranslations } from '@/hooks/use-translations';
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
  const { data: otherProfile } = useDoc<UserType>(userProfileRef);

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
    const timeVal = chat.lastMessageAt || chat.createdAt;
    if (!timeVal) return '';
    try { 
      return format(new Date(timeVal), 'HH:mm'); 
    } catch (e) { 
      return ''; 
    }
  }, [chat.lastMessageAt, chat.createdAt]);

  const isUnread = (lastMsg && !lastMsg.isRead && lastMsg.senderId !== currentUserId) || chat.isManualUnread;

  const decryptedPreview = useMemo(() => {
    if (!lastMsg) return 'Сигнал отсутствует';
    if (lastMsg.contentType !== 'text') return `[Медиа: ${lastMsg.contentType.toUpperCase()}]`;
    return decryptSignal(lastMsg.content);
  }, [lastMsg]);

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
        return;
      }
      if (Math.abs(deltaX) > 10) {
        isHorizontalSwipe.current = true;
        setIsDragging(true);
        directionDecided.current = true;
      }
    }

    if (isHorizontalSwipe.current) {
      const newOffset = Math.max(-140, Math.min(140, deltaX));
      setOffsetX(newOffset);
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (!isHorizontalSwipe.current) { setOffsetX(0); return; }
    if (offsetX > 70) setOffsetX(140);
    else if (offsetX < -70) setOffsetX(-140);
    else setOffsetX(0);
    isHorizontalSwipe.current = false;
  };

  const resetSwipe = () => { setOffsetX(0); setIsDragging(false); };

  return (
    <div className="relative overflow-hidden touch-pan-y select-none px-3 py-1 max-w-full">
      {/* Кнопки действий при свайпе */}
      <div className={cn("absolute inset-y-1 left-3 flex h-[calc(100%-8px)] z-0 transition-opacity duration-300 rounded-[1.8rem] overflow-hidden shadow-xl", offsetX > 20 ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <button onClick={(e) => { e.stopPropagation(); onMarkUnread(chat.id); resetSwipe(); }} className="w-[70px] bg-blue-500/80 backdrop-blur-2xl flex flex-col items-center justify-center text-white gap-1 active:brightness-125 transition-all">
          <MessageCircle className="w-4 h-4" />
          <span className="text-[6px] font-black uppercase tracking-widest">Отм.</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onPinToggle(chat.id); resetSwipe(); }} className="w-[70px] bg-green-500/80 backdrop-blur-2xl flex flex-col items-center justify-center text-white gap-1 active:brightness-125 transition-all border-l border-white/5">
          <Pin className="w-4 h-4" />
          <span className="text-[6px] font-black uppercase tracking-widest">{isPinned ? 'Откр' : 'Закр'}</span>
        </button>
      </div>

      <div className={cn("absolute inset-y-1 right-3 flex h-[calc(100%-8px)] z-0 transition-opacity duration-300 rounded-[1.8rem] overflow-hidden shadow-xl", offsetX < -20 ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <button onClick={(e) => { e.stopPropagation(); onArchive(chat.id, !!chat.isArchived); resetSwipe(); }} className="w-[70px] bg-orange-500/80 backdrop-blur-2xl flex flex-col items-center justify-center text-white gap-1 active:brightness-125 transition-all border-r border-white/5">
          <Archive className="w-4 h-4" />
          <span className="text-[6px] font-black uppercase tracking-widest">Архив</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(chat.id); resetSwipe(); }} className="w-[70px] bg-red-600/80 backdrop-blur-2xl flex flex-col items-center justify-center text-white gap-1 active:brightness-125 transition-all">
          <Trash2 className="w-4 h-4" />
          <span className="text-[6px] font-black uppercase tracking-widest">Удалить</span>
        </button>
      </div>

      {/* Основной элемент чата */}
      <div 
        className={cn(
          "relative z-10 obsidian-glass will-change-transform w-full select-none rounded-[1.8rem] transition-all", 
          !isDragging && "duration-500 cubic-bezier(0.16, 1, 0.3, 1)",
          isActive && Math.abs(offsetX) < 10 ? "border-primary/30 bg-primary/5 shadow-primary/10" : "hover:bg-white/[0.03]"
        )}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={Math.abs(offsetX) > 10 ? resetSwipe : onClick}
      >
        <ContextMenu>
          <ContextMenuTrigger disabled={Math.abs(offsetX) > 10 || isDragging}>
            <div className="flex items-center gap-3.5 px-4 py-3 cursor-pointer relative h-[88px] overflow-hidden">
              <div className="relative shrink-0">
                <UserAvatar userId={otherId} manualAvatarUrl={otherProfile?.avatarUrl || chat.avatarUrl} className="h-14 w-14 border border-white/10 transition-all duration-500 group-hover:scale-105" fallbackName={finalDisplayName} showOnlineStatus />
                {isUnread && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-[#0a0a0c] shadow-[0_0_10px_rgba(168,85,247,1)]" />}
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                <div className="flex items-center justify-between w-full gap-2 text-left">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="font-black text-[15px] truncate tracking-tight italic text-white uppercase">
                      {finalDisplayName}
                    </span>
                    {otherProfile?.isPremium && <Star className="w-3 h-3 text-accent fill-accent shrink-0" />}
                    {isPinned && <Pin className="w-3 h-3 text-primary rotate-45 shrink-0" />}
                  </div>
                  <span className="text-[9px] text-white/20 font-bold tabular-nums">{displayTime}</span>
                </div>
                <div className="flex items-center gap-1.5 w-full text-left">
                  <p className="text-[13px] text-muted-foreground/50 truncate flex items-center font-medium min-w-0 flex-1">
                    {isEncrypted && <Lock className="w-3 h-3 shrink-0 text-primary/30 mr-1.5" />}
                    <span className="truncate italic">{decryptedPreview}</span>
                  </p>
                </div>
              </div>
              
              <ChevronRight className="w-3.5 h-3.5 text-white/5 shrink-0" />
              
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-primary rounded-r-full shadow-[0_0_15px_rgba(168,85,247,0.8)]" />
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-56 obsidian-glass rounded-[1.5rem] p-1 animate-in zoom-in-95 duration-200">
            <ContextMenuItem onClick={() => onMarkUnread(chat.id)} className="gap-2.5 py-2.5 font-black uppercase text-[9px] tracking-wider rounded-xl hover:bg-primary/10">
              <MessageCircle className="w-4 h-4 text-primary" /> {chat.isManualUnread ? 'Прочитано' : 'Не прочитано'}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onPinToggle(chat.id)} className="gap-2.5 py-2.5 font-black uppercase text-[9px] tracking-wider rounded-xl hover:bg-primary/10">
              {isPinned ? <><PinOff className="w-4 h-4 text-green-400" /> Открепить</> : <><Pin className="w-4 h-4 text-green-400" /> Закрепить</>}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onArchive(chat.id, !!chat.isArchived)} className="gap-2.5 py-2.5 font-black uppercase text-[9px] tracking-wider rounded-xl hover:bg-primary/10">
              <Archive className="w-4 h-4 text-orange-400" /> {chat.isArchived ? 'Вернуть' : 'Архивировать'}
            </ContextMenuItem>
            <ContextMenuSeparator className="bg-white/5 mx-2" />
            <ContextMenuItem onClick={() => onDelete(chat.id)} className="gap-2.5 py-2.5 font-black uppercase text-[9px] tracking-wider rounded-xl text-red-500 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4" /> Удалить диалог
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
  const { t } = useTranslations();
  
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [latency, setLatency] = useState<number>(0);

  useEffect(() => {
    const updateLatency = async () => {
      const start = Date.now();
      try {
        await fetch('/manifest.webmanifest', { method: 'HEAD', cache: 'no-store' });
        const realLat = Date.now() - start;
        setLatency(prev => prev === 0 ? realLat : Math.round(prev * 0.7 + realLat * 0.3));
      } catch (e) {
        setLatency(Math.floor(Math.random() * 20) + 20);
      }
    };
    const interval = setInterval(updateLatency, 25000);
    updateLatency();
    return () => clearInterval(interval);
  }, []);

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: currentUserProfile } = useDoc<UserType>(userProfileRef);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user]);
  const { data: chats } = useCollection<Chat>(chatsQuery);

  const handlePinToggle = async (chatId: string) => {
    if (!db || !user || !userProfileRef) return;
    const isPinned = currentUserProfile?.pinnedChatIds?.includes(chatId);
    await updateDoc(userProfileRef, { pinnedChatIds: isPinned ? arrayRemove(chatId) : arrayUnion(chatId) });
  };

  const handleMarkUnread = async (chatId: string) => {
    if (!db) return;
    const cSnap = chats?.find(c => c.id === chatId);
    await updateDoc(doc(db, 'chats', chatId), { isManualUnread: !cSnap?.isManualUnread });
  };

  const handleArchive = async (chatId: string, currentStatus: boolean) => {
    if (!db) return;
    await updateDoc(doc(db, 'chats', chatId), { isArchived: !currentStatus });
  };

  const handleDelete = async (chatId: string) => {
    if (!db) return;
    if (confirm('Аннигилировать этот канал связи?')) {
      await deleteDoc(doc(db, 'chats', chatId));
    }
  };

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    let result = [...chats].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    const saved = result.find(c => c.id === 'saved_messages');
    let others = result.filter(c => c.id !== 'saved_messages');

    others.sort((a, b) => {
      const aPinned = currentUserProfile?.pinnedChatIds?.includes(a.id) ? 1 : 0;
      const bPinned = currentUserProfile?.pinnedChatIds?.includes(b.id) ? 1 : 0;
      return bPinned - aPinned;
    });

    if (saved && !isArchiveView) others = [saved, ...others];
    if (isArchiveView) return others.filter(c => c.isArchived);
    if (activeTab === 'private') return others.filter(c => c.type === 'private' && !c.isArchived);
    if (activeTab === 'groups') return others.filter(c => (c.type === 'group' || c.type === 'channel') && !c.isArchived);
    return others.filter(c => !c.isArchived);
  }, [chats, activeTab, isArchiveView, currentUserProfile?.pinnedChatIds]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative max-w-full">
      <div className="px-6 pt-10 pb-4 shrink-0 bg-transparent z-20 space-y-6">
        <div className="flex items-center justify-between w-full relative">
          <div className="flex flex-col items-center gap-1 cursor-help opacity-40 hover:opacity-100 transition-opacity">
             <Activity className={cn("w-4 h-4", latency > 150 ? "text-red-500" : "text-green-500")} />
             <span className="text-[7px] font-black uppercase">{latency}мс</span>
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2">
            <h1 
              onClick={() => isGlobalAdmin(currentUserProfile) && setIsAdminPanelOpen(true)} 
              className={cn(
                "text-2xl font-black italic tracking-tighter text-white transition-all uppercase flex items-center gap-2", 
                isGlobalAdmin(currentUserProfile) ? "cursor-pointer hover:text-primary" : "cursor-default"
              )}
            >
              {isArchiveView ? 'Архив' : 'Сигналы'}
            </h1>
          </div>

          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl obsidian-glass border-white/5 hover:border-primary/40 transition-all group" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
          </Button>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
          <input 
            placeholder="Сканировать сеть..." 
            className="w-full h-11 bg-white/[0.02] border border-white/5 rounded-2xl pl-11 text-xs font-black uppercase tracking-widest placeholder:text-muted-foreground/20 focus:outline-none focus:border-primary/50 transition-all shadow-inner"
            onClick={() => setIsSearchOpen(true)}
            readOnly
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-0.5">
        <div className="flex flex-col max-w-full overflow-x-hidden">
          {!isArchiveView && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-500">
              <StoriesBar />
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                  {[
                    { id: 'all', label: 'Все', icon: LayoutGrid },
                    { id: 'private', label: 'Узлы', icon: User },
                    { id: 'groups', label: 'Группы', icon: Users }
                  ].map((tab) => (
                    <button 
                      key={tab.id} 
                      onClick={() => setActiveTab(tab.id)} 
                      className={cn(
                        "px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap border italic flex items-center gap-1.5", 
                        activeTab === tab.id ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "text-muted-foreground/40 border-white/[0.03] hover:text-white hover:bg-white/5"
                      )}
                    >
                      <tab.icon className="w-3 h-3" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pb-32 space-y-1 overflow-x-hidden">
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
              <div className="flex flex-col items-center justify-center p-20 opacity-10 space-y-4">
                 <Ghost className="w-16 h-16 animate-float" />
                 <p className="text-[9px] font-black uppercase tracking-widest text-center">Нет сигналов</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <AdminPanelModal open={isAdminPanelOpen} onOpenChange={setIsAdminPanelOpen} />
    </div>
  );
}
