
"use client"

import React, { useState, useMemo, memo, useRef, useEffect } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, SquarePen, Ghost, Search, Star, Pin, PinOff, MessageSquare, VolumeX, Trash2, Volume2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { ChatEditorModal } from './modals/chat-editor-modal';
import { AdminPanelModal } from './modals/admin-panel-modal';
import { StoriesBar } from './stories-bar';
import { CreateStoryModal } from './modals/create-story-modal';
import { StoryViewerModal } from './modals/story-viewer-modal';
import type { User, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, limit, orderBy, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { formatDisplayName, cn, isGlobalAdmin } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const ChatListItem = memo(({ 
  chat, isActive, otherId, isPinned, onPinToggle, onClick, onMute, onMarkUnread, onDelete, currentUserId
}: any) => {
  const db = useFirestore();
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const [isMuted, setIsMuted] = useState(!!chat.mutedUntil);

  const userProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<User>(userProfileRef);

  const lastMessageQuery = useMemoFirebase(() => {
    if (!db || !chat.id) return null;
    return query(collection(db, 'chats', chat.id, 'messages'), orderBy('sentAt', 'desc'), limit(1));
  }, [db, chat.id]);
  const { data: lastMessages } = useCollection<Message>(lastMessageQuery);
  const lastMsg = lastMessages?.[0];

  const finalDisplayName = useMemo(() => {
    if (chat.type === 'saved') return 'Избранное';
    return formatDisplayName(otherProfile?.name || chat.name || 'User');
  }, [chat.type, otherProfile?.name, chat.name]);

  const displayTime = useMemo(() => {
    const date = chat.lastMessageAt ? new Date(chat.lastMessageAt) : new Date(chat.createdAt);
    try { return format(date, 'HH:mm'); } catch (e) { return ''; }
  }, [chat.lastMessageAt, chat.createdAt]);

  // FIXED: Only show unread dot if last message is NOT from current user
  const isUnread = (lastMsg && !lastMsg.isRead && lastMsg.senderId !== currentUserId) || chat.isManualUnread;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = false;
    setOffsetX(offsetX); // Preserve current state if already swiped
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Detect if move is horizontal to prevent interference with vertical scroll
    if (!isHorizontalSwipe.current && Math.abs(deltaX) > 10) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        isHorizontalSwipe.current = true;
        setIsDragging(true);
      }
    }

    if (isHorizontalSwipe.current) {
      // Small vibration on start of meaningful swipe
      if (!isDragging && window.navigator.vibrate) window.navigator.vibrate(10);
      
      const newOffset = Math.max(-180, Math.min(180, deltaX));
      setOffsetX(newOffset);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (!isHorizontalSwipe.current) {
      // If it wasn't a horizontal swipe, stay where we are or reset
      if (Math.abs(offsetX) < 40) setOffsetX(0);
      return;
    }
    
    // Snap logic
    if (offsetX > 60) setOffsetX(160);
    else if (offsetX < -60) setOffsetX(-160);
    else setOffsetX(0);
    
    isHorizontalSwipe.current = false;
  };

  const resetSwipe = () => {
    setOffsetX(0);
    setIsDragging(false);
  };

  return (
    <div className="relative overflow-hidden touch-pan-y select-none bg-[#0a0a0c] border-b border-white/[0.02]">
      {/* Background Actions */}
      <div className="absolute inset-y-0 left-0 flex h-full z-0">
        <button onClick={(e) => { e.stopPropagation(); onMarkUnread(chat.id); resetSwipe(); }} className="w-20 bg-[#007AFF] flex flex-col items-center justify-center text-white gap-1 active:brightness-90 transition-all">
          <MessageSquare className="w-5 h-5 fill-current" />
          <span className="text-[10px] font-bold leading-tight px-1 text-center">Не прочитан</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onPinToggle(chat.id); resetSwipe(); }} className="w-20 bg-[#34C759] flex flex-col items-center justify-center text-white gap-1 active:brightness-90 transition-all">
          <Pin className="w-5 h-5 fill-current" />
          <span className="text-[10px] font-bold leading-tight px-1 text-center">{isPinned ? 'Открепить' : 'Закрепить'}</span>
        </button>
      </div>

      <div className="absolute inset-y-0 right-0 flex h-full z-0">
        <button onClick={(e) => { e.stopPropagation(); onMute(chat.id); resetSwipe(); }} className="w-20 bg-[#FF9500] flex flex-col items-center justify-center text-white gap-1 active:brightness-90 transition-all">
          {isMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 fill-current" />}
          <span className="text-[10px] font-bold leading-tight px-1 text-center">{isMuted ? 'Звук' : 'Без звука'}</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(chat.id); resetSwipe(); }} className="w-20 bg-[#FF3B30] flex flex-col items-center justify-center text-white gap-1 active:brightness-90 transition-all">
          <Trash2 className="w-5 h-5 fill-current" />
          <span className="text-[10px] font-bold leading-tight px-1 text-center">Удалить</span>
        </button>
      </div>

      {/* Main Content Layer */}
      <div 
        className={cn(
          "relative z-10 bg-[#0a0a0c] will-change-transform", 
          !isDragging && "transition-transform duration-300 ease-out"
        )}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={Math.abs(offsetX) > 10 ? resetSwipe : onClick}
      >
        <ContextMenu>
          <ContextMenuTrigger disabled={Math.abs(offsetX) > 10}>
            <div className={cn(
              "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-none group relative",
              isActive && Math.abs(offsetX) < 5 ? 'bg-white/10' : 'active:bg-white/[0.05]'
            )}>
              <UserAvatar userId={otherId} manualAvatarUrl={otherProfile?.avatarUrl || chat.avatarUrl} className="h-[52px] w-[52px]" fallbackName={finalDisplayName} showOnlineStatus />
              <div className="flex-1 min-w-0 pb-3 h-full flex flex-col justify-center">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-[16px] text-white truncate flex items-center gap-1">
                    {isPinned && <Pin className="w-3 h-3 text-primary fill-primary rotate-45" />}
                    {finalDisplayName} {otherProfile?.isPremium && <Star className="w-3 h-3 text-accent fill-accent inline ml-1" />}
                  </span>
                  <span className="text-[13px] text-muted-foreground/60 font-medium">{displayTime}</span>
                </div>
                <div className="flex items-center justify-between pr-2">
                  <p className="text-[14px] text-muted-foreground/60 truncate flex-1">
                    {lastMsg?.contentType === 'text' ? lastMsg.content : (lastMsg ? `[${lastMsg.contentType}]` : 'Нет сообщений')}
                  </p>
                  {isUnread && <div className="w-2.5 h-2.5 bg-[#007AFF] rounded-full shadow-[0_0_8px_rgba(0,122,255,0.5)] shrink-0 ml-2" />}
                </div>
              </div>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-56 bg-card/95 backdrop-blur-xl border-white/10 rounded-2xl shadow-2xl">
            <ContextMenuItem onClick={() => onPinToggle(chat.id)} className="gap-3 py-3 font-bold uppercase text-[11px] tracking-widest rounded-xl">
              {isPinned ? <><PinOff className="w-4 h-4 text-primary" /> Открепить</> : <><Pin className="w-4 h-4 text-primary" /> Закрепить</>}
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
  const { currentChatId, setCurrentChatId, setIsSearchOpen, isCreateStoryOpen, setIsCreateStoryOpen } = useAppState();
  
  const [activeTab, setActiveTab] = useState(isArchiveView ? 'archived' : 'all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

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
    await updateDoc(userProfileRef, {
      pinnedChatIds: isPinned ? arrayRemove(chatId) : arrayUnion(chatId)
    });
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    toast({ title: isPinned ? "Откреплено" : "Закреплено" });
  };

  const handleMarkUnread = async (chatId: string) => {
    if (!db) return;
    const cSnap = chats?.find(c => c.id === chatId);
    await updateDoc(doc(db, 'chats', chatId), { isManualUnread: !cSnap?.isManualUnread });
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
  };

  const handleMute = async (chatId: string) => {
    if (!db || !user) return;
    const cSnap = chats?.find(c => c.id === chatId);
    const isCurrentlyMuted = !!cSnap?.mutedUntil;
    await updateDoc(doc(db, 'chats', chatId), { mutedUntil: isCurrentlyMuted ? null : new Date(9999, 11, 31).toISOString() });
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    toast({ title: isCurrentlyMuted ? "Звук включен" : "Без звука" });
  };

  const handleDelete = async (chatId: string) => {
    if (!db) return;
    if (confirm('Удалить этот чат навсегда?')) {
      await deleteDoc(doc(db, 'chats', chatId));
      toast({ title: "Чат удален" });
    }
  };

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    let result = [...chats].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
    result.sort((a, b) => {
      const aPinned = currentUserProfile?.pinnedChatIds?.includes(a.id) ? 1 : 0;
      const bPinned = currentUserProfile?.pinnedChatIds?.includes(b.id) ? 1 : 0;
      return bPinned - aPinned;
    });
    if (isArchiveView) return result.filter(c => c.isArchived);
    if (activeTab === 'private') return result.filter(c => c.type === 'private' && !c.isArchived);
    if (activeTab === 'groups') return result.filter(c => c.type === 'group' && !c.isArchived);
    return result.filter(c => !c.isArchived);
  }, [chats, activeTab, isArchiveView, currentUserProfile?.pinnedChatIds]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="grid grid-cols-3 items-center h-12 mb-6 w-full">
          <div className="flex justify-start">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/5" onClick={() => setIsSearchOpen(true)}>
              <Search className="w-5 h-5 text-white/60" />
            </Button>
          </div>

          <div className="flex justify-center">
            <h1 
              onClick={() => isGlobalAdmin(currentUserProfile) && setIsAdminPanelOpen(true)}
              className={cn(
                "text-[20px] font-black text-white italic tracking-tighter whitespace-nowrap",
                isGlobalAdmin(currentUserProfile) ? "cursor-pointer hover:text-primary transition-colors active:scale-95" : "cursor-default"
              )}
            >
              {isArchiveView ? 'Архив' : 'Чаты🐱'}
            </h1>
          </div>

          <div className="flex justify-end gap-1.5">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/5" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-5 h-5 text-white" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/5" onClick={() => setIsEditorModalOpen(true)}>
              <SquarePen className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>

        {!isArchiveView && <StoriesBar />}

        {!isArchiveView && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-3">
            {[
              { id: 'all', label: 'Все' },
              { id: 'private', label: 'Личные' },
              { id: 'groups', label: 'Группы' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  activeTab === tab.id ? "bg-[#007AFF] text-white shadow-lg shadow-[#007AFF]/20" : "text-muted-foreground/40 hover:text-white bg-white/5"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 scrollbar-hide">
        <div className="pb-32">
          {filteredChats.length > 0 ? (
            filteredChats.map(chat => (
              <ChatListItem 
                key={chat.id} 
                chat={chat} 
                isActive={currentChatId === chat.id} 
                isPinned={currentUserProfile?.pinnedChatIds?.includes(chat.id)}
                onPinToggle={handlePinToggle}
                onMarkUnread={handleMarkUnread}
                onMute={handleMute}
                onDelete={handleDelete}
                onClick={() => setCurrentChatId(chat.id)}
                currentUserId={user?.uid}
                otherId={chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null} 
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-20 opacity-20">
               <Ghost className="w-12 h-12 mb-4" />
               <p className="text-[10px] font-black uppercase tracking-widest text-center">
                 {isArchiveView ? 'Архив пуст' : 'Нет активных каналов'}
               </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <ChatEditorModal open={isEditorModalOpen} onOpenChange={setIsEditorModalOpen} />
      <AdminPanelModal open={isAdminPanelOpen} onOpenChange={setIsAdminPanelOpen} />
      <CreateStoryModal open={isCreateStoryOpen} onOpenChange={setIsCreateStoryOpen} />
      <StoryViewerModal />
    </div>
  );
}
