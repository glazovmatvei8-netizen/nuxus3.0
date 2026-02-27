
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Loader2, Contact, ShieldAlert } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { collection, query, doc, arrayUnion, limit } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { User } from '@/lib/types';
import { formatDisplayName } from '@/lib/utils';

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  currentParticipantIds: string[];
}

export function AddMemberModal({ open, onOpenChange, chatId, currentParticipantIds }: AddMemberModalProps) {
  const db = useFirestore();
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => {
    if (!db || search.length < 2) return null;
    return query(collection(db, 'users'), limit(50));
  }, [db, search]);

  const { data: allUsers } = useCollection<User>(usersQuery);

  const filteredUsers = (allUsers || []).filter(u => {
    if (currentParticipantIds.includes(u.id)) return false;
    const searchLower = search.toLowerCase();
    return u.name?.toLowerCase().includes(searchLower) || 
           u.username?.toLowerCase().includes(searchLower) || 
           u.phone?.includes(search);
  });

  const handleAddUser = async (targetUser: User) => {
    if (!db || !chatId) return;
    
    // Проверка конфиденциальности
    const privacy = targetUser.settings?.privacy?.allowGroupsFrom || 'everybody';
    if (privacy === 'nobody' || privacy === 'contacts') {
       toast({ 
         title: "Ограничение", 
         description: "Пользователь запретил добавлять себя в группы. Отправьте ему ссылку.", 
         variant: "destructive" 
       });
       return;
    }

    setIsLoading(true);
    try {
      const chatRef = doc(db, 'chats', chatId);
      updateDocumentNonBlocking(chatRef, {
        participantIds: arrayUnion(targetUser.id)
      });
      toast({ title: "Успех", description: `${formatDisplayName(targetUser.name)} добавлен в чат` });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border/40">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Добавить участников
          </DialogTitle>
          <DialogDescription>
            Найдите пользователей, чтобы добавить их в группу
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Имя, @ник или номер телефона..." 
              className="pl-9 h-11 bg-muted/30 border-muted-foreground/10 rounded-xl"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="h-[350px] border-t border-border/40">
          <div className="p-2 space-y-1">
            {search.length < 2 ? (
              <div className="p-8 text-center space-y-3">
                <div className="bg-muted/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                  <Contact className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Введите данные для поиска участников
                </p>
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map(u => (
                <div
                  key={u.id}
                  onClick={() => handleAddUser(u)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/10 cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary/20">
                      <AvatarImage src={u.avatarUrl || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold uppercase">{u.name?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="font-semibold text-sm group-hover:text-primary transition-colors block truncate">
                        {formatDisplayName(u.name)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">{u.username}</span>
                    </div>
                  </div>
                  {u.settings?.privacy?.allowGroupsFrom === 'nobody' && (
                    <ShieldAlert className="w-4 h-4 text-destructive" />
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm italic">
                Пользователи не найдены
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
