"use client"

import React, { memo, useMemo, useState, useEffect } from 'react';
import { UserAvatar } from '@/components/user-avatar';
import { format } from 'date-fns';
import { 
  Check, CheckCheck, Trash2, Reply, Edit2, Share2, ImageIcon, Smile
} from 'lucide-react';
import { cn, triggerHaptic, decryptSignal, formatDisplayName } from '@/lib/utils';
import { useAppState } from '@/lib/app-state';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import type { User, Message } from '@/lib/types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from '@/hooks/use-toast';

const REACTIONS_POOL = ['❤️', '🔥', '👍', '⚡', '🛸', '😂', '😮'];

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

  const handleToggleReaction = async (emoji: string) => {
    if (!db || !user || !chatId) return;
    triggerHaptic();
    const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
    const hasMyReaction = message.reactions?.[emoji]?.includes(user.uid);

    try {
      if (hasMyReaction) {
        await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayRemove(user.uid) });
      } else {
        await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(user.uid) });
      }
    } catch (e) {
      console.error("Reaction sync failed:", e);
      toast({ title: "Сбой реакций", variant: "destructive" });
    }
  };

  const activeReactions = useMemo(() => {
    if (!message.reactions) return [];
    return Object.entries(message.reactions).filter(([, uids]: any) => uids.length > 0);
  }, [message.reactions]);

  return (
    <div className={cn("w-full flex flex-col mb-1.5 transition-all", isMe ? "items-end" : "items-start")}>
      <ContextMenu>
        <ContextMenuTrigger className="max-w-[85%]">
          <div className={cn("flex gap-3 items-end", isMe ? "flex-row-reverse" : "flex-row")}>
            {!isMe && <UserAvatar userId={message.senderId} className="h-8 w-8 rounded-[0.8rem] mb-1" manualAvatarUrl={senderProfile?.avatarUrl} />}
            
            <div className="flex flex-col gap-1">
              {!isMe && (
                <span 
                  onClick={() => setInspectedUserId(message.senderId)}
                  className="text-[10px] font-black text-primary/80 uppercase tracking-widest ml-2 cursor-pointer hover:underline"
                >
                  {formatDisplayName(senderProfile?.name, senderProfile?.username)}
                </span>
              )}
              
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
                ) : message.contentType === 'image' ? (
                  <div className="relative rounded-[1.2rem] overflow-hidden border border-white/10 shadow-2xl group cursor-pointer" onClick={() => window.open(displayContent, '_blank')}>
                     <img src={displayContent} className="max-w-full max-h-[400px] object-cover transition-transform duration-700 group-hover:scale-105" alt="Signal Media" crossOrigin="anonymous" />
                     <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-white animate-pulse" />
                     </div>
                  </div>
                ) : (
                  <p className="text-[15px] font-bold leading-relaxed tracking-tight break-words">
                    {displayContent}
                  </p>
                )}

                <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-30">
                  {message.editedAt && <span className="text-[7px] font-black italic">изм.</span>}
                  <span className="text-[8px] font-black tabular-nums">{time}</span>
                  {isMe && (message.isRead ? <CheckCheck size={12} className="text-[#00D4FF]" /> : <Check size={12} />)}
                </div>

                {activeReactions.length > 0 && (
                  <div className={cn(
                    "absolute -bottom-4 flex gap-1 bg-black/40 backdrop-blur-3xl border border-white/10 p-1 rounded-full shadow-2xl",
                    isMe ? "right-0" : "left-0"
                  )}>
                    {activeReactions.map(([emoji, uids]: any) => (
                      <button 
                        key={emoji}
                        onClick={() => handleToggleReaction(emoji)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black transition-all",
                          uids.includes(user?.uid) ? "bg-primary/20 text-primary border border-primary/20" : "text-white/40"
                        )}
                      >
                        <span>{emoji}</span>
                        <span>{uids.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-52 mig-glass-heavy rounded-2xl p-2">
          <div className="flex justify-around p-2 mb-2 bg-white/5 rounded-xl border border-white/5">
            {REACTIONS_POOL.map(e => (
              <button 
                key={e} 
                onClick={() => handleToggleReaction(e)}
                className="text-lg hover:scale-125 transition-transform active:scale-90"
              >
                {e}
              </button>
            ))}
          </div>
          <ContextMenuItem onClick={() => onReply(message)} className="gap-3 py-2.5 rounded-xl font-black text-[10px] uppercase text-white"><Reply size={14} className="text-primary" /> Ответить</ContextMenuItem>
          {isMe && message.contentType === 'text' && <ContextMenuItem onClick={() => onEdit(message)} className="gap-3 py-2.5 rounded-xl font-black text-[10px] uppercase text-white"><Edit2 size={14} className="text-primary" /> Изменить</ContextMenuItem>}
          <ContextMenuItem onClick={() => setForwardingMessage(message)} className="gap-3 py-2.5 rounded-xl font-black text-[10px] uppercase text-white"><Share2 size={14} className="text-primary" /> Переслать</ContextMenuItem>
          <ContextMenuItem onClick={() => deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id))} className="gap-3 py-2.5 rounded-xl font-black text-[10px] uppercase text-red-500"><Trash2 size={14} /> Удалить</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
});
MessageItem.displayName = 'MessageItem';
