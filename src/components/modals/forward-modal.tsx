
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase/provider';
import { collection, query, where, doc, addDoc } from 'firebase/firestore';
import { useAppState } from '@/lib/app-state';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, ArrowRight, Share2 } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { formatDisplayName } from '@/lib/utils';
import type { Chat, Message, User } from '@/lib/types';

/**
 * FORWARD MODAL V5.2.0
 * ИСПРАВЛЕНО: Пути импорта useAppState и Firebase хуков.
 */
export function ForwardModal() {
  const { user } = useUser();
  const db = useFirestore();
  const { forwardingMessage, setForwardingMessage, setCurrentChatId } = useAppState();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user]);
  const { data: chats } = useCollection<Chat>(chatsQuery);

  const filteredChats = (chats || []).filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.username?.toLowerCase().includes(search.toLowerCase())
  );

  const handleForward = async (targetChat: Chat) => {
    if (!db || !user || !forwardingMessage) return;
    setIsLoading(true);
    try {
      const msgData: Partial<Message> = {
        chatId: targetChat.id,
        senderId: user.uid,
        senderName: user.displayName || 'Nuxus User',
        content: forwardingMessage.content,
        contentType: forwardingMessage.contentType,
        sentAt: new Date().toISOString(),
        forwardFrom: forwardingMessage.senderName,
        isRead: false
      };

      await addDoc(collection(db, 'chats', targetChat.id, 'messages'), msgData);
      toast({ title: "Переслано в " + formatDisplayName(targetChat.name) });
      setForwardingMessage(null);
      setCurrentChatId(targetChat.id);
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={!!forwardingMessage} onOpenChange={(o) => !o && setForwardingMessage(null)}>
      <DialogContent className="max-w-md bg-card border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl h-[70vh] flex flex-col">
        <DialogHeader className="p-6 pb-2 text-left">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" /> Переслать сообщение
          </DialogTitle>
          <DialogDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
            Выберите чат для отправки
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Поиск чатов..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="bg-white/5 border-white/10 h-10 rounded-xl pl-9 focus:border-primary/40 transition-all"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-2">
          <div className="space-y-1">
            {filteredChats.map(chat => (
              <div 
                key={chat.id} 
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-all group"
                onClick={() => handleForward(chat)}
              >
                <div className="flex items-center gap-3">
                  <UserAvatar userId={chat.type === 'private' ? chat.participantIds.find(id => id !== user?.uid) : null} manualAvatarUrl={chat.avatarUrl} className="h-10 w-10" fallbackName={chat.name} />
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-sm text-white">{formatDisplayName(chat.name)}</span>
                    <span className="text-[9px] text-muted-foreground uppercase">{chat.type}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
