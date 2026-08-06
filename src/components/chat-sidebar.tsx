
"use client"

import React, { useState, useMemo, memo, useRef, useEffect } from 'react';
import { useAppState } from '@/lib/store.tsx';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, Search, Star, Pin, PinOff, Archive, Lock, Trash2, MessageCircle, Activity, LayoutGrid, Users, User, ChevronRight, Zap, Shield, ChevronDown, UserPlus, LogOut, Check, X, MessageSquare, Bell, BellOff, Eraser, Edit3
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { AdminPanelModal } from './modals/admin-panel-modal';
import { StoriesBar } from './stories-bar';
import type { User as UserType, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc } from '@/firebase/provider';
import { collection, query, where, doc, limit, orderBy, updateDoc, arrayUnion, arrayRemove, deleteDoc, setDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { formatDisplayName, cn, isGlobalAdmin, decryptSignal, isUserPremium } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

const AccountItem = memo(({ account, isActive, index, onSwitch, onRemove }: any) => (
  <div className={cn(
    "flex items-center justify-between p-3 rounded-2xl transition-all group",
    isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-white/5"
  )}>
    <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => onSwitch(index)}>
      <UserAvatar userId={account.id} manualAvatarUrl={account.avatarUrl} className="h-10 w-10 border border-white/10" />
      <div className="flex flex-col text-left min-w-0">
        <span className="text-sm font-black text-white truncate">{account.name}</span>
        <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">{account.username}</span>
      </div>
    </div>
    {!isActive && (
      <button onClick={(e) => { e.stopPropagation(); onRemove(index); }} className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-red-500 transition-all">
        <X className="w-4 h-4" />
      </button>
    )}
    {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
  </div>
));
AccountItem.displayName = 'AccountItem';

const ChatListItem = memo(({ 
  chat, isActive, otherId, isPinned, onPinToggle, onClick, onMarkUnread, onDelete, onArchive, onClearHistory, onMuteToggle, onRename, currentUserId
}: any) => {
  const db = useFirestore();
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const isVerticalScroll = useRef(false);
  const directionDecided = useRef(false);

  const userProfileRef = useMemo(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(userProfileRef);

  const lastMessageQuery = useMemo(() => {
    if (!db || !chat.id) return null;
    return query(collection(db, 'chats', chat.id, 'messages'), orderBy('sentAt', 'desc'), limit(1));
  }, [db, chat.id]);
  const { data: lastMessages } = useCollection<Message>(lastMessageQuery);
  const lastMsg = lastMessages?.[0];

  const isSavedMessages = chat.id.startsWith('saved_');

  const finalDisplayName = useMemo(() => {
    if (isSavedMessages) return 'Архив Данных';
    if (chat.type === 'private') {
      const myMeta = chat.metadata?.[currentUserId || ''];
      if (myMeta?.customName) return myMeta.customName;
      if (otherProfile?.name) return formatDisplayName(otherProfile.name);
    }
    return formatDisplayName(chat.name || otherProfile?.name || 'Узел');
  }, [chat, otherProfile, currentUserId, isSavedMessages]);

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
  const isPremium = useMemo(() => isUserPremium(otherProfile), [otherProfile]);
  const isMuted = chat.mutedUntil && new Date(chat.mutedUntil) > new Date();

  const decryptedPreview = useMemo(() => {
    if (!lastMsg) return isSavedMessages ? 'Ваше личное хранилище' : 'Сигнал отсутствует';
    if (lastMsg.contentType !== 'text') return `[Медиа: ${lastMsg.contentType.toUpperCase()}]`;
    return decryptSignal(lastMsg.content);
  }, [lastMsg, isSavedMessages]);

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
    <div className="relative overflow-hidden touch-pan-y select-none px-4 py-1.5 max-w-full virtual-list-item">
      {/* Swipe Actions Background */}
      <div className={cn("absolute inset-y-1.5 left-4 flex h-[calc(100%-12px)] z-0 transition-opacity duration-300 rounded-[2.2rem] overflow-hidden", offsetX > 20 ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <button onClick={(e) => { e.stopPropagation(); onMarkUnread(chat.id); resetSwipe(); }} className="w-[70px] bg-blue-600 flex flex-col items-center justify-center text-white gap-1.5 active:brightness-125 transition-all">
          <MessageSquare className="w-5 h-5" />
          <span className="text-[7px] font-black uppercase tracking-widest">ИНФО</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onPinToggle(chat.id); resetSwipe(); }} className="w-[70px] bg-green-600 flex flex-col items-center justify-center text-white gap-1.5 active:brightness-125 transition-all border-l border-white/10">
          <Pin className="w-5 h-5" />
          <span className="text-[7px] font-black uppercase tracking-widest">{isPinned ? 'ОТКР' : 'ЗАКР'}</span>
        </button>
      </div>

      <div className={cn("absolute inset-y-1.5 right-4 flex h-[calc(100%-12px)] z-0 transition-opacity duration-300 rounded-[2.2rem] overflow-hidden", offsetX < -20 ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <button onClick={(e) => { e.stopPropagation(); onArchive(chat.id, !!chat.isArchived); resetSwipe(); }} className="w-[70px] bg-orange-600 flex flex-col items-center justify-center text-white gap-1.5 active:brightness-125 transition-all border-r border-white/10">
          <Archive className="w-5 h-5" />
          <span className="text-[7px] font-black uppercase tracking-widest">АРХИВ</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(chat.id); resetSwipe(); }} className="w-[70px] bg-red-700 flex flex-col items-center justify-center text-white gap-1.5 active:brightness-125 transition-all">
          <Trash2 className="w-5 h-5" />
          <span className="text-[7px] font-black uppercase tracking-widest">УДАЛИТЬ</span>
        </button>
      </div>

      <div 
        className={cn(
          "relative z-10 obsidian-glass will-change-transform w-full select-none rounded-[2.2rem] transition-all bg-[#0a0a0c] border border-white/5", 
          !isDragging && "duration-700 cubic-bezier(0.16, 1, 0.3, 1)",
          isActive && Math.abs(offsetX) < 10 ? "border-primary/40 bg-primary/10 shadow-[0_0_30px_rgba(168,85,247,0.1)]" : "hover:bg-white/[0.04]"
        )}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={Math.abs(offsetX) > 10 ? resetSwipe : onClick}
      >
        <ContextMenu>
          <ContextMenuTrigger disabled={Math.abs(offsetX) > 10 || isDragging}>
            <div className="flex items-center gap-4 px-5 py-4 cursor-pointer relative h-[96px] overflow-hidden">
              <div className="relative shrink-0">
                {isSavedMessages ? (
                  <div className="h-16 w-14 rounded-[1.8rem] bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                    <Shield className="w-7 h-7 fill-current" />
                  </div>
                ) : (
                  <UserAvatar userId={otherId} manualAvatarUrl={chat.type !== 'private' ? chat.avatarUrl : otherProfile?.avatarUrl} className="h-16 w-14 rounded-[1.8rem] border border-white/10 transition-all duration-700 group-hover:scale-105" fallbackName={finalDisplayName} showOnlineStatus />
                )}
                {isUnread && <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-[3px] border-[#0a0a0c] shadow-[0_0_15px_rgba(168,85,247,1)] animate-pulse" />}
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <div className="flex items-center justify-between w-full gap-3 text-left">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-black text-[16px] truncate tracking-tight italic text-white leading-none">
                      {finalDisplayName}
                    </span>
                    {isPremium && !isSavedMessages && <Star className="w-3.5 h-3.5 text-accent fill-accent shrink-0" />}
                    {isPinned && <Pin className="w-3.5 h-3.5 text-primary rotate-45 shrink-0" />}
                    {isMuted && <BellOff className="w-3 h-3 text-white/20 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-white/30 font-black tabular-nums tracking-widest">{displayTime}</span>
                </div>
                <div className="flex items-center gap-2 w-full text-left">
                  <p className="text-[14px] text-muted-foreground/60 truncate flex items-center font-semibold min-w-0 flex-1 italic">
                    {isEncrypted && <Lock className="w-3.5 h-3.5 shrink-0 text-primary/30 mr-2" />}
                    <span className="truncate">{decryptedPreview}</span>
                  </p>
                </div>
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-12 w-1.5 bg-primary/10 rounded-l-full group-hover:bg-primary/30 transition-all" />
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-r-full shadow-[0_0_20px_rgba(168,85,247,1)]" />
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64 bg-[#0a0a0c]/95 backdrop-blur-[60px] border-white/10 rounded-[2rem] p-2 shadow-2xl animate-in zoom-in-95 duration-300">
            {!isSavedMessages && (
              <ContextMenuItem onClick={() => onMarkUnread(chat.id)} className="gap-3 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/10 transition-all">
                <MessageSquare className="w-4 h-4 text-primary" /> {chat.isManualUnread ? 'ПРОЧИТАНО' : 'НЕ ПРОЧИТАНО'}
              </ContextMenuItem>
            )}
            <ContextMenuItem onClick={() => onPinToggle(chat.id)} className="gap-3 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/10 transition-all">
              {isPinned ? <><PinOff className="w-4 h-4 text-green-400" /> ОТКРЕПИТЬ</> : <><Pin className="w-4 h-4 text-green-400" /> ЗАКРЕПИТЬ</>}
            </ContextMenuItem>
            
            <ContextMenuSeparator className="bg-white/5 mx-3 my-1" />
            
            {!isSavedMessages && (
              <>
                <ContextMenuItem onClick={() => onMuteToggle(chat.id, isMuted)} className="gap-3 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/10 transition-all">
                  {isMuted ? <><Bell className="w-4 h-4 text-blue-400" /> ВКЛ. УВЕДОМЛЕНИЯ</> : <><BellOff className="w-4 h-4 text-white/40" /> ВЫКЛ. УВЕДОМЛЕНИЯ</>}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onRename(chat.id)} className="gap-3 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/10 transition-all">
                  <Edit3 className="w-4 h-4 text-cyan-400" /> ПЕРЕИМЕНОВАТЬ
                </ContextMenuItem>
              </>
            )}

            <ContextMenuItem onClick={() => onArchive(chat.id, !!chat.isArchived)} className="gap-3 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/10 transition-all">
              <Archive className="w-4 h-4 text-orange-400" /> {chat.isArchived ? 'ВЕРНУТЬ' : 'В АРХИВ'}
            </ContextMenuItem>
            
            <ContextMenuSeparator className="bg-white/5 mx-3 my-1" />
            
            <ContextMenuItem onClick={() => onClearHistory(chat.id)} className="gap-3 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-yellow-500/10 text-yellow-500 transition-all">
              <Eraser className="w-4 h-4" /> ОЧИСТИТЬ ИСТОРИЮ
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onDelete(chat.id)} className="gap-3 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-red-500 hover:bg-red-500/10 transition-all">
              <Trash2 className="w-4 h-4" /> УДАЛИТЬ УЗЕЛ
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
  const { toast } = useToast();
  const { currentChatId, setCurrentChatId, setIsSearchOpen, activeAccountIndex, setActiveAccountIndex } = useAppState();
  
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<Record<number, any>>({});

  useEffect(() => {
    const saved = localStorage.getItem('nuxus_multi_accounts');
    if (saved) setSavedAccounts(JSON.parse(saved));
  }, []);

  const userProfileRef = useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: currentUserProfile } = useDoc<UserType>(userProfileRef);

  useEffect(() => {
    if (user && currentUserProfile) {
      const accounts = JSON.parse(localStorage.getItem('nuxus_multi_accounts') || '{}');
      accounts[activeAccountIndex] = {
        id: user.uid,
        name: currentUserProfile.name,
        username: currentUserProfile.username,
        avatarUrl: currentUserProfile.avatarUrl,
        isPremium: !!isUserPremium(currentUserProfile)
      };
      localStorage.setItem('nuxus_multi_accounts', JSON.stringify(accounts));
      setSavedAccounts(accounts);
    }
  }, [user?.uid, currentUserProfile, activeAccountIndex]);

  const handleSwitchAccount = (index: number) => {
    if (index === activeAccountIndex) return;
    setActiveAccountIndex(index);
    setCurrentChatId(null);
  };

  const handleAddAccount = () => {
    const slots = [0, 1, 2, 3, 4];
    const nextSlot = slots.find(s => !savedAccounts[s]);
    if (nextSlot !== undefined) {
      setActiveAccountIndex(nextSlot);
      setCurrentChatId(null);
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(20);
    }
  };

  const handleRemoveAccount = (index: number) => {
    const next = { ...savedAccounts };
    delete next[index];
    setSavedAccounts(next);
    localStorage.setItem('nuxus_multi_accounts', JSON.stringify(next));
    if (index === activeAccountIndex) setActiveAccountIndex(0);
  };

  const chatsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user?.uid]);
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

  const handleMuteToggle = async (chatId: string, isCurrentlyMuted: boolean) => {
    if (!db) return;
    const muteUntil = isCurrentlyMuted ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    await updateDoc(doc(db, 'chats', chatId), { mutedUntil: muteUntil });
    toast({ title: isCurrentlyMuted ? "Звук включен" : "Уведомления отключены" });
  };

  const handleClearHistory = async (chatId: string) => {
    if (!db) return;
    if (confirm('Очистить историю сигналов в этом узле?')) {
      const msgsSnap = await getDocs(collection(db, 'chats', chatId, 'messages'));
      const batch = writeBatch(db);
      msgsSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      toast({ title: "История очищена" });
    }
  };

  const handleRename = async (chatId: string) => {
    const newName = prompt('Введите новое имя узла:');
    if (newName && db && user) {
      await updateDoc(doc(db, 'chats', chatId), { [`metadata.${user.uid}.customName`]: newName.trim() });
      toast({ title: "Узел переименован" });
    }
  };

  const handleDelete = async (chatId: string) => {
    if (!db) return;
    if (confirm('Аннигилировать этот узел связи?')) {
      await deleteDoc(doc(db, 'chats', chatId));
    }
  };

  const handleOpenSaved = async () => {
    if (!db || !user) return;
    const savedId = `saved_${user.uid}`;
    const savedRef = doc(db, 'chats', savedId);
    const snap = await getDoc(savedRef);
    if (!snap.exists()) {
      await setDoc(savedRef, {
        id: savedId, type: 'saved', name: 'Архив Данных', username: '@saved', ownerId: user.uid,
        participantIds: [user.uid], adminIds: [user.uid], createdAt: new Date().toISOString(), isPublic: false
      });
    }
    setCurrentChatId(savedId);
  };

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    let result = [...chats].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
    let saved = result.find(c => c.type === 'saved');
    let others = result.filter(c => c.type !== 'saved');
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

  const accsList = Object.entries(savedAccounts).map(([idx, data]) => ({ index: parseInt(idx), ...data }));
  const hasPremiumAnywhere = accsList.some(a => a.isPremium);
  const accLimit = hasPremiumAnywhere ? 5 : 3;

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative max-w-full">
      <ScrollArea className="flex-1">
        {/* Infinite Layout: Header and Search now scroll away */}
        <div className="px-6 pt-12 pb-6 bg-transparent z-20 space-y-8 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center justify-between w-full relative">
            <div className="flex flex-col items-center gap-1.5 opacity-40">
               <Activity className="w-5 h-5 text-green-500" />
               <span className="text-[8px] font-black uppercase tabular-nums">SYNCED</span>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2">
              <Popover>
                <PopoverTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer group active:scale-95 transition-all">
                     <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase group-hover:text-primary transition-colors">
                       {isArchiveView ? 'Архив' : 'Сигналы'}
                     </h1>
                     <ChevronDown className="w-5 h-5 text-white/20 group-hover:text-primary transition-all" />
                  </div>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-72 bg-[#0a0a0c]/95 backdrop-blur-3xl border-white/10 rounded-[2.2rem] p-3 shadow-2xl z-[1000] outline-none">
                   <div className="space-y-1.5 mb-4">
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 px-2">Узлы в сети ({accsList.length}/{accLimit})</span>
                      <ScrollArea className="max-h-64">
                         <div className="space-y-1">
                            {accsList.map(acc => (
                              <AccountItem 
                                key={acc.index} account={acc} index={acc.index} isActive={acc.index === activeAccountIndex} 
                                onSwitch={handleSwitchAccount} onRemove={handleRemoveAccount} 
                              />
                            ))}
                         </div>
                      </ScrollArea>
                   </div>
                   <div className="pt-2 border-t border-white/5 space-y-1">
                      {accsList.length < accLimit && (
                        <button onClick={handleAddAccount} className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-primary/10 transition-all group text-left">
                          <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <UserPlus className="w-5 h-5" />
                          </div>
                          <span className="text-[11px] font-black uppercase text-white tracking-widest">Добавить узел</span>
                        </button>
                      )}
                      {isGlobalAdmin(currentUserProfile) && (
                        <button onClick={() => setIsAdminPanelOpen(true)} className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-primary/10 transition-all group text-left">
                          <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <Shield className="w-5 h-5" />
                          </div>
                          <span className="text-[11px] font-black uppercase text-white tracking-widest">Админ-панель</span>
                        </button>
                      )}
                   </div>
                </PopoverContent>
              </Popover>
            </div>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl obsidian-glass border-white/5 hover:border-primary/40 transition-all group shadow-xl" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-700" />
            </Button>
          </div>
          <div className="relative group px-1">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
              <input 
                placeholder="Сканировать пространство..." 
                className="w-full h-14 bg-white/[0.03] border border-white/5 rounded-2xl pl-12 text-xs font-black uppercase tracking-[0.2em] placeholder:text-muted-foreground/20 focus:outline-none focus:border-primary/40 transition-all shadow-inner"
                onClick={() => setIsSearchOpen(true)}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col max-w-full overflow-x-hidden">
          {!isArchiveView && (
            <div className="px-1">
              <StoriesBar />
              <div className="px-5 pt-6">
                <button 
                  onClick={handleOpenSaved}
                  className={cn(
                    "w-full p-4 obsidian-glass rounded-[2rem] border border-primary/20 flex items-center gap-4 hover:bg-primary/5 transition-all group shadow-xl",
                    currentChatId?.startsWith('saved_') && "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                  )}
                >
                  <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-lg">
                    <Shield className="w-6 h-6 fill-current" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-black text-sm text-white italic uppercase tracking-tighter">Архив Данных</span>
                    <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Личный терминал</span>
                  </div>
                  <ChevronRight className="w-4 h-4 ml-auto text-primary/20" />
                </button>
              </div>
              <div className="px-5 py-6">
                <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-1">
                  {[
                    { id: 'all', label: 'ВСЕ', icon: LayoutGrid },
                    { id: 'private', label: 'УЗЛЫ', icon: User },
                    { id: 'groups', label: 'ГРУППЫ', icon: Users }
                  ].map((tab) => (
                    <button 
                      key={tab.id} onClick={() => setActiveTab(tab.id)} 
                      className={cn(
                        "px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border italic flex items-center gap-2.5", 
                        activeTab === tab.id ? "bg-primary text-white border-primary shadow-[0_10px_30px_rgba(168,85,247,0.3)] scale-105" : "text-muted-foreground/40 border-white/[0.05] hover:text-white hover:bg-white/10"
                      )}
                    >
                      <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="pb-40 space-y-2 overflow-x-hidden px-1">
            {filteredChats.length > 0 ? (
              filteredChats.map(chat => (
                <ChatListItem 
                  key={chat.id} chat={chat} isActive={currentChatId === chat.id} 
                  isPinned={currentUserProfile?.pinnedChatIds?.includes(chat.id)}
                  onPinToggle={handlePinToggle} onMarkUnread={handleMarkUnread} onArchive={handleArchive}
                  onMuteToggle={handleMuteToggle} onClearHistory={handleClearHistory} onRename={handleRename}
                  onDelete={handleDelete} onClick={() => { setCurrentChatId(chat.id); }}
                  currentUserId={user?.uid} otherId={chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null} 
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-24 opacity-10 space-y-6">
                 <Zap className="w-20 h-20 text-primary" />
                 <p className="text-[11px] font-black uppercase tracking-[0.4em] text-center">Сигналы не обнаружены</p>
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
