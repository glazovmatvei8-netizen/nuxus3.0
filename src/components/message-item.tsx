
"use client"

import React, { useState, useEffect, memo, useMemo, useRef } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { useAppState } from '@/lib/store';
import { UserAvatar } from '@/components/user-avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { 
  CornerUpLeft, Trash2, Check, CheckCheck, Languages, Loader2, 
  Forward, Edit2, Copy, Timer, EyeOff, Clock, Search, X,
  ChevronLeft, ChevronRight, Pause, Play, BarChart3, PlayCircle, Pin,
  Globe2, Gift, Code2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, updateDoc, collection, addDoc, getDoc } from 'firebase/firestore';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';
import type { Message, PollOption, User } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const MessageItem = memo(({ message, isMe, chatId, onReply, amIPremium = false, isAdmin = false, isGroup = false, onEdit }: any) => {
  const db = useFirestore();
  const { user } = useUser();
  const { setForwardingMessage } = useAppState();
  const { toast } = useToast();
  
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  useEffect(() => {
    if (message.expiresInSeconds && !message.isExpired && countdown === null) {
      setCountdown(message.expiresInSeconds);
    }
  }, [message.expiresInSeconds, message.isExpired, countdown]);

  useEffect(() => {
    if (countdown !== null) {
      if (countdown <= 0) {
        deleteDocumentNonBlocking(doc(db, 'chats', chatId, 'messages', message.id));
        return;
      }
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, chatId, message.id, db]);

  const toggleAudio = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (!audioRef.current) {
      audioRef.current = new Audio(message.content);
      audioRef.current.addEventListener('timeupdate', () => { if (audioRef.current) setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100); });
      audioRef.current.addEventListener('ended', () => { setIsPlaying(false); setAudioProgress(0); });
    }
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play().catch(() => {});
    setIsPlaying(!isPlaying);
  };

  const albumMedia = useMemo(() => {
    if (message.contentType === 'album') { try { return JSON.parse(message.content); } catch (e) { return []; } }
    if (['image', 'video', 'video_note'].includes(message.contentType)) return [{ url: message.content, type: message.contentType === 'video_note' ? 'video' : message.contentType }];
    return [];
  }, [message.contentType, message.content]);

  const renderContent = () => {
    if (message.scheduledAt && new Date(message.scheduledAt).getTime() > Date.now()) return <div className="flex items-center gap-2 py-1 px-2 opacity-50 italic text-[10px]"><Clock className="w-4 h-4" /> Запланировано</div>;
    if (message.isExpired) return <div className="flex items-center gap-2 py-1 px-2 opacity-50 italic text-[10px]"><EyeOff className="w-4 h-4" /> Сообщение просмотрено</div>;
    
    if (message.contentType === 'gift') {
      return (
        <div className="flex flex-col items-center gap-3 p-2 min-w-[180px]">
          <div className="bg-primary/20 p-4 rounded-full relative">
            <Gift className="w-10 h-10 text-primary animate-bounce" />
            <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Новый подарок!</p>
            <p className="text-xs font-bold text-white">Вы получили предмет</p>
            {message.giftMessage && <p className="text-[10px] italic text-muted-foreground mt-1">"{message.giftMessage}"</p>}
          </div>
        </div>
      );
    }

    if (message.contentType === 'poll' && message.pollData) {
      const totalVotes = message.pollData.options.reduce((acc: number, opt: PollOption) => acc + opt.votes.length, 0);
      return (
        <div className="flex flex-col gap-4 mt-1 min-w-[240px] p-1">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase text-accent tracking-[0.2em] flex items-center gap-1.5"><BarChart3 className="w-3 h-3" /> Опрос</span>
            <h4 className="text-sm font-bold text-white leading-tight">{message.pollData.question}</h4>
            <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">{message.pollData.isAnonymous ? 'Анонимный' : 'Публичный'} • {totalVotes} голосов</span>
          </div>
          <div className="space-y-3">
            {message.pollData.options.map((opt: PollOption) => {
              const voteCount = opt.votes.length;
              const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
              const hasVoted = user && opt.votes.includes(user.uid);
              return (
                <div key={opt.id} onClick={(e) => { e.stopPropagation(); if (!db || !user) return; const updatedOptions = message.pollData.options.map((o: PollOption) => { if (o.id === opt.id) { const voted = o.votes.includes(user.uid); return { ...o, votes: voted ? o.votes.filter(id => id !== user.uid) : [...o.votes, user.uid] }; } if (!message.pollData.isMultiple) return { ...o, votes: o.votes.filter(id => id !== user.uid) }; return o; }); updateDocumentNonBlocking(doc(db, 'chats', chatId, 'messages', message.id), { 'pollData.options': updatedOptions }); }} className="space-y-1.5 cursor-pointer group">
                  <div className="flex justify-between items-center px-1"><span className={cn("text-xs transition-colors", hasVoted ? "text-primary font-bold" : "text-white/80 group-hover:text-white")}>{opt.text}</span><span className="text-[10px] font-mono text-muted-foreground">{voteCount}</span></div>
                  <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden"><div className={cn("h-full transition-all duration-500 rounded-full", hasVoted ? "bg-primary" : "bg-muted-foreground/30")} style={{ width: `${percentage}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (message.contentType === 'text' && message.content.startsWith('```')) {
      const code = message.content.replace(/```/g, '').trim();
      return (
        <div className="flex flex-col gap-2 min-w-[280px]">
          <div className="flex items-center justify-between px-2">
            <span className="text-[8px] font-black uppercase text-primary tracking-widest flex items-center gap-1"><Code2 className="w-3 h-3" /> Содержимое кода</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(code); toast({ title: "Код скопирован" }); }}><Copy className="w-3 h-3" /></Button>
          </div>
          <pre className="bg-black/40 p-3 rounded-xl border border-white/5 overflow-x-auto scrollbar-hide">
            <code className="text-[11px] font-mono text-blue-300 leading-relaxed">{code}</code>
          </pre>
        </div>
      );
    }

    if (['album', 'image', 'video'].includes(message.contentType)) {
      const isOneTime = message.isOneTimeView;
      return (
        <div className="flex flex-col gap-1">
          {isOneTime && <div className="flex items-center gap-1.5 mb-1 px-1"><EyeOff className="w-3 h-3 text-accent" /><span className="text-[8px] font-bold uppercase text-accent tracking-widest">Один просмотр</span></div>}
          <div className={cn("grid gap-1 mt-1 overflow-hidden rounded-2xl", albumMedia.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
            {albumMedia.map((media: any, idx: number) => (
              <div key={idx} onClick={(e) => { e.stopPropagation(); if(!message.isExpired) { setGalleryIndex(idx); setGalleryOpen(true); } }} className={cn("relative cursor-pointer group bg-black border border-white/5 overflow-hidden", albumMedia.length === 1 ? "w-64 h-64" : "h-32")}>
                {media.type === 'video' ? <video src={media.url} className={cn("w-full h-full object-cover", isOneTime && "blur-2xl opacity-40")} muted playsInline /> : <img src={media.url} className={cn("w-full h-full object-cover", isOneTime && "blur-2xl opacity-40")} />}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">{media.type === 'video' ? <PlayCircle className="w-8 h-8 text-white/50" /> : <Search className="w-6 h-6 text-white/0 group-hover:text-white/50 transition-all" />}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col text-left">
        {message.forwardFrom && <div className="flex items-center gap-1.5 mb-1 opacity-50 border-l-2 border-white/10 pl-2"><Forward className="w-2.5 h-2.5" /><span className="text-[8px] font-bold uppercase">Переслано от {message.forwardFrom}</span></div>}
        <div className="whitespace-pre-wrap text-sm break-words max-w-[300px]">{message.content}{message.editedAt && <span className="text-[8px] ml-1 opacity-40 uppercase">(ред.)</span>}</div>
      </div>
    );
  };

  if (message.contentType === 'service') return <div className="w-full flex justify-center my-4 px-4"><div className="max-w-[75%] bg-white/5 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-sm"><p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em] text-center break-words">{message.content}</p></div></div>;

  return (
    <>
    <div id={`msg-${message.id}`} className={cn("w-full flex mb-2 transition-all scroll-mt-20", isMe ? "justify-end" : "justify-start")}>
      <div className={cn("flex gap-3 max-w-[85%] relative group px-2 items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && <UserAvatar userId={message.senderId} className="h-9 w-9 shrink-0" fallbackName={message.senderName} />}
        <div className={cn("flex flex-col min-w-0 max-w-full relative", isMe ? "items-end" : "items-start")}>
          {!isMe && isGroup && <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 ml-1 truncate max-w-[150px]">{message.senderName}</span>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className={cn("p-3 rounded-2xl cursor-pointer shadow-md border transition-all hover:opacity-95", isMe ? "message-bubble-me border-none" : "bg-card border-white/5 text-foreground", message.isMentionAll && !isMe && "border-accent shadow-lg shadow-accent/10")}>
                {renderContent()}
                <div className="flex items-center justify-end gap-1 mt-1 opacity-60"><span className="text-[9px]">{formattedTime}</span>{isMe && (message.isRead ? <CheckCheck className="w-3 h-3 text-accent" /> : <Check className="w-3 h-3" />)}</div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMe ? 'end' : 'start'} className="w-48 bg-card border-white/10">
              <DropdownMenuItem onClick={() => onReply(message)} className="gap-2"><CornerUpLeft className="w-4 h-4" /> Ответить</DropdownMenuItem>
              {isAdmin && <DropdownMenuItem onClick={() => {}} className="gap-2"><Pin className="w-4 h-4" /> Закрепить</DropdownMenuItem>}
              {isMe && message.contentType === 'text' && <DropdownMenuItem onClick={() => onEdit(message)} className="gap-2"><Edit2 className="w-4 h-4" /> Изменить</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => { setForwardingMessage(message); toast({ title: "Выберите чат для пересылки" }); }} className="gap-2"><Forward className="w-4 h-4" /> Переслать</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              {(isMe || isAdmin) && <DropdownMenuItem onClick={() => deleteDocumentNonBlocking(doc(db, 'chats', chatId, 'messages', message.id))} className="text-destructive gap-2"><Trash2 className="w-4 h-4" /> Удалить</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
    <Dialog open={galleryOpen} onOpenChange={v => { if(!v) { if(!isMe && message.isOneTimeView) updateDocumentNonBlocking(doc(db, 'chats', chatId, 'messages', message.id), { isExpired: true }); setGalleryOpen(false); } }}>
      <DialogContent className="max-w-4xl h-[90vh] bg-black/95 border-none p-0 overflow-hidden flex flex-col items-center justify-center [&>button]:hidden">
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-50"><div className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{galleryIndex + 1} / {albumMedia.length}</div><Button variant="ghost" size="icon" className="bg-white/10 hover:bg-white/20 rounded-full text-white h-10 w-10" onClick={() => setGalleryOpen(false)}><X className="w-6 h-6" /></Button></div>
        <div className="relative w-full h-full flex items-center justify-center p-4">
          {albumMedia[galleryIndex]?.type === 'video' ? <video key={albumMedia[galleryIndex].url} src={albumMedia[galleryIndex].url} className="max-w-full max-h-full object-contain" autoPlay controls /> : <img key={albumMedia[galleryIndex]?.url} src={albumMedia[galleryIndex]?.url} className="max-w-full max-h-full object-contain" />}
          {albumMedia.length > 1 && (<><Button variant="ghost" size="icon" className="absolute left-4 bg-white/5 rounded-full h-12 w-12" onClick={() => setGalleryIndex(p => (p - 1 + albumMedia.length) % albumMedia.length)}><ChevronLeft className="w-8 h-8 text-white" /></Button><Button variant="ghost" size="icon" className="absolute right-4 bg-white/5 rounded-full h-12 w-12" onClick={() => setGalleryIndex(p => (p + 1) % albumMedia.length)}><ChevronRight className="w-8 h-8 text-white" /></Button></>)}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
});
MessageItem.displayName = 'MessageItem';
