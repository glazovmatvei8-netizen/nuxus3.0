
"use client"

import React, { useState, memo, useRef, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
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
  CornerUpLeft, Trash2, Check, CheckCheck, Edit2, Copy, Pin, X, MoreVertical, Share2, Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
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

const isBase64Media = (str: string) => str.startsWith('data:');

export const MessageItem = memo(({ message, isMe, chatId, onReply, onPin, onForward, isAdmin = false, isGroup = false, onEdit, highlight = false }: any) => {
  const db = useFirestore();
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);

  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) {
      audioRef.current = new Audio(message.content);
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play().catch(() => {});
    setIsPlaying(!isPlaying);
  };

  const openGallery = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInitialIndex(idx);
    setIsGalleryOpen(true);
  };

  const renderContent = () => {
    const content = message.content || '';
    const isDataImage = content.startsWith('data:image');
    const isDataVideo = content.startsWith('data:video');
    const isAlbum = message.contentType === 'album';
    const isAudio = message.contentType === 'audio';
    const isVideoNote = message.contentType === 'video_note';
    const isSticker = message.contentType === 'sticker';

    if (isSticker) {
      return (
        <div className="w-40 h-40 select-none animate-in fade-in zoom-in duration-300">
          <img src={content} alt="Sticker" className="w-full h-full object-contain" />
        </div>
      );
    }

    if (isVideoNote) {
      return (
        <div className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-primary/20 bg-black cursor-pointer group" onClick={() => {
          if (videoRef.current) {
            if (videoRef.current.paused) videoRef.current.play(); else videoRef.current.pause();
          }
        }}>
          <video 
            ref={videoRef} 
            src={content} 
            loop 
            playsInline 
            className="w-full h-full object-cover scale-x-[-1]" 
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        </div>
      );
    }

    if (isAudio) {
      return (
        <div className="flex flex-col gap-2 min-w-[200px]">
          <div className="flex items-center gap-3 p-1">
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 bg-primary text-white rounded-full" onClick={toggleAudio}>
              {isPlaying ? <X className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </Button>
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-1 bg-white/10 w-full rounded-full overflow-hidden">
                <div className={cn("h-full bg-white transition-all", isPlaying ? "animate-pulse w-full" : "w-0")} />
              </div>
              <span className="text-[10px] font-bold mt-1 uppercase opacity-60">Голосовое сообщение</span>
            </div>
          </div>
        </div>
      );
    }

    if (message.contentType === 'image' || isDataImage || message.contentType === 'video' || isDataVideo) {
      return (
        <div 
          onClick={(e) => openGallery(0, e)}
          className="overflow-hidden rounded-2xl border border-white/5 w-full min-w-[280px] max-w-[320px] md:max-w-[420px] cursor-pointer group relative bg-muted/10 transition-transform active:scale-[0.98]"
        >
          {isDataVideo || message.contentType === 'video' ? (
            <video src={content} className="w-full h-full object-cover aspect-video" />
          ) : (
            <div className="relative w-full aspect-[3/4]">
              <img src={content} alt="Content" className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
            </div>
          )}
        </div>
      );
    }

    if (isAlbum) {
      let urls: string[] = [];
      try { urls = JSON.parse(content); } catch (e) { return <p className="text-destructive text-xs">Ошибка загрузки альбома</p>; }
      const gridCols = urls.length === 1 ? 'grid-cols-1' : urls.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3';
      return (
        <div className={cn("grid gap-1.5 w-full min-w-[300px] max-w-[340px] md:max-w-[500px]", gridCols)}>
          {urls.map((url, idx) => (
            <div key={idx} onClick={(e) => openGallery(idx, e)} className={cn("relative aspect-square rounded-xl overflow-hidden border border-white/5 cursor-pointer group bg-muted/10 transition-transform active:scale-[0.96]", urls.length === 3 && idx === 0 ? "col-span-2 aspect-video" : "")}>
              <img src={url} alt={`Img ${idx}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" loading="lazy" />
            </div>
          ))}
        </div>
      );
    }

    if (isBase64Media(content)) return null;

    return (
      <div className="flex flex-col text-left">
        <div className="whitespace-pre-wrap text-sm break-words max-w-[300px]">
          {message.content}
          {message.editedAt && <span className="text-[8px] ml-1 opacity-40 uppercase">(ред.)</span>}
        </div>
      </div>
    );
  };

  if (message.contentType === 'service') return <div className="w-full flex justify-center my-4 px-4"><div className="bg-white/5 backdrop-blur-md px-6 py-2 rounded-full border border-white/10"><p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest text-center">{message.content}</p></div></div>;

  return (
    <div id={`msg-${message.id}`} className={cn("w-full flex mb-2 transition-all scroll-mt-20", isMe ? "justify-end" : "justify-start", highlight && "scale-[1.02] z-10")}>
      <div className={cn("flex gap-3 max-w-[90%] relative group px-2 items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && <UserAvatar userId={message.senderId} className="h-9 w-9 shrink-0" manualAvatarUrl={message.senderId === 'stickers_bot' ? 'https://i.ibb.co/sd2MqGz2/Icon.png' : null} fallbackName={message.senderName} />}
        <div className={cn("flex flex-col min-w-0 max-w-full relative", isMe ? "items-end" : "items-start")}>
          {!isMe && isGroup && <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 ml-1 truncate max-w-[150px]">{message.senderName}</span>}
          
          <div className="relative group/bubble">
            <div className={cn(
              "p-2.5 rounded-2xl shadow-md border transition-all relative", 
              isMe ? "message-bubble-me border-none" : "bg-card border-white/5 text-white",
              highlight && "border-primary/50 shadow-primary/20 ring-1 ring-primary/30",
              (message.contentType === 'video_note' || message.contentType === 'sticker') && "bg-transparent border-none shadow-none p-0"
            )}>
              {renderContent()}
              <div className={cn(
                "flex items-center justify-end gap-1 mt-1.5 opacity-60", 
                message.contentType === 'video_note' && "absolute bottom-2 right-4 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-md",
                message.contentType === 'sticker' && "absolute -bottom-5 right-0 opacity-40"
              )}>
                <span className="text-[9px] font-bold">{formattedTime}</span>
                {isMe && (
                  message.isRead ? (
                    <CheckCheck className="w-3.5 h-3.5 text-accent animate-in fade-in zoom-in duration-300" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className={cn("absolute top-0 opacity-0 group-hover/bubble:opacity-100 transition-opacity hidden md:flex", isMe ? "-left-10" : "-right-10")}>
                   <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-card/50 backdrop-blur-xl border border-white/10">
                      <MoreVertical className="w-4 h-4" />
                   </Button>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isMe ? 'end' : 'start'} className="w-52 bg-card/95 backdrop-blur-2xl border-white/10 rounded-2xl shadow-2xl">
                <DropdownMenuItem onClick={() => onReply(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider"><CornerUpLeft className="w-4 h-4 text-primary" /> Ответить</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onForward(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider"><Share2 className="w-4 h-4 text-primary" /> Переслать</DropdownMenuItem>
                {isAdmin && <DropdownMenuItem onClick={() => onPin(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider"><Pin className="w-4 h-4 text-primary" /> Закрепить</DropdownMenuItem>}
                {isMe && message.contentType === 'text' && <DropdownMenuItem onClick={() => onEdit(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider"><Edit2 className="w-4 h-4 text-primary" /> Изменить</DropdownMenuItem>}
                <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(message.content); toast({ title: "Скопировано" }); }} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider"><Copy className="w-4 h-4 text-primary" /> Копировать</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                {(isMe || isAdmin) && <DropdownMenuItem onClick={() => deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id))} className="text-destructive gap-3 py-3 font-bold text-[11px] uppercase tracking-wider hover:bg-destructive/10"><Trash2 className="w-4 h-4" /> Удалить</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <MediaGalleryModal isOpen={isGalleryOpen} onOpenChange={setIsGalleryOpen} media={message.contentType === 'album' ? JSON.parse(message.content) : [message.content]} type={message.contentType === 'video' || message.content.startsWith('data:video') ? 'video' : 'image'} initialIndex={initialIndex} />
    </div>
  );
});
MessageItem.displayName = 'MessageItem';

function MediaGalleryModal({ isOpen, onOpenChange, media, type, initialIndex }: { isOpen: boolean, onOpenChange: (o: boolean) => void, media: string[], type: string, initialIndex: number }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(1);

  useEffect(() => {
    if (!api || !isOpen) return;
    const onSelect = () => { setCurrent(api.selectedScrollSnap() + 1); };
    api.on("select", onSelect);
    const timer = setTimeout(() => { api.scrollTo(initialIndex, true); setCurrent(initialIndex + 1); }, 50);
    return () => { api.off("select", onSelect); clearTimeout(timer); };
  }, [api, isOpen, initialIndex]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-full h-[100dvh] p-0 bg-black/98 border-none overflow-hidden z-[1000] rounded-none outline-none">
        <DialogTitle className="sr-only">Галерея Nuxus</DialogTitle>
        <Carousel setApi={setApi} className="w-full h-full" opts={{ watchDrag: true, loop: false, align: 'start' }}>
          <CarouselContent className="h-full">
            {media.map((url, idx) => (
              <CarouselItem key={idx} className="h-[100dvh] w-full flex items-center justify-center p-0">
                <div className="relative w-full h-full flex items-center justify-center p-2 md:p-8 animate-in fade-in zoom-in duration-300">
                  {type === 'video' ? (
                    <video src={url} controls autoPlay className="max-w-full max-h-full rounded-xl shadow-2xl" />
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img src={url} alt={`Media ${idx}`} className="max-w-full max-h-full object-contain pointer-events-none select-none" />
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {media.length > 1 && (
            <>
              <div className="hidden md:block">
                <CarouselPrevious className="left-8 h-14 w-14 bg-white/10 hover:bg-white/20 border-white/5 text-white" />
                <CarouselNext className="right-8 h-14 w-14 bg-white/10 hover:bg-white/20 border-white/5 text-white" />
              </div>
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-2xl px-6 py-2.5 rounded-full border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl z-[1100]">
                {current} / {media.length}
              </div>
            </>
          )}
        </Carousel>
        <Button variant="ghost" size="icon" className="absolute top-6 right-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white z-[1200] backdrop-blur-xl border border-white/5" onClick={() => onOpenChange(false)}><X className="w-6 h-6" /></Button>
      </DialogContent>
    </Dialog>
  );
}
