
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
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent
} from "@/components/ui/context-menu";
import { format, isAfter, parseISO } from 'date-fns';
import { 
  CornerUpLeft, Trash2, Check, CheckCheck, Edit2, Copy, Pin, X, Share2, Play, Smile, Lock, Loader2, Image as ImageIcon,
  MessageCircle, Star, Pause, ShieldCheck, Clock, Volume2, Timer, Zap, Maximize2, Video as VideoIcon, Sparkles, PinOff, Wand2, Gift, FileText
} from 'lucide-react';
import { cn, decryptSignal, isGlobalAdmin, isUserPremium, encryptSignal } from '@/lib/utils';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Message } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { Dialog, DialogContent, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '👏'];

/**
 * MessageItem V28.4.3: Interactive Video Notes (Telegram Style).
 */
export const MessageItem = memo(({ message, isMe, chatId, onReply, onPin, onForward, isAdmin = false, isGroup = false, onEdit, highlight = false, viewerProfile }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { setInspectedUserId } = useAppState();
  const { toast } = useToast();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(message.metadata?.transcription || null);
  
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  const audioInstance = useRef<HTMLAudioElement | null>(null);

  const displayContent = useMemo(() => {
    return message.contentType === 'text' ? decryptSignal(message.content) : message.content;
  }, [message.content, message.contentType]);

  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';
  const isPremium = useMemo(() => isUserPremium(viewerProfile), [viewerProfile]);

  useEffect(() => {
    if (message.selfDestructAt && db && chatId) {
      const expiry = parseISO(message.selfDestructAt);
      if (isAfter(new Date(), expiry)) {
        deleteDoc(doc(db, 'chats', chatId, 'messages', message.id));
      }
    }
  }, [message.selfDestructAt, db, chatId, message.id]);

  const handleTranscribe = async () => {
    if (!isPremium) {
      toast({ title: "Elite Only", description: "Расшифровка доступна только Premium-узлам.", variant: "destructive" });
      return;
    }
    if (transcription || isTranscribing) return;

    setIsTranscribing(true);
    try {
      const result = await transcribeVoice({ audioDataUri: message.content });
      const text = result.text;
      setTranscription(text);
      if (db && chatId) {
        await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
          'metadata.transcription': text
        });
      }
    } catch (e: any) {
      toast({ title: "Сбой ИИ", description: "Не удалось распознать сигнал.", variant: "destructive" });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!db || !user || !chatId) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
    const hasReacted = message.reactions?.[emoji]?.includes(user.uid);
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(20);
    if (hasReacted) await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayRemove(user.uid) });
    else await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(user.uid) });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const deltaX = touchStartX.current - e.touches[0].clientX;
    const deltaY = Math.abs(touchStartY.current - e.touches[0].clientY);
    if (deltaX > 10 && deltaY < 40) {
      isSwiping.current = true;
      const offset = Math.min(deltaX, 80);
      setSwipeOffset(offset);
      if (e.cancelable) e.preventDefault();
    }
  };

  const onTouchEnd = () => {
    if (swipeOffset >= 60) {
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(15);
      onReply(message);
    }
    setSwipeOffset(0);
    isSwiping.current = false;
  };

  const bubbleStyle = message.metadata?.bubbleStyle || 'default';

  const bubbleClasses = cn(
    "p-4 rounded-[1.8rem] transition-all duration-300 relative shadow-2xl overflow-hidden group/item",
    isMe ? "bg-primary text-white rounded-br-none" : "bg-white/[0.08] backdrop-blur-md border border-white/5 rounded-bl-none text-white",
    highlight && "ring-4 ring-primary shadow-[0_0_40px_rgba(168,85,247,0.6)] scale-105 z-10",
    bubbleStyle === 'neon' && isMe && "bg-gradient-to-tr from-cyan-500 to-purple-600 border border-cyan-400/30",
    bubbleStyle === 'gold' && isMe && "bg-gradient-to-tr from-yellow-400 to-orange-600 text-black border border-yellow-300/30",
    bubbleStyle === 'ocean' && isMe && "bg-gradient-to-tr from-blue-500 to-emerald-500 border border-blue-400/30",
    bubbleStyle === 'cyberpunk' && isMe && "bg-black border-2 border-primary shadow-[0_0_15px_rgba(168,85,247,0.5)]",
    bubbleStyle === 'glass' && isMe && "bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-inner"
  );

  const renderContent = () => {
    if (message.contentType === 'gift') {
      return (
        <div className="flex flex-col items-center gap-4 py-4 px-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-[2rem] border border-white/10 shadow-2xl">
          <div className="text-6xl animate-bounce drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">{message.metadata?.giftIcon || '🎁'}</div>
          <div className="text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Квантовый Артефакт</p>
            <p className="text-sm font-black text-white uppercase italic tracking-tighter">{message.metadata?.giftName || 'Подарок'}</p>
          </div>
        </div>
      );
    }
    if (message.contentType === 'sticker') {
      return (
        <div className="w-48 h-48 flex items-center justify-center relative min-w-[128px] min-h-[128px]">
          <img src={message.content} alt="Sticker" className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-2xl hover:scale-110 transition-transform duration-500 block relative z-10" crossOrigin="anonymous" referrerPolicy="no-referrer" />
        </div>
      );
    }
    if (message.contentType === 'video_note') return (
      <div 
        onClick={() => setIsNoteExpanded(!isNoteExpanded)}
        className={cn(
          "rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-black transition-all duration-500 cursor-pointer relative",
          isNoteExpanded ? "w-[300px] h-[300px] sm:w-[340px] sm:h-[340px]" : "w-44 h-44"
        )}
      >
        <video 
          src={message.content} 
          autoPlay 
          muted={!isNoteExpanded} 
          loop 
          playsInline 
          className="w-full h-full object-cover" 
        />
        {!isNoteExpanded && <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-all"><Volume2 className="w-5 h-5 text-white/60 opacity-0 group-hover:opacity-100" /></div>}
      </div>
    );
    if (message.contentType === 'image') return (
      <div className="relative max-w-[340px] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-black/40 cursor-pointer active:scale-[0.98] transition-all group" onClick={() => setIsMediaViewerOpen(true)}>
        <img src={message.content} alt="Image" className="w-full h-auto object-cover max-h-[500px]" loading="lazy" />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]"><Maximize2 className="w-10 h-10 text-white drop-shadow-lg" /></div>
      </div>
    );
    if (message.contentType === 'audio') return (
      <div className="flex flex-col gap-3 min-w-[240px]">
        <div className="flex items-center gap-4">
           <Button size="icon" onClick={(e) => {
              e.stopPropagation();
              if (!audioInstance.current) {
                audioInstance.current = new Audio(message.content);
                audioInstance.current.onplay = () => setIsPlaying(true);
                audioInstance.current.onpause = () => setIsPlaying(false);
                audioInstance.current.onended = () => setIsPlaying(false);
                audioInstance.current.ontimeupdate = () => setProgress((audioInstance.current!.currentTime / audioInstance.current!.duration) * 100);
              }
              if (audioInstance.current.paused) audioInstance.current.play(); else audioInstance.current.pause();
           }} className="h-10 w-10 rounded-full bg-white text-black shrink-0 shadow-lg">
             {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
           </Button>
           <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-primary shadow-[0_0_10px_rgba(168,85,247,1)] transition-all" style={{ width: `${progress}%` }} />
           </div>
           {isPremium && (
             <Button variant="ghost" size="icon" onClick={handleTranscribe} disabled={isTranscribing} className="h-8 w-8 text-white/40 hover:text-primary">
               {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
             </Button>
           )}
        </div>
        {(transcription || isTranscribing) && (
          <div className="bg-black/20 p-3 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 mb-1.5 opacity-40"><Sparkles className="w-3 h-3 text-primary" /><span className="text-[8px] font-black uppercase tracking-widest">Elite Transcription</span></div>
            <p className="text-[13px] font-medium leading-snug italic text-white/80">{isTranscribing ? 'Распознавание сигнала...' : transcription}</p>
          </div>
        )}
      </div>
    );
    return (
      <div className="space-y-2">
        {message.replyToId && (
          <div className="bg-white/5 border-l-2 border-primary/50 p-2 rounded-lg mb-2 text-xs opacity-60 truncate">
            <span className="font-black text-primary block uppercase text-[8px] mb-1">ОТВЕТ</span>
            <span className="italic">{decryptSignal(message.replyToContent)}</span>
          </div>
        )}
        <div className="whitespace-pre-wrap text-[16px] break-words max-w-[320px] font-semibold tracking-tight leading-relaxed">{displayContent}</div>
      </div>
    );
  };

  if (message.contentType === 'service') return (
    <div className="w-full flex justify-center my-4 opacity-40">
      <div className="bg-white/5 px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{message.content}</div>
    </div>
  );

  return (
    <>
    <div className={cn("w-full flex mb-2 transition-transform duration-200 ease-out relative", isMe ? "justify-end" : "justify-start")} style={{ transform: `translateX(${-swipeOffset}px)` }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="absolute right-[-80px] top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-300" style={{ opacity: swipeOffset / 80, transform: `scale(${0.5 + (swipeOffset / 80) * 0.5})` }}>
        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_20px_rgba(168,85,247,0.4)]"><CornerUpLeft className="w-6 h-6" /></div>
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
              <div className={cn((message.contentType === 'sticker' || message.contentType === 'gift') ? "relative" : bubbleClasses)}>
                {renderContent()}
                {message.reactions && Object.entries(message.reactions).some(([_, uids]) => uids.length > 0) && (
                  <div className={cn("flex gap-1 mt-2 flex-wrap", isMe ? "justify-end" : "justify-start")}>
                    {Object.entries(message.reactions).map(([emoji, uids]: any) => uids.length > 0 && (
                      <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }} className="bg-white/5 backdrop-blur-md rounded-full px-2 py-0.5 border border-white/10 flex items-center gap-1 hover:bg-white/10 transition-all"><span className="text-[11px]">{emoji}</span><span className="text-[9px] font-black text-white/60">{uids.length}</span></button>
                    ))}
                  </div>
                )}
                {message.selfDestructAt && (
                   <div className="flex items-center gap-1.5 mt-2 text-[9px] font-black text-red-400 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded-full w-fit">
                     <Timer className="w-3 h-3 animate-pulse" /> Сигнал уничтожается
                   </div>
                )}
                <div className={cn("flex items-center justify-end gap-2 mt-2 opacity-40 px-1", (message.contentType === 'sticker' || message.contentType === 'gift') && "absolute bottom-2 right-2 bg-black/40 rounded-full px-2 py-0.5 backdrop-blur-sm z-20")}>
                  <span className="text-[10px] font-black tabular-nums tracking-widest">{formattedTime}</span>
                  {isMe && (message.isPending ? <Clock className="w-3.5 h-3.5 text-primary animate-pulse" /> : (message.isRead ? <CheckCheck className="w-4 h-4 text-accent" /> : <Check className="w-4 h-4" />))}
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64 bg-[#0a0a0c]/95 backdrop-blur-[60px] border-white/10 rounded-[2.2rem] shadow-2xl p-2 animate-in zoom-in-95 duration-200">
              <div className="flex justify-around p-2 border-b border-white/5 mb-2 gap-1">{QUICK_REACTIONS.map(emoji => (<button key={emoji} onClick={() => handleReaction(emoji)} className="text-2xl hover:scale-150 active:scale-90 transition-all p-1">{emoji}</button>))}</div>
              <ContextMenuItem onClick={() => onReply(message)} className="gap-4 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-all"><CornerUpLeft className="w-4 h-4 text-primary" /> Ответить</ContextMenuItem>
              {isMe && <ContextMenuItem onClick={() => onEdit(message)} className="gap-4 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-all"><Edit2 className="w-4 h-4 text-white/60" /> Исправить</ContextMenuItem>}
              {isPremium && (
                <ContextMenuSub>
                  <ContextMenuSubTrigger className="gap-4 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-all"><Timer className="w-4 h-4 text-red-400" /> Самоуничтожение</ContextMenuSubTrigger>
                  <ContextMenuSubContent className="bg-black/90 border-white/10 rounded-xl">
                    <ContextMenuItem onClick={() => handleSetSelfDestruct(10)}>10 секунд</ContextMenuItem>
                    <ContextMenuItem onClick={() => handleSetSelfDestruct(60)}>1 минута</ContextMenuItem>
                    <ContextMenuItem onClick={() => handleSetSelfDestruct(3600)}>1 час</ContextMenuItem>
                    <ContextMenuItem onClick={() => handleSetSelfDestruct(86400)}>1 день</ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
              )}
              <ContextMenuItem onClick={() => onForward(message)} className="gap-4 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-all"><Share2 className="w-4 h-4 text-white/60" /> Резонанс</ContextMenuItem>
              <ContextMenuSeparator className="bg-white/5 mx-2 my-1" />
              {(isMe || isAdmin) && (<ContextMenuItem onClick={() => deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id))} className="text-red-500 gap-4 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4" /> Аннигилировать</ContextMenuItem>)}
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
    </div>
    <Dialog open={isMediaViewerOpen} onOpenChange={setIsMediaViewerOpen}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[3000]" />
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-5xl w-full h-full bg-transparent border-none p-0 overflow-hidden flex items-center justify-center outline-none z-[3100]">
          <DialogTitle className="sr-only">Просмотр</DialogTitle>
          <img src={message.content} alt="Media" className="max-w-full max-h-full object-contain animate-in zoom-in duration-300" />
          <button onClick={() => setIsMediaViewerOpen(false)} className="absolute top-10 right-10 h-14 w-14 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-90"><X className="w-7 h-7" /></button>
        </DialogContent>
      </DialogPortal>
    </Dialog>
    </>
  );
});
MessageItem.displayName = 'MessageItem';
