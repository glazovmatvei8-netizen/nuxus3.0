
"use client"

import React, { useState, memo, useRef, useEffect, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { format } from 'date-fns';
import { 
  CornerUpLeft, Trash2, Check, CheckCheck, Edit2, Copy, Pin, X, Share2, Play, Smile, Lock, Languages, Loader2, Image as ImageIcon,
  MessageCircle, Star, Pause
} from 'lucide-react';
import { cn, decryptSignal, isGlobalAdmin } from '@/lib/utils';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Message, PollOption } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';
import { useAppState } from '@/lib/store';

const QUICK_REACTIONS = ['❤️', '👍', '🔥', '😂', '😮', '😢', '💯'];

/**
 * ОПТИМИЗИРОВАННЫЙ MESSAGE ITEM 6.0
 * Реализован плавный прогресс-бар и таймер обратного отсчета для ГС.
 */
export const MessageItem = memo(({ message, isMe, chatId, onReply, onPin, onForward, isAdmin = false, isGroup = false, onEdit, highlight = false, viewerProfile }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { setInspectedUserId } = useAppState();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  
  // Playback states
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioInstance = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isKernelAdmin = useMemo(() => isGlobalAdmin(viewerProfile), [viewerProfile]);
  const displayContent = useMemo(() => message.contentType === 'text' ? decryptSignal(message.content) : message.content, [message.content, message.contentType]);
  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  // Helper to format seconds to M:SS
  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Preload metadata to get duration for the initial view
    if (message.contentType === 'audio') {
      const tempAudio = new Audio(message.content);
      tempAudio.preload = "metadata";
      tempAudio.onloadedmetadata = () => {
        setDuration(tempAudio.duration);
      };
    }

    return () => {
      if (audioInstance.current) {
        audioInstance.current.pause();
        audioInstance.current = null;
      }
    };
  }, [message.content, message.contentType]);

  const handleReaction = async (emoji: string) => {
    if (!db || !user || !chatId) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
    const hasReacted = message.reactions?.[emoji]?.includes(user.uid);
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    if (hasReacted) await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayRemove(user.uid) });
    else await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(user.uid) });
  };

  const handleTranscribe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!viewerProfile?.isPremium) { 
      toast({ title: "Nuxus Premium", description: "Расшифровка доступна только Quantum-узлам." }); 
      return; 
    }
    setIsTranscribing(true);
    try { 
      const res = await transcribeVoice({ audioDataUri: message.content }); 
      if (res && res.text) {
        setTranscription(res.text); 
      } else {
        throw new Error("Empty response");
      }
    }
    catch (e) { 
      console.error("AI Transcription Error:", e);
      toast({ title: "Ошибка ИИ", description: "Не удалось распознать сигнал" }); 
    } finally { 
      setIsTranscribing(false); 
    }
  };

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioInstance.current) {
      const audio = new Audio(message.content);
      audio.preload = "auto";
      
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => {
        setIsPlaying(false);
        audio.currentTime = 0;
        setCurrentTime(0);
        setProgress(0);
      };
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
      };
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };
      audio.onerror = () => {
        setIsPlaying(false);
        toast({ title: "Ошибка сигнала", description: "Не удалось загрузить аудио", variant: "destructive" });
      };
      
      audioInstance.current = audio;
    }
    
    const audio = audioInstance.current;
    if (audio.paused) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // iOS Autoplay policy bypass
          audio.muted = true;
          audio.play().then(() => {
            audio.muted = false;
          });
        });
      }
    } else {
      audio.pause();
    }
  };

  const toggleVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const v = videoRef.current;
      if (v.paused) {
        v.muted = false;
        v.play().catch(() => {
          v.muted = true;
          v.play();
        });
      } else {
        v.pause();
      }
    }
  };

  const renderContent = () => {
    if (message.contentType === 'sticker') return <img src={message.content} alt="Sticker" className="w-40 h-40 object-contain pointer-events-none" />;
    
    if (message.contentType === 'image') return (
      <div 
        className="relative max-w-[280px] rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black/20 cursor-pointer active:scale-[0.98] transition-transform"
        onClick={(e) => { e.stopPropagation(); window.open(message.content, '_blank'); }}
      >
        <img src={message.content} alt="Image" className="w-full h-auto object-cover max-h-[400px]" loading="lazy" />
      </div>
    );

    if (message.contentType === 'video_note') return (
      <div 
        className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-primary/20 bg-black group cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.2)]" 
        onClick={toggleVideo}
      >
        <video 
          ref={videoRef} 
          src={message.content} 
          loop 
          playsInline 
          preload="metadata"
          className="w-full h-full object-cover scale-x-[-1]" 
        />
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-8 h-8 text-white fill-white" />
        </div>
      </div>
    );

    if (message.contentType === 'audio') return (
      <div className="flex items-center gap-3 p-1 min-w-[240px] cursor-pointer group/audio" onClick={toggleAudio}>
        <Button size="icon" className="h-10 w-10 rounded-full bg-primary shadow-lg pointer-events-none transition-all active:scale-90 shrink-0">
          {isPlaying ? <Pause className="fill-current" /> : <Play fill="currentColor" className="ml-0.5" />}
        </Button>
        <div className="flex-1 flex flex-col justify-center min-w-0 gap-1.5">
          <div className="h-1 bg-white/10 w-full rounded-full overflow-hidden relative">
            <div 
              className="absolute inset-y-0 left-0 bg-primary transition-all duration-150 shadow-[0_0_8px_rgba(139,92,246,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/40 tabular-nums">
              {isPlaying ? `-${formatDuration(Math.max(0, duration - currentTime))}` : formatDuration(duration)}
            </span>
            <button 
              onClick={handleTranscribe} 
              disabled={isTranscribing}
              className="text-[9px] font-black text-primary uppercase flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity disabled:opacity-40"
            >
              {isTranscribing ? <Loader2 className="animate-spin w-3 h-3" /> : <><Languages className="w-3 h-3" /> Расшифровать</>}
            </button>
          </div>
          {transcription && (
            <div className="mt-1 p-2 bg-white/5 rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-1">
              <p className="text-[11px] text-white/80 italic leading-relaxed">{transcription}</p>
            </div>
          )}
        </div>
      </div>
    );

    if (message.contentType === 'poll') return (
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10 min-w-[240px]">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-primary/20 p-1.5 rounded-lg"><CheckCheck className="w-4 h-4 text-primary" /></div>
          <span className="font-bold text-sm">{message.pollData?.question}</span>
        </div>
        <div className="space-y-2">
          {message.pollData?.options.map((opt: any) => (
            <div key={opt.id} className="w-full p-3 rounded-xl bg-white/5 border border-white/5 text-xs flex justify-between items-center">
              <span>{opt.text}</span>
              <span className="opacity-40">{opt.votes?.length || 0}</span>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div className="whitespace-pre-wrap text-[15px] break-words max-w-[300px] leading-relaxed relative">
        {displayContent} 
        {message.editedAt && <span className="text-[8px] ml-1.5 opacity-40 uppercase">(ред.)</span>}
      </div>
    );
  };

  if (message.contentType === 'service') return <div className="w-full flex justify-center my-4"><div className="bg-white/5 backdrop-blur-md px-6 py-2 rounded-full border border-white/10"><p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">{message.content}</p></div></div>;

  return (
    <div className={cn("w-full flex mb-2 transition-all", isMe ? "justify-end" : "justify-start", highlight && "scale-105 z-10")}>
      <div className={cn("flex gap-3 max-w-[90%] items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && (
          <div className="cursor-pointer active:scale-90 transition-transform" onClick={() => setInspectedUserId(message.senderId)}>
            <UserAvatar userId={message.senderId} className="h-9 w-9 shrink-0" fallbackName={message.senderName} />
          </div>
        )}
        <div className={cn("flex flex-col min-w-0 max-w-full", isMe ? "items-end" : "items-start")}>
          {!isMe && isGroup && <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 ml-1 truncate max-w-[150px]">{message.senderName}</span>}
          
          <ContextMenu>
            <ContextMenuTrigger>
              <div className="cursor-pointer active:scale-[0.98] outline-none">
                <div className={cn(
                  "p-2.5 rounded-2xl border transition-all relative", 
                  isMe ? "message-bubble-me border-none" : "bg-card border-white/5 text-white",
                  highlight && "ring-2 ring-primary shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                )}>
                  {message.replyToId && (
                    <div className="mb-2 p-2 border-l-2 border-accent bg-white/5 rounded-r-lg opacity-60 text-[10px] truncate max-w-[200px]">
                      {decryptSignal(message.replyToContent)}
                    </div>
                  )}
                  {renderContent()}
                  <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                    {message.contentType === 'text' && <Lock className="w-2.5 h-2.5" />}
                    <span className="text-[9px] font-bold">{formattedTime}</span>
                    {isMe && (message.isRead ? <CheckCheck className="w-3.5 h-3.5 text-accent" /> : <Check className="w-3.5 h-3.5" />)}
                  </div>
                </div>
                {message.reactions && Object.keys(message.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(message.reactions).map(([emoji, uids]) => (uids as string[]).length > 0 && (
                      <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-black", (uids as string[]).includes(user?.uid || '') ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/5 text-muted-foreground")}>
                        <span>{emoji}</span><span>{(uids as string[]).length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </ContextMenuTrigger>
            
            <ContextMenuContent className="w-64 bg-card/95 backdrop-blur-xl border-white/10 rounded-2xl shadow-2xl p-1">
              <div className="flex justify-around p-2 border-b border-white/5 mb-1">
                {QUICK_REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => handleReaction(emoji)} className="text-xl hover:scale-125 transition-transform">{emoji}</button>
                ))}
              </div>
              <ContextMenuItem onClick={() => onReply(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider rounded-xl"><CornerUpLeft className="w-4 h-4" /> Ответить</ContextMenuItem>
              {isMe && <ContextMenuItem onClick={() => onEdit(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider rounded-xl"><Edit2 className="w-4 h-4" /> Изменить</ContextMenuItem>}
              <ContextMenuItem onClick={() => onForward(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider rounded-xl"><Share2 className="w-4 h-4" /> Переслать</ContextMenuItem>
              <ContextMenuItem onClick={() => onPin(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider rounded-xl"><Pin className="w-4 h-4" /> Закрепить</ContextMenuItem>
              <ContextMenuItem onClick={() => { navigator.clipboard.writeText(displayContent); toast({ title: "Скопировано" }); }} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider rounded-xl"><Copy className="w-4 h-4" /> Копировать</ContextMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              {(isMe || isAdmin || isKernelAdmin) && (
                <ContextMenuItem onClick={() => deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id))} className="text-destructive gap-3 py-3 font-bold text-[11px] uppercase tracking-wider"><Trash2 className="w-4 h-4" /> Удалить</ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
    </div>
  );
});
MessageItem.displayName = 'MessageItem';
