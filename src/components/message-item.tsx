
"use client"

import React, { useState, memo, useRef, useEffect, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { format } from 'date-fns';
import { 
  CornerUpLeft, Trash2, Check, CheckCheck, Play, Pause, Volume2, Share2, FileText, Heart, Square, Triangle, Ghost, Circle, Copy, Loader2, MessageCircle
} from 'lucide-react';
import { cn, decryptSignal, isUserPremium } from '@/lib/utils';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Message } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';

const SHAPE_CLIPS: Record<string, string> = {
  circle: 'circle(50% at 50% 50%)',
  square: 'inset(0% rounded 25%)',
  heart: 'polygon(50% 15%, 80% 0%, 100% 20%, 100% 50%, 50% 100%, 0% 50%, 0% 20%, 20% 0%)',
  triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
  poop: 'polygon(50% 0%, 63% 13%, 53% 25%, 80% 38%, 85% 61%, 69% 68%, 94% 82%, 100% 100%, 0% 100%, 6% 82%, 31% 68%, 15% 61%, 20% 38%, 47% 25%, 37% 13%)'
};

export const MessageItem = memo(({ message, isMe, chatId, onReply, onForward, isAdmin = false, isGroup = false, highlight = false, viewerProfile }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { setInspectedUserId } = useAppState();
  const { toast } = useToast();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(message.metadata?.transcription || null);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);

  // SWIPE TO REPLY STATE
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const isVerticalScroll = useRef(false);
  const directionDecided = useRef(false);

  const audioInstance = useRef<HTMLAudioElement | null>(null);

  const displayContent = useMemo(() => {
    return message.contentType === 'text' ? decryptSignal(message.content) : message.content;
  }, [message.content, message.contentType]);

  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';
  const isPremium = useMemo(() => isUserPremium(viewerProfile), [viewerProfile]);

  // SWIPE LOGIC
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    directionDecided.current = false;
    isHorizontalSwipe.current = false;
    isVerticalScroll.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isVerticalScroll.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    if (!directionDecided.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) + 5) {
        isVerticalScroll.current = true;
        directionDecided.current = true;
        return;
      }
      if (Math.abs(deltaX) > 10) {
        isHorizontalSwipe.current = true;
        directionDecided.current = true;
      }
    }

    if (isHorizontalSwipe.current) {
      // Swipe left = reply (only if not already swiping right or something)
      const newOffset = Math.max(-80, Math.min(0, deltaX));
      setSwipeOffset(newOffset);
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset < -50) {
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(10);
      onReply(message);
    }
    setSwipeOffset(0);
    isHorizontalSwipe.current = false;
  };

  useEffect(() => {
    return () => {
      if (audioInstance.current) {
        audioInstance.current.pause();
        audioInstance.current = null;
      }
    };
  }, []);

  const handleTranscribe = async (silent = false) => {
    if (!isPremium) {
      if (!silent) toast({ title: "Elite Only", description: "Расшифровка доступна только Premium-узлам.", variant: "destructive" });
      return;
    }
    if (transcription || isTranscribing) return;
    setIsTranscribing(true);
    try {
      const result = await transcribeVoice({ audioDataUri: message.content });
      setTranscription(result.text);
      if (db && chatId) {
        await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), { 'metadata.transcription': result.text });
      }
    } catch (e: any) { 
      if (!silent) toast({ title: "Сбой нейросети", variant: "destructive" }); 
    }
    finally { setIsTranscribing(false); }
  };

  const handleCopyTranscription = () => {
    if (!transcription) return;
    navigator.clipboard.writeText(transcription);
    toast({ title: "Текст скопирован" });
  };

  const handleAudioToggle = () => {
    if (!audioInstance.current) {
      audioInstance.current = new Audio(message.content);
      audioInstance.current.onplay = () => setIsPlaying(true);
      audioInstance.current.onpause = () => setIsPlaying(false);
      audioInstance.current.ontimeupdate = () => {
        if (audioInstance.current) {
          setProgress((audioInstance.current.currentTime / audioInstance.current.duration) * 100);
        }
      };
      audioInstance.current.onended = () => {
        setIsPlaying(false);
        setProgress(0);
      };
    }

    if (audioInstance.current.paused) {
      audioInstance.current.play().catch(e => {
        console.warn("Nuxus Audio: Play blocked", e);
        toast({ title: "Ошибка воспроизведения", variant: "destructive" });
      });
    } else {
      audioInstance.current.pause();
    }
  };

  const renderContent = () => {
    if (message.contentType === 'video_note') return (
      <div className="relative">
        {isNoteExpanded && (
          <div className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setIsNoteExpanded(false); }} />
        )}
        <div 
          onClick={(e) => { e.stopPropagation(); setIsNoteExpanded(!isNoteExpanded); }}
          className={cn(
            "overflow-hidden border-4 border-white/20 shadow-2xl bg-black transition-all duration-500 cursor-pointer relative",
            isNoteExpanded ? "w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] z-50 scale-105" : "w-44 h-44 z-10"
          )}
          style={{ clipPath: SHAPE_CLIPS[message.metadata?.shape] || SHAPE_CLIPS.circle }}
        >
          <video 
            src={message.content} 
            autoPlay 
            muted={!isNoteExpanded} 
            loop 
            playsInline 
            preload="metadata"
            className="w-full h-full object-cover" 
          />
          {!isNoteExpanded && <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-all"><Volume2 className="w-5 h-5 text-white/60 opacity-0 group-hover:opacity-100" /></div>}
        </div>
      </div>
    );
    if (message.contentType === 'image') return (
      <div className="relative max-w-[340px] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-black/40">
        <img src={message.content} alt="Image" className="w-full h-auto object-cover max-h-[500px]" />
      </div>
    );
    if (message.contentType === 'audio') return (
      <div className="flex flex-col gap-3 min-w-[240px]">
        <div className="flex items-center gap-4">
           <Button size="icon" onClick={handleAudioToggle} className="h-10 w-10 rounded-full bg-white text-black shrink-0 shadow-lg active:scale-90 transition-transform">
             {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
           </Button>
           <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative">
             <div className="h-full bg-primary shadow-[0_0_10px_rgba(168,85,247,1)] transition-all duration-300" style={{ width: `${progress}%` }} />
           </div>
           {isPremium && !transcription && (
             <Button variant="ghost" size="icon" disabled={isTranscribing} onClick={() => handleTranscribe()} className="h-9 w-9 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-all">
               {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
             </Button>
           )}
        </div>
        {transcription ? (
           <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2 animate-in fade-in zoom-in-95 duration-500">
              <p className="text-[12px] text-white/80 leading-relaxed font-medium tracking-tight">{transcription}</p>
              <button onClick={handleCopyTranscription} className="flex items-center gap-2 text-[8px] font-black uppercase text-primary/60 hover:text-primary transition-colors">
                <Copy className="w-3 h-3" /> Копировать текст
              </button>
           </div>
        ) : isTranscribing && (
           <div className="flex items-center gap-3 px-2 py-1 opacity-40">
             <Loader2 className="w-3 h-3 animate-spin text-primary" />
             <span className="text-[9px] font-black uppercase tracking-widest">Neural Link Active...</span>
           </div>
        )}
      </div>
    );
    if (message.contentType === 'sticker') return <img src={message.content} alt="Sticker" className="w-48 h-48 object-contain drop-shadow-2xl" />;
    
    return (
      <div className="space-y-2">
        {message.replyToId && (
          <div className="bg-white/5 border-l-2 border-primary/50 p-2 rounded-lg mb-2 text-xs opacity-60">
            <span className="italic">{decryptSignal(message.replyToContent)}</span>
          </div>
        )}
        <div className="whitespace-pre-wrap text-[16px] break-words max-w-[320px] font-semibold">{displayContent}</div>
      </div>
    );
  };

  const bubbleClasses = cn(
    "p-4 rounded-[1.8rem] transition-all duration-300 relative shadow-2xl overflow-hidden group/item",
    isMe ? "bg-primary text-white rounded-br-none" : "bg-white/[0.08] backdrop-blur-md border border-white/5 rounded-bl-none text-white",
    highlight && "ring-4 ring-primary shadow-[0_0_40px_rgba(168,85,247,0.6)] scale-105 z-10"
  );

  if (message.contentType === 'service' || message.contentType === 'broadcast') return (
    <div className="w-full flex justify-center my-4 opacity-40">
      <div className="bg-white/5 px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5 shadow-inner">{message.content}</div>
    </div>
  );

  return (
    <div 
      className={cn("w-full flex mb-2 transition-transform duration-200 relative touch-pan-y", isMe ? "justify-end" : "justify-start")}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateX(${swipeOffset}px)` }}
    >
      {/* REPLY INDICATOR BEHIND */}
      <div className="absolute right-[-60px] top-1/2 -translate-y-1/2 flex items-center justify-center opacity-40" style={{ opacity: Math.abs(swipeOffset) / 80 }}>
        <CornerUpLeft className="w-6 h-6 text-primary" />
      </div>

      <div className={cn("flex gap-3 max-w-[90%] items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && (
          <div className="cursor-pointer active:scale-90 transition-transform mb-1" onClick={() => setInspectedUserId(message.senderId)}>
            <UserAvatar userId={message.senderId} className="h-10 w-10 shrink-0 border border-white/5" fallbackName={message.senderName} />
          </div>
        )}
        <div className={cn("flex flex-col min-w-0 max-w-full", isMe ? "items-end" : "items-start")}>
          {!isMe && isGroup && <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-1.5 ml-2 opacity-60">{message.senderName}</span>}
          <ContextMenu>
            <ContextMenuTrigger>
              <div className={cn((message.contentType === 'sticker' || message.contentType === 'video_note') ? "relative" : bubbleClasses)}>
                {renderContent()}
                <div className={cn("flex items-center justify-end gap-2 mt-2 opacity-40 px-1", (message.contentType === 'sticker' || message.contentType === 'video_note') && "absolute bottom-2 right-2 bg-black/40 rounded-full px-2 py-0.5 backdrop-blur-sm z-20")}>
                  <span className="text-[10px] font-black tabular-nums">{formattedTime}</span>
                  {isMe && (message.isRead ? <CheckCheck className="w-4 h-4 text-accent" /> : <Check className="w-4 h-4" />)}
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64 bg-[#0a0a0c]/95 backdrop-blur-[60px] border-white/10 rounded-[2.2rem] shadow-2xl p-2">
              <ContextMenuItem onClick={() => onReply(message)} className="gap-4 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-all"><CornerUpLeft className="w-4 h-4 text-primary" /> Ответить</ContextMenuItem>
              {message.contentType === 'audio' && !transcription && isPremium && (
                <ContextMenuItem onClick={() => handleTranscribe()} className="gap-4 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-all"><FileText className="w-4 h-4 text-primary" /> Расшифровать</ContextMenuItem>
              )}
              <ContextMenuItem onClick={() => onForward(message)} className="gap-4 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-all"><Share2 className="w-4 h-4" /> Резонанс</ContextMenuItem>
              <ContextMenuSeparator className="bg-white/5 mx-2 my-1" />
              {(isMe || isAdmin) && (<ContextMenuItem onClick={() => deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id))} className="text-red-500 gap-4 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4" /> Аннигилировать</ContextMenuItem>)}
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
    </div>
  );
});
MessageItem.displayName = 'MessageItem';
