"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { Search, UserPlus, Contact, Star, Phone, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { collection, query, doc, arrayUnion, limit } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { User } from '@/lib/types';
import { formatDisplayName, isUserPremium } from '@/lib/utils';
import { UserAvatar } from '../user-avatar';

/**
 * ADD MEMBER MODAL V5.2.4 «ABSOLUTE STABILITY»
 * FIXED: Устранена ошибка ca9 за счет использования useMemoFirebase для всех запросов.
 */
export function AddMemberModal({ open, onOpenChange, chatId, currentParticipantIds, isCallContext }: any) {
  const db = useFirestore();
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const currentUserRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: currentUserProfile } = useDoc<User>(currentUserRef);

  const usersQuery = useMemoFirebase(() => {
    if (!db || search.length < 2) return null;
    return query(collection(db, 'users'), limit(50));
  }, [db, search]);

  const { data: allUsers } = useCollection<User>(usersQuery);

  const filteredUsers = (allUsers || []).filter(u => {
    if (currentParticipantIds.includes(u.id)) return false;
    const searchLower = search.toLowerCase();
    return u.name?.toLowerCase().includes(searchLower) || 
           u.username?.toLowerCase().includes(searchLower);
  });

  const handleAddUser = async (targetUser: User) => {
    if (!db || !chatId || !user) return;
    
    // Проверка приватности
    const privacy = targetUser.settings?.privacy?.allowGroupsFrom || 'everybody';
    let canAdd = true;
    let errorMsg = "";

    if (!isCallContext) {
      if (privacy === 'nobody') {
        canAdd = false;
        errorMsg = "Пользователь запретил приглашения в группы.";
      } else if (privacy === 'contacts') {
        const isContact = targetUser.contactIds?.includes(user.uid);
        if (!isContact) {
          canAdd = false;
          errorMsg = "Вы не в списке контактов пользователя.";
        }
      }
    }

    if (!canAdd) {
       toast({ title: "Сигнал заблокирован", description: errorMsg, variant: "destructive" });
       return;
    }

    setIsLoading(true);
    try {
      const collectionName = isCallContext ? 'calls' : 'chats';
      const ref = doc(db, collectionName, chatId);
      
      updateDocumentNonBlocking(ref, {
        participantIds: arrayUnion(targetUser.id)
      });

      toast({ 
        title: isCallContext ? "Signal Sent" : "Узел добавлен", 
        description: isCallContext ? `${targetUser.name} приглашен в разговор.` : `${formatDisplayName(targetUser.name)} интегрирован в кластер.` 
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Add member error:", error);
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-[#0a0a0c]/95 backdrop-blur-[60px] border-white/10 rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-8 pb-4 text-left">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-3">
            {isCallContext ? <Phone className="w-6 h-6 text-primary" /> : <UserPlus className="w-6 h-6 text-primary" />}
            {isCallContext ? 'Добавить в разговор' : 'Интеграция узлов'}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {isCallContext ? 'Выберите участника для подключения к линии' : 'Сканируйте базу для добавления в кластер'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 py-2">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Имя или @ID..." 
              className="pl-11 h-12 bg-white/5 border-white/10 rounded-2xl font-bold focus:border-primary/40 transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="h-[380px] mt-4 border-t border-white/5">
          <div className="p-4 space-y-2">
            {search.length < 2 ? (
              <div className="p-10 text-center space-y-4 opacity-20">
                <Contact className="w-12 h-12 mx-auto" />
                <p className="text-[10px] font-black uppercase tracking-widest italic">Введите данные для поиска</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map(u => (
                <div
                  key={u.id}
                  onClick={() => handleAddUser(u)}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-primary/10 cursor-pointer group transition-all border border-transparent hover:border-primary/20 shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <UserAvatar userId={u.id} className="h-12 w-12 border border-white/5" manualAvatarUrl={u.avatarUrl} />
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-white italic uppercase tracking-tight truncate max-w-[140px]">
                          {formatDisplayName(u.name, u.username)}
                        </span>
                        {isUserPremium(u) && <Star className="w-3.5 h-3.5 text-accent fill-accent animate-pulse" />}
                      </div>
                      <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">{u.username}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <Plus className="w-5 h-5" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center opacity-40">
                <p className="text-[10px] font-black uppercase italic tracking-widest">Узел не обнаружен</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
