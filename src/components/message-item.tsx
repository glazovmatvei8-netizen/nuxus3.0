
"use client"

import React, { useState, memo, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { 
  CornerUpLeft, Trash2, Check, CheckCheck, Edit2, Copy, Pin, FileText, Sparkles, Loader2, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Message } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';
import Image from 'next/image';

export const MessageItem = memo(({ message, isMe, chatId, onReply, onPin, isAdmin = false, isGroup = false, onEdit, amIPremium = false }: any) => {
  const db = useFirestore();
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(message.translation || null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const renderContent = () => {
    if (message.contentType === 'audio') {
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

    if (['image', 'video'].includes(message.contentType)) {
      return (
        <Dialog>
          <DialogTrigger asChild>
            <div className="overflow-hidden rounded-2xl border border-white/5 max-w-[240px] cursor-zoom-in group relative">
              {message.contentType === 'video' ? (
                <video src={message.content} className="w-full h-full object-cover" />
              ) : (
                <div className="relative w-[240px] h-[320px]">
                  <Image src={message.content} alt="Media content" fill className="object-cover transition-transform group-hover:scale-105" />
                </div>
              )}
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-transparent border-none flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center group">
              {message.contentType === 'video' ? (
                <video src={message.content} controls autoPlay className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" />
              ) : (
                <div className="relative w-screen h-screen">
                   <Image src={message.content} alt="Full screen" fill className="object-contain" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <div className="flex flex-col text-left">
        <div className="whitespace-pre-wrap text-sm break-words max-w-[300px]">{message.content}{message.editedAt && <span className="text-[8px] ml-1 opacity-40 uppercase">(ред.)</span>}</div>
      </div>
    );
  };

  if (message.contentType === 'service') return <div className="w-full flex justify-center my-4 px-4"><div className="bg-white/5 backdrop-blur-md px-6 py-2 rounded-full border border-white/10"><p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest text-center">{message.content}</p></div></div>;

  return (
    <div id={`msg-${message.id}`} className={cn("w-full flex mb-2 transition-all scroll-mt-20", isMe ? "justify-end" : "justify-start")}>
      <div className={cn("flex gap-3 max-w-[85%] relative group px-2 items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && <UserAvatar userId={message.senderId} className="h-9 w-9 shrink-0" fallbackName={message.senderName} />}
        <div className={cn("flex flex-col min-w-0 max-w-full relative", isMe ? "items-end" : "items-start")}>
          {!isMe && isGroup && <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 ml-1 truncate max-w-[150px]">{message.senderName}</span>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className={cn("p-3 rounded-2xl cursor-pointer shadow-md border transition-all hover:opacity-95", isMe ? "message-bubble-me border-none" : "bg-card border-white/5 text-foreground")}>
                {renderContent()}
                <div className="flex items-center justify-end gap-1 mt-1 opacity-60"><span className="text-[9px]">{formattedTime}</span>{isMe && (message.isRead ? <CheckCheck className="w-3 h-3 text-accent" /> : <Check className="w-3 h-3" />)}</div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMe ? 'end' : 'start'} className="w-48 bg-card border-white/10">
              <DropdownMenuItem onClick={() => onReply(message)} className="gap-2"><CornerUpLeft className="w-4 h-4" /> Ответить</DropdownMenuItem>
              {isAdmin && <DropdownMenuItem onClick={() => onPin(message)} className="gap-2"><Pin className="w-4 h-4" /> Закрепить</DropdownMenuItem>}
              {isMe && message.contentType === 'text' && <DropdownMenuItem onClick={() => onEdit(message)} className="gap-2"><Edit2 className="w-4 h-4" /> Изменить</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(message.content); toast({ title: "Скопировано" }); }} className="gap-2"><Copy className="w-4 h-4" /> Копировать</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              {(isMe || isAdmin) && <DropdownMenuItem onClick={() => deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id))} className="text-destructive gap-2"><Trash2 className="w-4 h-4" /> Удалить</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});
MessageItem.displayName = 'MessageItem';
