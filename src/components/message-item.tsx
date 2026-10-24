"use client"

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { UserAvatar } from '@/components/user-avatar';
import { format, differenceInSeconds } from 'date-fns';
import { 
  Check, CheckCheck, Play, Pause, MoreHorizontal, 
  Copy, Share2, Pin, Trash2, Heart, Smile,
  Reply, ReplyAll, Mic, Edit2, Flame, Clock, BarChart2
} from 'lucide-react';
import { cn, getReputationInfo, triggerHaptic, decryptSignal, isUserPremium } from '@/lib/utils';
import { useAppState } from '@/lib/app-state';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { User, Message } from '@/lib/types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from '@/hooks/use-toast';

export const MessageItem = memo(({ message, isMe, amIPremium, viewerProfile, chatId, onReply, onEdit }: any) => {
  const { setInspectedUserId, setForwardingMessage } = useAppState();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // SWIPE TO REPLY LOGIC
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const swipeThreshold = 60;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  
  useEffect(() => {
    setMounted(true);
    if (message.selfDestructAt) {
       const timer = setInterval(() => {
          const diff = differenceInSeconds(new Date(message.selfDestructAt), new Date());
          if (diff <= 0) {
             clearInterval(timer);
             setTimeLeft(0);
          } else {
             setTimeLeft(diff);
          }
       }, 1000);
       return () => clearInterval(timer);
    }
  }, [message.selfDestructAt]);

  const senderRef = React.useMemo(() => (!db || !message.senderId) ? null : doc(db, 'users', message.senderId), [db, message.senderId]);
  const { data: senderProfile } = useDoc<User>(senderRef);
  
  const formattedTime = useMemo(() => {
    if (!mounted || !message.sentAt) return '';
    try {
      return format(new Date(message.sentAt), 'HH:mm');
    } catch (e) { return ''; }
  }, [message.sentAt, mounted]);

  // Touch Handlers for Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const diff = e.touches[0].clientX - startX.current;
    if (diff < 0) {
      const offset = Math.max(diff, -100);
      setSwipeX(offset);
      if (Math.abs(offset) >= swipeThreshold && Math.abs(swipeX) < swipeThreshold) {
        triggerHaptic();
      }
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(swipeX) >= swipeThreshold) {
      onReply(message);
    }
    setSwipeX(0);
    setIsSwiping(false);
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleCopy = () => {
    const textToCopy = message.contentType === 'text' ? decryptSignal(message.content) : message.content;
    navigator.clipboard.writeText(textToCopy);
    toast({ title: "Скопировано" });
  };

  const handleDelete = () => {
    if (!db || !chatId) return;
    if (confirm("Аннигилировать этот сигнал для всех?")) {
      const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
      deleteDoc(msgRef).catch(async (error) => {
        console.error("Error deleting message:", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: msgRef.path, operation: 'delete' }));
      });
      toast({ title: "Сигнал удален" });
    }
  };

  const handlePin = async () => {
    if (!db || !chatId) return;
    triggerHaptic();
    await updateDoc(doc(db, 'chats', chatId), { pinnedMessageId: message.id });
    toast({ title: "Сигнал закреплен" });
  };

  const handleReaction = (emoji: string) => {
    if (!db || !user || !chatId) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
    const hasReacted = message.reactions?.[emoji]?.includes(user.uid);
    const updateData = hasReacted 
      ? { [`reactions.${emoji}`]: arrayRemove(user.uid) }
      : { [`reactions.${emoji}`]: arrayUnion(user.uid) };
    updateDoc(msgRef, updateData).catch(async (error) => {
      console.error("Error updating message reactions:", error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: msgRef.path, operation: 'update', requestResourceData: updateData }));
    });
  };

  const bubbleStyle = viewerProfile?.settings?.bubbleStyle || message.metadata?.bubbleStyle || 'default';
  const textSize = viewerProfile?.settings?.messageSize || 'medium';
  const borderRadius = viewerProfile?.settings?.messageRadius ?? 24;

  const styleClasses = {
    default: isMe ? "bg-primary text-white border-white/10 shadow-lg shadow-primary/10" : "obsidian-glass text-white/95 border-white/5",
    neon: isMe ? "bg-primary/20 text-white border-primary shadow-[0_0_25px_rgba(var(--primary),0.3)]" : "bg-white/5 border-white/10 text-white",
    gold: isMe ? "bg-gradient-to-br from-yellow-500/30 to-amber-700/30 text-white border-yellow-500/20 shadow-2xl" : "bg-white/5 border-white/10 text-white",
    ocean: !isMe ? "bg-[#0A2647]/80 backdrop-blur-xl border-[#114084]/30" : "bg-[#114084] text-white"
  };

  const textClasses = { small: "text-[13px]", medium: "text-[15px]", large: "text-[18px]" };
  const rep = getReputationInfo(senderProfile?.reputation);

  const displayContent = useMemo(() => {
    if (message.contentType === 'text') {
      return decryptSignal(message.content);
    }
    return message.content;
  }, [message.content, message.contentType]);

  const isScheduled = message.scheduledAt && new Date(message.scheduledAt) > new Date();

  return (
    <div 
      className={cn("w-full flex flex-col mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500 relative", isMe ? "items-end" : "items-start", isScheduled && "opacity-60")}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="absolute right-[-40px] top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-200"
        style={{ opacity: Math.abs(swipeX) / swipeThreshold, transform: `scale(${Math.min(Math.abs(swipeX) / swipeThreshold, 1.2)})` }}
      >
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", Math.abs(swipeX) >= swipeThreshold ? "bg-primary text-white" : "bg-white/10 text-white/40")}>
           <Reply className="w-5 h-5" />
        </div>
      </div>

      <ContextMenu>
        <ContextMenuTrigger className="w-full flex flex-col items-inherit">
          <div 
            className={cn("flex gap-3 max-w-[85%] items-end transition-transform duration-75", isMe ? "flex-row-reverse" : "flex-row")}
            style={{ transform: `translateX(${swipeX}px)` }}
          >
            {!isMe && (
              <UserAvatar 
                userId={message.senderId} 
                className="h-9 w-9 border border-white/5 shadow-2xl mb-1 cursor-pointer hover:scale-110 transition-transform" 
                onClick={() => setInspectedUserId(message.senderId)} 
              />
            )}
            
            <div id={message.id} className={cn("flex flex-col min-w-[60px]", isMe ? "items-end" : "items-start")}>
              {!isMe && (
                <div className="flex items-center gap-2 ml-2 mb-1">
                   <span className="text-[10px] font-black uppercase tracking-widest italic text-primary/60">
                     {message.senderName || 'User'}
                   </span>
                   <span className={cn("text-[8px]", rep.color)}>{rep.icon}</span>
                </div>
              )}
              
              <div className="relative group">
                <div 
                  className={cn(
                    "p-3 px-4 relative shadow-2xl transition-all duration-500 border overflow-hidden pb-6",
                    styleClasses[bubbleStyle as keyof typeof styleClasses] || styleClasses.default,
                    isMe ? "rounded-br-lg" : "rounded-bl-lg",
                    (message.contentType === 'sticker' || message.contentType === 'video_note') && "bg-transparent border-none shadow-none p-0 pb-1"
                  )}
                  style={{ borderRadius: `${borderRadius}px`, borderBottomRightRadius: isMe ? '4px' : `${borderRadius}px`, borderBottomLeftRadius: isMe ? `${borderRadius}px` : '4px' }}
                >
                  {isScheduled && (
                    <div className="flex items-center gap-2 mb-1.5 opacity-60">
                       <Clock className="w-3 h-3 text-white" />
                       <span className="text-[9px] font-black uppercase">Запланировано</span>
                    </div>
                  )}

                  {timeLeft !== null && (
                    <div className="flex items-center gap-2 mb-1.5 text-primary">
                       <Flame className="w-3 h-3 animate-pulse" />
                       <span className="text-[9px] font-black uppercase tabular-nums">Сгорит через {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                    </div>
                  )}

                  {message.replyToId && (
                    <div className="mb-2.5 p-2 bg-white/10 rounded-xl border-l-4 border-primary flex flex-col gap-0.5 opacity-80 cursor-pointer overflow-hidden" onClick={() => document.getElementById(message.replyToId)?.scrollIntoView({ behavior: 'smooth' })}>
                       <span className="text-[9px] font-black text-primary uppercase tracking-widest truncate">{message.replyToSenderName || 'Signal'}</span>
                       <span className="text-[11px] text-white/60 truncate italic">{decryptSignal(message.replyToContent)}</span>
                    </div>
                  )}

                  {message.contentType === 'sticker' ? (
                    <div className="w-40 h-40 select-none">
                      <img src={message.content} alt="Sticker" className="w-full h-full object-contain" draggable={false} crossOrigin="anonymous" />
                    </div>
                  ) : message.contentType === 'video_note' ? (
                    <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-primary/20 shadow-2xl relative bg-black">
                       <video src={message.content} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                    </div>
                  ) : message.contentType === 'audio' ? (
                    <div className="flex items-center gap-4 min-w-[200px] py-1">
                       <audio 
                         ref={audioRef} 
                         src={message.content} 
                         onTimeUpdate={(e) => setAudioProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
                         onEnded={() => setIsPlaying(false)}
                       />
                       <button onClick={toggleAudio} className="h-10 w-10 rounded-full bg-white/10 shrink-0 flex items-center justify-center hover:bg-white/20 transition-all">
                         {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                       </button>
                       <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden relative">
                          <div className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)] transition-all" style={{ width: `${audioProgress}%` }} />
                       </div>
                       <Mic className="w-4 h-4 text-primary/40" />
                    </div>
                  ) : message.contentType === 'image' ? (
                    <div className="relative rounded-xl overflow-hidden border border-white/5 max-w-full shadow-2xl">
                       <img src={message.content} alt="Attachment" className="w-full h-auto object-cover" />
                    </div>
                  ) : message.contentType === 'poll' ? (
                    <div className="space-y-3 min-w-[240px]">
                       <div className="flex items-center gap-2 mb-2">
                          <BarChart2 className="w-4 h-4 text-primary" />
                          <span className="text-[11px] font-black uppercase text-white tracking-widest">{message.pollData?.question}</span>
                       </div>
                       {message.pollData?.options.map(opt => (
                         <button key={opt.id} className="w-full p-2.5 rounded-xl bg-white/5 border border-white/5 text-left flex justify-between items-center group/opt hover:bg-white/10 transition-all">
                            <span className="text-xs font-bold text-white/80">{opt.text}</span>
                            <span className="text-[10px] font-black text-primary opacity-40 group-hover/opt:opacity-100 tabular-nums">{opt.votes.length}</span>
                         </button>
                       ))}
                    </div>
                  ) : (
                    <div className={cn("whitespace-pre-wrap font-medium leading-relaxed tracking-tight break-words", textClasses[textSize as keyof typeof textClasses])}>
                      {displayContent}
                    </div>
                  )}

                  <div className={cn("absolute bottom-1 right-2.5 flex items-center gap-1 opacity-40", (message.contentType === 'sticker' || message.contentType === 'video_note') && "bg-black/40 rounded-full px-2 py-0.5")}>
                     {message.editedAt && <span className="text-[7px] font-black uppercase text-primary mr-1 italic">изм.</span>}
                     <span className="text-[8px] font-black tabular-nums">{formattedTime}</span>
                     {isMe && (message.isRead ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3" />)}
                  </div>
                </div>

                {message.reactions && Object.keys(message.reactions).length > 0 && (
                  <div className={cn("flex gap-1 mt-1 flex-wrap", isMe ? "justify-end" : "justify-start")}>
                    {Object.entries(message.reactions).map(([emoji, uids]: any) => (
                      uids.length > 0 && (
                        <button key={emoji} onClick={() => handleReaction(emoji)} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black border transition-all", uids.includes(user?.uid) ? "bg-primary/20 border-primary text-white" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10")}>
                          <span>{emoji}</span> <span className="tabular-nums">{uids.length}</span>
                        </button>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-52 bg-[#121212]/98 backdrop-blur-2xl border-white/10 rounded-2xl p-2 shadow-2xl">
          <div className="flex justify-around p-1.5 mb-2 bg-white/5 rounded-xl border border-white/5">
            {['❤️', '🔥', '👍', '😂', '😮', '😢'].map(e => (<button key={e} onClick={() => handleReaction(e)} className="text-base hover:scale-125 transition-transform active:scale-90">{e}</button>))}
          </div>
          <ContextMenuItem onClick={() => onReply(message)} className="gap-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white"><Reply className="w-3.5 h-3.5 text-primary" /> Ответить</ContextMenuItem>
          {isMe && message.contentType === 'text' && (
            <ContextMenuItem onClick={() => onEdit(message)} className="gap-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white"><Edit2 className="w-3.5 h-3.5 text-primary" /> Изменить</ContextMenuItem>
          )}
          <ContextMenuItem onClick={handlePin} className="gap-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white"><Pin className="w-3.5 h-3.5 text-primary" /> Закрепить</ContextMenuItem>
          <ContextMenuItem onClick={handleCopy} className="gap-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white"><Copy className="w-3.5 h-3.5 text-primary" /> Копировать</ContextMenuItem>
          <ContextMenuItem onClick={() => setForwardingMessage(message)} className="gap-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white"><Share2 className="w-3.5 h-3.5 text-primary" /> Переслать</ContextMenuItem>
          <ContextMenuItem onClick={handleDelete} className="gap-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-red-500"><Trash2 className="w-3.5 h-3.5" /> Удалить для всех</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';