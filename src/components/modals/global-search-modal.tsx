
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
  const [results, setResults] = useState<{ type: 'chat' | 'user' | 'bot' | 'pack', data: any }[]>([]);
  const [trends, setTrends] = useState<Chat[]>([]);
  const [featuredPacks, setFeaturedPacks] = useState<StickerPack[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: myProfile } = useDoc<User>(userRef);

  // Stable CDN URLs for Fox stickers (Kumi expression equivalents)
  // Using ultra-stable Google Static Assets
  const foxStickers = [
    'https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u1f98a/u1f98a_u1f60d.png',
    'https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u1f98a/u1f98a_u1f602.png',
    'https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u1f98a/u1f98a_u1f621.png',
    'https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u1f98a/u1f98a_u1f60e.png',
    'https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u1f98a/u1f98a_u1f634.png',
    'https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u1f98a/u1f98a_u1f973.png',
    'https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u1f98a/u1f98a_u1f607.png',
    'https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u1f98a/u1f98a_u1f618.png',
    'https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u1f98a/u1f98a_u1f914.png',
    'https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u1f98a/u1f98a_u1f62d.png',
    'https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u1f98a/u1f98a_u1f631.png',
    'https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u1f98a/u1f98a_u1f60b.png'
  ];

  useEffect(() => {
    if (open && db) {
      const initSystemPacks = async () => {
        // Updated ID to v3 to force refresh on all clients
        const foxPackId = 'system_fox_pack_v3';
        const packRef = doc(db, 'stickerPacks', foxPackId);
        await setDoc(packRef, {
          id: foxPackId,
          ownerId: 'system',
          name: 'Лиса 🦊',
          iconUrl: foxStickers[0],
          stickerUrls: foxStickers,
          createdAt: new Date().toISOString()
        }, { merge: true });
      };
      initSystemPacks();
    }
  }, [open, db]);

  useEffect(() => {
    if (open && !searchQuery.trim() && db) {
      const fetchDiscoveryData = async () => {
        setIsLoading(true);
        try {
          const chatQ = query(collection(db, 'chats'), where('isPublic', '==', true), limit(10));
          const chatSnap = await getDocs(chatQ);
          setTrends(chatSnap.docs.map(d => ({ id: d.id, ...d.data() } as Chat)));

          const packQ = query(collection(db, 'stickerPacks'), limit(10));
          const packSnap = await getDocs(packQ);
          setFeaturedPacks(packSnap.docs.map(d => ({ id: d.id, ...d.data() } as StickerPack)));
        } catch (e) {
          console.warn("Nuxus Discovery: Syncing data...");
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

      if ('@stickers'.includes(searchVal)) {
        foundResults.push({ type: 'bot', data: { id: 'bot_stickers', name: 'Sticker Pack Bot', username: '@stickers', avatarUrl: 'https://i.ibb.co/sd2MqGz2/Icon.png' } });
      }

      const chatQuery = query(collection(db!, 'chats'), where('username', '==', searchVal), limit(5));
      const userQuery = query(collection(db!, 'users'), where('username', '==', searchVal), limit(5));
      const packQuery = query(collection(db!, 'stickerPacks'), where('name', '>=', val), limit(5));

      const [chatSnap, userSnap, packSnap] = await Promise.all([getDocs(chatQuery), getDocs(userQuery), getDocs(packQuery)]);
      
      const foundChats = chatSnap.docs.map(d => ({ type: 'chat' as const, data: { id: d.id, ...d.data() } }));
      const foundUsers = userSnap.docs.map(d => ({ type: 'user' as const, data: { id: d.id, ...d.data() } })).filter(u => u.data.id !== user?.uid);
      const foundPacks = packSnap.docs.map(d => ({ type: 'pack' as const, data: { id: d.id, ...d.data() } }));

      setResults([...foundResults, ...foundPacks, ...foundChats, ...foundUsers]);
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallPack = async (pack: StickerPack) => {
    if (!db || !user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        installedStickerPackIds: arrayUnion(pack.id)
      });
      toast({ title: "Успех", description: `Стикерпак "${pack.name}" добавлен!` });
      onOpenChange(false);
    } catch (e) {}
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
              placeholder="Поиск по @username или пакам..." 
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="bg-white/5 border-white/5 h-14 rounded-2xl pl-12 text-lg"
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
                    if (res.type === 'pack') handleInstallPack(res.data);
                    else if (res.type === 'bot') { /* logic */ }
                    else if (res.type === 'chat') { setCurrentChatId(res.data.id); onOpenChange(false); }
                  }}>
                    <div className="flex items-center gap-4">
                      {res.type === 'pack' ? (
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                          <Sticker className="w-6 h-6 text-primary" />
                        </div>
                      ) : (
                        <UserAvatar userId={res.type === 'user' ? res.data.id : null} manualAvatarUrl={res.data.avatarUrl} className="h-12 w-12" fallbackName={res.data.name} />
                      )}
                      <div className="flex flex-col">
                        <span className="font-bold text-white flex items-center gap-2">
                          {res.data.name} 
                          {res.type === 'pack' && <Check className="w-3 h-3 text-green-500" />}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{res.type === 'pack' ? 'Стикерпак' : res.data.username}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-primary/40" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2 text-accent">
                    <Sticker className="w-4 h-4 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Витрина Стикеров</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {featuredPacks.map(pack => (
                      <div 
                        key={pack.id} 
                        onClick={() => handleInstallPack(pack)}
                        className="min-w-[140px] p-4 bg-white/5 rounded-[2rem] border border-white/5 hover:border-accent/40 transition-all cursor-pointer flex flex-col items-center gap-3 active:scale-95"
                      >
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/20">
                          {/* Standard img for Safari stability */}
                          <img src={pack.iconUrl || ''} className="w-full h-full object-cover" alt="Pack Icon" />
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] font-black text-white truncate w-24">{pack.name}</p>
                          <p className="text-[8px] text-accent uppercase font-black">Добавить</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2 text-primary">
                    <Zap className="w-4 h-4 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Рекомендации</span>
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
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
