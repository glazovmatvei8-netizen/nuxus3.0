"use client"

import React, { useState, useEffect } from 'react';
import { useAppState } from '@/lib/app-state';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { Phone, Link as LinkIcon, PhoneOff, Loader2, ArrowUpRight, ArrowDownLeft, ShieldCheck, Activity, UserPlus, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import { formatDisplayName, cn } from '@/lib/utils';
import type { Call, User } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

/**
 * CALL CENTER V92.0 «MIRROR ABSOLUTE»
 * В точности воссоздает интерфейс из референса.
 */
export default function CallsView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIsSearchOpen } = useAppState();
  const [activeTab, setActiveTab] = useState<'all' | 'missed'>('all');

  const callsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'calls'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  }, [db, user]);

  const { data: calls, isLoading } = useCollection<Call>(callsQuery);

  const filteredCalls = React.useMemo(() => {
    if (!calls) return [];
    if (activeTab === 'missed') return calls.filter(c => c.status === 'missed');
    return calls;
  }, [calls, activeTab]);

  const handleCreateCallLink = () => {
    if (!user) return;
    const link = `${window.location.origin}/?action=call&to=${user.uid}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link Created", description: "Signal invitation copied." });
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] overflow-hidden relative">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(229,142,56,0.05)_0%,transparent_50%)] pointer-events-none" />
      
      <ScrollArea className="flex-1 relative z-10">
        <div className="px-8 pt-16 pb-40 space-y-12">
          
          {/* HEADER: ЦЕНТР CALL CENTER */}
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
              ЦЕНТР
            </h1>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] italic">CALL CENTER</span>
               <div className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse" />
            </div>
          </div>
          
          {/* ACTION CARDS: SQUARE MODE */}
          <div className="grid grid-cols-2 gap-5">
             <button 
               onClick={() => setIsSearchOpen(true)}
               className="aspect-square flex flex-col items-center justify-center gap-4 p-4 bg-[#1C1C1E] border border-white/[0.03] rounded-[2.8rem] shadow-2xl transition-all active:scale-95 group relative overflow-hidden"
             >
                <div className="absolute inset-0 icon-glow-bg opacity-40" />
                <div className="relative z-10 w-14 h-14 flex items-center justify-center text-primary">
                  <Phone className="w-8 h-8 fill-current drop-shadow-[0_0_15px_rgba(229,142,56,0.6)]" />
                </div>
                <span className="relative z-10 text-[11px] font-black uppercase text-primary tracking-[0.1em] italic">ПОЗВОНИТЬ</span>
             </button>
             
             <button 
               onClick={handleCreateCallLink}
               className="aspect-square flex flex-col items-center justify-center gap-4 p-4 bg-[#1C1C1E] border border-white/[0.03] rounded-[2.8rem] shadow-2xl transition-all active:scale-95 group relative overflow-hidden"
             >
                <div className="absolute inset-0 icon-glow-bg opacity-40" />
                <div className="relative z-10 w-14 h-14 flex items-center justify-center text-primary">
                  <LinkIcon className="w-8 h-8 drop-shadow-[0_0_15px_rgba(229,142,56,0.6)]" />
                </div>
                <span className="relative z-10 text-[11px] font-black uppercase text-primary tracking-[0.1em] italic">CALL LINK</span>
             </button>
          </div>

          {/* TOGGLE TABS */}
          <div className="bg-[#1C1C1E]/50 border border-white/[0.05] p-1.5 rounded-[2rem] flex items-center">
             <button 
               onClick={() => setActiveTab('all')} 
               className={cn(
                 "flex-1 h-14 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all italic", 
                 activeTab === 'all' ? "bg-[#3A2518] text-primary shadow-xl border border-primary/10" : "text-muted-foreground hover:text-white"
               )}
             >
               Все вызовы
             </button>
             <button 
               onClick={() => setActiveTab('missed')} 
               className={cn(
                 "flex-1 h-14 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all italic", 
                 activeTab === 'missed' ? "bg-[#3A2518] text-red-500 shadow-xl border border-red-500/10" : "text-muted-foreground hover:text-white"
               )}
             >
               Пропущенные
             </button>
          </div>

          {/* LOADING STATE: REPLICATING THE SPINNER */}
          <div className="flex flex-col items-center justify-center py-10">
             {isLoading ? (
               <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
             ) : filteredCalls.length === 0 ? (
               <div className="w-10 h-10 border-2 border-white/5 border-t-white/10 rounded-full opacity-20" />
             ) : (
               <div className="w-full space-y-3">
                  {filteredCalls.map(call => (
                    <CallItem key={call.id} call={call} currentUserId={user?.uid} />
                  ))}
               </div>
             )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function CallItem({ call, currentUserId }: { call: Call, currentUserId?: string }) {
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const otherId = call.callerId === currentUserId ? call.receiverId : call.callerId;
  const userRef = useMemoFirebase(() => (!db ? null : doc(db, 'users', otherId)), [db, otherId]);
  const { data: otherUser } = useDoc<User>(userRef);

  const isOutgoing = call.callerId === currentUserId;
  const isMissed = call.status === 'missed';

  const displayDate = React.useMemo(() => {
    if (!mounted || !call.createdAt) return '';
    try {
      return format(new Date(call.createdAt), 'dd MMM HH:mm');
    } catch (e) {
<<<<<<< HEAD
=======
      console.error("Error formatting call date in calls-view:", e);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      return 'Недавно';
    }
  }, [call.createdAt, mounted]);

  return (
    <div className="p-5 bg-[#1C1C1E]/40 rounded-[2rem] border border-white/[0.03] flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <UserAvatar userId={otherId} className="h-12 w-12 border border-white/5" manualAvatarUrl={otherUser?.avatarUrl} fallbackName={otherUser?.name} />
        <div className="flex flex-col text-left">
          <span className={cn("font-bold text-[15px] italic uppercase tracking-tight", isMissed ? "text-red-400" : "text-white")}>
            {formatDisplayName(otherUser?.name, otherUser?.username)}
          </span>
          <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest mt-0.5">{displayDate}</span>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 text-muted-foreground group-hover:text-primary transition-all">
        <Phone className="w-5 h-5" />
      </Button>
    </div>
  );
}