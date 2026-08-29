
"use client"

import React, { useState, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Globe, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { useAppState } from '@/lib/app-state';
import { cn, formatDisplayName, isUserPremium } from '@/lib/utils';
import type { Chat, User } from '@/lib/types';

const ADMIN_ID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

export default function DiscoveryView() {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { setCurrentChatId, setActiveView, setInspectedUserId } = useAppState();
  
  const [search, setSearch] = useState('');

  const publicChatsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'chats'), where('isPublic', '==', true), limit(20));
  }, [db]);
  const { data: publicChats } = useCollection<Chat>(publicChatsQuery);

  const topUsersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'users'), orderBy('referralCount', 'desc'), limit(30));
  }, [db]);
  const { data: rawTopUsers } = useCollection<User>(topUsersQuery);

  const allUsersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'users'));
  }, [db]);
  const { data: allUsers } = useCollection<User>(allUsersQuery);

  const leaderboard = useMemo(() => {
    if (!rawTopUsers || !allUsers) return [];
    let list = rawTopUsers.filter(u => isUserPremium(u));
    const adminData = allUsers.find(u => u.id === ADMIN_ID);
    list = list.filter(u => u.id !== ADMIN_ID);
    if (adminData) list.unshift(adminData);
    return list.slice(0, 15);
  }, [rawTopUsers, allUsers]);

  const totalNodes = allUsers?.length || 0;
  const goalPercentage = Math.min(100, (totalNodes / 100) * 100);

  const filteredChats = (publicChats || []).filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden max-w-full relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none -z-10" />
      
      <div className="px-6 pt-10 pb-6 shrink-0 space-y-6 relative z-20 bg-[#0a0a0c]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col text-left">
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
              Навигатор <span className="text-[8px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20 tracking-widest font-black">АКТИВЕН</span>
            </h1>
            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] ml-1 mt-1">Квантовая навигация</p>
          </div>
          <div className="obsidian-glass p-3 rounded-2xl border-white/5 shadow-xl">
            <Globe className="w-6 h-6 text-primary/60 animate-[spin_20s_linear_infinite]" />
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Сканировать пространство..." 
            className="bg-white/[0.02] border-white/[0.05] h-12 rounded-2xl pl-12 text-sm font-bold tracking-tight focus:border-primary/50 transition-all shadow-inner"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-0.5">
        <div className="space-y-8 pb-32 px-6 max-w-full overflow-x-hidden animate-in fade-in duration-700">
          
          <div className="relative overflow-hidden rounded-[2.5rem] p-[1px] bg-gradient-to-br from-white/10 to-transparent">
             <div className="bg-[#05050a]/95 backdrop-blur-3xl p-5 sm:p-6 rounded-[2.5rem] text-center space-y-5 relative overflow-hidden shadow-xl">
                <div className="relative z-10 flex flex-col items-center gap-3">
                   <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-lg">
                     <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                   </div>
                   <div className="space-y-1">
                     <h3 className="text-lg sm:text-xl font-black uppercase italic text-white tracking-tighter leading-tight">Миссия Nuxus</h3>
                     <p className="text-[7px] sm:text-[8px] font-black text-primary/50 uppercase tracking-[0.2em]">Цель глобальной синхронизации</p>
                   </div>
                </div>

                <div className="w-full max-w-[280px] mx-auto space-y-4 relative z-10">
                   <div className="h-2.5 bg-white/[0.03] rounded-full overflow-hidden border border-white/5 p-[1px]">
                     <div 
                       className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_10px_rgba(168,85,247,0.8)] transition-all duration-1500 rounded-full" 
                       style={{ width: `${goalPercentage}%` }} 
                     />
                   </div>
                   <div className="flex justify-between items-center px-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg sm:text-xl font-black text-white italic tabular-nums">{totalNodes}</span>
                        <span className="text-[7px] sm:text-[9px] font-black text-white/20 uppercase">/ 100</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                         <div className="w-1 h-1 rounded-full bg-green-500" />
                         <span className="text-[6px] sm:text-[7px] font-black text-green-500 uppercase">Synced</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <section className="space-y-5">
            <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/60 flex items-center gap-2 px-1">
              <Sparkles className="w-3 h-3 fill-current" /> Прайм-Узлы
            </h3>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2 px-1 -mx-4">
              {leaderboard.length > 0 ? leaderboard.map((u) => (
                <div 
                  key={u.id} 
                  onClick={() => setInspectedUserId(u.id)}
                  className="flex flex-col items-center gap-2.5 shrink-0 group cursor-pointer relative"
                >
                  <UserAvatar 
                    userId={u.id} 
                    className={cn(
                      "h-14 w-14 border border-white/5 group-hover:scale-105 transition-all relative z-10 obsidian-glass",
                      u.id === ADMIN_ID && "border-primary/40 shadow-lg shadow-primary/20"
                    )} 
                    manualAvatarUrl={u.avatarUrl} 
                  />
                  <span className={cn(
                    "text-[9px] font-black truncate w-16 text-center tracking-tight italic",
                    u.id === ADMIN_ID ? "text-primary" : "text-white/40 group-hover:text-white"
                  )}>
                    {u.id === ADMIN_ID ? 'СОЗДАТЕЛЬ' : formatDisplayName(u.name).split(' ')[0]}
                  </span>
                </div>
              )) : null}
            </div>
          </section>

          <section className="space-y-5">
            <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/60 flex items-center gap-2 px-1">
              <LayoutGrid className="w-3 h-3" /> Кластеры
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {filteredChats.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => { setCurrentChatId(chat.id); setActiveView('chats'); }}
                  className="flex items-center justify-between p-4 obsidian-glass rounded-3xl hover:bg-white/[0.04] transition-all cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center gap-4 min-w-0 text-left">
                    <UserAvatar userId={null} className="h-12 w-12 rounded-2xl border-white/10" manualAvatarUrl={chat.avatarUrl} fallbackName={chat.name} />
                    <div className="flex flex-col min-w-0 gap-0.5">
                      <span className="font-black text-white text-[15px] truncate italic tracking-tighter uppercase">{chat.name}</span>
                      <span className="text-[9px] text-primary font-black tracking-widest">{chat.username}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

function LayoutGrid(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
  )
}
