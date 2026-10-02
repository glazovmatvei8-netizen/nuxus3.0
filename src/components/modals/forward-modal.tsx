
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser, useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { collection, query, where } from 'firebase/firestore';
import { useAppState } from '@/lib/app-state';
import { useToast } from '@/hooks/use-toast';
import { Search, ArrowRight, Share2, Loader2 } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { formatDisplayName } from '@/lib/utils';
import type { Chat } from '@/lib/types';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * FORWARD MODAL V76.0 «STABILITY MAXIMUS»
 * FIXED: Hydration error and Fiber crash by adding mounting guard and direct imports.
 * REFACTORED: Action converted to non-blocking as per guidelines.
 */
export function ForwardModal() {
  const { user } = useUser();
  const db = useFirestore();
  const { forwardingMessage, setForwardingMessage, setCurrentChatId } = useAppState();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'chats'), 
      where('participantIds', 'array-contains', user.uid)
    );
  }, [db, user?.uid]);
  
  const { data: chats, isLoading } = useCollection<Chat>(chatsQuery);

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    if (!search.trim()) return chats;
    const s = search.toLowerCase();
    return chats.filter(c => 
      c.name?.toLowerCase().includes(s) || 
      c.username?.toLowerCase().includes(s)
    );
  }, [chats, search]);

  const handleForward = (targetChat: Chat) => {
    if (!db || !user || !forwardingMessage) return;
    
    setIsProcessing(true);
    
    const msgData: any = {
      chatId: targetChat.id,
      senderId: user.uid,
      senderName: user.displayName || 'Nuxus User',
      content: forwardingMessage.content,
      contentType: forwardingMessage.contentType,
      sentAt: new Date().toISOString(),
      forwardFrom: forwardingMessage.senderName,
      isRead: false
    };

    // Using the non-blocking pattern for maximum reliability
    addDocumentNonBlocking(collection(db, 'chats', targetChat.id, 'messages'), msgData)
      .then(() => {
        toast({ title: "Переслано в " + formatDisplayName(targetChat.name) });
        setForwardingMessage(null);
        setCurrentChatId(targetChat.id);
      })
      .catch(() => {
        toast({ title: "Сбой передачи сигнала", variant: "destructive" });
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  // Prevent rendering anything until mounted to avoid hydration mismatches
  if (!mounted) return null;

  return (
    <Dialog open={!!forwardingMessage} onOpenChange={(o) => !o && setForwardingMessage(null)}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/98 backdrop-blur-3xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl h-[70vh] flex flex-col outline-none">
        <DialogHeader className="p-8 pb-4 text-left border-b border-white/5 bg-primary/5">
          <DialogTitle className="text-2xl font-black uppercase italic text-white flex items-center gap-3 tracking-tighter">
            <Share2 className="w-6 h-6 text-primary" /> Переслать
          </DialogTitle>
          <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-primary/40 mt-1">
            Выберите узел для передачи сигнала
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 py-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Поиск чатов..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="bg-white/5 border-white/10 h-12 rounded-2xl pl-12 focus:border-primary/40 transition-all font-bold"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-10">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest">Сканирование сети...</p>
              </div>
            ) : filteredChats.length > 0 ? (
              filteredChats.map(chat => (
                <div 
                  key={chat.id} 
                  className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-[1.8rem] hover:bg-primary/5 hover:border-primary/20 cursor-pointer transition-all group shadow-lg"
                  onClick={() => handleForward(chat)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <UserAvatar 
                      userId={chat.type === 'private' ? chat.participantIds.find(id => id !== user?.uid) : null} 
                      manualAvatarUrl={chat.avatarUrl} 
                      className="h-12 w-12 border border-white/10" 
                      fallbackName={chat.name} 
                    />
                    <div className="flex flex-col text-left min-w-0">
                      <span className="font-black text-[15px] text-white italic tracking-tight uppercase truncate">
                        {formatDisplayName(chat.name, chat.username)}
                      </span>
                      <span className="text-[9px] text-primary/60 font-black uppercase tracking-widest">{chat.type}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 opacity-10">
                 <Share2 className="w-12 h-12 mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-widest">Нет доступных узлов</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
