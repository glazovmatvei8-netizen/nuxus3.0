"use client"

import React, { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Zap, Users, Radio, Star, Globe, Plus, Sparkles, Activity, Target, ShieldCheck, ArrowRight } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { useAppState } from '@/lib/store';
import { cn, formatDisplayName } from '@/lib/utils';
import type { Chat, User } from '@/lib/types';

const ADMIN_ID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

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
    <div className="flex flex-col h-full bg-transparent overflow-hidden max-w-full relative">
      {/* Background Ambience V7.5 */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/5 blur-[120px] pointer-events-none -z-10" />
      
      <div className="px-8 pt-12 pb-8 shrink-0 space-y-10 relative">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
              Navigator <span className="text-[10px] bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/30 not-italic tracking-[0.3em] font-black">ACTIVE</span>
            </h1>
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em] ml-1 mt-2">Quantum Sector Discovery</p>
          </div>
          <div className="obsidian-glass p-4 rounded-[1.8rem] border-white/10 shadow-2xl">
            <Globe className="w-8 h-8 text-primary animate-[spin_15s_linear_infinite]" />
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search Nodes..." 
            className="bg-white/[0.03] border-white/[0.1] h-16 rounded-[1.8rem] pl-14 text-lg font-bold tracking-tight focus:border-primary/50 transition-all placeholder:text-white/10 shadow-inner"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-1">
        <div className="space-y-14 pb-48 px-7 max-w-full overflow-x-hidden animate-in fade-in slide-in-from-bottom-6 duration-1000">
          
          {/* Milestone Banner V7.5 «Mission Control» */}
          <div className="relative group overflow-hidden rounded-[3.5rem] p-[2px] bg-gradient-to-br from-white/10 via-primary/20 to-transparent">
             <div className="bg-[#05050a]/90 backdrop-blur-3xl p-10 rounded-[3.5rem] text-center space-y-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                   <Target className="w-48 h-48 text-primary rotate-12" />
                </div>
                
                <div className="relative z-10 flex flex-col items-center gap-6">
                   <div className="bg-primary/20 p-5 rounded-[2.2rem] border border-primary/30 shadow-[0_0_50px_rgba(168,85,247,0.5)] animate-pulse">
                     <ShieldCheck className="w-10 h-10 text-primary" />
                   </div>
                   <div className="space-y-2">
                     <h3 className="text-3xl font-black uppercase italic text-white tracking-tighter leading-tight drop-shadow-2xl">
                       Nuxus Milestone
                     </h3>
                     <p className="text-[10px] font-black text-primary/70 uppercase tracking-[0.6em] ml-1">
                       Mission: 100 Active Nodes
                     </p>
                   </div>
                </div>

                <div className="w-full max-w-[360px] mx-auto space-y-6 relative z-10">
                   <div className="h-5 bg-white/[0.04] rounded-full overflow-hidden border border-white/10 p-[2px] shadow-inner">
                     <div 
                       className="h-full bg-gradient-to-r from-primary via-accent to-primary shadow-[0_0_30px_rgba(168,85,247,1)] transition-all duration-1500 ease-out rounded-full relative" 
                       style={{ width: `${goalPercentage}%` }} 
                     >
                       <div className="absolute inset-0 bg-white/20 animate-[scanline_2s_linear_infinite]" />
                     </div>
                   </div>
                   <div className="flex justify-between items-center px-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white italic tabular-nums">{totalNodes}</span>
                        <span className="text-[11px] font-black text-white/20 uppercase">/ 100</span>
                      </div>
                      <div className="flex items-center gap-2.5 bg-green-500/10 px-4 py-1.5 rounded-full border border-green-500/20">
                         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]" />
                         <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Stable Sync</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Leaders Section V7.5 */}
          <section className="space-y-8">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-primary/80 flex items-center gap-3 italic">
                <Sparkles className="w-4 h-4 fill-current" /> Prime Nodes
              </h3>
            </div>
            <div className="flex gap-6 overflow-x-auto scrollbar-hide py-4 px-2 -mx-4">
              {leaderboard.map((u) => (
                <div 
                  key={u.id} 
                  onClick={() => setInspectedUserId(u.id)}
                  className="flex flex-col items-center gap-4 shrink-0 group cursor-pointer relative"
                >
                  <div className="relative">
                    {u.id === ADMIN_ID ? (
                      <div className="absolute -inset-4 bg-primary/40 blur-3xl rounded-full animate-pulse z-0" />
                    ) : u.isPremium && (
                      <div className="absolute -inset-3 bg-accent/20 blur-2xl rounded-full z-0" />
                    )}
                    <UserAvatar 
                      userId={u.id} 
                      className={cn(
                        "h-20 w-20 border-2 border-white/10 group-hover:scale-110 group-hover:border-primary/50 transition-all relative z-10 obsidian-glass",
                        u.id === ADMIN_ID && "border-primary shadow-[0_0_40px_rgba(168,85,247,1)]"
                      )} 
                      manualAvatarUrl={u.avatarUrl} 
                    />
                  </div>
                  <span className={cn(
                    "text-[11px] font-black truncate w-24 text-center uppercase tracking-tight italic transition-all group-hover:scale-110",
                    u.id === ADMIN_ID ? "text-primary drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" : "text-white/60 group-hover:text-white"
                  )}>
                    {u.id === ADMIN_ID ? 'SYSTEM ROOT' : formatDisplayName(u.name).split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Community Feed V7.5 */}
          <section className="space-y-8">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-primary/80 flex items-center gap-3 italic">
                <Users className="w-4 h-4" /> Global Clusters
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {filteredChats.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => { setCurrentChatId(chat.id); setActiveView('chats'); }}
                  className="flex items-center justify-between p-6 obsidian-glass rounded-[3rem] hover:bg-white/[0.06] hover:border-primary/50 transition-all cursor-pointer group shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="flex items-center gap-6 min-w-0 relative z-10">
                    <div className="relative shrink-0">
                       <UserAvatar userId={null} className="h-16 w-16 rounded-[1.6rem] border-white/10" manualAvatarUrl={chat.avatarUrl} fallbackName={chat.name} />
                       <div className="absolute -top-1 -right-1 bg-primary p-2 rounded-xl border-2 border-[#0a0a0c] shadow-2xl group-hover:scale-125 transition-transform">
                         {chat.type === 'channel' ? <Radio className="w-4 h-4 text-white" /> : <Users className="w-4 h-4 text-white" />}
                       </div>
                    </div>
                    <div className="flex flex-col min-w-0 gap-1.5">
                      <span className="font-black text-white text-xl group-hover:text-primary transition-colors truncate italic tracking-tighter leading-none">{chat.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-primary font-black uppercase tracking-[0.2em]">{chat.username}</span>
                        <div className="h-1 w-1 rounded-full bg-white/20" />
                        <span className="text-[10px] text-white/40 font-bold uppercase">{chat.participantIds?.length || 0} LINKED</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-14 w-14 rounded-[1.6rem] bg-white/5 border border-white/10 group-hover:bg-primary group-hover:text-white group-hover:border-primary/50 transition-all shrink-0 ml-4 relative z-10 shadow-xl">
                    <ArrowRight className="w-7 h-7" />
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