
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
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { format } from 'date-fns';
import { 
  CornerUpLeft, Trash2, Check, CheckCheck, Edit2, Copy, Pin, X, Share2, Play, Smile, Lock, Languages, Loader2, Image as ImageIcon
} from 'lucide-react';
import { cn, decryptSignal, isGlobalAdmin } from '@/lib/utils';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Message, PollOption } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';

const QUICK_REACTIONS = ['❤️', '👍', '🔥', '😂', '😮', '😢', '💯'];

export const MessageItem = memo(({ message, isMe, chatId, onReply, onPin, onForward, isAdmin = false, isGroup = false, onEdit, highlight = false, viewerProfile }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isKernelAdmin = useMemo(() => isGlobalAdmin(viewerProfile), [viewerProfile]);
  const displayContent = useMemo(() => message.contentType === 'text' ? decryptSignal(message.content) : message.content, [message.content, message.contentType]);
  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  const handleReaction = async (emoji: string) => {
    if (!db || !user || !chatId) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
    const hasReacted = message.reactions?.[emoji]?.includes(user.uid);
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    if (hasReacted) await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayRemove(user.uid) });
    else await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(user.uid) });
  };

  const handleTranscribe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!viewerProfile?.isPremium) { toast({ title: "Nuxus Premium", description: "Расшифровка только для Premium." }); return; }
    setIsTranscribing(true);
    try { const res = await transcribeVoice({ audioDataUri: message.content }); setTranscription(res.text); }
    catch (e) { toast({ title: "Ошибка ИИ" }); } finally { setIsTranscribing(false); }
  };

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) {
      audioRef.current = new Audio(message.content);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => { 
        toast({ title: "Ошибка проигрывателя", variant: "destructive" }); 
        setIsPlaying(false); 
      };
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        toast({ title: "Ошибка безопасности браузера", variant: "destructive" });
      });
    }
    setIsPlaying(!isPlaying);
  };

  const renderContent = () => {
    if (message.contentType === 'sticker') return <img src={message.content} alt="Sticker" className="w-40 h-40 object-contain pointer-events-none" />;
    
    if (message.contentType === 'image') return (
      <div 
        className="relative max-w-[280px] rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black/20 cursor-pointer active:scale-[0.98] transition-transform"
        onClick={(e) => { e.stopPropagation(); window.open(message.content, '_blank'); }}
      >
        <img 
          src={message.content} 
          alt="Shared Image" 
          className="w-full h-auto object-cover max-h-[400px] animate-in fade-in duration-500" 
          loading="lazy"
        />
      </div>
    );

    if (message.contentType === 'video_note') return (
      <div 
        className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-primary/20 bg-black group cursor-pointer" 
        onClick={(e) => { 
          e.stopPropagation();
          if (videoRef.current) { if (videoRef.current.paused) videoRef.current.play(); else videoRef.current.pause(); } 
        }}
      >
        <video ref={videoRef} src={message.content} loop playsInline className="w-full h-full object-cover scale-x-[-1]" />
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Play className="w-8 h-8 text-white fill-white" /></div>
      </div>
    );

    if (message.contentType === 'audio') return (
      <div className="flex items-center gap-3 p-1 min-w-[200px] cursor-pointer" onClick={toggleAudio}>
        <Button size="icon" className="h-10 w-10 rounded-full bg-primary shadow-lg shadow-primary/20 pointer-events-none">
          {isPlaying ? <X /> : <Play fill="currentColor" />}
        </Button>
        <div className="flex-1 flex flex-col justify-center">
          <div className="h-1 bg-white/10 w-full rounded-full overflow-hidden">
            <div className={cn("h-full bg-white transition-all", isPlaying ? "w-full animate-pulse" : "w-0")} />
          </div>
          <button onClick={handleTranscribe} className="text-[9px] font-black text-primary uppercase mt-1 flex items-center gap-1">
            {isTranscribing ? <Loader2 className="animate-spin w-3 h-3" /> : <><Languages className="w-3 h-3" /> A💬</>}
          </button>
        </div>
      </div>
    );

    if (message.contentType === 'poll') return (
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10 min-w-[240px]">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-primary/20 p-1.5 rounded-lg"><CheckCheck className="w-4 h-4 text-primary" /></div>
          <span className="font-bold text-sm">{message.pollData?.question}</span>
        </div>
        <div className="space-y-2">
          {message.pollData?.options.map((opt: any) => (
            <button key={opt.id} className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-primary/40 transition-all text-xs flex justify-between items-center group">
              <span>{opt.text}</span>
              <span className="opacity-40 group-hover:opacity-100">{opt.votes?.length || 0}</span>
            </button>
          ))}
        </div>
        <p className="text-[8px] text-muted-foreground uppercase font-bold mt-3 text-center tracking-widest">{message.pollData?.isAnonymous ? 'Анонимный опрос' : 'Открытый опрос'}</p>
      </div>
    );

    return <div className="whitespace-pre-wrap text-[15px] break-words max-w-[300px] leading-relaxed relative">{displayContent} {message.editedAt && <span className="text-[8px] ml-1.5 opacity-40 uppercase">(ред.)</span>}</div>;
  };

  if (message.contentType === 'service') return <div className="w-full flex justify-center my-4"><div className="bg-white/5 backdrop-blur-md px-6 py-2 rounded-full border border-white/10"><p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">{message.content}</p></div></div>;

  return (
    <div className={cn("w-full flex mb-2 transition-all", isMe ? "justify-end" : "justify-start", highlight && "scale-[1.02]")}>
      <div className={cn("flex gap-3 max-w-[90%] items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && <UserAvatar userId={message.senderId} className="h-9 w-9 shrink-0" fallbackName={message.senderName} />}
        <div className={cn("flex flex-col min-w-0 max-w-full", isMe ? "items-end" : "items-start")}>
          {!isMe && isGroup && <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 ml-1 truncate max-w-[150px]">{message.senderName}</span>}
          
          <ContextMenu>
            <ContextMenuTrigger>
              <div className="cursor-pointer active:scale-[0.98] outline-none group/bubble">
                <div className={cn("p-2.5 rounded-2xl border transition-all relative", isMe ? "message-bubble-me border-none" : "bg-card border-white/5 text-white")}>
                  {message.replyToId && <div className="mb-2 p-2 border-l-2 bg-white/5 rounded-r-lg opacity-60 text-[10px] truncate">{decryptSignal(message.replyToContent)}</div>}
                  {renderContent()}
                  <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                    {message.contentType === 'text' && <Lock className="w-2.5 h-2.5" />}
                    <span className="text-[9px] font-bold">{formattedTime}</span>
                    {isMe && (message.isRead ? <CheckCheck className="w-3.5 h-3.5 text-accent" /> : <Check className="w-3.5 h-3.5" />)}
                  </div>
                </div>
                {message.reactions && Object.keys(message.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(message.reactions).map(([emoji, uids]) => (uids as string[]).length > 0 && (
                      <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-black", (uids as string[]).includes(user?.uid || '') ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/5 text-muted-foreground")}>
                        <span>{emoji}</span><span>{(uids as string[]).length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </ContextMenuTrigger>
            
            <ContextMenuContent className="w-64 bg-card/95 backdrop-blur-xl border-white/10 rounded-2xl shadow-2xl p-1">
              <div className="flex justify-around p-2 border-b border-white/5 mb-1">
                {QUICK_REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => handleReaction(emoji)} className="text-xl hover:scale-125 transition-transform">{emoji}</button>
                ))}
              </div>
              <ContextMenuItem onClick={() => onReply(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider rounded-xl"><CornerUpLeft className="w-4 h-4" /> Ответить</ContextMenuItem>
              {isMe && <ContextMenuItem onClick={() => onEdit(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider rounded-xl"><Edit2 className="w-4 h-4" /> Изменить</ContextMenuItem>}
              <ContextMenuItem onClick={() => onForward(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider rounded-xl"><Share2 className="w-4 h-4" /> Переслать</ContextMenuItem>
              <ContextMenuItem onClick={() => onPin(message)} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider rounded-xl"><Pin className="w-4 h-4" /> Закрепить</ContextMenuItem>
              <ContextMenuItem onClick={() => { navigator.clipboard.writeText(displayContent); toast({ title: "Скопировано" }); }} className="gap-3 py-3 font-bold text-[11px] uppercase tracking-wider rounded-xl"><Copy className="w-4 h-4" /> Копировать</ContextMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              {(isMe || isAdmin || isKernelAdmin) && (
                <ContextMenuItem onClick={() => deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id))} className="text-destructive gap-3 py-3 font-bold text-[11px] uppercase tracking-wider"><Trash2 className="w-4 h-4" /> Удалить</ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
    </div>
  );
});
MessageItem.displayName = 'MessageItem';
