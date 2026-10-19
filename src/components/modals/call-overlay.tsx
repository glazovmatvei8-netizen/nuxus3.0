
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { 
  doc, onSnapshot, collection, addDoc, setDoc, getDoc, updateDoc, deleteDoc 
} from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useAppState } from '@/lib/app-state';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
  PhoneOff, Mic, MicOff, 
  Phone, UserPlus, Video, VideoOff, Volume2, Loader2
} from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import type { Call, User as UserType } from '@/lib/types';
import { AddMemberModal } from './add-member-modal';

/**
 * NUXUS CALL ENGINE V122.0 «VOICE REAL-TIME»
 * Внедрена поддержка WebRTC для реальной передачи голоса и видео.
 */
const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ],
  iceCandidatePoolSize: 10,
};

export function CallOverlay() {
  const { user } = useUser();
  const db = useFirestore();
  const { activeCallId, setActiveCallId } = useAppState();

  const [callData, setCallData] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // 1. Мониторинг состояния звонка в Firestore
  useEffect(() => {
    if (!db || !activeCallId || !user) return;

    const unsubscribe = onSnapshot(doc(db, 'calls', activeCallId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Call;
        setCallData(data);
        
        if (data.status === 'calling' && data.receiverId === user.uid) {
           playRingtone();
        } else {
           stopRingtone();
        }

        if (data.status === 'ended' || data.status === 'rejected') {
          handleEndCallLocally();
        }
      } else {
        setActiveCallId(null);
      }
    });

    return () => {
      unsubscribe();
      stopRingtone();
      handleEndCallLocally();
    };
  }, [db, activeCallId, user?.uid]);

  const playRingtone = () => {
    if (!ringtoneRef.current) {
      ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      ringtoneRef.current.loop = true;
<<<<<<< HEAD
      ringtoneRef.current.play().catch(() => {
        window.addEventListener('click', () => ringtoneRef.current?.play(), { once: true });
=======
      ringtoneRef.current.play().catch((err) => {
        console.error("Ringtone play error:", err);
        window.addEventListener('click', () => {
          ringtoneRef.current?.play().catch((e) => console.error("Ringtone click play error:", e));
        }, { once: true });
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      });
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current = null;
    }
  };

  // 2. Инициализация WebRTC при переходе в статус 'active'
  useEffect(() => {
    if (callData?.status === 'active' && !pc.current) {
      startWebRTC();
    }
  }, [callData?.status]);

  const startWebRTC = async () => {
    if (!db || !activeCallId || !user || !callData) return;
    setIsConnecting(true);

    try {
      pc.current = new RTCPeerConnection(servers);
      remoteStream.current = new MediaStream();

      // Получаем локальные медиа
      localStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callData.type === 'video'
      });

      // Добавляем треки в соединение
      localStream.current.getTracks().forEach((track) => {
        pc.current?.addTrack(track, localStream.current!);
      });

      // Принимаем удаленные треки
      pc.current.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.current?.addTrack(track);
        });
      };

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream.current;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }

      const callDoc = doc(db, 'calls', activeCallId);
      const offerCandidates = collection(callDoc, 'offerCandidates');
      const answerCandidates = collection(callDoc, 'answerCandidates');

      // Обмен ICE кандидатами
      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          const col = user.uid === callData.callerId ? offerCandidates : answerCandidates;
          addDoc(col, event.candidate.toJSON());
        }
      };

      // Логика Оффера (вызывающий)
      if (user.uid === callData.callerId) {
        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);

        await updateDoc(callDoc, {
          offer: {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
          },
        });

        // Слушаем ответ
        onSnapshot(callDoc, (snapshot) => {
          const data = snapshot.data();
          if (!pc.current?.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.current?.setRemoteDescription(answerDescription);
          }
        });

        onSnapshot(answerCandidates, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const candidate = new RTCIceCandidate(change.doc.data());
              pc.current?.addIceCandidate(candidate);
            }
          });
        });
      } 
      // Логика Ответа (принимающий)
      else {
        const data = (await getDoc(callDoc)).data();
        const offerDescription = data?.offer;
        await pc.current.setRemoteDescription(new RTCSessionDescription(offerDescription));

        const answerDescription = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answerDescription);

        await updateDoc(callDoc, {
          answer: {
            type: answerDescription.type,
            sdp: answerDescription.sdp,
          },
        });

        onSnapshot(offerCandidates, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              pc.current?.addIceCandidate(new RTCIceCandidate(data));
            }
          });
        });
      }
    } catch (e) {
      console.error("WebRTC Error:", e);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAccept = () => {
    if (!db || !activeCallId) return;
    triggerHaptic();
    updateDocumentNonBlocking(doc(db, 'calls', activeCallId), { 
      status: 'active',
      startedAt: new Date().toISOString()
    });
  };

  const handleEndCall = () => {
    if (!db || !activeCallId) return;
    triggerHaptic();
    updateDocumentNonBlocking(doc(db, 'calls', activeCallId), { 
      status: 'ended',
      endedAt: new Date().toISOString()
    });
    handleEndCallLocally();
  };

  const handleEndCallLocally = () => {
    stopRingtone();
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    setActiveCallId(null);
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
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

  if (!activeCallId || !callData) return null;

  const durationStr = `${Math.floor(callDuration / 60).toString().padStart(2, '0')}:${(callDuration % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[5000] flex flex-col bg-[#010103] overflow-hidden animate-in fade-in duration-700">
      <div className="absolute inset-0 z-0">
        {callData.type === 'video' && callData.status === 'active' ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60" />
        ) : (
          <>
            <div className="w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1)_0%,transparent_70%)]" />
            <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" />
          </>
        )}
      </div>
      
      <div className="relative z-10 flex-1 flex flex-col items-center justify-between py-20 px-8">
        <div className="flex flex-col items-center gap-4">
           <div className="bg-white/5 backdrop-blur-3xl border border-white/10 px-6 py-2 rounded-full flex items-center gap-3 shadow-2xl">
             <div className={cn("w-2 h-2 rounded-full shadow-lg", callData.status === 'active' ? "bg-green-500 animate-pulse" : "bg-blue-500 animate-pulse")} />
             <span className="text-[11px] font-black text-white uppercase tracking-[0.3em] tabular-nums">
               {callData.status === 'active' ? (isConnecting ? 'Подключение...' : durationStr) : 'Входящий вызов'}
             </span>
           </div>
        </div>

        <div className="flex flex-col items-center gap-12">
          {callData.type === 'video' && callData.status === 'active' ? (
            <div className="relative w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black/40">
               <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="relative">
               <div className="absolute -inset-8 bg-blue-500/10 blur-[60px] rounded-full animate-pulse" />
               <UserAvatar userId={otherId} className="h-44 w-44 border-[4px] border-white/5 shadow-2xl relative z-10" manualAvatarUrl={otherUser?.avatarUrl} />
            </div>
          )}
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
                  onClick={toggleMute}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>
                {callData.type === 'video' && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("h-16 w-16 rounded-2xl transition-all", isVideoOff ? "bg-red-500/20 text-red-500" : "bg-white/5 text-white/40")} 
                    onClick={toggleVideo}
                  >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </Button>
                )}
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
      <AddMemberModal open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen} chatId={callData.id} currentParticipantIds={callData.participantIds} isCallContext />
    </div>
  );
}
