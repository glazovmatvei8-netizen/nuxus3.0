
"use client"

import React, { useState, memo, useRef, useEffect } from 'react';
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
  CornerUpLeft, Trash2, Check, CheckCheck, Edit2, Copy, Pin, FileText, Sparkles, Loader2, X, MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Message } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel"

export const MessageItem = memo(({ message, isMe, chatId, onReply, onPin, isAdmin = false, isGroup = false, onEdit, amIPremium = false }: any) => {
  const db = useFirestore();
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(message.translation || null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Gallery state
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [activeMediaIdx, setActiveIdx] = useState(0);
  const [api, setApi] = useState<CarouselApi>();

  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  useEffect(() => {
    if (!api || !isGalleryOpen) return;
    const timer = setTimeout(() => {
      api.scrollTo(activeMediaIdx, true);
    }, 50);
    return () => clearTimeout(timer);
  }, [api, isGalleryOpen, activeMediaIdx]);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) {
      audioRef.current = new Audio(message.content);
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play().catch(() => {});
    setIsPlaying(!isPlaying);
  };

  const handleTranscribe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!amIPremium) {
      toast({ title: "Только для Premium", description: "Расшифровка доступна только Premium пользователям.", variant: "destructive" });
      return;
    }
    if (isTranscribing) return;
    setIsTranscribing(true);
    try {
      const { text } = await transcribeVoice({ audioDataUri: message.content });
      setTranscription(text);
      await updateDoc(doc(db!, 'chats', chatId, 'messages', message.id), { translation: text });
      toast({ title: "Голосовое расшифровано" });
    } catch (e) {
      toast({ title: "Ошибка расшифровки", variant: "destructive" });
    } finally {
      setIsTranscribing(false);
    }
  };

  const openGallery = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIdx(idx);
    setIsGalleryOpen(true);
  };

  const renderContent = () => {
    const content = message.content || '';
    const isDataImage = content.startsWith('data:image');
    const isDataVideo = content.startsWith('data:video');
    const isAlbum = message.contentType === 'album';
    const isAudio = message.contentType === 'audio';

    if (isAudio) {
      return (
        <div className="flex flex-col gap-2 min-w-[200px]">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 gap-2 bg-primary/10 rounded-full px-4 hover:bg-primary/20" onClick={toggleAudio}>
              {isPlaying ? 'Пауза' : 'Голосовое сообщение'}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-accent/10 hover:bg-accent/20" onClick={handleTranscribe} disabled={isTranscribing}>
              {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            </Button>
          </div>
          {transcription && (
            <div className="bg-black/20 p-2 rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-1">
              <p className="text-[11px] italic text-white/70 leading-relaxed"><Sparkles className="w-3 h-3 inline mr-1 text-primary" /> {transcription}</p>
            </div>
          )}
        </div>
      );
    }

    if (message.contentType === 'image' || isDataImage || message.contentType === 'video' || isDataVideo) {
      return (
        <div 
          onClick={(e) => openGallery(0, e)}
          className="overflow-hidden rounded-2xl border border-white/5 w-full min-w-[240px] max-w-[300px] md:max-w-[400px] cursor-pointer group relative bg-muted/10"
        >
          {isDataVideo || message.contentType === 'video' ? (
            <video src={content} className="w-full h-full object-cover aspect-video" />
          ) : (
            <div className="relative w-full aspect-[3/4]">
              <img 
                src={content} 
                alt="Content" 
                className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                loading="lazy"
              />
            </div>
          )}
        </div>
      );
    }

    if (isAlbum) {
      let urls: string[] = [];
      try {
        urls = JSON.parse(content);
      } catch (e) {
        return <p className="text-destructive text-xs">Ошибка загрузки альбома</p>;
      }

      const gridCols = urls.length === 1 ? 'grid-cols-1' : urls.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3';
      
      return (
        <div className={cn("grid gap-1.5 w-full min-w-[260px] max-w-[320px] md:max-w-[450px]", gridCols)}>
          {urls.map((url, idx) => (
            <div 
              key={idx}
              onClick={(e) => openGallery(idx, e)}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden border border-white/5 cursor-pointer group bg-muted/10",
                urls.length === 3 && idx === 0 ? "col-span-2 aspect-video" : ""
              )}
            >
              <img 
                src={url} 
                alt={`Img ${idx}`} 
                className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                loading="lazy"
              />
            </div>
          ))}
        </div>
      );
    }

    // Если это всё же данные, но не попали в проверки выше — не рендерим как текст
    if (content.startsWith('data:')) return null;

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
    <div id={`msg-${message.id}`} className={cn("w-full flex mb-2 transition-all scroll-mt-20", isMe ? "justify-end" : "justify-start")}>
      <div className={cn("flex gap-3 max-w-[90%] relative group px-2 items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && <UserAvatar userId={message.senderId} className="h-9 w-9 shrink-0" fallbackName={message.senderName} />}
        <div className={cn("flex flex-col min-w-0 max-w-full relative", isMe ? "items-end" : "items-start")}>
          {!isMe && isGroup && <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 ml-1 truncate max-w-[150px]">{message.senderName}</span>}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className={cn(
                "p-2.5 rounded-2xl shadow-md border transition-all relative group/bubble cursor-pointer", 
                isMe ? "message-bubble-me border-none" : "bg-card border-white/5 text-white"
              )}>
                {renderContent()}
                <div className="flex items-center justify-end gap-1 mt-1.5 opacity-60">
                  <span className="text-[9px] font-bold">{formattedTime}</span>
                  {isMe && (message.isRead ? <CheckCheck className="w-3.5 h-3.5 text-accent" /> : <Check className="w-3.5 h-3.5" />)}
                </div>
                
                <div className={cn(
                  "absolute top-0 opacity-0 group-hover/bubble:opacity-100 transition-opacity hidden md:flex",
                  isMe ? "-left-10" : "-right-10"
                )}>
                   <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-card/50 backdrop-blur-xl border border-white/10">
                      <MoreVertical className="w-4 h-4" />
                   </Button>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMe ? 'end' : 'start'} className="w-52 bg-card/95 backdrop-blur-2xl border-white/10 rounded-2xl shadow-2xl">
              <DropdownMenuItem onClick={() => onReply(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider"><CornerUpLeft className="w-4 h-4 text-primary" /> Ответить</DropdownMenuItem>
              {isAdmin && <DropdownMenuItem onClick={() => onPin(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider"><Pin className="w-4 h-4 text-primary" /> Закрепить</DropdownMenuItem>}
              {isMe && message.contentType === 'text' && <DropdownMenuItem onClick={() => onEdit(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider"><Edit2 className="w-4 h-4 text-primary" /> Изменить</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(message.content); toast({ title: "Скопировано" }); }} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider"><Copy className="w-4 h-4 text-primary" /> Копировать</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              {(isMe || isAdmin) && <DropdownMenuItem onClick={() => deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id))} className="text-destructive gap-3 py-3 font-bold text-[11px] uppercase tracking-wider hover:bg-destructive/10"><Trash2 className="w-4 h-4" /> Удалить</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <MediaGalleryModal 
        isOpen={isGalleryOpen} 
        onOpenChange={setIsGalleryOpen} 
        media={message.contentType === 'album' ? JSON.parse(message.content) : [message.content]} 
        type={message.contentType === 'video' || message.content.startsWith('data:video') ? 'video' : 'image'} 
        setApi={setApi}
        api={api}
      />
    </div>
  );
});
MessageItem.displayName = 'MessageItem';

function MediaGalleryModal({ isOpen, onOpenChange, media, type, setApi, api }: { isOpen: boolean, onOpenChange: (o: boolean) => void, media: string[], type: string, setApi: (api: CarouselApi) => void, api?: CarouselApi }) {
  const [current, setCurrent] = useState(1);

  useEffect(() => {
    if (!api) return;
    
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap() + 1);
    };

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-full h-[100dvh] p-0 bg-black/98 border-none flex items-center justify-center overflow-hidden z-[1000]">
        <DialogTitle className="sr-only">Просмотр медиафайлов</DialogTitle>
        
        <Carousel setApi={setApi} className="w-full h-full flex items-center justify-center">
          <CarouselContent className="h-full">
            {media.map((url, idx) => (
              <CarouselItem key={idx} className="h-full w-full flex items-center justify-center">
                <div className="relative w-full h-full flex items-center justify-center p-2 md:p-8 animate-in fade-in zoom-in duration-300">
                  {type === 'video' ? (
                    <video src={url} controls autoPlay className="max-w-full max-h-full rounded-xl shadow-2xl" />
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img 
                        src={url} 
                        alt={`Media ${idx}`} 
                        className="max-w-full max-h-full object-contain"
                      />
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
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-2xl px-6 py-2.5 rounded-full border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl">
                {current} / {media.length}
              </div>
            </>
          )}
        </Carousel>

        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-6 right-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white z-[1100] backdrop-blur-xl border border-white/5"
          onClick={() => onOpenChange(false)}
        >
          <X className="w-6 h-6" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
