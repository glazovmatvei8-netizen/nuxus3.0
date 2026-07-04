
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
import { format } from 'date-fns';
import { 
  CornerUpLeft, Trash2, Check, CheckCheck, Edit2, Copy, Pin, X, Share2, Play, Smile, Lock, Languages, Loader2, Image as ImageIcon,
  MessageCircle, Star, Pause, ShieldCheck, Clock, Type, Globe, Volume2, Timer, Zap, Maximize2, Video as VideoIcon, Sparkles, PinOff, Wand2, Gift
} from 'lucide-react';
import { cn, decryptSignal, isGlobalAdmin, isUserPremium } from '@/lib/utils';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Message } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';
import { Dialog, DialogContent, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '👏'];

/**
 * MessageItem V26.1.2: Final Vision & Layout Fix.
 */
export const MessageItem = memo(({ message, isMe, chatId, onReply, onPin, onForward, isAdmin = false, isGroup = false, onEdit, highlight = false, viewerProfile }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { setInspectedUserId } = useAppState();
  const { toast } = useToast();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  
  const audioInstance = useRef<HTMLAudioElement | null>(null);

  const displayContent = useMemo(() => message.contentType === 'text' ? decryptSignal(message.content) : message.content, [message.content, message.contentType]);
  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  const isPremium = useMemo(() => isUserPremium(viewerProfile), [viewerProfile]);

  const handleReaction = async (emoji: string) => {
    if (!db || !user || !chatId) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
    const hasReacted = message.reactions?.[emoji]?.includes(user.uid);
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    if (hasReacted) await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayRemove(user.uid) });
    else await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(user.uid) });
  };

  const bubbleStyle = message.metadata?.bubbleStyle || 'default';

  const bubbleClasses = cn(
    "p-4 rounded-[1.8rem] transition-all duration-300 relative shadow-2xl overflow-hidden group/item",
    isMe 
      ? "bg-primary text-white rounded-br-none" 
      : "bg-white/[0.08] backdrop-blur-md border border-white/5 rounded-bl-none text-white",
    highlight && "ring-4 ring-primary shadow-[0_0_40px_rgba(168,85,247,0.6)] scale-105 z-10",
    bubbleStyle === 'neon' && isMe && "bg-gradient-to-tr from-cyan-500 to-purple-600 border border-cyan-400/30",
    bubbleStyle === 'gold' && isMe && "bg-gradient-to-tr from-yellow-400 to-orange-600 text-black border border-yellow-300/30",
    bubbleStyle === 'ocean' && isMe && "bg-gradient-to-tr from-blue-500 to-emerald-500 border border-blue-400/30"
  );

  const renderContent = () => {
    if (message.contentType === 'gift') {
      return (
        <div className="flex flex-col items-center gap-4 py-4 px-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-[2rem] border border-white/10 shadow-2xl">
          <div className="text-6xl animate-bounce drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
            {message.metadata?.giftIcon || '🎁'}
          </div>
          <div className="text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Квантовый Артефакт</p>
            <p className="text-sm font-black text-white uppercase italic tracking-tighter">{message.metadata?.giftName || 'Подарок'}</p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 px-4 py-1 rounded-full border border-white/5">
             <Sparkles className="w-3 h-3 text-accent animate-pulse" />
             <span className="text-[9px] font-black text-white uppercase tracking-widest">Received</span>
          </div>
        </div>
      );
    }

    if (message.contentType === 'sticker') {
      return (
        <div className="w-48 h-48 flex items-center justify-center relative group/sticker">
          <img 
            src={message.content} 
            alt="Sticker" 
            className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-2xl hover:scale-110 transition-transform duration-500 block relative z-10" 
            style={{ width: '192px', height: '192px', display: 'block' }}
          />
        </div>
      );
    }
    
    if (message.contentType === 'video_note') return (
      <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-black relative group cursor-pointer">
        <video src={message.content} autoPlay muted loop playsInline className="w-full h-full object-cover rounded-full" />
      </div>
    );

    if (message.contentType === 'image') return (
      <div 
        className="relative max-w-[340px] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-black/40 cursor-pointer active:scale-[0.98] transition-all group"
        onClick={() => setIsMediaViewerOpen(true)}
      >
        <img src={message.content} alt="Image" className="w-full h-auto object-cover max-h-[500px]" loading="lazy" />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
          <Maximize2 className="w-10 h-10 text-white drop-shadow-lg" />
        </div>
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
              }
              if (audioInstance.current.paused) audioInstance.current.play();
              else audioInstance.current.pause();
           }} className="h-10 w-10 rounded-full bg-white text-black shrink-0">
             {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
           </Button>
           <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
           </div>
        </div>
      </div>
    );

    return (
      <div className="whitespace-pre-wrap text-[16px] break-words max-w-[320px] font-semibold tracking-tight leading-relaxed">
        {displayContent}
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
    <div className={cn("w-full flex mb-2 transition-all duration-500", isMe ? "justify-end" : "justify-start", highlight && "z-10")}>
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
                <div className={cn("flex items-center justify-end gap-2 mt-2 opacity-40 px-1", (message.contentType === 'sticker' || message.contentType === 'gift') && "absolute bottom-2 right-2 bg-black/40 rounded-full px-2 py-0.5 backdrop-blur-sm z-20")}>
                  <span className="text-[10px] font-black tabular-nums tracking-widest">{formattedTime}</span>
                  {isMe && (
                    message.isPending ? <Clock className="w-3.5 h-3.5 text-primary animate-pulse" /> : (message.isRead ? <CheckCheck className="w-4 h-4 text-accent" /> : <Check className="w-4 h-4" />)
                  )}
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64 bg-[#0a0a0c]/95 backdrop-blur-[60px] border-white/10 rounded-[2rem] shadow-2xl p-2">
              <div className="flex justify-around p-2 border-b border-white/5 mb-2">
                {QUICK_REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => handleReaction(emoji)} className="text-xl hover:scale-150 transition-all">{emoji}</button>
                ))}
              </div>
              <ContextMenuItem onClick={() => onReply(message)} className="gap-4 py-3 font-black text-[11px] uppercase tracking-widest"><CornerUpLeft className="w-4 h-4" /> Ответить</ContextMenuItem>
              {isMe && <ContextMenuItem onClick={() => onEdit(message)} className="gap-4 py-3 font-black text-[11px] uppercase tracking-widest"><Edit2 className="w-4 h-4" /> Исправить</ContextMenuItem>}
              <ContextMenuItem onClick={() => onForward(message)} className="gap-4 py-3 font-black text-[11px] uppercase tracking-widest"><Share2 className="w-4 h-4" /> Резонанс</ContextMenuItem>
              <DropdownMenuSeparator className="bg-white/5 mx-2 my-1" />
              {(isMe || isAdmin) && (
                <ContextMenuItem onClick={() => deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id))} className="text-red-500 gap-4 py-3 font-black text-[11px] uppercase tracking-widest"><Trash2 className="w-4 h-4" /> Удалить</ContextMenuItem>
              )}
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
          <img src={message.content} alt="Media" className="max-w-full max-h-full object-contain" />
          <button onClick={() => setIsMediaViewerOpen(false)} className="absolute top-8 right-8 h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/10">
            <X className="w-6 h-6" />
          </button>
        </DialogContent>
      </DialogPortal>
    </Dialog>
    </>
  );
});
MessageItem.displayName = 'MessageItem';
