
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

const ADMIN_ID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

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

        // Fetch "Top Nodes" and force Admin to Top 1
        const userQ = query(collection(db, 'users'), orderBy('referralCount', 'desc'), limit(12));
        const userSnap = await getDocs(userQ);
        let usersList = userSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
        
        // Hoist the Admin
        const adminIndex = usersList.findIndex(u => u.id === ADMIN_ID);
        if (adminIndex > -1) {
          const adminObj = usersList.splice(adminIndex, 1)[0];
          usersList = [adminObj, ...usersList];
        } else {
          // If admin was not in top 12, fetch it manually (rare case)
          // But usually admin should be in the list.
        }

        setTopUsers(usersList.slice(0, 10));
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
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden max-w-full">
      <div className="px-6 pt-8 pb-4 shrink-0 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] md:text-[32px] font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            Discovery <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20 not-italic">HUB</span>
          </h1>
          <Globe className="w-6 h-6 text-primary animate-pulse" />
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Поиск сообществ и людей..." 
            className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 text-lg focus:border-primary/40 transition-all placeholder:text-muted-foreground/30"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-10 pb-40 px-6 max-w-full overflow-hidden">
          
          {/* Top Nodes Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                <Star className="w-3 h-3 fill-current" /> Лидеры Ядра
              </h3>
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2 px-1">
              {topUsers.map((u, idx) => (
                <div 
                  key={u.id} 
                  onClick={() => setInspectedUserId(u.id)}
                  className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer relative"
                >
                  <div className="relative">
                    {u.id === ADMIN_ID && (
                      <div className="absolute -inset-2 bg-primary/20 blur-md rounded-full animate-pulse z-0" />
                    )}
                    <UserAvatar 
                      userId={u.id} 
                      className={cn(
                        "h-16 w-16 border-2 border-white/5 group-hover:border-primary/40 transition-all relative z-10",
                        u.id === ADMIN_ID && "border-primary shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                      )} 
                      manualAvatarUrl={u.avatarUrl} 
                    />
                    {u.isPremium && (
                      <div className="absolute -bottom-1 -right-1 bg-accent rounded-full p-0.5 border-2 border-[#0a0a0c] z-20 shadow-lg">
                        <Star className="w-2.5 h-2.5 text-black fill-current" />
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold truncate w-16 text-center",
                    u.id === ADMIN_ID ? "text-primary" : "text-white/80"
                  )}>
                    {u.id === ADMIN_ID ? 'ADMIN' : formatDisplayName(u.name).split(' ')[0]}
                  </span>
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
                  className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-[2rem] hover:bg-white/10 transition-all cursor-pointer group overflow-hidden"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative shrink-0">
                       <UserAvatar userId={null} className="h-12 w-12 rounded-[1.2rem]" manualAvatarUrl={chat.avatarUrl} fallbackName={chat.name} />
                       <div className="absolute -top-1 -right-1 bg-primary p-1 rounded-lg border-2 border-[#0a0a0c]">
                         {chat.type === 'channel' ? <Radio className="w-2.5 h-2.5 text-white" /> : <Users className="w-2.5 h-2.5 text-white" />}
                       </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-white text-[15px] group-hover:text-primary transition-colors truncate">{chat.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-black truncate">{chat.username} • {chat.participantIds?.length || 0} узлов</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full group-hover:bg-primary group-hover:text-white transition-all shrink-0 ml-2">
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Activity Placeholder */}
          <div className="bg-primary/10 border border-primary/20 p-6 md:p-8 rounded-[2.5rem] text-center space-y-4 relative overflow-hidden">
             <Zap className="w-10 h-10 text-primary mx-auto animate-pulse" />
             <div className="space-y-1">
               <h3 className="text-base md:text-lg font-black uppercase italic text-white tracking-tighter">Nuxus Milestone</h3>
               <p className="text-[9px] md:text-[10px] font-bold text-primary/60 uppercase tracking-[0.2em]">Цель: 100 активных узлов</p>
             </div>
             <div className="w-full max-w-[240px] mx-auto space-y-3">
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-primary shadow-[0_0_15px_rgba(168,85,247,0.6)] transition-all duration-1000" style={{ width: '33%' }} />
                </div>
                <p className="text-[8px] md:text-[9px] text-muted-foreground uppercase font-black px-2 leading-relaxed">
                  Приглашайте друзей через <span className="text-primary">Signal QR</span> и расширяйте влияние своего узла в Ядре!
                </p>
             </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
