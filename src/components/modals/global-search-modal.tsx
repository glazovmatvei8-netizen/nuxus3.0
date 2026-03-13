
"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, limit, addDoc, orderBy, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, Radio, Users, Check, ArrowRight, X, Star, Zap, Bot, Sticker } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { isUserPremium } from '@/lib/utils';
import type { User, Chat, StickerPack } from '@/lib/types';

export function GlobalSearchModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { user } = useUser();
  const db = useFirestore();
  const { setCurrentChatId, setActiveView } = useAppState();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<{ type: 'chat' | 'user' | 'bot', data: any }[]>([]);
  const [trends, setTrends] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: myProfile } = useDoc<User>(userRef);

  useEffect(() => {
    if (open && !searchQuery.trim() && db) {
      const fetchDiscoveryData = async () => {
        setIsLoading(true);
        try {
          const chatQ = query(collection(db!, 'chats'), where('isPublic', '==', true), limit(15));
          const chatSnap = await getDocs(chatQ);
          setTrends(chatSnap.docs.map(d => ({ id: d.id, ...d.data() } as Chat)));
        } catch (e) {
          console.warn("Nuxus Discovery: Syncing...");
        } finally {
          setIsLoading(false);
        }
      };
      fetchDiscoveryData();
    }
  }, [open, searchQuery, db]);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchVal = val.startsWith('@') ? val.toLowerCase() : '@' + val.toLowerCase();
      const foundResults: any[] = [];

      // Системные боты (например, @stickers для управления своими паками)
      if ('@stickers'.includes(searchVal)) {
        foundResults.push({ 
          type: 'bot', 
          data: { 
            id: 'bot_stickers', 
            name: 'Sticker Bot 🎨', 
            username: '@stickers', 
            avatarUrl: 'https://i.ibb.co/sd2MqGz2/Icon.png' 
          } 
        });
      }

      const chatQuery = query(collection(db!, 'chats'), where('username', '==', searchVal), limit(5));
      const userQuery = query(collection(db!, 'users'), where('username', '==', searchVal), limit(5));

      const [chatSnap, userSnap] = await Promise.all([getDocs(chatQuery), getDocs(userQuery)]);
      
      const foundChats = chatSnap.docs.map(d => ({ type: 'chat' as const, data: { id: d.id, ...d.data() } }));
      const foundUsers = userSnap.docs.map(d => ({ type: 'user' as const, data: { id: d.id, ...d.data() } })).filter(u => u.data.id !== user?.uid);

      setResults([...foundResults, ...foundChats, ...foundUsers]);
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const openBotChat = async () => {
    if (!db || !user) return;
    try {
      const q = query(collection(db!, 'chats'), where('username', '==', '@stickers'), where('participantIds', 'array-contains', user.uid), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setCurrentChatId(snap.docs[0].id);
      } else {
        const newChat = await addDoc(collection(db!, 'chats'), {
          type: 'private',
          participantIds: [user.uid, 'bot_stickers'],
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          name: 'Sticker Bot 🎨',
          username: '@stickers',
          avatarUrl: 'https://i.ibb.co/sd2MqGz2/Icon.png'
        });
        setCurrentChatId(newChat.id);
      }
      onOpenChange(false);
      setActiveView('chats');
    } catch (e) {
      console.error("Bot open error:", e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-white font-black uppercase italic tracking-tighter">Глобальный поиск</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
            <Input 
              placeholder="Поиск по @username..." 
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 text-lg"
              autoFocus
            />
            {isLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>}
          </div>
        </div>

        <ScrollArea className="h-[450px]">
          <div className="p-4 space-y-6">
            {searchQuery.trim().length >= 3 ? (
              <div className="space-y-3">
                {results.map((res, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] hover:bg-white/10 cursor-pointer" onClick={() => {
                    if (res.type === 'bot') openBotChat();
                    else { setCurrentChatId(res.data.id); onOpenChange(false); }
                  }}>
                    <div className="flex items-center gap-4">
                      <UserAvatar userId={res.type === 'user' ? res.data.id : null} manualAvatarUrl={res.data.avatarUrl} className="h-12 w-12" fallbackName={res.data.name} />
                      <div className="flex flex-col">
                        <span className="font-bold text-white flex items-center gap-2">
                          {res.data.name} 
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{res.data.username}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-primary/40" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2 text-primary">
                  <Zap className="w-4 h-4 fill-current" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Рекомендации Ядра</span>
                </div>
                <div className="space-y-2">
                  {trends.map(chat => (
                    <div key={chat.id} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] hover:bg-white/10 cursor-pointer" onClick={() => { setCurrentChatId(chat.id); onOpenChange(false); }}>
                      <div className="flex items-center gap-4">
                        <UserAvatar userId={null} manualAvatarUrl={chat.avatarUrl} className="h-12 w-12" fallbackName={chat.name} />
                        <div className="flex flex-col">
                          <span className="font-bold text-white flex items-center gap-2">{chat.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{chat.username}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-primary/40" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
