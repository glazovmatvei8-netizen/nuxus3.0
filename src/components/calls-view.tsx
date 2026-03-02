
"use client"

import React, { useState } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { Phone, Link, Info, PhoneOff, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import { formatDisplayName, cn } from '@/lib/utils';
import type { Call, User } from '@/lib/types';
import { format } from 'date-fns';

export default function CallsView() {
  const { user } = useUser();
  const db = useFirestore();
  const [activeTab, setActiveTab] = useState<'all' | 'missed'>('all');

  const callsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    // Звонки теперь общедоступны для всех пользователей
    return query(
      collection(db, 'calls'),
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

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-6 pb-2 shrink-0">
        <h1 className="text-[32px] font-black text-white tracking-tight mb-6">Звонки</h1>
        
        {/* Action Buttons styled like iOS screenshot */}
        <div className="space-y-6 mb-8">
          <button className="flex items-center gap-4 group w-full text-left">
            <div className="h-6 w-6 flex items-center justify-center">
              <Phone className="w-6 h-6 text-[#007AFF]" />
            </div>
            <span className="text-[#007AFF] text-[17px] font-medium group-active:opacity-60 transition-opacity">Позвонить контакту</span>
          </button>
          
          <button className="flex items-center gap-4 group w-full text-left">
            <div className="h-6 w-6 flex items-center justify-center">
              <Link className="w-6 h-6 text-[#007AFF]" />
            </div>
            <span className="text-[#007AFF] text-[17px] font-medium group-active:opacity-60 transition-opacity">Создать групповой звонок</span>
          </button>
        </div>

        {/* Tabs with blue indicator */}
        <div className="flex gap-6 mb-4">
          <button 
            onClick={() => setActiveTab('all')}
            className={cn(
              "pb-2 text-[17px] font-bold transition-all relative",
              activeTab === 'all' ? "text-white" : "text-muted-foreground/60"
            )}
          >
            Все
            {activeTab === 'all' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#007AFF] rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('missed')}
            className={cn(
              "pb-2 text-[17px] font-bold transition-all relative",
              activeTab === 'missed' ? "text-white" : "text-muted-foreground/60"
            )}
          >
            Пропущенные
            {activeTab === 'missed' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#007AFF] rounded-t-full" />}
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 space-y-0.5 pb-32">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3 opacity-50">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest">Загрузка звонков...</p>
            </div>
          ) : filteredCalls.length > 0 ? (
            filteredCalls.map(call => (
              <CallItem key={call.id} call={call} currentUserId={user?.uid} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
              <Phone className="w-12 h-12 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">Нет звонков</p>
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
  const isRejected = call.status === 'rejected';

  const displayDate = React.useMemo(() => {
    try {
      return format(new Date(call.createdAt), 'dd.MM');
    } catch (e) {
      return '';
    }
  }, [call.createdAt]);

  return (
    <div className="flex items-center justify-between py-2.5 group active:bg-white/[0.05] transition-all">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <UserAvatar userId={otherId} className="h-[52px] w-[52px]" manualAvatarUrl={otherUser?.avatarUrl} fallbackName={otherUser?.name} />
        <div className="flex flex-col min-w-0">
          <span className={cn("font-bold text-[17px] truncate", isMissed ? "text-[#FF3B30]" : "text-white")}>
            {formatDisplayName(otherUser?.name)}
          </span>
          <div className="flex items-center gap-1 text-[14px] text-muted-foreground/60 font-medium">
            {isMissed || isRejected ? (
              <PhoneOff className="w-3.5 h-3.5" />
            ) : (
              <Phone className="w-3.5 h-3.5" />
            )}
            <span>{isRejected ? 'Отменённый' : 'Звонок по ссылке'}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[15px] text-muted-foreground/60 font-medium">{displayDate}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground/40 p-0 hover:bg-transparent">
          <Info className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
