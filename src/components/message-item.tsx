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
  CornerUpLeft, Trash2, Check, CheckCheck, Play, Pause, Volume2, Share2, FileText, Copy, Loader2, RefreshCcw, Languages
} from 'lucide-react';
import { cn, decryptSignal, isUserPremium, formatDisplayName } from '@/lib/utils';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Message } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';
import { translateMessage } from '@/ai/flows/ai-translate-flow';

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
  const [isTranslating, setIsTranslating] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(message.metadata?.transcription || null);
  const [translation, setTranslation] = useState<string | null>(message.metadata?.translation || null);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);

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

  const handleTranscribe = async () => {
    if (!isPremium) {
      toast({ title: "Elite Access Only", description: "Расшифровка доступна только Premium-узлам.", variant: "destructive" });
      return;
    }
    setIsTranscribing(true);
    try {
      const result = await transcribeVoice({ audioDataUri: message.content });
      setTranscription(result.text);
      if (db && chatId) {
        await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), { 'metadata.transcription': result.text });
      }
    } catch (e) { toast({ title: "Сбой ИИ", variant: "destructive" }); }
    finally { setIsTranscribing(false); }
  };

  const handleTranslate = async () => {
    if (!isPremium) {
      toast({ title: "Elite Only", variant: "destructive" });
      return;
    }
    setIsTranslating(true);
    try {
      const { translatedText } = await translateMessage({ text: displayContent, targetLang: 'Russian' });
      setTranslation(translatedText);
      if (db && chatId) {
        await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), { 'metadata.translation': translatedText });
      }
    } catch (e) { toast({ title: "Сбой перевода", variant: "destructive" }); }
    finally { setIsTranslating(false); }
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
      audioInstance.current.onended = () => { setIsPlaying(false); setProgress(0); };
    }
    if (audioInstance.current.paused) audioInstance.current.play();
    else audioInstance.current.pause();
  };

  const renderContent = () => {
    if (message.contentType === 'video_note') return (
      <div 
        onClick={(e) => { e.stopPropagation(); setIsNoteExpanded(!isNoteExpanded); }}
        className={cn(
          "overflow-hidden border-4 border-white/20 shadow-2xl bg-black transition-all duration-500 cursor-pointer",
          isNoteExpanded ? "w-[300px] h-[300px] sm:w-[340px] sm:h-[340px]" : "w-44 h-44"
        )}
        style={{ clipPath: SHAPE_CLIPS[message.metadata?.shape] || SHAPE_CLIPS.circle }}
      >
        <video src={message.content} autoPlay muted={!isNoteExpanded} loop playsInline className="w-full h-full object-cover" />
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
           <Button size="icon" onClick={handleAudioToggle} className="h-10 w-10 rounded-full bg-white text-black shrink-0"><Play className="w-5 h-5 fill-current ml-0.5" /></Button>
           <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
           </div>
        </div>
        {transcription && <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-[12px] text-white/80">{transcription}</div>}
      </div>
    );
    
    return (
      <div className="space-y-2">
        {message.replyToId && (
          <div className="bg-white/5 border-l-2 border-primary/50 p-2 rounded-lg mb-2 text-xs opacity-60">
            <span className="italic">{decryptSignal(message.replyToContent)}</span>
          </div>
        )}
        <div className="whitespace-pre-wrap text-[16px] break-words max-w-[320px] font-semibold">{displayContent}</div>
        {translation && (
          <div className="mt-2 pt-2 border-t border-white/10 italic text-[14px] text-primary/80">
            <div className="flex items-center gap-2 mb-1 text-[10px] font-black uppercase text-primary/40"><Languages className="w-3 h-3" /> Перевод</div>
            {translation}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={cn("w-full flex mb-2 transition-transform duration-200 relative touch-pan-y", isMe ? "justify-end" : "justify-start")}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateX(${swipeOffset}px)` }}
    >
      <div className={cn("flex gap-3 max-w-[90%] items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && (
          <div className="cursor-pointer active:scale-90 transition-transform mb-1" onClick={() => setInspectedUserId(message.senderId)}>
            <UserAvatar userId={message.senderId} className="h-10 w-10 shrink-0 border border-white/5" fallbackName={formatDisplayName(message.senderName)} />
          </div>
        )}
        <div className={cn("flex flex-col min-w-0 max-w-full", isMe ? "items-end" : "items-start")}>
          {!isMe && isGroup && <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-1.5 ml-2 opacity-60">{formatDisplayName(message.senderName)}</span>}
          <ContextMenu>
            <ContextMenuTrigger>
              <div className={cn(
                "p-4 rounded-[1.8rem] transition-all relative shadow-2xl",
                isMe ? "bg-primary text-white rounded-br-none" : "bg-white/[0.08] backdrop-blur-md border border-white/5 rounded-bl-none text-white",
                highlight && "ring-4 ring-primary scale-105"
              )}>
                {renderContent()}
                <div className="flex items-center justify-end gap-2 mt-2 opacity-40 px-1">
                  <span className="text-[10px] font-black">{formattedTime}</span>
                  {isMe && (message.isRead ? <CheckCheck className="w-4 h-4 text-accent" /> : <Check className="w-4 h-4" />)}
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64 bg-[#0a0a0c]/95 backdrop-blur-[60px] border-white/10 rounded-[2.2rem] shadow-2xl p-2">
              <ContextMenuItem onClick={() => onReply(message)} className="gap-4 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-all"><CornerUpLeft className="w-4 h-4 text-primary" /> Ответить</ContextMenuItem>
              {message.contentType === 'audio' && (
                <ContextMenuItem onClick={handleTranscribe} className="gap-4 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-all">
                  <FileText className={cn("w-4 h-4", isPremium ? "text-primary" : "text-white/20")} /> Расшифровать { !isPremium && "★" }
                </ContextMenuItem>
              )}
              {message.contentType === 'text' && (
                <ContextMenuItem onClick={handleTranslate} className="gap-4 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-all">
                  <Languages className={cn("w-4 h-4", isPremium ? "text-primary" : "text-white/20")} /> Перевести { !isPremium && "★" }
                </ContextMenuItem>
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
