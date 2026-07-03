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
} from "@/components/ui/dropdown-menu";
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { format, isAfter, parseISO } from 'date-fns';
import { 
  CornerUpLeft, Trash2, Check, CheckCheck, Edit2, Copy, Pin, X, Share2, Play, Smile, Lock, Languages, Loader2, Image as ImageIcon,
  MessageCircle, Star, Pause, ShieldCheck, Clock, Type, Globe, Volume2, Timer, Zap, Maximize2, Video as VideoIcon, Sparkles, PinOff, Wand2
} from 'lucide-react';
import { cn, decryptSignal, isGlobalAdmin, isUserPremium } from '@/lib/utils';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Message } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';
import { translateMessage } from '@/ai/flows/ai-translate-flow';
import { Dialog, DialogContent, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '👏'];

/**
 * MessageItem V25.2: Full Offline Support.
 * Индикация часов для исходящих сигналов в очереди.
 */
export const MessageItem = memo(({ message, isMe, chatId, onReply, onPin, onForward, isAdmin = false, isGroup = false, onEdit, highlight = false, viewerProfile }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { setInspectedUserId } = useAppState();
  const { toast } = useToast();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string | null>(message.metadata?.transcription || null);
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  
  const audioInstance = useRef<HTMLAudioElement | null>(null);

  const displayContent = useMemo(() => message.contentType === 'text' ? decryptSignal(message.content) : message.content, [message.content, message.contentType]);
  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  const isPremium = useMemo(() => isUserPremium(viewerProfile), [viewerProfile]);

  useEffect(() => {
    if (message.contentType === 'audio') {
      const tempAudio = new Audio(message.content);
      tempAudio.preload = "metadata";
      tempAudio.onloadedmetadata = () => setDuration(tempAudio.duration);
    }
    
    if (message.selfDestructAt && db && chatId) {
      const checkExpiry = () => {
        if (isAfter(new Date(), parseISO(message.selfDestructAt))) {
          deleteDoc(doc(db, 'chats', chatId, 'messages', message.id));
        }
      };
      const interval = setInterval(checkExpiry, 10000);
      return () => clearInterval(interval);
    }

    return () => { 
      if (audioInstance.current) { audioInstance.current.pause(); audioInstance.current = null; } 
    };
  }, [message.content, message.contentType, message.selfDestructAt, db, chatId, message.id]);

  const handleReaction = async (emoji: string) => {
    if (!db || !user || !chatId) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
    const hasReacted = message.reactions?.[emoji]?.includes(user.uid);
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    if (hasReacted) await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayRemove(user.uid) });
    else await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(user.uid) });
  };

  const handleTranscribe = async () => {
    if (!isPremium) {
      toast({ title: "Premium функция", description: "Расшифровка доступна только Premium пользователям." });
      return;
    }
    if (transcribedText) return;

    setIsTranscribing(true);
    try {
      const { text } = await transcribeVoice({ audioDataUri: message.content });
      setTranscribedText(text);
      if (db && chatId) {
        await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), { 
          'metadata.transcription': text 
        });
      }
    } catch (e) {
      toast({ title: "Ошибка расшифровки", variant: "destructive" });
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioInstance.current) {
      const audio = new Audio(message.content);
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => { setIsPlaying(false); audio.currentTime = 0; setCurrentTime(0); setProgress(0); };
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.ontimeupdate = () => { setCurrentTime(audio.currentTime); if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100); };
      audioInstance.current = audio;
    }
    if (audioInstance.current.paused) audioInstance.current.play().catch(() => {});
    else audioInstance.current.pause();
  };

  const bubbleStyle = message.metadata?.bubbleStyle || 'default';

  const bubbleClasses = cn(
    "p-4 rounded-[1.8rem] transition-all duration-300 relative shadow-2xl overflow-hidden group/item",
    isMe 
      ? "bg-primary text-white rounded-br-none" 
      : "bg-white/[0.08] backdrop-blur-md border border-white/5 rounded-bl-none text-white",
    highlight && "ring-4 ring-primary shadow-[0_0_40px_rgba(168,85,247,0.6)] scale-105 z-10",
    bubbleStyle === 'neon' && isMe && "bg-gradient-to-tr from-cyan-500 to-purple-600 shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-cyan-400/30",
    bubbleStyle === 'gold' && isMe && "bg-gradient-to-tr from-yellow-400 to-orange-600 shadow-[0_0_20px_rgba(234,179,8,0.5)] text-black border border-yellow-300/30",
    bubbleStyle === 'ocean' && isMe && "bg-gradient-to-tr from-blue-500 to-emerald-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-400/30"
  );

  const renderContent = () => {
    if (message.contentType === 'sticker') return <img src={message.content} alt="Sticker" className="w-52 h-52 object-contain pointer-events-none drop-shadow-2xl hover:scale-110 transition-transform duration-500" />;
    
    if (message.contentType === 'video_note') return (
      <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-black relative group cursor-pointer active:scale-95 transition-all">
        <video src={message.content} autoPlay muted loop playsInline className="w-full h-full object-cover rounded-full" />
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="w-10 h-10 text-white drop-shadow-lg" />
        </div>
      </div>
    );

    if (message.contentType === 'image') return (
      <div 
        className="relative max-w-[340px] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-black/40 cursor-pointer active:scale-[0.98] transition-all group"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMediaViewerOpen(true); }}
      >
        <img src={message.content} alt="Image" className="w-full h-auto object-cover max-h-[500px]" loading="lazy" />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
          <Maximize2 className="w-10 h-10 text-white drop-shadow-lg" />
        </div>
      </div>
    );

    if (message.contentType === 'audio') return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-5 p-1 min-w-[260px] cursor-pointer" onClick={toggleAudio}>
          <div className="relative">
            <Button size="icon" className="h-12 w-12 rounded-full bg-white text-black shadow-xl relative z-10 hover:scale-110 active:scale-90 transition-transform">
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
            </Button>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-1.5 bg-white/10 w-full rounded-full overflow-hidden">
              <div className="h-full bg-primary shadow-[0_0_10px_rgba(168,85,247,1)] transition-all duration-150" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black text-white/40 tabular-nums uppercase tracking-widest">
                {isPlaying ? `-${formatDuration(Math.max(0, duration - currentTime))}` : formatDuration(duration)}
              </span>
              <div className="flex gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleTranscribe(); }} 
                  className={cn("text-white/20 hover:text-primary transition-all", isTranscribing && "animate-pulse")}
                  disabled={isTranscribing}
                >
                  {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className={cn("w-4 h-4", transcribedText && "text-accent")} />}
                </button>
              </div>
            </div>
          </div>
        </div>
        {(isTranscribing || transcribedText) && (
          <div className="px-4 py-3 bg-white/5 rounded-2xl border border-white/5 text-[12px] italic text-white/90 animate-in fade-in slide-in-from-top-2">
            {isTranscribing ? "Сигнал обрабатывается..." : transcribedText}
          </div>
        )}
      </div>
    );

    return (
      <div className="flex flex-col gap-2">
        <div className="whitespace-pre-wrap text-[16px] break-words max-w-[320px] font-semibold tracking-tight leading-relaxed">
          {displayContent} 
          {message.editedAt && <span className="text-[9px] ml-3 text-white/30 font-black uppercase tracking-widest italic">(ред.)</span>}
        </div>
      </div>
    );
  };

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (message.contentType === 'service' || message.contentType === 'broadcast') return (
    <div className="w-full flex justify-center my-6 animate-in fade-in zoom-in-95 duration-1000">
      <div className={cn(
        "bg-white/[0.04] backdrop-blur-2xl px-8 py-3 rounded-full border border-white/5 shadow-2xl",
        message.contentType === 'broadcast' && "border-primary/40 bg-primary/10"
      )}>
        <p className={cn(
          "text-[10px] text-primary/60 uppercase font-black tracking-[0.3em]",
          message.contentType === 'broadcast' && "text-primary animate-pulse"
        )}>
          {message.content}
        </p>
      </div>
    </div>
  );

  return (
    <>
    <div className={cn("w-full flex mb-2 transition-all duration-500", isMe ? "justify-end" : "justify-start", highlight && "z-10")}>
      <div className={cn("flex gap-3 max-w-[90%] items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && (
          <div className="cursor-pointer active:scale-90 transition-transform mb-1" onClick={() => setInspectedUserId(message.senderId)}>
            <UserAvatar key={message.senderId} userId={message.senderId} className="h-10 w-10 shrink-0 border border-white/5 shadow-xl" fallbackName={message.senderName} />
          </div>
        )}
        <div className={cn("flex flex-col min-w-0 max-w-full", isMe ? "items-end" : "items-start")}>
          {!isMe && isGroup && <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-1.5 ml-2 opacity-60">{message.senderName}</span>}
          
          <ContextMenu>
            <ContextMenuTrigger>
              <div className="cursor-pointer outline-none group/bubble relative">
                <div className={cn(message.contentType !== 'video_note' ? bubbleClasses : "")}>
                  {message.replyToId && (
                    <div className="mb-3 p-3 border-l-4 border-accent bg-white/5 rounded-r-2xl opacity-60 text-[12px] truncate max-w-[240px] italic font-bold">
                      {decryptSignal(message.replyToContent)}
                    </div>
                  )}
                  {renderContent()}
                  <div className="flex items-center justify-end gap-2 mt-2 opacity-40 px-1">
                    <span className="text-[10px] font-black tabular-nums tracking-widest">{formattedTime}</span>
                    {isMe && (
                      message.isPending ? (
                        <Clock className="w-3.5 h-3.5 text-primary animate-pulse" />
                      ) : (
                        message.isRead ? <CheckCheck className="w-4 h-4 text-accent" /> : <Check className="w-4 h-4" />
                      )
                    )}
                  </div>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64 bg-[#0a0a0c]/95 backdrop-blur-[60px] border-white/10 rounded-[2rem] shadow-[0_20px_100px_rgba(0,0,0,1)] p-2 animate-in zoom-in-95 duration-300">
              <div className="flex justify-around p-3 border-b border-white/5 mb-2">
                {QUICK_REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => handleReaction(emoji)} className="text-2xl hover:scale-150 transition-all duration-500">{emoji}</button>
                ))}
              </div>
              <ContextMenuItem onClick={() => onReply(message)} className="gap-4 py-3.5 font-black text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-primary/10 transition-all"><CornerUpLeft className="w-5 h-5 text-primary" /> Ответить</ContextMenuItem>
              {isMe && <ContextMenuItem onClick={() => onEdit(message)} className="gap-4 py-3.5 font-black text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-primary/10 transition-all"><Edit2 className="w-5 h-5 text-primary" /> Исправить</ContextMenuItem>}
              <ContextMenuItem onClick={() => onForward(message)} className="gap-4 py-3.5 font-black text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-primary/10 transition-all"><Share2 className="w-5 h-5 text-primary" /> Резонанс</ContextMenuItem>
              <DropdownMenuSeparator className="bg-white/5 mx-3 my-2" />
              {(isMe || isAdmin) && (
                <ContextMenuItem onClick={() => deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id))} className="text-red-500 gap-4 py-3.5 font-black text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-red-500/10 transition-all"><Trash2 className="w-5 h-5" /> Аннигилировать</ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
    </div>

    <Dialog open={isMediaViewerOpen} onOpenChange={setIsMediaViewerOpen}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[3000]" />
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-5xl w-[95vw] h-[90vh] bg-transparent border-none p-0 overflow-hidden flex flex-col items-center justify-center outline-none z-[3100] rounded-[3rem]">
          <DialogTitle className="sr-only">Просмотр сигнала</DialogTitle>
          <button onClick={() => setIsMediaViewerOpen(false)} className="absolute top-8 right-8 z-[3200] h-14 w-14 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center text-white transition-all border border-white/10 backdrop-blur-xl shadow-2xl">
            <X className="w-8 h-8" />
          </button>
          <div className="w-full h-full flex items-center justify-center p-6">
            {message.contentType === 'video' || message.contentType === 'video_note' ? (
              <video src={message.content} className="max-w-full max-h-full rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,1)]" controls autoPlay loop />
            ) : (
              <img src={message.content} alt="Media" className="max-w-full max-h-full object-contain rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,1)]" />
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
    </>
  );
});
MessageItem.displayName = 'MessageItem';
