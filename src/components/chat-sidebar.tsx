
"use client"

import React, { useState, useMemo, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, SquarePen, Ghost, Search, MoreVertical, 
  Archive, Trash2, ArchiveRestore, Star
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatModal } from './modals/create-chat-modal';
import { ChatEditorModal } from './modals/chat-editor-modal';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import type { User, Message, Chat } from '@/lib/types';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, limit, orderBy, updateDoc, deleteDoc } from 'firebase/firestore';
import { formatDisplayName, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const ChatListItem = memo(({ 
  chat, isActive, otherId, cachedDisplayName, manualAvatarUrl, 
  onClick, user
}: any) => {
  const db = useFirestore();
  const { toast } = useToast();
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

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!db) return;
    updateDoc(doc(db, 'chats', chat.id), { isArchived: !chat.isArchived });
    toast({ title: chat.isArchived ? "Вернулся из архива" : "Отправлено в архив" });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!db) return;
    if (confirm('Вы уверены, что хотите удалить этот чат?')) {
      deleteDoc(doc(db, 'chats', chat.id));
      toast({ title: "Чат удален" });
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all border-none group relative",
        isActive ? 'bg-white/10' : 'active:bg-white/[0.05]'
      )}
    >
      <UserAvatar userId={otherId} manualAvatarUrl={manualAvatarUrl || otherProfile?.avatarUrl || chat.avatarUrl} className="h-[52px] w-[52px]" fallbackName={finalDisplayName} />
      <div className="flex-1 min-w-0 border-b border-white/[0.03] pb-3 h-full flex flex-col justify-center">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-bold text-[16px] text-white truncate">
            {finalDisplayName} {otherProfile?.isPremium && <Star className="w-3 h-3 text-accent fill-accent inline ml-1" />}
          </span>
          <span className="text-[13px] text-muted-foreground/60 font-medium">{displayTime}</span>
        </div>
        <div className="flex items-center justify-between pr-2">
          <p className="text-[14px] text-muted-foreground/60 truncate flex-1">
            {lastMsg?.contentType === 'text' ? lastMsg.content : (lastMsg ? `[${lastMsg.contentType}]` : 'Нет сообщений')}
          </p>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-white/5">
              <DropdownMenuItem onClick={handleArchive} className="gap-2">
                {chat.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                {chat.isArchived ? 'Из архива' : 'В архив'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive gap-2">
                <Trash2 className="w-4 h-4" /> Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});
ChatListItem.displayName = 'ChatListItem';

export default function ChatSidebar({ isArchiveView = false }: { isArchiveView?: boolean }) {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId, setIsSearchOpen } = useAppState();
  
  const [activeTab, setActiveTab] = useState(isArchiveView ? 'archived' : 'all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user]);
  const { data: chats } = useCollection<Chat>(chatsQuery);

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    let result = [...chats].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    if (isArchiveView) return result.filter(c => c.isArchived);
    
    if (activeTab === 'private') return result.filter(c => c.type === 'private' && !c.isArchived);
    if (activeTab === 'groups') return result.filter(c => c.type === 'group' && !c.isArchived);

    return result.filter(c => !c.isArchived);
  }, [chats, activeTab, isArchiveView]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="relative flex items-center justify-between h-12 mb-6 w-full">
          {/* Left: Search */}
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/5" onClick={() => setIsSearchOpen(true)}>
            <Search className="w-5 h-5 text-white/60" />
          </Button>

          {/* Center: Title */}
          <h1 className="text-[20px] font-black text-white italic tracking-tighter absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
            {isArchiveView ? 'Архив' : 'Чаты🐱'}
          </h1>

          {/* Right: Plus (+) and Editor (SquarePen) */}
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/5" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-5 h-5 text-white" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/5" onClick={() => setIsEditorModalOpen(true)}>
              <SquarePen className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>

        {!isArchiveView && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
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
                user={user}
                onClick={() => setCurrentChatId(chat.id)}
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
    </div>
  );
}
