
"use client"

import React, { useState, useMemo, memo, useEffect } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, Bookmark, Pin, Star, 
  Check, CheckCheck,
  MessageSquare, Lock, SquarePen,
  Search, Trash2, Circle, Sparkles,
  Wifi, WifiOff, Ghost
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { AdminPanelModal } from './modals/admin-panel-modal';
import type { User, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, limit, orderBy, writeBatch } from 'firebase/firestore';
import { formatDisplayName, cn, isGlobalAdmin } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { format } from 'date-fns';

const ChatListItem = memo(({ 
  chat, isActive, otherId, cachedDisplayName, manualAvatarUrl, 
  onClick, isPinned, user, isEditMode, isSelected, onToggleSelect 
}: any) => {
  const db = useFirestore();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!db || !otherId) return null;
    return doc(db, 'users', otherId);
  }, [db, otherId]);
  
  const { data: otherProfile } = useDoc<User>(userProfileRef);

  const lastMessageQuery = useMemoFirebase(() => {
    if (!db || !chat.id) return null;
    return query(
      collection(db, 'chats', chat.id, 'messages'), 
      orderBy('sentAt', 'desc'),
      limit(1)
    );
  }, [db, chat.id]);
  
  const { data: lastMessages } = useCollection<Message>(lastMessageQuery);
  const lastMsg = lastMessages?.[0];

  const finalDisplayName = useMemo(() => {
    if (chat.type === 'saved') return 'Избранное';
    return formatDisplayName(otherProfile?.name || cachedDisplayName || chat.name || 'User');
  }, [chat.type, otherProfile?.name, cachedDisplayName, chat.name]);

  const displayTime = useMemo(() => {
    const date = chat.lastMessageAt ? new Date(chat.lastMessageAt) : new Date(chat.createdAt);
    try {
      return format(date, 'HH:mm');
    } catch (e) { return ''; }
  }, [chat.lastMessageAt, chat.createdAt]);

  return (
    <div
      onClick={isEditMode ? () => onToggleSelect(chat.id) : onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all border-none group relative",
        isActive && !isEditMode ? 'bg-white/10' : 'active:bg-white/[0.05]'
      )}
    >
      {isEditMode && (
        <div className="shrink-0 mr-1 animate-in slide-in-from-left-2 duration-200">
          <div className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
            isSelected ? "bg-[#007AFF] border-[#007AFF]" : "border-white/20"
          )}>
            {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
          </div>
        </div>
      )}

      <div className="relative shrink-0">
        {chat.type === 'saved' ? (
          <div className="h-[52px] w-[52px] rounded-full bg-[#007AFF] flex items-center justify-center shadow-lg">
            <Bookmark className="w-6 h-6 text-white fill-white" />
          </div>
        ) : (
          <>
            <UserAvatar userId={otherId} manualAvatarUrl={manualAvatarUrl || otherProfile?.avatarUrl || chat.avatarUrl} className="h-[52px] w-[52px]" fallbackName={finalDisplayName} />
            {otherProfile?.statusEmoji && (
              <div className="absolute -bottom-1 -left-1 bg-[#1c1c1e] rounded-full p-0.5 border border-white/5 shadow-lg z-20">
                <span className="text-[10px]">{otherProfile.statusEmoji}</span>
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex-1 min-w-0 border-b border-white/[0.03] pb-3 h-full flex flex-col justify-center">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-[16px] text-white truncate">
              {finalDisplayName}
            </span>
            {otherProfile?.isPremium && (
              <div className="bg-[#007AFF] rounded-full p-0.5 shrink-0 shadow-[0_0_8px_rgba(0,122,255,0.5)]">
                <Check className="w-2.5 h-2.5 text-white stroke-[4]" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {lastMsg?.senderId === user?.uid && (
              lastMsg?.isRead ? <CheckCheck className="w-3.5 h-3.5 text-[#007AFF]" /> : <Check className="w-3.5 h-3.5 text-muted-foreground/40" />
            )}
            <span className="text-[13px] text-muted-foreground/60 font-medium">{displayTime}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[14px] text-muted-foreground/60 truncate leading-snug pr-4">
            {otherProfile?.statusText && !lastMsg ? (
              <span className="italic opacity-60 text-primary">{otherProfile.statusText}</span>
            ) : (
              lastMsg?.contentType === 'text' ? lastMsg.content : (lastMsg ? `[${lastMsg.contentType}]` : 'Нет сообщений')
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {isPinned && <Pin className="w-3.5 h-3.5 rotate-45 text-muted-foreground/40" />}
          </div>
        </div>
      </div>
    </div>
  );
});
ChatListItem.displayName = 'ChatListItem';

export default function ChatSidebar() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { currentChatId, setCurrentChatId, forwardingMessage, setForwardingMessage } = useAppState();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'private' | 'channels' | 'bots'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user]);
  const { data: chats } = useCollection<Chat>(chatsQuery);

  const pinnedIds = profile?.pinnedChatIds || [];

  const handleChatClick = (chat: Chat) => {
    if (forwardingMessage) {
      if (!db || !user || !profile) return;
      const newMsgData = {
        chatId: chat.id, senderId: user.uid, senderName: profile.name,
        content: forwardingMessage.content, contentType: forwardingMessage.contentType,
        sentAt: new Date().toISOString(), isRead: false, forwardFrom: forwardingMessage.senderName
      };
      addDocumentNonBlocking(collection(db, 'chats', chat.id, 'messages'), newMsgData);
      updateDocumentNonBlocking(doc(db, 'chats', chat.id), { lastMessageAt: new Date().toISOString() });
      setForwardingMessage(null);
      toast({ title: "Сообщение переслано" });
    }
    setCurrentChatId(chat.id);
  };

  const sortedChats = useMemo(() => {
    if (!chats) return [];
    return [...chats].sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id);
      const bPinned = pinnedIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [chats, pinnedIds]);

  const filteredChats = useMemo(() => {
    let result = sortedChats;
    if (activeTab === 'channels') result = result.filter(c => c.type === 'channel');
    if (activeTab === 'private') result = result.filter(c => c.type === 'private' || c.type === 'saved');
    if (searchQuery.trim()) {
      result = result.filter(chat => {
        const isSaved = chat.type === 'saved';
        const otherId = chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;
        const chatName = isSaved ? 'Избранное' : (otherId && chat.metadata && chat.metadata[otherId] ? chat.metadata[otherId].name : chat.name);
        return chatName?.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    return result;
  }, [sortedChats, searchQuery, user, activeTab]);

  const toggleChatSelection = (chatId: string) => {
    setSelectedChatIds(prev => 
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  const handleDeleteSelected = async () => {
    if (!db || selectedChatIds.length === 0) return;
    if (!confirm(`Удалить выбранные чаты (${selectedChatIds.length})?`)) return;

    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      selectedChatIds.forEach(id => {
        batch.delete(doc(db, 'chats', id));
      });
      await batch.commit();
      
      toast({ title: "Чаты удалены" });
      setSelectedChatIds([]);
      setIsEditMode(false);
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-4 pt-4 pb-2 shrink-0">
        {/* Header centered */}
        <div className="relative flex items-center justify-center mb-4 min-h-[36px]">
          <div 
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => isGlobalAdmin(profile) && setIsAdminPanelOpen(true)}
          >
            <div className="relative">
              {isOnline ? (
                <Lock className="w-3.5 h-3.5 text-white" />
              ) : (
                <Ghost className="w-3.5 h-3.5 text-primary animate-pulse" />
              )}
              <div className={cn(
                "absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full border border-black",
                isOnline ? "bg-green-500" : "bg-red-500 animate-pulse"
              )} />
            </div>
            <h1 className="text-[17px] font-black text-white tracking-tight">
              {isOnline ? 'Чаты 🐱' : 'Nuxus Ghost'}
            </h1>
          </div>

          <div className="absolute right-0 flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-5 h-5 text-white" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => {
                setIsEditMode(!isEditMode);
                setSelectedChatIds([]);
              }}
              className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-[13px] border border-white/5"
            >
              {isEditMode ? 'Готово' : 'Изм.'}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          {[
            { id: 'all', label: 'Все' },
            { id: 'private', label: 'Личные' },
            { id: 'channels', label: 'Каналы' },
            { id: 'bots', label: 'Боты' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[14px] font-bold transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-white/20 text-white shadow-lg shadow-white/5" : "text-muted-foreground/60 hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {!isOnline && (
        <div className="mx-4 mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 animate-pulse">
          <WifiOff className="w-3 h-3 text-red-500" />
          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Ghost Protocol Active</span>
        </div>
      )}

      <ScrollArea className="flex-1 scrollbar-hide">
        <div className="pb-32">
          {filteredChats.length > 0 ? (
            filteredChats.map(chat => (
              <ChatListItem 
                key={chat.id} 
                chat={chat} 
                isActive={currentChatId === chat.id} 
                user={user}
                isEditMode={isEditMode}
                isSelected={selectedChatIds.includes(chat.id)}
                onToggleSelect={toggleChatSelection}
                otherId={chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null} 
                cachedDisplayName={chat.metadata && user && chat.participantIds?.find((id: string) => id !== user.uid) ? chat.metadata[chat.participantIds.find((id: string) => id !== user.uid)!].name : chat.name} 
                onClick={() => handleChatClick(chat)} 
                isPinned={pinnedIds.includes(chat.id)} 
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">Здесь пока пусто</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {isEditMode && selectedChatIds.length > 0 && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[90%] max-w-[350px] z-50 animate-in slide-in-from-bottom-4 duration-300">
          <Button 
            onClick={handleDeleteSelected}
            disabled={isDeleting}
            className="w-full h-12 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-2xl shadow-2xl flex items-center justify-center gap-2"
          >
            {isDeleting ? <Trash2 className="w-5 h-5 animate-pulse" /> : <Trash2 className="w-5 h-5" />}
            Удалить выбранные ({selectedChatIds.length})
          </Button>
        </div>
      )}

      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <AdminPanelModal open={isAdminPanelOpen} onOpenChange={setIsAdminPanelOpen} />
    </div>
  );
}
