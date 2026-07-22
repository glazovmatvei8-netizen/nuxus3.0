
"use client"

import React, { useState, memo, useRef, useMemo } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from 'date-fns';
import { 
  CornerUpLeft, Trash2, Check, CheckCheck, Play, Share2, Copy, Edit2, MoreHorizontal, ShieldCheck, Star, Wand2, Loader2, RotateCcw, EyeOff, Eye
} from 'lucide-react';
import { cn, decryptSignal, isUserPremium, formatDisplayName } from '@/lib/utils';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Message, User } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';

/**
 * MESSAGE ITEM V5.8.0 «ELITE RESTORATION»
 * Исправлено: Нейронная расшифровка (Hide/Retry), полное меню действий.
 */
export const MessageItem = memo(({ message, isMe, chatId, onReply, onForward, isAdmin = false, isGroup = false, highlight = false, viewerProfile }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { setInspectedUserId } = useAppState();
  const { toast } = useToast();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranscriptionVisible, setIsTranscriptionVisible] = useState(true);
  const [transcription, setTranscription] = useState<string | null>(message.metadata?.transcription || null);

  const displayContent = useMemo(() => {
    return message.contentType === 'text' ? decryptSignal(message.content) : message.content;
  }, [message.content, message.contentType]);

  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  const handleTranscribe = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (message.contentType !== 'audio') return;
    setIsTranscribing(true);
    setIsTranscriptionVisible(true);
    try {
      const { text } = await transcribeVoice({ audioDataUri: message.content });
      setTranscription(text);
      if (db && chatId) {
        await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), { 'metadata.transcription': text });
      }
    } catch (e) {
      toast({ title: "Сбой расшифровки", variant: "destructive" });
    } finally {
      setIsTranscribing(false);
    }
  };

  const copyToClipboard = () => {
    const text = message.contentType === 'text' ? displayContent : transcription || '';
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: "Скопировано в буфер" });
    setIsMenuOpen(false);
  };

  const handleDeleteMessage = async () => {
    if (!db || !chatId) return;
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', message.id));
      setIsMenuOpen(false);
    } catch (e) { }
  };

  return (
    <div className={cn("w-full flex mb-2", isMe ? "justify-end" : "justify-start")}>
      <div className={cn("flex gap-3 max-w-[90%] items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && <UserAvatar userId={message.senderId} className="h-10 w-10 cursor-pointer" onClick={() => setInspectedUserId(message.senderId)} />}
        <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
          <div className="relative flex items-center gap-2 group">
            <div className={cn(
              "p-4 rounded-[1.8rem] relative shadow-xl min-w-[80px]",
              isMe ? "bg-primary text-white rounded-br-none" : "bg-white/[0.08] backdrop-blur-md border border-white/5 rounded-bl-none text-white",
              message.metadata?.bubbleStyle === 'neon' && "shadow-[0_0_20px_rgba(168,85,247,0.3)] border-primary/30"
            )}>
              {message.contentType === 'audio' ? (
                <div className="space-y-3 min-w-[220px]">
                   <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/10 shrink-0"><Play className="w-5 h-5 fill-current" /></Button>
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-white/40 w-1/4" /></div>
                      <span className="text-[10px] font-bold opacity-60">
                        {message.metadata?.duration ? `${Math.floor(message.metadata.duration / 60)}:${(message.metadata.duration % 60).toString().padStart(2, '0')}` : '0:00'}
                      </span>
                   </div>
                   
                   {transcription && isTranscriptionVisible && (
                     <div className="bg-black/10 p-3 rounded-2xl border border-white/5 relative group/t">
                        <p className="text-[12px] italic text-white/80 leading-relaxed pr-8">{transcription}</p>
                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover/t:opacity-100 transition-opacity">
                           <button onClick={() => handleTranscribe()} className="p-1 hover:text-primary"><RotateCcw className="w-3 h-3" /></button>
                           <button onClick={() => setIsTranscriptionVisible(false)} className="p-1 hover:text-white"><EyeOff className="w-3 h-3" /></button>
                        </div>
                     </div>
                   )}

                   {(!transcription || !isTranscriptionVisible) && (
                     <Button 
                       onClick={() => !transcription ? handleTranscribe() : setIsTranscriptionVisible(true)} 
                       disabled={isTranscribing}
                       variant="ghost" 
                       className="w-full h-9 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-widest gap-2"
                     >
                       {isTranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : transcription ? <><Eye className="w-3.5 h-3.5" /> Показать текст</> : <><Wand2 className="w-3.5 h-3.5 text-primary" /> Расшифровать</>}
                     </Button>
                   )}
                </div>
              ) : message.contentType === 'image' ? (
                <img src={message.content} className="max-w-[280px] rounded-2xl border border-white/10" alt="Signal" />
              ) : (
                <div className="whitespace-pre-wrap text-[15px] font-medium break-words max-w-[280px]">{displayContent}</div>
              )}

              <div className="mt-1 flex items-center justify-end gap-1.5 opacity-60">
                 <span className="text-[9px] font-black tabular-nums">{formattedTime}</span>
                 {isMe && (message.isRead ? <CheckCheck className="w-3 h-3 text-accent" /> : <Check className="w-3 h-3" />)}
              </div>
            </div>

            <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <PopoverTrigger asChild>
                <button className="p-2 rounded-full hover:bg-white/5 text-white/20 opacity-0 group-hover:opacity-100 transition-all"><MoreHorizontal className="w-5 h-5" /></button>
              </PopoverTrigger>
              <PopoverContent side="top" align={isMe ? "end" : "start"} className="w-56 bg-[#0a0a0c]/95 backdrop-blur-xl border-white/10 rounded-[1.8rem] p-2 shadow-2xl z-[1000] outline-none">
                 <ActionMenuItem icon={CornerUpLeft} label="Ответить" onClick={() => { onReply(message); setIsMenuOpen(false); }} />
                 <ActionMenuItem icon={Share2} label="Переслать" onClick={() => { onForward(message); setIsMenuOpen(false); }} />
                 <ActionMenuItem icon={Copy} label="Копировать" onClick={copyToClipboard} />
                 {isMe && <ActionMenuItem icon={Trash2} label="Удалить" variant="destructive" onClick={handleDeleteMessage} />}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
});

function ActionMenuItem({ icon: Icon, label, onClick, variant = 'default' }: any) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-white/5 transition-all", variant === 'destructive' ? "text-red-500" : "text-white")}>
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
      <Icon className="w-4 h-4 opacity-40" />
    </button>
  );
}

MessageItem.displayName = 'MessageItem';
