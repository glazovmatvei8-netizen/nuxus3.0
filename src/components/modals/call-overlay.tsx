
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, onSnapshot, arrayUnion } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  PhoneOff, Mic, MicOff, Video, VideoOff, 
  Phone, X, Loader2, ShieldCheck, Zap, Maximize2, Minimize2, RefreshCcw, UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Call, User as UserType } from '@/lib/types';
import { AddMemberModal } from './add-member-modal';

/**
 * CALL OVERLAY V44.0.0 «MULTIPLEX»
 * ОБНОВЛЕНО: Поддержка групповых вызовов и добавления участников.
 */
export function CallOverlay() {
  const { user } = useUser();
  const db = useFirestore();
  const { activeCallId, setActiveCallId } = useAppState();
  const { toast } = useToast();

  const [callData, setCallData] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [camMode, setCamMode] = useState<'user' | 'environment'>('user');
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

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
        if (data.status === 'active' || data.status === 'calling') {
          initLocalMedia(data.type === 'video', camMode);
        }
      } else {
        setActiveCallId(null);
        stopLocalStream();
      }
    });

    return () => {
      unsubscribe();
      stopLocalStream();
    };
  }, [db, activeCallId, setActiveCallId]);

  const initLocalMedia = async (withVideo: boolean, mode: 'user' | 'environment') => {
    try {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo ? { facingMode: mode, width: 720, height: 1280 } : false
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn("Nuxus Call: Media access denied", e);
      toast({ title: "Ошибка доступа", description: "Разрешите камеру и микрофон", variant: "destructive" });
    }
  };

  const stopLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
  };

  const handleFlipCamera = () => {
    const newMode = camMode === 'user' ? 'environment' : 'user';
    setCamMode(newMode);
    if (callData?.type === 'video') {
      initLocalMedia(true, newMode);
    }
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(25);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callData?.status === 'active') {
      interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [callData?.status]);

  const isIncoming = callData?.status === 'calling' && callData?.receiverId === user?.uid;
  const isOutgoing = callData?.status === 'calling' && callData?.callerId === user?.uid;
  const isActive = callData?.status === 'active';

  // В групповом вызове показываем первого другого участника или "Групповой вызов"
  const otherId = callData?.callerId === user?.uid ? callData?.receiverId : callData?.callerId;
  const otherUserRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUser } = useDoc<UserType>(otherUserRef);

  const handleAccept = () => {
    if (!db || !activeCallId) return;
    updateDocumentNonBlocking(doc(db, 'calls', activeCallId), { 
      status: 'active',
      startedAt: new Date().toISOString()
    });
  };

  const handleDecline = () => {
    if (!db || !activeCallId) return;
    updateDocumentNonBlocking(doc(db, 'calls', activeCallId), { 
      status: 'rejected',
      endedAt: new Date().toISOString()
    });
    setActiveCallId(null);
  };

  const handleEndCall = () => {
    if (!db || !activeCallId) return;
    updateDocumentNonBlocking(doc(db, 'calls', activeCallId), { 
      status: 'ended',
      endedAt: new Date().toISOString()
    });
    setActiveCallId(null);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    } else if (isVideoOff) {
      initLocalMedia(true, camMode);
      setIsVideoOff(false);
    }
  };

  useEffect(() => {
    if (callData?.status === 'ended' || callData?.status === 'rejected' || callData?.status === 'missed') {
      const timer = setTimeout(() => {
        setActiveCallId(null);
        setCallDuration(0);
        stopLocalStream();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [callData?.status, setActiveCallId]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeCallId || !callData) return null;

  return (
    <>
    <div className="fixed inset-0 z-[5000] flex flex-col bg-[#020205] overflow-hidden animate-in fade-in duration-700">
      <div className="absolute inset-0 z-0">
        {!isVideoOff && isActive && localStream ? (
           <video 
             ref={localVideoRef} 
             autoPlay 
             muted 
             playsInline 
             className="w-full h-full object-cover opacity-40 blur-[2px]" 
           />
        ) : (
          <div className="w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_70%)]" />
        )}
        <div className="absolute inset-0 bg-black/60" />
      </div>
      
      <div className="relative z-10 flex-1 flex flex-col items-center justify-between py-20 px-8">
        
        <div className="flex flex-col items-center gap-4 animate-in slide-in-from-top-4 duration-1000">
           <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full flex items-center gap-3 shadow-2xl">
             <div className={cn("w-1.5 h-1.5 rounded-full bg-primary", isActive && "animate-pulse")} />
             <span className="text-[11px] font-black text-white uppercase tracking-[0.3em] tabular-nums">
               {isActive ? formatTime(callDuration) : (isIncoming ? 'Входящий сигнал' : 'Соединение')}
             </span>
           </div>
           <ShieldCheck className="w-4 h-4 text-primary/40" />
        </div>

        <div className="flex flex-col items-center gap-12 w-full max-w-sm">
          <div className="relative">
            <div className="absolute -inset-16 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
            <UserAvatar 
              userId={otherId} 
              className={cn(
                "h-40 w-40 border-[6px] border-white/5 shadow-[0_30px_80px_rgba(0,0,0,0.8)] relative transition-all duration-1000",
                isActive ? "scale-90 opacity-60" : "scale-100"
              )}
              manualAvatarUrl={otherUser?.avatarUrl}
              fallbackName={otherUser?.name}
            />
            {(isIncoming || isOutgoing) && (
              <div className="absolute -inset-4 border-2 border-primary rounded-full animate-ping opacity-20" />
            )}
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl">
              {callData.participantIds.length > 2 ? 'Групповой Сигнал' : (otherUser?.name || 'SYNC...')}
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60">
              {callData.participantIds.length} узлов в сети
            </p>
          </div>
        </div>

        {isActive && !isVideoOff && (
          <div className="absolute right-6 top-32 w-28 h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20 bg-black animate-in zoom-in duration-500">
             <video 
               ref={localVideoRef} 
               autoPlay 
               muted 
               playsInline 
               className="w-full h-full object-cover" 
             />
             <button 
               onClick={handleFlipCamera}
               className="absolute bottom-3 right-3 bg-white/10 backdrop-blur-md p-2 rounded-lg border border-white/10"
             >
               <RefreshCcw className="w-4 h-4 text-white" />
             </button>
          </div>
        )}

        <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4 animate-in slide-in-from-bottom-8 duration-700">
          {isIncoming ? (
            <div className="flex w-full gap-4">
              <Button 
                variant="destructive" 
                className="flex-1 h-16 rounded-[2.2rem] shadow-2xl hover:scale-105 active:scale-90 transition-all border border-white/10" 
                onClick={handleDecline}
              >
                <PhoneOff className="w-7 h-7" />
              </Button>
              <Button 
                className="flex-1 h-16 rounded-[2.2rem] bg-green-500 hover:bg-green-600 shadow-2xl hover:scale-105 active:scale-90 transition-all border border-white/10" 
                onClick={handleAccept}
              >
                <Phone className="w-7 h-7 fill-white" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("h-14 w-14 rounded-[1.5rem] obsidian-glass border border-white/5", isMuted && "bg-red-500/20 text-red-500 border-red-500/40")} 
                  onClick={toggleMute}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("h-14 w-14 rounded-[1.5rem] obsidian-glass border border-white/5", isVideoOff && "bg-red-500/20 text-red-500 border-red-500/40")} 
                  onClick={toggleVideo}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </Button>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-14 w-14 rounded-[1.5rem] obsidian-glass border border-white/5 bg-primary/10 text-primary"
                  onClick={() => setIsAddMemberOpen(true)}
                >
                  <UserPlus className="w-5 h-5" />
                </Button>
              </div>

              <Button 
                variant="destructive" 
                className="h-16 w-20 rounded-[2rem] shadow-2xl shadow-red-500/20 hover:scale-105 active:scale-90 transition-all border border-white/10" 
                onClick={handleEndCall}
              >
                <PhoneOff className="w-7 h-7" />
              </Button>
            </>
          )}
        </div>

      </div>

      <div className="absolute bottom-10 left-0 right-0 flex justify-center opacity-10 pointer-events-none">
        <span className="text-[8px] font-black uppercase tracking-[1em] text-white">Nuxus Kernel V44.0</span>
      </div>
    </div>

    <AddMemberModal 
      open={isAddMemberOpen} 
      onOpenChange={setIsAddMemberOpen} 
      chatId={callData.id} 
      currentParticipantIds={callData.participantIds}
      isCallContext={true}
    />
    </>
  );
}
