
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  PhoneOff, Mic, MicOff, Video, VideoOff, 
  Maximize2, Minimize2, Loader2, Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Call, User as UserType } from '@/lib/types';

export function CallOverlay() {
  const { user } = useUser();
  const db = useFirestore();
  const { activeCallId, setActiveCallId } = useAppState();
  const { toast } = useToast();

  const callRef = useMemoFirebase(() => (!db || !activeCallId) ? null : doc(db, 'calls', activeCallId), [db, activeCallId]);
  const { data: call } = useDoc<Call>(callRef);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isIncoming = call?.status === 'calling' && call?.receiverId === user?.uid;
  const isOutgoing = call?.status === 'calling' && call?.callerId === user?.uid;
  const isActive = call?.status === 'active';

  const otherId = call?.callerId === user?.uid ? call?.receiverId : call?.callerId;
  const otherUserRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUser } = useDoc<UserType>(otherUserRef);

  // Функция для запроса медиа-ресурсов (вызывается при клике или старте звонка)
  const requestMedia = async () => {
    if (!navigator.mediaDevices) {
      toast({ variant: 'destructive', title: 'Ошибка безопасности', description: 'Ваш браузер блокирует доступ к камере.' });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: call?.type === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false, 
        audio: true 
      });
      setHasCameraPermission(true);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Доступ запрещен',
        description: 'Пожалуйста, разрешите доступ к камере и микрофону в настройках браузера.',
      });
    }
  };

  // Автоматический запрос для звонящего (он уже нажал кнопку вызова - жест был)
  useEffect(() => {
    if (isOutgoing && call?.status === 'calling') {
      requestMedia();
    }
  }, [isOutgoing, call?.status]);

  // Подключение потока при активации звонка (после нажатия "Принять")
  useEffect(() => {
    if (isActive && !streamRef.current) {
      requestMedia();
    }
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (call?.status === 'ended' || call?.status === 'rejected' || call?.status === 'missed') {
      const timer = setTimeout(() => {
        setActiveCallId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [call?.status, setActiveCallId]);

  const handleAccept = () => {
    if (!callRef) return;
    // Сначала запрашиваем разрешение (пользователь нажал кнопку - жест есть)
    requestMedia();
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
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  if (!activeCallId || !call) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-2xl animate-in fade-in zoom-in duration-300">
      <div className="absolute inset-0 nuxus-core-glow opacity-30 animate-pulse-glow" />
      
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm px-6">
        <div className="relative group">
          <div className="absolute inset-0 bg-primary blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <UserAvatar 
            userId={otherId} 
            className="h-32 w-32 border-4 border-primary/20 shadow-2xl relative"
            manualAvatarUrl={otherUser?.avatarUrl}
            fallbackName={otherUser?.name || '...'}
          />
          {(isIncoming || isOutgoing) && (
            <div className="absolute inset-0 border-4 border-primary rounded-full animate-ping opacity-20" />
          )}
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">
            {otherUser?.name || 'Пользователь'}
          </h2>
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-primary animate-pulse">
            {call.status === 'calling' ? (isIncoming ? 'Входящий вызов' : 'Вызов...') : 
             call.status === 'active' ? 'Разговор' :
             call.status === 'rejected' ? 'Отклонено' : 
             call.status === 'missed' ? 'Пропущен' : 'Завершено'}
          </p>
        </div>

        {call.type === 'video' && (isActive || isOutgoing) && (
          <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5 relative">
            <video 
              ref={videoRef} 
              className={cn("w-full h-full object-cover", isVideoOff && "hidden")} 
              autoPlay 
              muted 
              playsInline 
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                <VideoOff className="w-12 h-12 text-muted-foreground/50" />
              </div>
            )}
            {!hasCameraPermission && hasCameraPermission !== null && (
               <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 p-4 text-center">
                <p className="text-[10px] font-bold uppercase text-destructive">Нет доступа к камере</p>
               </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-6 pt-8">
          {isIncoming && (
            <>
              <Button 
                variant="destructive" 
                size="lg" 
                className="h-16 w-16 rounded-full shadow-2xl shadow-destructive/40 hover:scale-110 active:scale-95 transition-all"
                onClick={handleDecline}
              >
                <PhoneOff className="w-8 h-8" />
              </Button>
              <Button 
                variant="default" 
                size="lg" 
                className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl shadow-green-500/40 hover:scale-110 active:scale-95 transition-all"
                onClick={handleAccept}
              >
                <Phone className="w-10 h-10 fill-white" />
              </Button>
            </>
          )}

          {(isActive || isOutgoing) && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-14 w-14 rounded-2xl bg-white/5 hover:bg-white/10", isMuted && "bg-destructive/20 text-destructive")}
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>
              
              <Button 
                variant="destructive" 
                size="lg" 
                className="h-16 w-16 rounded-full shadow-2xl shadow-destructive/40 hover:scale-110 active:scale-95 transition-all"
                onClick={handleEndCall}
              >
                <PhoneOff className="w-8 h-8" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-14 w-14 rounded-2xl bg-white/5 hover:bg-white/10", isVideoOff && "bg-destructive/20 text-destructive")}
                onClick={toggleVideo}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
