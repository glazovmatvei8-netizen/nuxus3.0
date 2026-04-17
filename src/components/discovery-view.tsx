
"use client"

import React, { useState, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Compass, Search, Zap, Users, Radio, ArrowRight, Star, TrendingUp, Globe, Plus } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { useAppState } from '@/lib/store';
import { cn, formatDisplayName } from '@/lib/utils';
import type { Chat, User } from '@/lib/types';

export default function DiscoveryView() {
  const db = useFirestore();
  const { user } = useUser();
  const { setCurrentChatId, setActiveView, setInspectedUserId } = useAppState();
  
  const [search, setSearch] = useState('');
  const [publicChats, setPublicChats] = useState<Chat[]>([]);
  const [topUsers, setTopUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!db) return;
      setIsLoading(true);
      try {
        // Fetch Public Chats
        const chatQ = query(collection(db, 'chats'), where('isPublic', '==', true), limit(10));
        const chatSnap = await getDocs(chatQ);
        setPublicChats(chatSnap.docs.map(d => ({ id: d.id, ...d.data() } as Chat)));

        // Fetch "Top Nodes" (Users with high referral count or recent activity)
        const userQ = query(collection(db, 'users'), orderBy('referralCount', 'desc'), limit(8));
        const userSnap = await getDocs(userQ);
        setTopUsers(userSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
      } catch (e) {
        console.warn("Discovery Engine: Signal Lost");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [db]);

  const filteredChats = publicChats.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-6 pt-8 pb-4 shrink-0 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[32px] font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            Discovery <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20 not-italic">HUB</span>
          </h1>
          <Globe className="w-6 h-6 text-primary animate-pulse" />
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Поиск сообществ и людей..." 
            className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 text-lg focus:border-primary/40 transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-6">
        <div className="space-y-10 pb-40">
          
          {/* Top Nodes Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                <Star className="w-3 h-3 fill-current" /> Лидеры Ядра
              </h3>
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2">
              {topUsers.map(u => (
                <div 
                  key={u.id} 
                  onClick={() => setInspectedUserId(u.id)}
                  className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer"
                >
                  <div className="relative">
                    <UserAvatar userId={u.id} className="h-16 w-16 border-2 border-white/5 group-hover:border-primary/40 transition-all" manualAvatarUrl={u.avatarUrl} />
                    {u.isPremium && <div className="absolute -bottom-1 -right-1 bg-accent rounded-full p-0.5 border-2 border-[#0a0a0c]"><Star className="w-2.5 h-2.5 text-black fill-current" /></div>}
                  </div>
                  <span className="text-[10px] font-bold text-white/80 truncate w-16 text-center">{formatDisplayName(u.name).split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Communities Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                <Users className="w-3 h-3" /> Популярные Сообщества
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {filteredChats.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => { setCurrentChatId(chat.id); setActiveView('chats'); }}
                  className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-[2rem] hover:bg-white/10 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                       <UserAvatar userId={null} className="h-12 w-12 rounded-[1.2rem]" manualAvatarUrl={chat.avatarUrl} fallbackName={chat.name} />
                       <div className="absolute -top-1 -right-1 bg-primary p-1 rounded-lg border-2 border-[#0a0a0c]">
                         {chat.type === 'channel' ? <Radio className="w-2 h-2 text-white" /> : <Users className="w-2 h-2 text-white" />}
                       </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-[15px] group-hover:text-primary transition-colors">{chat.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-black">{chat.username} • {chat.participantIds?.length || 0} узлов</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full group-hover:bg-primary group-hover:text-white transition-all">
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Activity Placeholder */}
          <div className="bg-primary/10 border border-primary/20 p-8 rounded-[2.5rem] text-center space-y-4 relative overflow-hidden">
             <Zap className="w-12 h-12 text-primary mx-auto animate-pulse" />
             <div className="space-y-1">
               <h3 className="text-lg font-black uppercase italic text-white">Nuxus Milestone</h3>
               <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Цель: 100 активных узлов</p>
             </div>
             <div className="h-2 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-primary shadow-[0_0_15px_rgba(168,85,247,0.6)]" style={{ width: '33%' }} />
             </div>
             <p className="text-[9px] text-muted-foreground uppercase font-bold px-4">Приглашайте друзей через Signal QR и получайте статус Elite Node!</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
