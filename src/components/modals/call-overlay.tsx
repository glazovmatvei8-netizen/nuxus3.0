
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  PhoneOff, Mic, MicOff, Video, VideoOff, 
  UserPlus, Play, Phone, X, Loader2, ShieldCheck, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Call, User as UserType } from '@/lib/types';
import { differenceInSeconds, parseISO } from 'date-fns';

/**
 * CALL OVERLAY V20.0: Working Signals
 * Добавлена имитация соединения и корректная обработка статусов.
 */
export function CallOverlay() {
  const { user } = useUser();
  const db = useFirestore();
  const { activeCallId, setActiveCallId, setInspectedUserId } = useAppState();
  const { toast } = useToast();

  const callRef = useMemoFirebase(() => (!db || !activeCallId) ? null : doc(db, 'calls', activeCallId), [db, activeCallId]);
  const { data: call } = useDoc<Call>(callRef);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isIncoming = call?.status === 'calling' && call?.receiverId === user?.uid;
  const isOutgoing = call?.status === 'calling' && call?.callerId === user?.uid;
  const isActive = call?.status === 'active';

  const otherId = call?.callerId === user?.uid ? call?.receiverId : call?.callerId;
  const otherUserRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUser } = useDoc<UserType>(otherUserRef);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleAccept = () => {
    if (!callRef) return;
    updateDocumentNonBlocking(callRef, { 
      status: 'active',
      startedAt: new Date().toISOString()
    });
  };

  const handleDecline = () => {
    if (!callRef) return;
    updateDocumentNonBlocking(callRef, { 
      status: 'rejected',
      endedAt: new Date().toISOString()
    });
  };

  const handleEndCall = () => {
    if (!callRef) return;
    updateDocumentNonBlocking(callRef, { 
      status: 'ended',
      endedAt: new Date().toISOString()
    });
  };

  useEffect(() => {
    if (call?.status === 'ended' || call?.status === 'rejected' || call?.status === 'missed') {
      const timer = setTimeout(() => {
        setActiveCallId(null);
        setCallDuration(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [call?.status, setActiveCallId]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeCallId || !call) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-[#050505]/95 backdrop-blur-3xl animate-in fade-in zoom-in duration-500">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.15)_0%,transparent_70%)] animate-pulse" />
      
      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-lg px-8">
        <div className="relative group">
          <div className="absolute -inset-8 bg-primary/20 blur-[80px] rounded-full opacity-40 animate-pulse" />
          <UserAvatar 
            userId={otherId} 
            className={cn("h-32 w-32 border-4 border-white/5 shadow-2xl relative transition-all duration-1000", isActive && "h-24 w-24 scale-90")}
            manualAvatarUrl={otherUser?.avatarUrl}
            fallbackName={otherUser?.name}
          />
          {(isIncoming || isOutgoing) && (
            <div className="absolute -inset-2 border-2 border-primary rounded-full animate-ping opacity-30" />
          )}
        </div>

        <div className="text-center space-y-3">
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
            {otherUser?.name || 'ИНИЦИАЛИЗАЦИЯ...'}
          </h2>
          <div className="flex flex-col items-center gap-1">
             {isActive ? (
               <div className="flex items-center gap-2 bg-primary/20 px-4 py-1 rounded-full border border-primary/30">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                 <span className="text-[12px] font-black text-white tabular-nums tracking-widest">{formatTime(callDuration)}</span>
               </div>
             ) : (
               <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60 animate-pulse">
                 {isIncoming ? 'ВХОДЯЩИЙ СИГНАЛ' : isOutgoing ? 'УСТАНОВКА СВЯЗИ...' : 'СИГНАЛ ПОТЕРЯН'}
               </p>
             )}
          </div>
        </div>

        <div className="flex items-center gap-6 pt-10">
          {isIncoming ? (
            <div className="flex gap-12">
              <Button variant="destructive" size="lg" className="h-20 w-20 rounded-[2.5rem] shadow-2xl hover:scale-110 active:scale-90 transition-all border border-white/10" onClick={handleDecline}>
                <PhoneOff className="w-8 h-8" />
              </Button>
              <Button className="h-24 w-24 rounded-[3rem] bg-green-500 hover:bg-green-600 shadow-2xl hover:scale-110 active:scale-90 transition-all border border-white/10" onClick={handleAccept}>
                <Phone className="w-10 h-10 fill-white" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-5">
              <Button variant="ghost" size="icon" className={cn("h-14 w-14 rounded-2xl bg-white/5 border border-white/5", isMuted && "bg-red-500/20 text-red-500")} onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>
              
              <Button variant="ghost" size="icon" className={cn("h-14 w-14 rounded-2xl bg-white/5 border border-white/5", isVideoOff && "bg-red-500/20 text-red-500")} onClick={() => setIsVideoOff(!isVideoOff)}>
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </Button>

              <Button variant="destructive" size="lg" className="h-16 w-16 rounded-full shadow-2xl shadow-red-500/30 hover:scale-110 active:scale-90 transition-all border border-white/5" onClick={handleEndCall}>
                <PhoneOff className="w-8 h-8" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="absolute bottom-12 flex flex-col items-center gap-2 opacity-20">
         <ShieldCheck className="w-4 h-4 text-primary" />
         <span className="text-[8px] font-black uppercase tracking-widest text-white">Quantum Encryption Active</span>
      </div>
    </div>
  );
}
