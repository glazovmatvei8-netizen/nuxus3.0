"use client"

import React, { useState, useMemo } from 'react';
import { useAppState } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { Search, UserPlus, Star, Contact as ContactIcon, MessageCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser, useCollection, useDoc } from '@/firebase';
import { collection, query, where, doc, getDocs, addDoc } from 'firebase/firestore';
import { formatDisplayName, cn, isUserPremium } from '@/lib/utils';
import type { User, Chat } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function ContactsView() {
  const { user } = useUser();
  const db = useFirestore();
  const { setCurrentChatId, setActiveView } = useAppState();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const userProfileRef = useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const contactsQuery = useMemo(() => {
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
        metadata: {
          [user.uid]: { name: profile.name, username: profile.username, avatarUrl: profile.avatarUrl || null },
          [otherUser.id]: { name: otherUser.name, username: otherUser.username, avatarUrl: otherUser.avatarUrl || null }
        }
      };

      const docRef = await addDoc(collection(db, 'chats'), newChatData);
      setCurrentChatId(docRef.id);
      setActiveView('chats');
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-4 pt-6 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[28px] font-black text-white tracking-tight">Контакты</h1>
          <Button size="icon" className="h-10 w-10 rounded-xl bg-[#007AFF]">
            <UserPlus className="w-6 h-6 text-white" />
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input 
            placeholder="Поиск по контактам" 
            className="pl-10 bg-[#1c1c1e] border-none rounded-xl h-10 text-[15px]" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 space-y-1 pb-24">
          {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => (
              <div 
                key={contact.id} 
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group"
                onClick={() => startChat(contact)}
              >
                <div className="flex items-center gap-3">
                  <UserAvatar userId={contact.id} className="h-12 w-12" manualAvatarUrl={contact.avatarUrl} />
                  <div className="flex flex-col">
                    <span className="font-bold text-white flex items-center gap-1">
                      {formatDisplayName(contact.name)}
                      {isUserPremium(contact) && <Star className="w-3 h-3 text-accent fill-accent" />}
                    </span>
                    <span className="text-[12px] text-muted-foreground">{contact.username}</span>
                  </div>
                </div>
                <MessageCircle className="w-5 h-5 text-muted-foreground/40 group-hover:text-[#007AFF] transition-colors" />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
              <ContactIcon className="w-12 h-12 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">Список пуст</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
