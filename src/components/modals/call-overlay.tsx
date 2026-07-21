"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  PhoneOff, Mic, MicOff, Video, VideoOff, 
  Phone, X, Loader2, ShieldCheck, Zap, RefreshCcw, UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Call, User as UserType } from '@/lib/types';
import { AddMemberModal } from './add-member-modal';

/**
 * CALL OVERLAY V72.0.0 «AUDIO RESTORATION»
 * Исправлено: Активация звука и системных уведомлений.
 */
export function CallOverlay() {
  const { user } = useUser();
  const db = useFirestore();
  const { activeCallId, setActiveCallId } = useAppState();
  const { toast } = useToast();

  const [callData, setCallData] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!db || !activeCallId) {
      setCallData(null);
      stopLocalStream();
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'calls', activeCallId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Call;
        setCallData(data);
        
        // Ringtone logic
        if (data.status === 'calling' && data.receiverId === user?.uid) {
           if (!ringtoneRef.current) {
             ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
             ringtoneRef.current.loop = true;
             ringtoneRef.current.play().catch(() => {});
           }
        } else {
           if (ringtoneRef.current) {
             ringtoneRef.current.pause();
             ringtoneRef.current = null;
           }
        }

        if (data.status === 'active' || data.status === 'calling') {
          initLocalMedia(data.type === 'video');
        }
      } else {
        setActiveCallId(null);
        stopLocalStream();
      }
    });

    return () => {
      unsubscribe();
      stopLocalStream();
      if (ringtoneRef.current) ringtoneRef.current.pause();
    };
  }, [db, activeCallId, user?.uid]);

  const initLocalMedia = async (withVideo: boolean) => {
    try {
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo ? { facingMode: 'user' } : false
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (e) {
      toast({ title: "Сбой медиа", variant: "destructive" });
    }
  };

  const stopLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callData?.status === 'active') {
      interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [callData?.status]);

  const otherId = callData?.callerId === user?.uid ? callData?.receiverId : callData?.callerId;
  const userRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUser } = useDoc<UserType>(userRef);

  const handleAccept = () => {
    if (!db || !activeCallId) return;
    updateDocumentNonBlocking(doc(db, 'calls', activeCallId), { 
      status: 'active',
      startedAt: new Date().toISOString()
    });
  };

  const handleEndCall = () => {
    if (!db || !activeCallId) return;
    updateDocumentNonBlocking(doc(db, 'calls', activeCallId), { 
      status: 'ended',
      endedAt: new Date().toISOString()
    });
    setActiveCallId(null);
  };

  if (!activeCallId || !callData) return null;

  return (
    <>
    <div className="fixed inset-0 z-[5000] flex flex-col bg-[#020205] overflow-hidden animate-in fade-in duration-700">
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-black/60" />
      </div>
      
      <div className="relative z-10 flex-1 flex flex-col items-center justify-between py-20 px-8">
        <div className="flex flex-col items-center gap-4">
           <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full flex items-center gap-3 shadow-2xl">
             <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
             <span className="text-[11px] font-black text-white uppercase tracking-[0.3em] tabular-nums">
               {callData.status === 'active' ? 'Соединение активно' : 'Входящий сигнал'}
             </span>
           </div>
        </div>

        <div className="flex flex-col items-center gap-12">
          <UserAvatar userId={otherId} className="h-40 w-40 border-[6px] border-white/5 shadow-2xl" manualAvatarUrl={otherUser?.avatarUrl} />
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">{otherUser?.name || 'SYNC...'}</h2>
        </div>

        <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-6 shadow-2xl flex items-center justify-between gap-4">
          {callData.status === 'calling' && callData.receiverId === user?.uid ? (
            <div className="flex w-full gap-4">
              <Button variant="destructive" className="flex-1 h-16 rounded-3xl" onClick={handleEndCall}><PhoneOff className="w-7 h-7" /></Button>
              <Button className="flex-1 h-16 rounded-3xl bg-green-500" onClick={handleAccept}><Phone className="w-7 h-7" /></Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-white/5" onClick={() => setIsMuted(!isMuted)}>
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-white/5" onClick={() => setIsAddMemberOpen(true)}><UserPlus className="w-5 h-5" /></Button>
              </div>
              <Button variant="destructive" className="h-16 w-20 rounded-3xl" onClick={handleEndCall}><PhoneOff className="w-7 h-7" /></Button>
            </>
          )}
        </div>
      </div>
    </div>
    <AddMemberModal open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen} chatId={callData.id} currentParticipantIds={callData.participantIds} isCallContext />
    </>
  );
}
