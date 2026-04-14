
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
  MessageCircle, Star, Pause, ShieldCheck, Clock, Type, Globe, Volume2, Timer, Zap, Maximize2, Video as VideoIcon, Sparkles
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
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(message.metadata?.translation || null);
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
    setIsTranscribing(true);
    try {
      const { text } = await transcribeVoice({ audioDataUri: message.content });
      setTranscribedText(text);
    } catch (e) {
      toast({ title: "Ошибка расшифровки", variant: "destructive" });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTranslate = async () => {
    if (!isPremium) {
      toast({ title: "Premium функция", description: "Перевод доступен только Premium пользователям." });
      return;
    }
    if (message.contentType !== 'text') return;
    setIsTranslating(true);
    try {
      const { translatedText: result } = await translateMessage({ text: displayContent, targetLang: 'Russian' });
      setTranslatedText(result);
      if (db && chatId) {
        updateDoc(doc(db, 'chats', chatId, 'messages', message.id), { 'metadata.translation': result });
      }
    } catch (e) {
      toast({ title: "Ошибка перевода", variant: "destructive" });
    } finally {
      setIsTranslating(false);
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
    "p-3.5 rounded-[2rem] transition-all duration-300 relative shadow-lg overflow-hidden",
    isMe ? "message-bubble-me rounded-br-none" : "message-bubble-other rounded-bl-none text-white",
    highlight && "ring-2 ring-primary shadow-[0_0_25px_rgba(168,85,247,0.5)] scale-105",
    bubbleStyle === 'neon' && isMe && "bg-gradient-to-tr from-cyan-500 to-purple-600 shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-cyan-400/30",
    bubbleStyle === 'gold' && isMe && "bg-gradient-to-tr from-yellow-400 to-orange-600 shadow-[0_0_20px_rgba(234,179,8,0.5)] text-black border border-yellow-300/30",
    bubbleStyle === 'ocean' && isMe && "bg-gradient-to-tr from-blue-500 to-emerald-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-400/30"
  );

  const renderContent = () => {
    if (message.contentType === 'sticker') return <img src={message.content} alt="Sticker" className="w-44 h-44 object-contain pointer-events-none drop-shadow-2xl" />;
    
    if (message.contentType === 'image') return (
      <div 
        className="relative max-w-[300px] rounded-[1.8rem] overflow-hidden border border-white/10 shadow-2xl bg-black/40 cursor-pointer active:scale-[0.98] transition-all group"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMediaViewerOpen(true); }}
      >
        <img src={message.content} alt="Image" className="w-full h-auto object-cover max-h-[450px]" loading="lazy" />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Maximize2 className="w-8 h-8 text-white drop-shadow-lg" />
        </div>
      </div>
    );

    if (message.contentType === 'video' || message.contentType === 'ai_video') return (
      <div 
        className="relative max-w-[300px] rounded-[1.8rem] overflow-hidden border border-white/10 shadow-2xl bg-black/40 cursor-pointer active:scale-[0.98] transition-all group"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMediaViewerOpen(true); }}
      >
        <video src={message.content} className="w-full h-auto max-h-[450px]" autoPlay muted loop playsInline />
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10">
          <VideoIcon className="w-4 h-4 text-white" />
        </div>
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Maximize2 className="w-8 h-8 text-white drop-shadow-lg" />
        </div>
      </div>
    );

    if (message.contentType === 'audio') return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4 p-2 min-w-[260px] cursor-pointer group/audio" onClick={toggleAudio}>
          <div className="relative">
            <Button size="icon" className="h-12 w-12 rounded-full bg-primary text-white shadow-xl relative z-10">
              {isPlaying ? <Pause className="fill-current" /> : <Play fill="currentColor" className="ml-1" />}
            </Button>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-1.5 bg-white/10 w-full rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-150 shadow-[0_0_10px_rgba(168,85,247,0.8)]" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between items-center px-0.5">
              <span className="text-[10px] font-black text-primary/60 tabular-nums uppercase tracking-tighter">
                {isPlaying ? `-${formatDuration(Math.max(0, duration - currentTime))}` : formatDuration(duration)}
              </span>
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleTranscribe(); }} className="hover:text-primary transition-colors">
                  {isTranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Type className="w-3.5 h-3.5" />}
                </button>
                <ShieldCheck className="w-3.5 h-3.5 text-primary/40" />
              </div>
            </div>
          </div>
        </div>
        {transcribedText && (
          <div className="px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-[11px] italic text-white/80 animate-in fade-in slide-in-from-top-1">
            "{transcribedText}"
          </div>
        )}
      </div>
    );

    return (
      <div className="flex flex-col gap-2">
        <div className="whitespace-pre-wrap text-[15px] break-words max-w-[320px] leading-[1.6] relative font-medium tracking-tight">
          {displayContent} 
          {message.editedAt && <span className="text-[8px] ml-2 text-primary/40 font-black uppercase tracking-widest">(sync)</span>}
        </div>
        {translatedText && (
          <div className="pt-2 border-t border-white/5 text-[13px] text-accent/80 italic font-bold">
            <div className="flex items-center gap-1 text-[8px] uppercase font-black tracking-widest mb-1 text-accent/40">
              <Sparkles className="w-2.5 h-2.5" /> AI Translation
            </div>
            {translatedText}
          </div>
        )}
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
    <div className="w-full flex justify-center my-6 animate-in fade-in zoom-in duration-700">
      <div className={cn(
        "bg-white/[0.03] backdrop-blur-xl px-8 py-2.5 rounded-full border border-white/5 shadow-inner",
        message.contentType === 'broadcast' && "border-primary/40 bg-primary/10"
      )}>
        <p className={cn(
          "text-[10px] text-primary/60 uppercase font-black tracking-[0.4em] ml-[0.4em]",
          message.contentType === 'broadcast' && "text-primary animate-pulse"
        )}>
          {message.contentType === 'broadcast' && <Zap className="w-3 h-3 inline mr-2 mb-0.5" />}
          {message.content}
        </p>
      </div>
    </div>
  );

  return (
    <>
    <div 
      className={cn("w-full flex mb-4 transition-all duration-300", isMe ? "justify-end pr-2" : "justify-start pl-2", highlight && "scale-105 z-10")}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 80px' }}
    >
      <div className={cn("flex gap-4 max-w-[92%] items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && (
          <div className="cursor-pointer active:scale-90 transition-transform relative group" onClick={() => setInspectedUserId(message.senderId)}>
            <UserAvatar userId={message.senderId} className="h-10 w-10 shrink-0 border-2 border-white/5 shadow-lg relative z-10" fallbackName={message.senderName} />
          </div>
        )}
        <div className={cn("flex flex-col min-w-0 max-w-full", isMe ? "items-end" : "items-start")}>
          {!isMe && isGroup && <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1.5 ml-2 italic drop-shadow-[0_0_5px_rgba(168,85,247,0.3)]">{message.senderName}</span>}
          
          <ContextMenu>
            <ContextMenuTrigger>
              <div className="cursor-pointer active:scale-[0.98] outline-none group/bubble relative">
                {message.selfDestructAt && (
                  <div className="absolute -top-6 right-0 flex items-center gap-1 text-primary/60 text-[8px] font-black uppercase tracking-widest">
                    <Timer className="w-3 h-3 animate-spin" /> Исчезающее
                  </div>
                )}
                <div className={bubbleClasses}>
                  {message.replyToId && (
                    <div className="mb-3 p-2.5 border-l-2 border-accent bg-white/5 rounded-r-2xl opacity-60 text-[11px] truncate max-w-[240px] italic">
                      {decryptSignal(message.replyToContent)}
                    </div>
                  )}
                  {renderContent()}
                  <div className="flex items-center justify-end gap-2 mt-2 opacity-40">
                    <span className="text-[9px] font-black tabular-nums tracking-widest">{formattedTime}</span>
                    {isMe && (message.isRead ? <CheckCheck className="w-3.5 h-3.5 text-accent" /> : <Check className="w-3.5 h-3.5" />)}
                  </div>
                </div>
                
                {message.reactions && Object.keys(message.reactions).length > 0 && (
                  <div className={cn("flex flex-wrap gap-1.5 mt-2", isMe ? "justify-end" : "justify-start")}>
                    {Object.entries(message.reactions).map(([emoji, uids]) => (uids as string[]).length > 0 && (
                      <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-black transition-all", (uids as string[]).includes(user?.uid || '') ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_10px_rgba(168,85,247,0.2)]" : "bg-white/5 border-white/5 text-muted-foreground")}>
                        <span>{emoji}</span><span>{(uids as string[]).length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </ContextMenuTrigger>
            
            <ContextMenuContent className="w-64 bg-[#0a0a0c]/90 backdrop-blur-3xl border-white/10 rounded-[1.8rem] shadow-2xl p-1.5 animate-in zoom-in-95 duration-200">
              <div className="flex justify-around p-2.5 border-b border-white/5 mb-1.5">
                {QUICK_REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => handleReaction(emoji)} className="text-2xl hover:scale-125 transition-all duration-300">{emoji}</button>
                ))}
              </div>
              <ContextMenuItem onClick={() => onReply(message)} className="gap-3 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all"><CornerUpLeft className="w-4 h-4 text-primary" /> Ответить</ContextMenuItem>
              {message.contentType === 'text' && (
                <ContextMenuItem onClick={handleTranslate} disabled={isTranslating} className="gap-3 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all">
                  {isTranslating ? <Loader2 className="w-4 h-4 animate-spin text-accent" /> : <Globe className="w-4 h-4 text-accent" />} Перевести ИИ
                </ContextMenuItem>
              )}
              {isMe && <ContextMenuItem onClick={() => onEdit(message)} className="gap-3 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all"><Edit2 className="w-4 h-4 text-primary" /> Изменить</ContextMenuItem>}
              <ContextMenuItem onClick={() => onForward(message)} className="gap-3 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all"><Share2 className="w-4 h-4 text-primary" /> Переслать</ContextMenuItem>
              <DropdownMenuSeparator className="bg-white/5 mx-2" />
              {(isMe || isAdmin) && (
                <ContextMenuItem onClick={() => deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id))} className="text-red-500 gap-3 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4" /> Удалить</ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
    </div>

    <Dialog open={isMediaViewerOpen} onOpenChange={setIsMediaViewerOpen}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[3000]" />
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-4xl w-[95vw] h-[90vh] bg-transparent border-none p-0 overflow-hidden flex flex-col items-center justify-center outline-none z-[3100] rounded-[2.5rem]">
          <DialogTitle className="sr-only">Просмотр медиа</DialogTitle>
          <button 
            onClick={(e) => { e.preventDefault(); setIsMediaViewerOpen(false); }} 
            className="absolute top-6 right-6 z-[3200] h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="w-full h-full flex items-center justify-center p-4">
            {message.contentType === 'video' || message.contentType === 'ai_video' ? (
              <video src={message.content} className="max-w-full max-h-full rounded-2xl shadow-2xl" controls autoPlay loop />
            ) : (
              <img src={message.content} alt="Media" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
    </>
  );
});
MessageItem.displayName = 'MessageItem';
