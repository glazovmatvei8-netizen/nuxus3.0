"use client"

import React, { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Zap, Users, Radio, Star, Globe, Plus, Sparkles, Activity, Target, ShieldCheck } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { useAppState } from '@/lib/store';
import { cn, formatDisplayName } from '@/lib/utils';
import type { Chat, User } from '@/lib/types';

const ADMIN_ID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

/**
 * DiscoveryView V6.5 (Nova UI)
 * ОПТИМИЗИРОВАНО: Ультра-адаптивный баннер Milestone, элитный лидерборд.
 */
export default function DiscoveryView() {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { setCurrentChatId, setActiveView, setInspectedUserId } = useAppState();
  
  const [search, setSearch] = useState('');

  const publicChatsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'chats'), where('isPublic', '==', true), limit(20));
  }, [db]);
  const { data: publicChats } = useCollection<Chat>(publicChatsQuery);

  const topUsersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), orderBy('referralCount', 'desc'), limit(30));
  }, [db]);
  const { data: rawTopUsers } = useCollection<User>(topUsersQuery);

  const allUsersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'));
  }, [db]);
  const { data: allUsers } = useCollection<User>(allUsersQuery);

  const leaderboard = useMemo(() => {
    if (!rawTopUsers || !allUsers) return [];
    
    let list = [...rawTopUsers];
    const adminData = allUsers.find(u => u.id === ADMIN_ID);
    
    list = list.filter(u => u.id !== ADMIN_ID);
    if (adminData) {
      list.unshift(adminData);
    }
    
    return list.slice(0, 15);
  }, [rawTopUsers, allUsers]);

  const totalNodes = allUsers?.length || 0;
  const goalPercentage = Math.min(100, (totalNodes / 100) * 100);

  const filteredChats = (publicChats || []).filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden max-w-full relative">
      {/* Dynamic Aura Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none -z-10 animate-pulse" />
      
      <div className="px-6 pt-10 pb-6 shrink-0 space-y-8 relative">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
              Discovery <span className="text-[10px] bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/30 not-italic tracking-[0.2em] font-black">CORE</span>
            </h1>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] ml-1 mt-1">Quantum Signal Analysis</p>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 shadow-xl">
            <Globe className="w-6 h-6 text-primary animate-[spin_10s_linear_infinite]" />
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search Nodes & Communities..." 
            className="bg-white/[0.03] border-white/[0.08] h-14 rounded-2xl pl-12 text-lg focus:border-primary/40 transition-all placeholder:text-white/10 shadow-2xl"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-1">
        <div className="space-y-12 pb-40 px-5 max-w-full overflow-x-hidden">
          
          {/* Elite Leaderboard V6.5 */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/80 flex items-center gap-2 italic">
                <Sparkles className="w-3.5 h-3.5 fill-current" /> Node Leaders
              </h3>
            </div>
            <div className="flex gap-5 overflow-x-auto scrollbar-hide py-4 px-1 -mx-2">
              {leaderboard.map((u) => (
                <div 
                  key={u.id} 
                  onClick={() => setInspectedUserId(u.id)}
                  className="flex flex-col items-center gap-3 shrink-0 group cursor-pointer relative"
                >
                  <div className="relative">
                    {u.id === ADMIN_ID ? (
                      <div className="absolute -inset-3 bg-primary/40 blur-2xl rounded-full animate-pulse z-0" />
                    ) : u.isPremium && (
                      <div className="absolute -inset-2 bg-accent/20 blur-xl rounded-full z-0" />
                    )}
                    <UserAvatar 
                      userId={u.id} 
                      className={cn(
                        "h-16 w-16 border-2 border-white/5 group-hover:scale-110 transition-all relative z-10",
                        u.id === ADMIN_ID && "border-primary shadow-[0_0_30px_rgba(168,85,247,0.8)]"
                      )} 
                      manualAvatarUrl={u.avatarUrl} 
                    />
                  </div>
                  <span className={cn(
                    "text-[10px] font-black truncate w-20 text-center uppercase tracking-tighter italic transition-colors",
                    u.id === ADMIN_ID ? "text-primary" : "text-white/50 group-hover:text-white"
                  )}>
                    {u.id === ADMIN_ID ? 'PRIME NODE' : formatDisplayName(u.name).split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* HUD Milestone Banner V6.5 */}
          <div className="relative group overflow-hidden rounded-[3rem] p-[2px] bg-gradient-to-br from-white/10 to-transparent">
             <div className="bg-[#0a0a0c]/90 backdrop-blur-2xl p-8 rounded-[3rem] text-center space-y-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                   <Target className="w-40 h-40 text-primary rotate-12" />
                </div>
                
                <div className="relative z-10 flex flex-col items-center gap-5">
                   <div className="bg-primary/20 p-4 rounded-[1.8rem] border border-primary/30 shadow-[0_0_40px_rgba(168,85,247,0.4)] animate-pulse">
                     <ShieldCheck className="w-8 h-8 text-primary" />
                   </div>
                   <div className="space-y-1">
                     <h3 className="text-2xl font-black uppercase italic text-white tracking-tighter leading-tight drop-shadow-lg">
                       Nuxus Milestone
                     </h3>
                     <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.5em] ml-1">
                       Target: 100 Active Nodes
                     </p>
                   </div>
                </div>

                <div className="w-full max-w-[340px] mx-auto space-y-5 relative z-10">
                   <div className="h-4 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.06] p-[2px] shadow-inner">
                     <div 
                       className="h-full bg-gradient-to-r from-primary via-accent to-primary shadow-[0_0_25px_rgba(168,85,247,0.9)] transition-all duration-1500 ease-out rounded-full relative" 
                       style={{ width: `${goalPercentage}%` }} 
                     >
                       <div className="absolute inset-0 bg-white/20 animate-[scanline_3s_linear_infinite]" />
                     </div>
                   </div>
                   <div className="flex justify-between items-center px-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-white italic tabular-nums">{totalNodes}</span>
                        <span className="text-[10px] font-black text-white/30 uppercase">/ 100</span>
                      </div>
                      <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                         <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Active Sync</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Communities Hub V6.5 */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/80 flex items-center gap-2 italic">
                <Users className="w-3.5 h-3.5" /> Public Signals
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {filteredChats.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => { setCurrentChatId(chat.id); setActiveView('chats'); }}
                  className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/[0.04] rounded-[2.8rem] hover:bg-white/[0.06] hover:border-primary/30 transition-all cursor-pointer group shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-5 min-w-0 relative z-10">
                    <div className="relative shrink-0">
                       <UserAvatar userId={null} className="h-14 w-14 rounded-[1.4rem]" manualAvatarUrl={chat.avatarUrl} fallbackName={chat.name} />
                       <div className="absolute -top-1 -right-1 bg-primary p-1.5 rounded-xl border-2 border-[#0a0a0c] shadow-lg group-hover:scale-110 transition-transform">
                         {chat.type === 'channel' ? <Radio className="w-3 h-3 text-white" /> : <Users className="w-3 h-3 text-white" />}
                       </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-black text-white text-lg group-hover:text-primary transition-colors truncate italic tracking-tighter leading-none">{chat.name}</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-primary font-black uppercase tracking-widest">{chat.username}</span>
                        <div className="h-1 w-1 rounded-full bg-white/20" />
                        <span className="text-[10px] text-white/30 font-bold uppercase">{chat.participantIds?.length || 0} Nodes</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-[1.4rem] bg-white/5 border border-white/5 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all shrink-0 ml-3 relative z-10">
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
