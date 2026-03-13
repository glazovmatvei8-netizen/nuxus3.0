
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
  UserPlus, Play, Phone, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Call, User as UserType } from '@/lib/types';
import { differenceInSeconds, parseISO } from 'date-fns';

export function CallOverlay() {
  const { user } = useUser();
  const db = useFirestore();
  const { activeCallId, setActiveCallId, setInspectedUserId } = useAppState();
  const { toast } = useToast();

  const callRef = useMemoFirebase(() => (!db || !activeCallId) ? null : doc(db, 'calls', activeCallId), [db, activeCallId]);
  const { data: call } = useDoc<Call>(callRef);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isIncoming = call?.status === 'calling' && call?.receiverId === user?.uid;
  const isOutgoing = call?.status === 'calling' && call?.callerId === user?.uid;
  const isActive = call?.status === 'active';

  const otherId = call?.callerId === user?.uid ? call?.receiverId : call?.callerId;
  const otherUserRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUser } = useDoc<UserType>(otherUserRef);

  const requestMedia = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;

    try {
      const constraints = { 
        video: call?.type === 'video' ? { facingMode: 'user' } : false, 
        audio: true 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setHasCameraPermission(true);
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Nuxus Media: Access Denied', error);
      setHasCameraPermission(false);
    }
  };

  useEffect(() => {
    if ((isOutgoing || isActive) && !streamRef.current) {
      requestMedia();
    }
  }, [isOutgoing, isActive]);

  // Log call to chat on finish
  const logCallToChat = async (finalStatus: string, startedAt?: string, endedAt?: string) => {
    if (!db || !call || !user) return;
    
    let durationStr = "";
    if (startedAt && endedAt) {
      const diff = differenceInSeconds(parseISO(endedAt), parseISO(startedAt));
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      durationStr = mins > 0 ? `${mins} мин ${secs} сек` : `${secs} сек`;
    }

    let messageContent = "";
    if (finalStatus === 'missed') messageContent = "🚫 Пропущенный звонок";
    else if (finalStatus === 'rejected') messageContent = "❌ Отклоненный звонок";
    else if (finalStatus === 'ended') {
      messageContent = call.callerId === user.uid 
        ? `📞 Исходящий звонок (${durationStr})` 
        : `📞 Входящий звонок (${durationStr})`;
    }

    if (messageContent && call.chatId !== 'global_profile') {
      try {
        await addDoc(collection(db, 'chats', call.chatId, 'messages'), {
          chatId: call.chatId,
          senderId: 'system',
          senderName: 'Nuxus Call',
          content: messageContent,
          contentType: 'service',
          sentAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("Nuxus Call: Log failed", e);
      }
    }
  };

  useEffect(() => {
    if (call?.status === 'ended' || call?.status === 'rejected' || call?.status === 'missed') {
      logCallToChat(call.status, call.startedAt, call.endedAt || new Date().toISOString());
      const timer = setTimeout(() => setActiveCallId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [call?.status]);

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

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!streamRef.current.getAudioTracks()[0].enabled);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!streamRef.current.getVideoTracks()[0].enabled);
    }
  };

  if (!activeCallId || !call) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#050505]/95 backdrop-blur-3xl animate-in fade-in zoom-in duration-300">
      <div className="absolute inset-0 nuxus-core-glow opacity-20 animate-pulse-glow" />
      
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-lg px-6">
        {/* Remote Participant View */}
        <div className="relative group">
          <div className="absolute inset-0 bg-primary blur-3xl opacity-20 animate-pulse" />
          <UserAvatar 
            userId={otherId} 
            className={cn("h-32 w-32 border-4 border-primary/20 shadow-2xl relative transition-all", isActive && "h-20 w-20")}
            manualAvatarUrl={otherUser?.avatarUrl}
            fallbackName={otherUser?.name}
          />
          {(isIncoming || isOutgoing) && (
            <div className="absolute inset-0 border-4 border-primary rounded-full animate-ping opacity-20" />
          )}
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
            {otherUser?.name || 'Node...'}
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary animate-pulse">
            {call.status === 'calling' ? (isIncoming ? 'Incoming Signal' : 'Establishing...') : 
             call.status === 'active' ? 'Signal Stable' : 'Signal Lost'}
          </p>
        </div>

        {/* Video Containers */}
        {(isActive || isOutgoing) && (
          <div className="w-full flex flex-col gap-4">
            <div className="relative w-full aspect-video bg-black/40 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
              {/* Remote Video (Mock for now, needs WebRTC stream) */}
              <video ref={remoteVideoRef} className="w-full h-full object-cover hidden" autoPlay playsInline />
              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
                </div>
              )}
              {/* Local Mini Preview */}
              <div className="absolute bottom-4 right-4 w-1/3 aspect-video bg-black rounded-2xl overflow-hidden border border-white/20 shadow-xl z-20">
                <video ref={localVideoRef} className={cn("w-full h-full object-cover scale-x-[-1]", isVideoOff && "hidden")} autoPlay muted playsInline />
                {isVideoOff && <div className="w-full h-full flex items-center justify-center bg-muted/20"><VideoOff className="w-4 h-4 text-white/40" /></div>}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4 pt-4">
          {isIncoming ? (
            <div className="flex gap-10">
              <Button variant="destructive" size="lg" className="h-20 w-20 rounded-full shadow-2xl hover:scale-110 active:scale-95" onClick={handleDecline}>
                <PhoneOff className="w-8 h-8" />
              </Button>
              <Button variant="default" size="lg" className="h-24 w-24 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl hover:scale-110 active:scale-95" onClick={handleAccept}>
                <Phone className="w-10 h-10 fill-white" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="ghost" size="icon" className={cn("h-14 w-14 rounded-2xl bg-white/5", isMuted && "bg-red-500/20 text-red-500")} onClick={toggleMute}>
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>
              
              <Button variant="ghost" size="icon" className={cn("h-14 w-14 rounded-2xl bg-white/5", isVideoOff && "bg-red-500/20 text-red-500")} onClick={toggleVideo}>
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </Button>

              <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-white/5 text-primary" onClick={() => setInspectedUserId(otherId!)}>
                <UserPlus className="w-6 h-6" />
              </Button>

              <Button variant="destructive" size="lg" className="h-16 w-16 rounded-full shadow-2xl shadow-red-500/20" onClick={handleEndCall}>
                <PhoneOff className="w-8 h-8" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Loader2({ className }: any) {
  return (
    <div className={cn("animate-spin", className)}>
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    </div>
  );
}
