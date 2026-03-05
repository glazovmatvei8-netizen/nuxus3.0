
"use client"

import React, { useState, useMemo, memo, useEffect } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, Bookmark, Pin, Star, 
  Check, CheckCheck, Archive,
  MessageSquare, Lock, SquarePen,
  Search, Trash2, Circle, Sparkles,
  Wifi, WifiOff, Ghost, Filter, FolderArchive,
  FolderOpen, Settings2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { AdminPanelModal } from './modals/admin-panel-modal';
import type { User, Message, Chat, ChatFolder } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, limit, orderBy, writeBatch, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { formatDisplayName, cn, isGlobalAdmin } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { format } from 'date-fns';

const ChatListItem = memo(({ 
  chat, isActive, otherId, cachedDisplayName, manualAvatarUrl, 
  onClick, isPinned, user, isEditMode, isSelected, onToggleSelect, onArchive 
}: any) => {
  const db = useFirestore();
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
    return formatDisplayName(otherProfile?.name || cachedDisplayName || chat.name || 'User');
  }, [chat.type, otherProfile?.name, cachedDisplayName, chat.name]);

  const displayTime = useMemo(() => {
    const date = chat.lastMessageAt ? new Date(chat.lastMessageAt) : new Date(chat.createdAt);
    try { return format(date, 'HH:mm'); } catch (e) { return ''; }
  }, [chat.lastMessageAt, chat.createdAt]);

  return (
    <div
      onClick={isEditMode ? () => onToggleSelect(chat.id) : onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all border-none group relative",
        isActive && !isEditMode ? 'bg-white/10' : 'active:bg-white/[0.05]'
      )}
    >
      <UserAvatar userId={otherId} manualAvatarUrl={manualAvatarUrl || otherProfile?.avatarUrl || chat.avatarUrl} className="h-[52px] w-[52px]" fallbackName={finalDisplayName} />
      <div className="flex-1 min-w-0 border-b border-white/[0.03] pb-3 h-full flex flex-col justify-center">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-bold text-[16px] text-white truncate">{finalDisplayName} {otherProfile?.isPremium && <Star className="w-3 h-3 text-accent fill-accent inline ml-1" />}</span>
          <span className="text-[13px] text-muted-foreground/60 font-medium">{displayTime}</span>
        </div>
        <p className="text-[14px] text-muted-foreground/60 truncate pr-4">
          {lastMsg?.contentType === 'text' ? lastMsg.content : (lastMsg ? `[${lastMsg.contentType}]` : 'Нет сообщений')}
        </p>
      </div>
    </div>
  );
});
ChatListItem.displayName = 'ChatListItem';

export default function ChatSidebar() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { currentChatId, setCurrentChatId } = useAppState();
  
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user]);
  const { data: chats } = useCollection<Chat>(chatsQuery);

  const customFolders = profile?.settings?.customFolders || [];

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    let result = [...chats].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    if (activeTab === 'all') return result;
    if (activeTab === 'private') return result.filter(c => c.type === 'private');
    if (activeTab === 'groups') return result.filter(c => c.type === 'group');
    
    const folder = customFolders.find(f => f.id === activeTab);
    if (folder) return result.filter(c => folder.chatIds.includes(c.id));

    return result;
  }, [chats, activeTab, customFolders]);

  const handleCreateFolder = async () => {
    const name = prompt("Название папки:");
    if (!name || !db || !user || !userProfileRef) return;
    const newFolder: ChatFolder = { id: `folder_${Date.now()}`, name, chatIds: [] };
    await updateDoc(userProfileRef, { 'settings.customFolders': [...customFolders, newFolder] });
    toast({ title: "Папка создана" });
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="relative flex items-center justify-between mb-4">
          <div onClick={() => isGlobalAdmin(profile) && setIsAdminPanelOpen(true)} className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
              <Lock className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-[17px] font-black text-white">Nuxus Core</h1>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-white/5" onClick={() => setIsCreateModalOpen(true)}>
            <SquarePen className="w-5 h-5 text-white" />
          </Button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          {[
            { id: 'all', label: 'Все' },
            { id: 'private', label: 'ЛС' },
            { id: 'groups', label: 'Группы' },
            ...customFolders.map(f => ({ id: f.id, label: f.name }))
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[13px] font-bold transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-[#007AFF] text-white shadow-lg shadow-[#007AFF]/20" : "text-muted-foreground/60 hover:text-white bg-white/5"
              )}
            >
              {tab.label}
            </button>
          ))}
          <Button variant="ghost" size="sm" className="h-8 rounded-full bg-white/5 px-2" onClick={handleCreateFolder}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-hide">
        <div className="pb-32">
          {filteredChats.map(chat => (
            <ChatListItem 
              key={chat.id} 
              chat={chat} 
              isActive={currentChatId === chat.id} 
              user={user}
              onClick={() => setCurrentChatId(chat.id)}
              otherId={chat.type === 'private' && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null} 
            />
          ))}
        </div>
      </ScrollArea>

      <CreateChatModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <AdminPanelModal open={isAdminPanelOpen} onOpenChange={setIsAdminPanelOpen} />
    </div>
  );
}
