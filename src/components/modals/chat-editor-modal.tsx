
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Archive, Trash2, Ghost, ShieldAlert } from 'lucide-react';
import { formatDisplayName, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Chat } from '@/lib/types';

export function ChatEditorModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
  }, [db, user]);
  const { data: chats } = useCollection<Chat>(chatsQuery);

  const handleArchive = async (chatId: string, currentStatus: boolean) => {
    if (!db) return;
    await updateDoc(doc(db, 'chats', chatId), { isArchived: !currentStatus });
    toast({ title: currentStatus ? "Вернулся из архива" : "Отправлено в архив" });
  };

  const handleDelete = async (chatId: string) => {
    if (!db) return;
    if (confirm('Удалить этот чат навсегда для вас?')) {
      await deleteDoc(doc(db, 'chats', chatId));
      toast({ title: "Чат удален" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl h-[70vh] flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" /> Редактор чатов
          </DialogTitle>
          <DialogDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
            Управление активными диалогами и архивом
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 py-2">
          <div className="space-y-2">
            {chats && chats.length > 0 ? (
              chats.map(chat => (
                <div key={chat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar userId={chat.type === 'private' ? chat.participantIds.find(id => id !== user?.uid) : null} manualAvatarUrl={chat.avatarUrl} className="h-10 w-10 shrink-0" fallbackName={chat.name} />
                    <div className="flex flex-col text-left min-w-0">
                      <span className="font-bold text-sm text-white truncate">{formatDisplayName(chat.name)}</span>
                      <span className="text-[9px] text-muted-foreground/60 uppercase font-black">{chat.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-xl", chat.isArchived ? "text-primary" : "text-muted-foreground")} onClick={() => handleArchive(chat.id, !!chat.isArchived)}>
                      <Archive className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleDelete(chat.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 opacity-20">
                <Ghost className="w-12 h-12 mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Список пуст</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
