
"use client"

import React, { useState, useMemo } from 'react';
import { useAppState } from '@/lib/app-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { Search, UserPlus, Star, Contact as ContactIcon, MessageCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { collection, query, where, doc, getDocs, addDoc } from 'firebase/firestore';
import { formatDisplayName, cn, isUserPremium } from '@/lib/utils';
import type { User, Chat } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

/**
 * CONTACTS VIEW V102.0 «ORDER PROTOCOL»
 * Добавлен запрет на создание дублей личных чатов.
 */
export default function ContactsView() {
  const { user } = useUser();
  const db = useFirestore();
  const { setCurrentChatId, setActiveView } = useAppState();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const contactsQuery = useMemoFirebase(() => {
    if (!db || !profile?.contactIds?.length) return null;
    return query(collection(db, 'users'), where('id', 'in', profile.contactIds.slice(0, 10)));
  }, [db, profile?.contactIds]);

  const { data: contacts, isLoading } = useCollection<User>(contactsQuery);

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!searchQuery.trim()) return contacts;
    const s = searchQuery.toLowerCase();
    return contacts.filter(c => 
      c.name?.toLowerCase().includes(s) || 
      c.username?.toLowerCase().includes(s)
    );
  }, [contacts, searchQuery]);

  const startChat = async (otherUser: User) => {
    if (!db || !user || !profile) return;
    try {
      // ПРОВЕРКА НА СУЩЕСТВУЮЩИЙ ЧАТ
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'private'),
        where('participantIds', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find(d => {
        const pIds = d.data().participantIds;
        return pIds.includes(otherUser.id) && pIds.length === 2;
      });

      if (existing) {
        setCurrentChatId(existing.id);
        setActiveView('chats');
        return;
      }

      const newChatData = {
        type: 'private' as const,
        participantIds: [user.uid, otherUser.id],
        adminIds: [user.uid, otherUser.id],
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        name: otherUser.name,
        username: otherUser.username,
        avatarUrl: otherUser.avatarUrl || null,
        metadata: {
          [user.uid]: { name: profile.name, username: profile.username, avatarUrl: profile.avatarUrl || null },
          [otherUser.id]: { name: otherUser.name, username: otherUser.username, avatarUrl: otherUser.avatarUrl || null }
        }
      };

      const docRef = await addDoc(collection(db, 'chats'), newChatData);
      setCurrentChatId(docRef.id);
      setActiveView('chats');
    } catch (e: any) {
<<<<<<< HEAD
=======
      console.error("Failed to create or open contact chat:", e);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] overflow-hidden">
      <div className="px-8 pt-16 pb-6 shrink-0">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black text-primary italic tracking-tighter uppercase leading-none">КОНТАКТЫ</h1>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/5 text-white">
            <UserPlus className="w-5 h-5" />
          </Button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30" />
          <Input placeholder="Поиск по контактам" className="pl-16 bg-white/[0.03] border-white/5 rounded-[2rem] h-14 text-[15px] font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-4 space-y-1 pb-24">
          {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => (
              <div key={contact.id} className="flex items-center justify-between p-4 rounded-[2rem] hover:bg-white/[0.02] transition-all cursor-pointer group" onClick={() => startChat(contact)}>
                <div className="flex items-center gap-4">
                  <UserAvatar userId={contact.id} className="h-14 w-14 border border-white/5 shadow-xl" manualAvatarUrl={contact.avatarUrl} />
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-white uppercase italic tracking-tight flex items-center gap-2">
                      {formatDisplayName(contact.name)}
                      {isUserPremium(contact) && <Star className="w-3 h-3 text-accent fill-accent" />}
                    </span>
                    <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest">{contact.username}</span>
                  </div>
                </div>
                <MessageCircle className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-center opacity-10">
              <ContactIcon className="w-16 h-16 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Список пуст</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
