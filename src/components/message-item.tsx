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

const REACTIONS = ['❤️', '🔥', '👍', '⚡', '😂', '😮'];

export const MessageItem = memo(({ message, isMe, onReply, onEdit, chatId }: any) => {
  const { setInspectedUserId, setForwardingMessage } = useAppState();
  const { user } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const senderRef = useMemo(() => (!db || !message.senderId) ? null : doc(db, 'users', message.senderId), [db, message.senderId]);
  const { data: senderProfile } = useDoc<User>(senderRef);
  
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
    } catch (e) {}
  };

  return (
    <div className={cn("w-full flex flex-col mb-2 transition-all", isMe ? "items-end" : "items-start")}>
      <ContextMenu>
        <ContextMenuTrigger className="max-w-[85%]">
          <div className={cn("flex gap-4 items-end", isMe ? "flex-row-reverse" : "flex-row")}>
            {!isMe && <UserAvatar userId={message.senderId} className="h-9 w-9 rounded-xl mb-1 shadow-lg" manualAvatarUrl={senderProfile?.avatarUrl} />}
            
            <div className="flex flex-col gap-1.5">
              {!isMe && (
                <span 
                  onClick={() => setInspectedUserId(message.senderId)}
                  className="text-[10px] font-black text-primary/60 uppercase tracking-widest ml-3 cursor-pointer hover:text-primary transition-colors"
                >
                  {formatDisplayName(senderProfile?.name, senderProfile?.username)}
                </span>
              )}
              
              <div className={cn(
                "relative px-6 py-4 transition-all duration-500 border",
                isMe 
                  ? "bg-primary text-white border-primary/20 rounded-[2.2rem] rounded-br-sm sonic-glow" 
                  : "bg-white/[0.04] backdrop-blur-2xl text-white/95 border-white/5 rounded-[2.2rem] rounded-bl-sm shadow-2xl"
              )}>
                {message.replyToId && (
                  <div className="mb-3 p-3 bg-black/30 rounded-2xl border-l-2 border-primary/50 opacity-50 text-[11px] italic truncate max-w-[220px]">
                    {decryptSignal(message.replyToContent)}
                  </div>
                )}

                {message.contentType === 'sticker' ? (
                  <img src={message.content} className="w-32 h-32 object-contain" alt="Sticker" crossOrigin="anonymous" />
                ) : message.contentType === 'image' ? (
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 group cursor-pointer" onClick={() => window.open(displayContent, '_blank')}>
                     <img src={displayContent} className="max-w-full max-h-[450px] object-cover transition-transform duration-1000 group-hover:scale-105" alt="Signal Media" crossOrigin="anonymous" />
                     <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-white animate-pulse" />
                     </div>
                  </div>
                ) : (
                  <p className="text-[16px] font-semibold leading-relaxed tracking-tight break-words whitespace-pre-wrap">
                    {displayContent}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 mt-2 opacity-25">
                  {message.editedAt && <span className="text-[8px] font-black italic">Edited</span>}
                  <span className="text-[9px] font-black tabular-nums">{mounted ? format(new Date(message.sentAt), 'HH:mm') : ''}</span>
                  {isMe && (message.isRead ? <CheckCheck size={14} className="text-primary" /> : <Check size={14} />)}
                </div>

                {message.reactions && Object.entries(message.reactions).some(([, uids]: any) => uids.length > 0) && (
                  <div className={cn(
                    "absolute -bottom-4 flex gap-1.5 bg-black/60 backdrop-blur-3xl border border-white/10 p-1.5 rounded-full shadow-2xl z-20",
                    isMe ? "right-2" : "left-2"
                  )}>
                    {Object.entries(message.reactions).filter(([, uids]: any) => uids.length > 0).map(([emoji, uids]: any) => (
                      <button key={emoji} onClick={() => handleToggleReaction(emoji)} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black transition-all", uids.includes(user?.uid) ? "bg-primary/20 text-primary border border-primary/20" : "text-white/40")}>
                        <span>{emoji}</span><span>{uids.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-56 mig-glass rounded-2xl p-2 bg-black/80 border-white/10">
          <div className="flex justify-around p-2 mb-2 bg-white/5 rounded-xl">
            {REACTIONS.map(e => (<button key={e} onClick={() => handleToggleReaction(e)} className="text-xl hover:scale-125 transition-transform active:scale-90">{e}</button>))}
          </div>
          <ContextMenuItem onClick={() => onReply(message)} className="gap-3 py-3 rounded-xl font-bold text-[11px] uppercase text-white"><Reply size={16} className="text-primary" /> Reply</ContextMenuItem>
          {isMe && message.contentType === 'text' && <ContextMenuItem onClick={() => onEdit(message)} className="gap-3 py-3 rounded-xl font-bold text-[11px] uppercase text-white"><Edit2 size={16} className="text-primary" /> Edit</ContextMenuItem>}
          <ContextMenuItem onClick={() => setForwardingMessage(message)} className="gap-3 py-3 rounded-xl font-bold text-[11px] uppercase text-white"><Share2 size={16} className="text-primary" /> Forward</ContextMenuItem>
          <ContextMenuItem onClick={() => deleteDoc(doc(db!, 'chats', chatId, 'messages', message.id))} className="gap-3 py-3 rounded-xl font-bold text-[11px] uppercase text-red-500"><Trash2 size={16} /> Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
});
MessageItem.displayName = 'MessageItem';