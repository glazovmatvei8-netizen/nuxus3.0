
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, limit, addDoc } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, Radio, Users, Check, ArrowRight, X, Star } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';

export function GlobalSearchModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { user } = useUser();
  const db = useFirestore();
  const { setCurrentChatId, setActiveView } = useAppState();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<{ type: 'chat' | 'user', data: any }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: myProfile } = useDoc<User>(userRef);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchVal = val.startsWith('@') ? val.toLowerCase() : '@' + val.toLowerCase();
      
      const chatQuery = query(collection(db!, 'chats'), where('username', '==', searchVal), limit(5));
      const userQuery = query(collection(db!, 'users'), where('username', '==', searchVal), limit(5));

      const [chatSnap, userSnap] = await Promise.all([getDocs(chatQuery), getDocs(userQuery)]);
      
      const foundChats = chatSnap.docs.map(d => ({ type: 'chat' as const, data: { id: d.id, ...d.data() } }));
      const foundUsers = userSnap.docs
        .map(d => ({ type: 'user' as const, data: { id: d.id, ...d.data() } }))
        .filter(u => u.data.id !== user?.uid);

      setResults([...foundChats, ...foundUsers]);
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const openUserChat = async (targetUser: User) => {
    if (!user || !db || !myProfile) return;
    try {
      const q = query(collection(db, 'chats'), where('type', '==', 'private'), where('participantIds', 'array-contains', user.uid));
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find(d => {
        const pIds = d.data().participantIds;
        return pIds.includes(targetUser.id) && pIds.length === 2;
      });

      if (existing) {
        setCurrentChatId(existing.id);
        onOpenChange(false);
        setActiveView('chats');
        return;
      }

      const newChatData = {
        type: 'private' as const,
        participantIds: [user.uid, targetUser.id],
        adminIds: [user.uid, targetUser.id],
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        name: targetUser.name,
        username: targetUser.username
      };

      const docRef = await addDoc(collection(db, 'chats'), newChatData);
      setCurrentChatId(docRef.id);
      onOpenChange(false);
      setActiveView('chats');
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <div className="px-6 py-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
            <Input 
              placeholder="Поиск по @username..." 
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="bg-white/5 border-white/5 h-14 rounded-2xl pl-12 text-lg"
              autoFocus
            />
            {isLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-3">
            {results.length > 0 ? (
              results.map((res, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] hover:bg-white/10 cursor-pointer" onClick={() => res.type === 'chat' ? (setCurrentChatId(res.data.id), onOpenChange(false)) : openUserChat(res.data)}>
                  <div className="flex items-center gap-4">
                    <UserAvatar userId={res.type === 'user' ? res.data.id : null} manualAvatarUrl={res.data.avatarUrl} className="h-12 w-12" fallbackName={res.data.name} />
                    <div className="flex flex-col">
                      <span className="font-bold text-white flex items-center gap-2">{res.data.name} {res.type === 'chat' ? <Users className="w-3 h-3" /> : isUserPremium(res.data) && <Star className="w-3 h-3 text-accent fill-accent" />}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{res.data.username}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary/40" />
                </div>
              ))
            ) : searchQuery.length >= 3 ? (
              <div className="text-center py-12 opacity-40 uppercase text-[10px] font-black tracking-widest">Ничего не найдено</div>
            ) : (
              <div className="text-center py-12 opacity-20 uppercase text-[10px] font-black tracking-widest">Введите @никнейм для поиска</div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
