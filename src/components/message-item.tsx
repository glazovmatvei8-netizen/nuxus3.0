
"use client"

import React, { useState, memo, useRef, useEffect, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { 
  CornerUpLeft, Trash2, Check, CheckCheck, Edit2, Copy, Pin, X, MoreVertical, Share2, Play, Smile, ArrowUp, Lock
} from 'lucide-react';
import { cn, decryptSignal, isGlobalAdmin } from '@/lib/utils';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Message } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel"

export const MessageItem = memo(({ message, isMe, chatId, onReply, onPin, onForward, isAdmin = false, isGroup = false, onEdit, highlight = false, viewerProfile }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);

  const isKernelAdmin = useMemo(() => isGlobalAdmin(viewerProfile), [viewerProfile]);

  // Расшифровка контента для отображения
  const displayContent = useMemo(() => {
    if (message.contentType !== 'text') return message.content;
    return decryptSignal(message.content);
  }, [message.content, message.contentType]);

  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  const handleReaction = async (emoji: string) => {
    if (!db || !user || !chatId) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
    const hasReacted = message.reactions?.[emoji]?.includes(user.uid);
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    if (hasReacted) {
      await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayRemove(user.uid) });
    } else {
      await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(user.uid) });
    }
  };

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) {
      audioRef.current = new Audio(message.content);
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play().catch(() => {});
    setIsPlaying(!isPlaying);
  };

  const renderContent = () => {
    const isAudio = message.contentType === 'audio';
    const isVideoNote = message.contentType === 'video_note';
    const isSticker = message.contentType === 'sticker';

    if (isSticker) {
      return (
        <div className="w-44 h-44 select-none animate-in fade-in zoom-in duration-300 flex items-center justify-center">
          <img src={message.content} alt="Sticker" className="w-full h-full object-contain pointer-events-none" />
        </div>
      );
    }

    return (
      <div className="flex flex-col text-left">
        {message.replyToId && (
          <div className={cn("mb-2 p-2 border-l-2 rounded-r-lg cursor-pointer transition-all hover:bg-white/5", isMe ? "border-white/40 bg-white/10" : "border-primary/50 bg-primary/5")}>
            <div className="flex items-center gap-1.5 mb-0.5"><CornerUpLeft className="w-2.5 h-2.5 opacity-40" /><span className={cn("text-[9px] font-black uppercase tracking-widest", isMe ? "text-white/60" : "text-primary")}>Ответ</span></div>
            <p className="text-[11px] text-muted-foreground truncate italic opacity-80 leading-tight">{decryptSignal(message.replyToContent) || 'Сообщение'}</p>
          </div>
        )}

        {isVideoNote ? (
          <div className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-primary/20 bg-black cursor-pointer group" onClick={() => { if (videoRef.current) { if (videoRef.current.paused) videoRef.current.play(); else videoRef.current.pause(); } }}>
            <video ref={videoRef} src={message.content} loop playsInline className="w-full h-full object-cover scale-x-[-1]" />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Play className="w-8 h-8 text-white fill-white" /></div>
          </div>
        ) : isAudio ? (
          <div className="flex items-center gap-3 p-1 min-w-[200px]">
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 bg-primary text-white rounded-full" onClick={toggleAudio}>{isPlaying ? <X className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}</Button>
            <div className="flex-1 flex flex-col justify-center"><div className="h-1 bg-white/10 w-full rounded-full overflow-hidden"><div className={cn("h-full bg-white transition-all", isPlaying ? "animate-pulse w-full" : "w-0")} /></div><span className="text-[10px] font-bold mt-1 uppercase opacity-60">Голосовой сигнал</span></div>
          </div>
        ) : (message.contentType === 'image' || message.contentType === 'video') ? (
          <div onClick={() => setIsGalleryOpen(true)} className="overflow-hidden rounded-2xl border border-white/5 w-full min-w-[280px] max-w-[320px] cursor-pointer group relative bg-muted/10 transition-transform active:scale-[0.98]">
            {message.contentType === 'video' ? <video src={message.content} className="w-full h-full object-cover aspect-video" /> : <img src={message.content} alt="Content" className="w-full h-full object-cover" />}
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-[15px] break-words max-w-[300px] leading-relaxed relative">
            {displayContent}
            {message.editedAt && <span className="text-[8px] ml-1.5 opacity-40 uppercase">(ред.)</span>}
          </div>
        )}
      </div>
    );
  };

  if (message.contentType === 'service') return <div className="w-full flex justify-center my-4 px-4"><div className="bg-white/5 backdrop-blur-md px-6 py-2 rounded-full border border-white/10"><p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest text-center">{message.content}</p></div></div>;

  const isSpecialContent = message.contentType === 'sticker' || message.contentType === 'video_note';

  return (
    <div id={`msg-${message.id}`} className={cn("w-full flex mb-2 transition-all scroll-mt-20", isMe ? "justify-end" : "justify-start", highlight && "scale-[1.02] z-10")}>
      <div className={cn("flex gap-3 max-w-[90%] relative group px-2 items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && <UserAvatar userId={message.senderId} className="h-9 w-9 shrink-0" fallbackName={message.senderName} />}
        
        <div className={cn("flex flex-col min-w-0 max-w-full relative", isMe ? "items-end" : "items-start")}>
          {!isMe && isGroup && <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 ml-1 truncate max-w-[150px]">{message.senderName}</span>}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="relative group/bubble cursor-pointer active:scale-[0.98] transition-transform outline-none">
                <div className={cn(
                  "p-2.5 rounded-2xl shadow-md border transition-all relative select-none touch-none", 
                  !isSpecialContent && (isMe ? "message-bubble-me border-none" : "bg-card border-white/5 text-white"),
                  highlight && "border-primary/50 shadow-primary/20",
                  isSpecialContent && "bg-transparent border-none shadow-none p-0"
                )}>
                  {renderContent()}
                  
                  <div className={cn(
                    "flex items-center justify-end gap-1 mt-1.5 opacity-60", 
                    message.contentType === 'video_note' && "absolute bottom-2 right-4 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-md",
                    message.contentType === 'sticker' && "absolute -bottom-5 right-0 opacity-40"
                  )}>
                    {message.contentType === 'text' && <Lock className="w-2.5 h-2.5 text-primary/60" />}
                    <span className="text-[9px] font-bold">{formattedTime}</span>
                    {isMe && (message.isRead ? <CheckCheck className="w-3.5 h-3.5 text-accent" /> : <Check className="w-3.5 h-3.5" />)}
                  </div>
                </div>
              </div>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align={isMe ? 'end' : 'start'} className="w-64 bg-card/95 backdrop-blur-2xl border-white/10 rounded-2xl shadow-2xl p-1 z-[500]">
              <DropdownMenuItem onClick={() => onReply(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider rounded-xl"><CornerUpLeft className="w-4 h-4 text-primary" /> Ответить</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(displayContent); toast({ title: "Скопировано" }); }} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider rounded-xl"><Copy className="w-4 h-4 text-primary" /> Копировать</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onForward(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider rounded-xl"><Share2 className="w-4 h-4 text-primary" /> Переслать</DropdownMenuItem>
              {(isMe || isAdmin || isKernelAdmin) && (
                <DropdownMenuItem onClick={() => deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id))} className="text-destructive gap-3 py-3 font-bold text-[11px] uppercase tracking-wider hover:bg-destructive/10 rounded-xl"><Trash2 className="w-4 h-4" /> Удалить для всех</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <MediaGalleryModal isOpen={isGalleryOpen} onOpenChange={setIsGalleryOpen} media={[message.content]} type={message.contentType} />
    </div>
  );
});
MessageItem.displayName = 'MessageItem';

function MediaGalleryModal({ isOpen, onOpenChange, media, type }: any) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-full h-[100dvh] p-0 bg-black/98 border-none flex items-center justify-center rounded-none">
        <DialogTitle className="sr-only">Nuxus Media</DialogTitle>
        <div className="relative w-full h-full flex items-center justify-center p-4">
          {type === 'video' ? <video src={media[0]} controls autoPlay className="max-w-full max-h-full rounded-xl" /> : <img src={media[0]} alt="Media" className="max-w-full max-h-full object-contain" />}
          <Button variant="ghost" size="icon" className="absolute top-6 right-6 h-12 w-12 rounded-full bg-white/10 text-white" onClick={() => onOpenChange(false)}><X className="w-6 h-6" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
