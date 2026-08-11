
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
  Phone, X, Loader2, ShieldCheck, Zap, RefreshCcw, UserPlus, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Call, User as UserType } from '@/lib/types';
import { AddMemberModal } from './add-member-modal';

/**
 * CALL OVERLAY V75.0.0 «MODERN RELIABILITY»
 * FIXED: Imports corrected to central firebase hub.
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
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
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
        
        if (data.status === 'calling' && data.receiverId === user?.uid) {
           if (!ringtoneRef.current) {
             ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
             ringtoneRef.current.loop = true;
             ringtoneRef.current.play().catch(() => {
               const resume = () => ringtoneRef.current?.play();
               window.addEventListener('click', resume, { once: true });
             });
           }
        } else {
           if (ringtoneRef.current) {
             ringtoneRef.current.pause();
             ringtoneRef.current = null;
           }
        }

        if (data.status === 'active') {
           if (remoteAudioRef.current) {
             remoteAudioRef.current.play().catch(console.warn);
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
  }, [db, activeCallId, user?.uid, setActiveCallId]);

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
      // handle permissions error silently
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

  const durationStr = `${Math.floor(callDuration / 60).toString().padStart(2, '0')}:${(callDuration % 60).toString().padStart(2, '0')}`;

  return (
    <>
    <audio ref={remoteAudioRef} autoPlay playsInline />
    <div className="fixed inset-0 z-[5000] flex flex-col bg-[#010103] overflow-hidden animate-in fade-in duration-700">
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" />
      </div>
      
      <div className="relative z-10 flex-1 flex flex-col items-center justify-between py-20 px-8">
        <div className="flex flex-col items-center gap-4">
           <div className="bg-white/5 backdrop-blur-3xl border border-white/10 px-6 py-2 rounded-full flex items-center gap-3 shadow-2xl">
             <div className={cn("w-2 h-2 rounded-full shadow-lg", callData.status === 'active' ? "bg-green-500 animate-pulse" : "bg-blue-500 animate-pulse")} />
             <span className="text-[11px] font-black text-white uppercase tracking-[0.3em] tabular-nums">
               {callData.status === 'active' ? durationStr : 'Входящий вызов'}
             </span>
           </div>
        </div>

        <div className="flex flex-col items-center gap-12">
          <div className="relative">
             <div className="absolute -inset-8 bg-blue-500/10 blur-[60px] rounded-full animate-pulse" />
             <UserAvatar userId={otherId} className="h-44 w-44 border-[4px] border-white/5 shadow-2xl relative z-10" manualAvatarUrl={otherUser?.avatarUrl} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-bold text-white tracking-tight leading-tight">{otherUser?.name || 'Загрузка...'}</h2>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em]">Nuxus Voice Link</p>
          </div>
        </div>

        <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] p-6 shadow-2xl flex items-center justify-between gap-4">
          {callData.status === 'calling' && callData.receiverId === user?.uid ? (
            <div className="flex w-full gap-4">
              <Button variant="destructive" className="flex-1 h-20 rounded-[2rem] shadow-2xl active:scale-95 transition-all" onClick={handleEndCall}>
                <PhoneOff className="w-8 h-8" />
              </Button>
              <Button className="flex-1 h-20 rounded-[2rem] bg-green-500 hover:bg-green-400 shadow-2xl active:scale-95 transition-all" onClick={handleAccept}>
                <Phone className="w-8 h-8 animate-bounce" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("h-16 w-16 rounded-2xl transition-all", isMuted ? "bg-red-500/20 text-red-500" : "bg-white/5 text-white/40")} 
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-16 w-16 rounded-2xl bg-white/5 text-white/40 hover:bg-blue-500/20 hover:text-blue-400 transition-all" 
                  onClick={() => setIsAddMemberOpen(true)}
                >
                  <UserPlus className="w-6 h-6" />
                </Button>
              </div>
              <Button variant="destructive" className="h-20 w-24 rounded-2xl shadow-2xl active:scale-90 transition-all" onClick={handleEndCall}>
                <PhoneOff className="w-8 h-8" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
    <AddMemberModal open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen} chatId={callData.id} currentParticipantIds={callData.participantIds} isCallContext />
    </>
  );
}
