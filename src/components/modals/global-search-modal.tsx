
"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, limit, addDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, ArrowRight, Zap, Globe, MessageCircle, Star } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import type { User, Chat } from '@/lib/types';

/**
 * GLOBAL SEARCH 5.0: Исправлено раздвоение результатов и утечки приватности.
 */
export function GlobalSearchModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { user } = useUser();
  const db = useFirestore();
  const { setCurrentChatId, setActiveView, setIsInterceptionRequested } = useAppState();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<{ type: 'chat' | 'user' | 'bot', data: any }[]>([]);
  const [trends, setTrends] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: myProfile } = useDoc<User>(userRef);

  // Discovery Hub Logic: Только ПУБЛИЧНЫЕ чаты
  useEffect(() => {
    if (open && !searchQuery.trim() && db) {
      const fetchDiscoveryData = async () => {
        setIsLoading(true);
        try {
          const chatQ = query(
            collection(db!, 'chats'), 
            where('isPublic', '==', true), 
            limit(15)
          );
          const chatSnap = await getDocs(chatQ);
          const publicChats = chatSnap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
          setTrends(publicChats);
        } catch (e) {
          console.warn("Nuxus Discovery: Syncing...");
        } finally {
          setIsLoading(false);
        }
      };
      fetchDiscoveryData();
    }
  }, [open, searchQuery, db]);

  const handleChatClick = async (targetChat: Chat) => {
    if (!db || !user) return;
    setIsInterceptionRequested(false);
    setIsLoading(true);
    try {
      // Присоединяемся только если это публичная группа/канал
      if (targetChat.type !== 'private' && !targetChat.participantIds.includes(user.uid)) {
        await updateDoc(doc(db, 'chats', targetChat.id), {
          participantIds: arrayUnion(user.uid)
        });
      }
      setCurrentChatId(targetChat.id);
      onOpenChange(false);
      setActiveView('chats');
    } catch (e) {
      toast({ title: "Ошибка входа в узел", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const openPrivateChat = async (targetUser: User) => {
    if (!db || !user || !myProfile) return;
    setIsInterceptionRequested(false);
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'private'),
        where('participantIds', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find(d => {
        const pIds = d.data().participantIds;
        return pIds.includes(targetUser.id) && pIds.length === 2;
      });

      if (existing) {
        setCurrentChatId(existing.id);
      } else {
        const newChat = await addDoc(collection(db, 'chats'), {
          type: 'private',
          participantIds: [user.uid, targetUser.id],
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          name: targetUser.name,
          username: targetUser.username,
          avatarUrl: targetUser.avatarUrl || null,
          metadata: {
            [user.uid]: { name: myProfile.name, username: myProfile.username, avatarUrl: myProfile.avatarUrl },
            [targetUser.id]: { name: targetUser.name, username: targetUser.username, avatarUrl: targetUser.avatarUrl }
          }
        });
        setCurrentChatId(newChat.id);
      }
      onOpenChange(false);
      setActiveView('chats');
    } catch (e) {
      toast({ title: "Ошибка открытия чата", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchVal = val.startsWith('@') ? val.toLowerCase() : '@' + val.toLowerCase();
      const foundResults: any[] = [];

      // Боты
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

      // 1. Ищем только ПУБЛИЧНЫЕ чаты (группы/каналы)
      const chatQuery = query(
        collection(db!, 'chats'), 
        where('username', '==', searchVal), 
        where('isPublic', '==', true),
        limit(10)
      );
      
      // 2. Ищем пользователей
      const userQuery = query(
        collection(db!, 'users'), 
        where('username', '==', searchVal), 
        limit(10)
      );

      const [chatSnap, userSnap] = await Promise.all([getDocs(chatQuery), getDocs(userQuery)]);
      
      const foundChats = chatSnap.docs.map(d => ({ type: 'chat' as const, data: { id: d.id, ...d.data() } }));
      const foundUsers = userSnap.docs
        .map(d => ({ type: 'user' as const, data: { id: d.id, ...d.data() } }))
        .filter(u => u.data.id !== user?.uid); // Не показываем себя

      setResults([...foundResults, ...foundChats, ...foundUsers]);
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const openBotChat = async () => {
    if (!db || !user) return;
    setIsInterceptionRequested(false);
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
      <DialogContent className="max-w-md bg-card border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl h-[80vh] flex flex-col outline-none">
        <DialogHeader className="p-6 pb-0 shrink-0">
          <DialogTitle className="text-white font-black uppercase italic tracking-tighter text-xl">Signal Discovery</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-6 shrink-0">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Поиск по @username..." 
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 text-lg focus:border-primary/40 transition-all"
              autoFocus
            />
            {isLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {searchQuery.trim().length >= 2 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2 text-muted-foreground/60">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Результаты поиска</span>
                </div>
                {results.length > 0 ? results.map((res, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] hover:bg-white/10 cursor-pointer border border-white/5 active:scale-[0.98] transition-all" onClick={() => {
                    if (res.type === 'bot') openBotChat();
                    else if (res.type === 'user') openPrivateChat(res.data);
                    else handleChatClick(res.data);
                  }}>
                    <div className="flex items-center gap-4">
                      <UserAvatar userId={res.type === 'user' ? res.data.id : null} manualAvatarUrl={res.data.avatarUrl} className="h-12 w-12" fallbackName={res.data.name} />
                      <div className="flex flex-col">
                        <span className="font-bold text-white flex items-center gap-2">
                          {res.data.name} 
                          {res.data.isPremium && <Star className="w-3 h-3 text-accent fill-accent" />}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{res.data.username}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-primary/40" />
                  </div>
                )) : (
                  <div className="text-center py-10 opacity-40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Ничего не найдено</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Globe className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Discovery Hub</span>
                  </div>
                  <Zap className="w-3.5 h-3.5 text-accent animate-pulse fill-current" />
                </div>

                <div className="space-y-2">
                  {trends.map(chat => (
                    <div key={chat.id} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] hover:bg-white/10 cursor-pointer border border-white/5 active:scale-[0.98] transition-all" onClick={() => handleChatClick(chat)}>
                      <div className="flex items-center gap-4">
                        <UserAvatar userId={null} manualAvatarUrl={chat.avatarUrl} className="h-12 w-12" fallbackName={chat.name} />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{chat.name}</span>
                            <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full border border-primary/20 uppercase font-black">Public</span>
                          </div>
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
