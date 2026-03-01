
"use client"

import React from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, doc, or } from 'firebase/firestore';
import { formatDisplayName, cn } from '@/lib/utils';
import type { Call, User } from '@/lib/types';
import { format } from 'date-fns';

export default function CallsView() {
  const { user } = useUser();
  const db = useFirestore();

  const callsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    // Query both incoming and outgoing calls
    return query(
      collection(db, 'calls'),
      or(where('callerId', '==', user.uid), where('receiverId', '==', user.uid)),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  }, [db, user]);

  const { data: calls } = useCollection<Call>(callsQuery);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-4 pt-6 pb-2 shrink-0">
        <h1 className="text-[28px] font-black text-white tracking-tight mb-4">Звонки</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 space-y-1 pb-24">
          {calls && calls.length > 0 ? (
            calls.map(call => (
              <CallItem key={call.id} call={call} currentUserId={user?.uid} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
              <Phone className="w-12 h-12 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">Нет истории звонков</p>
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

  return (
    <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all group">
      <div className="flex items-center gap-3">
        <UserAvatar userId={otherId} className="h-12 w-12" manualAvatarUrl={otherUser?.avatarUrl} />
        <div className="flex flex-col">
          <span className={cn("font-bold", isMissed ? "text-red-500" : "text-white")}>
            {formatDisplayName(otherUser?.name)}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            {isMissed ? <PhoneMissed className="w-3 h-3 text-red-500" /> : isOutgoing ? <PhoneOutgoing className="w-3 h-3" /> : <PhoneIncoming className="w-3 h-3 text-green-500" />}
            <span>{isOutgoing ? 'Исходящий' : 'Входящий'}</span>
            <span className="opacity-40">•</span>
            <span>{format(new Date(call.createdAt), 'HH:mm')}</span>
          </div>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground/40 group-hover:text-primary">
        {call.type === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
      </Button>
    </div>
  );
}
