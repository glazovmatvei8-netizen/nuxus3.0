
"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, limit, addDoc, orderBy } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, Radio, Users, Check, ArrowRight, X, User as UserIcon, Star, Sparkles, TrendingUp } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { cn, formatDisplayName, isUserPremium } from '@/lib/utils';
import type { Chat, User } from '@/lib/types';

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

  // Discover: Trending public chats
  const discoverQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'chats'),
      where('isPublic', '==', true),
      limit(10)
    );
  }, [db]);
  const { data: trendingChats } = useCollection<Chat>(discoverQuery);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchVal = val.startsWith('@') ? val.toLowerCase() : '@' + val.toLowerCase();
      
      // Query Chats
      const chatQuery = query(
        collection(db!, 'chats'),
        where('username', '==', searchVal),
        where('isPublic', '==', true),
        limit(5)
      );
      
      // Query Users
      const userQuery = query(
        collection(db!, 'users'),
        where('username', '==', searchVal),
        limit(5)
      );

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
        isPublic: false,
        name: targetUser.name,
        username: targetUser.username,
        metadata: {
          [user.uid]: { name: myProfile.name, username: myProfile.username, avatarUrl: myProfile.avatarUrl || null, isPremium: isUserPremium(myProfile) },
          [targetUser.id]: { name: targetUser.name, username: targetUser.username, avatarUrl: targetUser.avatarUrl || null, isPremium: isUserPremium(targetUser) }
        }
      };

      const docRef = await addDoc(collection(db, 'chats'), newChatData);
      setCurrentChatId(docRef.id);
      onOpenChange(false);
      setActiveView('chats');
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    }
  };

  const joinAndOpen = async (chat: Chat) => {
    if (!user || !db) return;
    
    try {
      if (!chat.participantIds.includes(user.uid)) {
        await updateDoc(doc(db, 'chats', chat.id), {
          participantIds: arrayUnion(user.uid)
        });
        toast({ title: "Успех", description: `Вы присоединились к ${chat.name}` });
      }
      
      setCurrentChatId(chat.id);
      setActiveView('chats');
      onOpenChange(false);
      setSearchQuery('');
      setResults([]);
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/90 backdrop-blur-2xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl font-black uppercase italic text-white tracking-tighter flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> Nuxus Discover
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Исследуйте глобальное пространство и находите новых людей
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
            <Input 
              placeholder="Введите @username или название..." 
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="bg-white/5 border-white/5 h-14 rounded-2xl pl-12 text-lg focus:border-primary/50 transition-all"
              autoFocus
            />
            {isLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="h-[450px] px-2">
          <div className="p-4 space-y-6">
            {searchQuery.length < 3 ? (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2 ml-2">
                  <TrendingUp className="w-3.5 h-3.5" /> Тренды сегодня
                </h3>
                {trendingChats?.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] border border-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                    onClick={() => joinAndOpen(item)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <UserAvatar userId={null} manualAvatarUrl={item.avatarUrl} className="h-14 w-14 border border-white/10" fallbackName={item.name} />
                      <div className="flex flex-col min-w-0">
                        <span className="font-black text-white text-lg truncate flex items-center gap-2">
                          {item.name}
                          {item.type === 'channel' ? <Radio className="w-3.5 h-3.5 text-accent" /> : <Users className="w-3.5 h-3.5 text-primary" />}
                        </span>
                        <span className="text-[11px] font-bold text-primary tracking-widest uppercase truncate">{item.username}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-6 h-6 text-primary/40 group-hover:text-primary transition-all" />
                  </div>
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                {results.map((res, idx) => {
                  const isChat = res.type === 'chat';
                  const item = res.data;
                  const isMember = isChat && user && item.participantIds.includes(user.uid);
                  
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] border border-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                      onClick={() => isChat ? joinAndOpen(item) : openUserChat(item)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <UserAvatar userId={isChat ? null : item.id} manualAvatarUrl={item.avatarUrl} className="h-14 w-14 border border-white/10" fallbackName={item.name} />
                        <div className="flex flex-col min-w-0">
                          <span className="font-black text-white text-lg truncate flex items-center gap-2">
                            {item.name}
                            {isChat ? (
                              item.type === 'channel' ? <Radio className="w-3.5 h-3.5 text-accent" /> : <Users className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              isUserPremium(item) && <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                            )}
                          </span>
                          <span className="text-[11px] font-bold text-primary tracking-widest uppercase truncate">{item.username}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                        {isMember ? <Check className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
                <X className="w-12 h-12 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Ничего не найдено</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
