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
  CornerUpLeft, Trash2, Check, CheckCheck, Play, Share2, Copy, Edit2, MoreHorizontal, ShieldCheck, Star
} from 'lucide-react';
import { cn, decryptSignal, isUserPremium, formatDisplayName } from '@/lib/utils';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Message, User } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';

export const MessageItem = memo(({ message, isMe, chatId, onReply, onForward, isAdmin = false, isGroup = false, highlight = false, viewerProfile }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { setInspectedUserId } = useAppState();
  const { toast } = useToast();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const displayContent = useMemo(() => {
    return message.contentType === 'text' ? decryptSignal(message.content) : message.content;
  }, [message.content, message.contentType]);

  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  const handleReaction = async (emoji: string) => {
    if (!db || !chatId || !user) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
    const existing = message.reactions?.[emoji] || [];
    const hasReacted = existing.includes(user.uid);
    if (hasReacted) {
      await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayRemove(user.uid) });
    } else {
      await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(user.uid) });
    }
    setIsMenuOpen(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayContent);
    toast({ title: "Скопировано" });
    setIsMenuOpen(false);
  };

  return (
    <div className={cn("w-full flex mb-2 transition-all", isMe ? "justify-end" : "justify-start")}>
      <div className={cn("flex gap-3 max-w-[90%] items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && (
          <div className="cursor-pointer" onClick={() => setInspectedUserId(message.senderId)}>
            <UserAvatar userId={message.senderId} className="h-10 w-10" />
          </div>
        )}
        <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
          <div className="relative flex items-center gap-2">
            <div className={cn(
              "p-4 rounded-[1.8rem] transition-all relative shadow-xl",
              isMe ? "bg-primary text-white rounded-br-none" : "bg-white/[0.08] backdrop-blur-md border border-white/5 rounded-bl-none text-white"
            )}>
              {message.replyToId && <div className="bg-black/10 p-2 rounded-lg mb-1 text-[10px] opacity-60 italic">{decryptSignal(message.replyToContent)}</div>}
              <div className="whitespace-pre-wrap text-[15px] font-medium break-words max-w-[280px]">{displayContent}</div>
              <div className="mt-1 flex items-center justify-end gap-1.5 opacity-60">
                 <span className="text-[9px] font-black tabular-nums">{formattedTime}</span>
                 {isMe && (message.isRead ? <CheckCheck className="w-3 h-3 text-accent" /> : <Check className="w-3 h-3" />)}
              </div>
            </div>

            <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <PopoverTrigger asChild>
                <button className="p-2 rounded-full hover:bg-white/5 text-white/20 transition-all"><MoreHorizontal className="w-5 h-5" /></button>
              </PopoverTrigger>
              <PopoverContent side="top" align={isMe ? "end" : "start"} className="w-56 bg-[#0a0a0c] border-white/10 rounded-2xl p-2 shadow-2xl z-[1000]">
                 <ActionMenuItem icon={CornerUpLeft} label="Ответить" onClick={() => { onReply(message); setIsMenuOpen(false); }} />
                 <ActionMenuItem icon={Share2} label="Переслать" onClick={() => { onForward(message); setIsMenuOpen(false); }} />
                 <ActionMenuItem icon={Copy} label="Копировать" onClick={copyToClipboard} />
                 {isMe && <ActionMenuItem icon={Trash2} label="Удалить" variant="destructive" onClick={async () => { await deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id)); setIsMenuOpen(false); }} />}
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
    <button onClick={onClick} className={cn("w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all", variant === 'destructive' ? "text-red-500" : "text-white")}>
      <span className="text-[12px] font-black uppercase tracking-widest">{label}</span>
      <Icon className="w-4 h-4 opacity-40" />
    </button>
  );
}

MessageItem.displayName = 'MessageItem';
