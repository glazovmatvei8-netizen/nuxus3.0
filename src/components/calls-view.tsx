"use client"

import React, { useState } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { Phone, Link as LinkIcon, Info, PhoneOff, Loader2, ArrowUpRight, ArrowDownLeft, ShieldCheck, Zap, Activity } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import { formatDisplayName, cn } from '@/lib/utils';
import type { Call, User } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

/**
 * CALL CENTER V29.0.0 «MISSION CONTROL»
 * ИСПРАВЛЕНО: Кнопки теперь функциональны. Добавлена генерация ссылок и поиск узлов.
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
    const link = `${window.location.origin}/?ref=${user.uid}&action=call`;
    navigator.clipboard.writeText(link);
    toast({ title: "Ссылка скопирована", description: "Отправьте её узлу для входящего сигнала." });
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[120px] pointer-events-none -z-10" />
      
      <div className="px-6 pt-10 pb-6 shrink-0 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col text-left">
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
              Центр <span className="text-[8px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20 tracking-widest font-black">CALL CENTER</span>
            </h1>
            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] ml-1 mt-1">Quantum Encryption Signal</p>
          </div>
          <div className="obsidian-glass p-3 rounded-2xl border-white/5 shadow-xl">
             <Activity className="w-6 h-6 text-primary animate-pulse" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
           <button 
             onClick={() => setIsSearchOpen(true)}
             className="flex flex-col items-center gap-3 p-6 obsidian-glass rounded-[2.2rem] border-white/5 hover:bg-primary/5 hover:border-primary/40 transition-all group shadow-2xl active:scale-95"
           >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-all">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <span className="text-[10px] font-black uppercase text-white tracking-widest italic">Позвонить</span>
           </button>
           
           <button 
             onClick={handleCreateCallLink}
             className="flex flex-col items-center gap-3 p-6 obsidian-glass rounded-[2.2rem] border-white/5 hover:bg-accent/5 hover:border-accent/40 transition-all group shadow-2xl active:scale-95"
           >
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20 group-hover:bg-accent/20 transition-all">
                <LinkIcon className="w-6 h-6 text-accent" />
              </div>
              <span className="text-[10px] font-black uppercase text-white tracking-widest italic">Ссылка</span>
           </button>
        </div>

        <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/5 shadow-inner">
           <button 
             onClick={() => setActiveTab('all')} 
             className={cn("flex-1 h-11 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", activeTab === 'all' ? "bg-primary text-white shadow-lg" : "text-white/40 hover:bg-white/5")}
           >
             Все вызовы
           </button>
           <button 
             onClick={() => setActiveTab('missed')} 
             className={cn("flex-1 h-11 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", activeTab === 'missed' ? "bg-red-500 text-white shadow-lg" : "text-white/40 hover:bg-white/5")}
           >
             Пропущенные
           </button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-1">
        <div className="px-5 space-y-3 pb-40 animate-in fade-in duration-700">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-40">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest">Синхронизация истории...</p>
            </div>
          ) : filteredCalls.length > 0 ? (
            filteredCalls.map(call => (
              <CallItem key={call.id} call={call} currentUserId={user?.uid} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-center space-y-6 opacity-20">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center animate-pulse">
                <PhoneOff className="w-10 h-10" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.5em]">Журнал пуст</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function CallItem({ call, currentUserId }: { call: Call, currentUserId?: string }) {
  const db = useFirestore();
  const otherId = call.callerId === currentUserId ? call.receiverId : call.callerId;
  const userRef = useMemoFirebase(() => (!db ? null : doc(db, 'users', otherId)), [db, otherId]);
  const { data: otherUser } = useDoc<User>(userRef);

  const isOutgoing = call.callerId === currentUserId;
  const isMissed = call.status === 'missed';

  const displayDate = React.useMemo(() => {
    try {
      return format(new Date(call.createdAt), 'dd MMM HH:mm');
    } catch (e) {
      return 'Недавно';
    }
  }, [call.createdAt]);

  return (
    <div className="p-4 obsidian-glass rounded-3xl border-white/5 hover:bg-white/[0.04] transition-all group relative overflow-hidden shadow-lg">
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative">
            <UserAvatar userId={otherId} className="h-14 w-14 border border-white/10" manualAvatarUrl={otherUser?.avatarUrl} fallbackName={otherUser?.name} />
            <div className={cn(
              "absolute -bottom-1 -right-1 p-1.5 rounded-lg border-2 border-[#0a0a0c] shadow-lg",
              isMissed ? "bg-red-500" : "bg-primary"
            )}>
              {isOutgoing ? <ArrowUpRight className="w-2.5 h-2.5 text-white" /> : <ArrowDownLeft className="w-2.5 h-2.5 text-white" />}
            </div>
          </div>
          
          <div className="flex flex-col min-w-0 text-left">
            <span className={cn("font-black text-base truncate italic tracking-tight uppercase", isMissed ? "text-red-400" : "text-white")}>
              {formatDisplayName(otherUser?.name)}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">{displayDate}</span>
               <div className="w-1 h-1 rounded-full bg-white/10" />
               <span className="text-[8px] font-black uppercase text-primary/60 tracking-widest">{isOutgoing ? 'Исходящий' : 'Входящий'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-white/5 border border-white/5 hover:bg-primary/20 hover:text-primary transition-all shadow-xl group-hover:scale-105 active:scale-90">
             <Phone className="w-5 h-5" />
           </Button>
        </div>
      </div>
      <div className="absolute top-0 right-0 p-4 opacity-[0.02] -z-0">
         <ShieldCheck className="w-16 h-16" />
      </div>
    </div>
  );
}
