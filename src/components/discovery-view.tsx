"use client"

import React, { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Zap, Users, Radio, Star, Globe, Plus, Sparkles, Activity } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { useAppState } from '@/lib/store';
import { cn, formatDisplayName } from '@/lib/utils';
import type { Chat, User } from '@/lib/types';

const ADMIN_ID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

/**
 * DiscoveryView V6.0
 * ОПТИМИЗИРОВАНО: Полная адаптивность баннера Milestone, Real-time фикс лидеров.
 */
export default function DiscoveryView() {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { setCurrentChatId, setActiveView, setInspectedUserId } = useAppState();
  
  const [search, setSearch] = useState('');

  // 1. Real-time Public Chats
  const publicChatsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'chats'), where('isPublic', '==', true), limit(20));
  }, [db]);
  const { data: publicChats } = useCollection<Chat>(publicChatsQuery);

  // 2. Real-time Leaders
  const topUsersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), orderBy('referralCount', 'desc'), limit(30));
  }, [db]);
  const { data: rawTopUsers } = useCollection<User>(topUsersQuery);

  // 3. Global Stats Stream
  const allUsersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'));
  }, [db]);
  const { data: allUsers } = useCollection<User>(allUsersQuery);

  // Leaderboard Logic: Admin ALWAYS at #1 V6.0
  const leaderboard = useMemo(() => {
    if (!rawTopUsers || !allUsers) return [];
    
    let list = [...rawTopUsers];
    const adminData = allUsers.find(u => u.id === ADMIN_ID);
    
    // Remove admin from list if present to re-insert at top
    list = list.filter(u => u.id !== ADMIN_ID);
    
    if (adminData) {
      list.unshift(adminData);
    }
    
    return list.slice(0, 12);
  }, [rawTopUsers, allUsers]);

  const totalNodes = allUsers?.length || 0;
  const goalPercentage = Math.min(100, (totalNodes / 100) * 100);

  const filteredChats = (publicChats || []).filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden max-w-full">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 shrink-0 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] -z-10" />
        
        <div className="flex items-center justify-between">
          <h1 className="text-[32px] font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            Discovery <span className="text-[10px] bg-primary/20 text-primary px-2.5 py-1 rounded-full border border-primary/30 not-italic tracking-[0.2em] font-black">HUB</span>
          </h1>
          <div className="bg-white/5 p-2 rounded-xl border border-white/10">
            <Globe className="w-6 h-6 text-primary animate-pulse" />
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Поиск по квантовым узлам..." 
            className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 text-lg focus:border-primary/40 transition-all placeholder:text-white/10 shadow-inner"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-10 pb-40 px-6 max-w-full overflow-x-hidden">
          
          {/* Top Nodes Section V6.0 */}
          <section className="space-y-5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/80 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 fill-current" /> Лидеры Ядра
              </h3>
            </div>
            <div className="flex gap-5 overflow-x-auto scrollbar-hide py-2 px-1">
              {leaderboard.map((u) => (
                <div 
                  key={u.id} 
                  onClick={() => setInspectedUserId(u.id)}
                  className="flex flex-col items-center gap-3 shrink-0 group cursor-pointer relative"
                >
                  <div className="relative">
                    {u.id === ADMIN_ID && (
                      <div className="absolute -inset-3 bg-primary/30 blur-xl rounded-full animate-pulse z-0" />
                    )}
                    <UserAvatar 
                      userId={u.id} 
                      className={cn(
                        "h-16 w-16 border-2 border-white/5 group-hover:border-primary/50 group-hover:scale-110 transition-all relative z-10",
                        u.id === ADMIN_ID && "border-primary shadow-[0_0_25px_rgba(168,85,247,0.6)]"
                      )} 
                      manualAvatarUrl={u.avatarUrl} 
                    />
                    {u.isPremium && (
                      <div className="absolute -bottom-1 -right-1 bg-accent rounded-full p-1 border-2 border-[#0a0a0c] z-20 shadow-xl">
                        <Star className="w-3 h-3 text-black fill-current" />
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-black truncate w-16 text-center uppercase tracking-tighter transition-colors",
                    u.id === ADMIN_ID ? "text-primary italic" : "text-white/60 group-hover:text-white"
                  )}>
                    {u.id === ADMIN_ID ? 'PRIME' : formatDisplayName(u.name).split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Activity Milestone Banner V6.0 FIX */}
          <div className="bg-primary/5 border border-primary/20 p-8 rounded-[3rem] text-center space-y-6 relative overflow-hidden shadow-2xl">
             <div className="absolute -top-10 -right-10 opacity-10 rotate-45 pointer-events-none">
                <Zap className="w-40 h-40 text-primary" />
             </div>
             
             <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="bg-primary/20 p-3 rounded-2xl border border-primary/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  <Zap className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <div className="space-y-1 px-2">
                  <h3 className="text-xl md:text-2xl font-black uppercase italic text-white tracking-tighter leading-tight break-words">
                    Nuxus Milestone
                  </h3>
                  <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.3em]">
                    Цель: 100 активных узлов
                  </p>
                </div>
             </div>

             <div className="w-full max-w-[320px] mx-auto space-y-4 relative z-10">
                <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 p-[1.5px] shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_20px_rgba(168,85,247,0.8)] transition-all duration-1000 ease-out rounded-full relative" 
                    style={{ width: `${goalPercentage}%` }} 
                  >
                    <div className="absolute inset-0 bg-white/20 animate-[scanline_2s_linear_infinite]" />
                  </div>
                </div>
                <div className="flex justify-between items-center px-2">
                   <span className="text-[13px] font-black text-white italic tabular-nums">{totalNodes} / 100</span>
                   <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] font-black text-primary uppercase tracking-widest">Live Sync</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Communities Section V6.0 */}
          <section className="space-y-5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/80 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Глобальные Каналы
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {filteredChats.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => { setCurrentChatId(chat.id); setActiveView('chats'); }}
                  className="flex items-center justify-between p-5 bg-white/[0.03] border border-white/5 rounded-[2.5rem] hover:bg-white/[0.07] hover:border-primary/30 transition-all cursor-pointer group shadow-xl"
                >
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="relative shrink-0">
                       <UserAvatar userId={null} className="h-14 w-14 rounded-2xl" manualAvatarUrl={chat.avatarUrl} fallbackName={chat.name} />
                       <div className="absolute -top-1 -right-1 bg-primary p-1.5 rounded-lg border-2 border-[#0a0a0c] shadow-lg">
                         {chat.type === 'channel' ? <Radio className="w-3 h-3 text-white" /> : <Users className="w-3 h-3 text-white" />}
                       </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-black text-white text-[16px] group-hover:text-primary transition-colors truncate italic italic tracking-tight">{chat.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-black truncate tracking-widest">{chat.username}</span>
                        <div className="h-1 w-1 rounded-full bg-white/10" />
                        <span className="text-[10px] text-primary/60 font-black uppercase">{chat.participantIds?.length || 0} узлов</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all shrink-0 ml-3">
                    <Plus className="w-6 h-6" />
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
