
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { ShieldAlert, Users, Star, Search, Trash2, ShieldCheck } from 'lucide-react';
import type { User } from '@/lib/types';
import { formatDisplayName } from '@/lib/utils';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Административная консоль для управления пользователями Ядра (v0.44.0 Style).
 */
export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const [userSearch, setUserSearch] = useState('');
  
  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(50))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

  const filteredUsers = (users || []).filter(u => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.phone?.includes(userSearch)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-primary/20 p-0 overflow-hidden h-[70vh] flex flex-col rounded-[2.5rem] shadow-2xl border">
        <DialogHeader className="p-6 bg-primary/10 border-b border-white/5 shrink-0">
          <DialogTitle className="flex items-center gap-3 text-white uppercase italic font-black">
            <ShieldAlert className="w-5 h-5 text-primary" /> Nuxus Admin Panel
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 border-b border-white/5 bg-muted/10 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <Input 
              placeholder="Поиск по Имени, @никнейму или номеру..." 
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="bg-card border-white/10 h-11 rounded-xl text-sm pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {filteredUsers.length > 0 ? (
              filteredUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar userId={u.id} className="h-10 w-10 shrink-0" manualAvatarUrl={u.avatarUrl} fallbackName={u.name} />
                    <div className="flex flex-col text-left min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-xs text-white truncate">
                          {formatDisplayName(u.name)}
                        </span>
                        {u.isPremium && <Star className="w-3 h-3 text-accent fill-accent shrink-0" />}
                        {u.isAdmin && <ShieldCheck className="w-3 h-3 text-primary shrink-0" />}
                      </div>
                      <span className="text-[9px] text-muted-foreground/60 truncate uppercase tracking-tighter">{u.username}</span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={() => {
                      if (confirm(`Удалить пользователя ${u.name} навсегда?`)) {
                        deleteDocumentNonBlocking(doc(db, 'users', u.id));
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-20 opacity-20 uppercase text-[10px] font-black tracking-widest">
                Пользователи не найдены
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-4 bg-muted/5 border-t border-white/5 shrink-0">
          <p className="text-[8px] text-center text-muted-foreground/40 uppercase font-bold tracking-[0.2em]">
            Nuxus Global Management System v0.44.0
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
