"use client"

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { UserAvatar } from '@/components/user-avatar';
import { format } from 'date-fns';
import { 
  Check, CheckCheck, Play, Pause, MoreHorizontal, 
  Copy, Share2, Pin, Trash2, Heart, Smile,
  Reply, Edit2, Flame, Zap
} from 'lucide-react';
import { cn, triggerHaptic, decryptSignal, getReputationInfo } from '@/lib/utils';
import { useAppState } from '@/lib/app-state';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { User, Message } from '@/lib/types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from '@/hooks/use-toast';

/**
 * MIG MESSAGE ITEM V194.0 «AERO-BUBBLE»
 * ОПТИМИЗИРОВАНО: Обтекаемые формы и премиальная анимация.
 */
export const MessageItem = memo(({ message, isMe, onReply, onEdit, chatId }: any) => {
  const { setInspectedUserId, setForwardingMessage } = useAppState();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => { setMounted(true); }, []);

  const senderRef = useMemo(() => (!db || !message.senderId) ? null : doc(db, 'users', message.senderId), [db, message.senderId]);
  const { data: senderProfile } = useDoc<User>(senderRef);
  
  const time = useMemo(() => {
    if (!mounted || !message.sentAt) return '';
    return format(new Date(message.sentAt), 'HH:mm');
  }, [message.sentAt, mounted]);

  const displayContent = useMemo(() => {
    if (message.contentType === 'text') return decryptSignal(message.content);
    return message.content;
  }, [message.content, message.contentType]);

  return (
    <div className={cn("w-full flex flex-col mb-1.5 transition-all", isMe ? "items-end" : "items-start")}>
      <ContextMenu>
        <ContextMenuTrigger className="max-w-[85%]">
          <div className={cn("flex gap-3 items-end", isMe ? "flex-row-reverse" : "flex-row")}>
            {!isMe && <UserAvatar userId={message.senderId} className="h-8 w-8 rounded-[0.8rem] mb-1" manualAvatarUrl={senderProfile?.avatarUrl} />}
            
            <div className={cn(
              "relative px-4 py-3 shadow-xl transition-all duration-300 border",
              isMe 
                ? "bg-primary text-white border-primary/20 rounded-[1.8rem] rounded-br-sm sonic-glow" 
                : "bg-white/[0.04] backdrop-blur-xl text-white/95 border-white/5 rounded-[1.8rem] rounded-bl-sm"
            )}>
              {message.replyToId && (
                <div className="mb-2 p-2 bg-black/20 rounded-2xl border-l-2 border-primary/50 opacity-60 text-[11px] italic truncate max-w-[200px]">
                  {decryptSignal(message.replyToContent)}
                </div>
              )}

              {message.contentType === 'sticker' ? (
                <img src={message.content} className="w-32 h-32 object-contain" alt="Sticker" crossOrigin="anonymous" />
              ) : (
                <p className="text-[15px] font-bold leading-relaxed tracking-tight break-words uppercase">
                  {displayContent}
                </p>
              )}

              <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-30">
                {message.editedAt && <span className="text-[7px] font-black italic">EDIT</span>}
                <span className="text-[8px] font-black tabular-nums">{time}</span>
                {isMe && (message.isRead ? <CheckCheck size={10} className="text-blue-400" /> : <Check size={10} />)}
              </div>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-52 mig-glass-heavy rounded-2xl p-2">
          <div className="flex justify-around p-2 mb-2 bg-white/5 rounded-xl">
            {['❤️', '🔥', '👍', '⚡', '🛸'].map(e => (
              <button key={e} className="text-lg hover:scale-125 transition-transform">{e}</button>
            ))}
          </div>
          <ContextMenuItem onClick={() => onReply(message)} className="gap-3 py-2.5 rounded-xl font-black text-[10px] uppercase text-white"><Reply size={14} className="text-primary" /> Ответить</ContextMenuItem>
          {isMe && <ContextMenuItem onClick={() => onEdit(message)} className="gap-3 py-2.5 rounded-xl font-black text-[10px] uppercase text-white"><Edit2 size={14} className="text-primary" /> Изменить</ContextMenuItem>}
          <ContextMenuItem onClick={() => setForwardingMessage(message)} className="gap-3 py-2.5 rounded-xl font-black text-[10px] uppercase text-white"><Share2 size={14} className="text-primary" /> Переслать</ContextMenuItem>
          <ContextMenuItem onClick={() => deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id))} className="gap-3 py-2.5 rounded-xl font-black text-[10px] uppercase text-red-500"><Trash2 size={14} /> Удалить</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
});
MessageItem.displayName = 'MessageItem';