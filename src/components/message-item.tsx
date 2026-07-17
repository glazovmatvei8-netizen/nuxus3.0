
"use client"

import React, { useState, memo, useRef, useEffect, useMemo } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { 
  CornerUpLeft, Trash2, Check, CheckCheck, Play, Pause, Share2, FileText, Copy, Loader2, Languages, MoreHorizontal, Star, Edit, MousePointer2, ShieldCheck
} from 'lucide-react';
import { cn, decryptSignal, isUserPremium, formatDisplayName } from '@/lib/utils';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Message, User } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';
import { translateMessage } from '@/ai/flows/ai-translate-flow';
import { Checkbox } from './ui/checkbox';

const SHAPE_CLIPS: Record<string, string> = {
  circle: 'circle(50% at 50% 50%)',
  square: 'inset(0% rounded 25%)',
  heart: 'polygon(50% 15%, 80% 0%, 100% 20%, 100% 50%, 50% 100%, 0% 50%, 0% 20%, 20% 0%)',
  triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
};

const QUICK_REACTIONS = ['❤️', '👀', '🤟', '🔥', '😭', '⚡', '👍', '❤️‍🔥'];

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteForEveryone, setDeleteForEveryone] = useState(true);

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

  const otherId = !isMe ? message.senderId : null;
  const otherUserRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUser } = useDoc<User>(otherUserRef);

  const senderTitle = message.metadata?.senderTitle || null;

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

  const handleReaction = async (emoji: string) => {
    if (!db || !chatId || !user) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
    const existing = message.reactions?.[emoji] || [];
    const hasReacted = existing.includes(user.uid);

    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(20);

    if (hasReacted) {
      await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayRemove(user.uid) });
    } else {
      await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(user.uid) });
    }
    setIsMenuOpen(false);
  };

  const handleDelete = async () => {
    if (!db || !chatId) return;
    try {
      const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
      await deleteDoc(msgRef);
      setIsDeleteModalOpen(false);
      toast({ title: "Сообщение удалено" });
    } catch (e) {
      toast({ title: "Сбой удаления", variant: "destructive" });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayContent);
    toast({ title: "Скопировано в буфер" });
    setIsMenuOpen(false);
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
      <div className="flex flex-col gap-1 relative">
        {message.replyToId && (
          <div className="bg-white/5 border-l-2 border-primary/50 p-2 rounded-lg mb-1 text-xs opacity-60">
            <span className="italic">{decryptSignal(message.replyToContent)}</span>
          </div>
        )}
        <div className="whitespace-pre-wrap text-[16px] break-words max-w-[320px] font-semibold pr-16">{displayContent}</div>
        {translation && (
          <div className="mt-2 pt-2 border-t border-white/10 italic text-[14px] text-primary/80 pr-16">
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
      <div className={cn("flex gap-3 max-w-[90%] items-end group/msg", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && (
          <div className="cursor-pointer active:scale-90 transition-transform mb-1" onClick={() => setInspectedUserId(message.senderId)}>
            <UserAvatar userId={message.senderId} className="h-10 w-10 shrink-0 border border-white/5" fallbackName={formatDisplayName(message.senderName)} />
          </div>
        )}
        <div className={cn("flex flex-col min-w-0 max-w-full", isMe ? "items-end" : "items-start")}>
          {!isMe && isGroup && (
            <div className="flex items-center gap-2 mb-1.5 ml-2">
              <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em] opacity-80">{formatDisplayName(message.senderName)}</span>
              {senderTitle && (
                <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md">
                   {senderTitle.toLowerCase().includes('владелец') || senderTitle.toLowerCase().includes('owner') ? (
                     <Star className="w-2.5 h-2.5 text-accent fill-accent" />
                   ) : (
                     <ShieldCheck className="w-2.5 h-2.5 text-primary" />
                   )}
                   <span className="text-[8px] font-black text-white/60 uppercase tracking-widest">{senderTitle}</span>
                </div>
              )}
            </div>
          )}
          
          <div className="relative flex items-center gap-2">
            {/* ТРИ ТОЧКИ ПЕРЕД СООБЩЕНИЕМ ДЛЯ МЕНЯ */}
            {isMe && (
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="p-2 rounded-full bg-white/5 opacity-0 group-hover/msg:opacity-100 transition-all hover:bg-white/10 shrink-0 md:opacity-0 sm:opacity-100"
              >
                <MoreHorizontal className="w-5 h-5 text-white/40" />
              </button>
            )}

            <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <PopoverTrigger asChild>
                <div className={cn(
                  "p-4 rounded-[1.8rem] transition-all relative shadow-2xl cursor-pointer hover:brightness-110",
                  isMe ? "bg-primary text-white rounded-br-none" : "bg-white/[0.08] backdrop-blur-md border border-white/5 rounded-bl-none text-white",
                  highlight && "ring-4 ring-primary scale-105"
                )}>
                  {renderContent()}
                  
                  <div className={cn(
                    "absolute bottom-2 right-4 flex items-center gap-1.5 px-1.5 py-0.5 rounded-full",
                    message.contentType === 'text' ? "bg-black/10 backdrop-blur-sm" : "bg-black/40"
                  )}>
                    <span className="text-[9px] font-black italic tabular-nums opacity-60">
                      {formattedTime}
                    </span>
                    {isMe && (
                      <div className="flex items-center opacity-60">
                        {message.isRead ? (
                          <CheckCheck className="w-3.5 h-3.5 text-accent" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </div>
                    )}
                  </div>

                  {message.reactions && Object.entries(message.reactions).some(([_, uids]) => (uids as string[]).length > 0) && (
                    <div className={cn(
                      "absolute -bottom-3 flex flex-wrap gap-1",
                      isMe ? "right-0" : "left-0"
                    )}>
                      {Object.entries(message.reactions).map(([emoji, uids]) => (uids as string[]).length > 0 && (
                        <button 
                          key={emoji} 
                          onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }}
                          className="bg-[#1c1c1e] border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-1 hover:bg-white/10 transition-all shadow-lg scale-90"
                        >
                          <span className="text-[12px]">{emoji}</span>
                          <span className="text-[9px] font-black text-white">{(uids as string[]).length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverTrigger>

              <PopoverContent 
                side="top" 
                align={isMe ? "end" : "start"} 
                className="w-72 bg-[#0a0a0c]/95 backdrop-blur-[60px] border-white/10 rounded-[2.2rem] shadow-2xl p-0 overflow-hidden outline-none animate-in zoom-in-95 duration-200 z-[1000]"
                collisionPadding={16}
              >
                <div className="flex justify-between items-center px-4 py-3 bg-white/5 border-b border-white/5">
                   {QUICK_REACTIONS.map(emoji => (
                     <button 
                       key={emoji} 
                       onClick={() => handleReaction(emoji)}
                       className="text-2xl hover:scale-125 active:scale-90 transition-transform duration-200"
                     >
                       {emoji}
                     </button>
                   ))}
                </div>

                <div className="p-2 space-y-0.5">
                   <ActionMenuItem icon={CornerUpLeft} label="Ответить" onClick={() => { onReply(message); setIsMenuOpen(false); }} />
                   <ActionMenuItem icon={Share2} label="Переслать" onClick={() => { onForward(message); setIsMenuOpen(false); }} />
                   <ActionMenuItem icon={Star} label="В избранное" onClick={() => setIsMenuOpen(false)} />
                   {message.contentType === 'text' && <ActionMenuItem icon={Copy} label="Копировать текст" onClick={copyToClipboard} />}
                   {isMe && <ActionMenuItem icon={Edit} label="Редактировать" onClick={() => setIsMenuOpen(false)} />}
                   <div className="h-px bg-white/5 mx-2 my-1" />
                   <ActionMenuItem 
                     icon={Trash2} 
                     label="Удалить" 
                     variant="destructive" 
                     onClick={() => { setIsDeleteModalOpen(true); setIsMenuOpen(false); }} 
                   />
                </div>
              </PopoverContent>
            </Popover>

            {/* ТРИ ТОЧКИ ПОСЛЕ СООБЩЕНИЯ ДЛЯ ДРУГИХ */}
            {!isMe && (
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="p-2 rounded-full bg-white/5 opacity-0 group-hover/msg:opacity-100 transition-all hover:bg-white/10 shrink-0 md:opacity-0 sm:opacity-100"
              >
                <MoreHorizontal className="w-5 h-5 text-white/40" />
              </button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-xs bg-[#0a0a0c]/98 border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl outline-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic text-white text-center w-full">Удаление</DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2 text-center w-full">
              Удалить это сообщение?
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
             <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-white">Для всех</span>
                  <span className="text-[9px] text-primary/60 font-black uppercase tracking-widest">Аннигиляция сигнала</span>
                </div>
                <Checkbox 
                  checked={deleteForEveryone} 
                  onCheckedChange={(v: any) => setDeleteForEveryone(v)} 
                  className="rounded-full border-primary w-6 h-6 data-[state=checked]:bg-primary"
                />
             </div>
          </div>

          <DialogFooter className="flex flex-col gap-2">
            <Button 
              variant="destructive" 
              className="w-full h-14 rounded-2xl font-black uppercase italic tracking-widest shadow-xl"
              onClick={handleDelete}
            >
              Удалить
            </Button>
            <Button 
              variant="ghost" 
              className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest text-muted-foreground"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Отмена
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

function ActionMenuItem({ icon: Icon, label, onClick, variant = 'default' }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-white/5 transition-all group",
        variant === 'destructive' ? "text-red-500 hover:bg-red-500/10" : "text-white"
      )}
    >
      <span className="text-[14px] font-bold italic tracking-tight">{label}</span>
      <Icon className={cn("w-5 h-5", variant === 'destructive' ? "text-red-500" : "text-white/20 group-hover:text-primary")} />
    </button>
  );
}

MessageItem.displayName = 'MessageItem';
