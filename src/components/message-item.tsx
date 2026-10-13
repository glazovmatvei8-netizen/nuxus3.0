
"use client"

import React, { memo, useMemo, useState, useEffect } from 'react';
import { UserAvatar } from '@/components/user-avatar';
import { format } from 'date-fns';
import { 
  Check, CheckCheck, Play, MoreHorizontal, 
  Copy, Share2, Pin, Trash2, Heart, Smile,
  Reply, ReplyAll
} from 'lucide-react';
import { cn, decryptSignal, getReputationInfo, encryptSignal } from '@/lib/utils';
import { useAppState } from '@/lib/app-state';
import { useFirestore, useUser } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { User, Message } from '@/lib/types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { useToast } from '@/hooks/use-toast';

export const MessageItem = memo(({ message, isMe, amIPremium, viewerProfile, chatId, onReply }: any) => {
  const { setInspectedUserId, setForwardingMessage } = useAppState();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const senderRef = React.useMemo(() => (!db || !message.senderId) ? null : doc(db, 'users', message.senderId), [db, message.senderId]);
  const { data: senderProfile } = useDoc<User>(senderRef);
  
  const displayContent = useMemo(() => {
    if (!mounted) return '...';
    return message.contentType === 'text' ? decryptSignal(message.content) : message.content;
  }, [message.content, message.contentType, mounted]);

  const formattedTime = useMemo(() => {
    if (!mounted || !message.sentAt) return '';
    try {
      return format(new Date(message.sentAt), 'HH:mm');
    } catch (e) { return ''; }
  }, [message.sentAt, mounted]);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent);
    toast({ title: "Скопировано", description: "Текст сигнала в буфере обмена." });
  };

  const handleReaction = (emoji: string) => {
    if (!db || !user || !chatId) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
    const hasReacted = message.reactions?.[emoji]?.includes(user.uid);
    const updateData = hasReacted 
      ? { [`reactions.${emoji}`]: arrayRemove(user.uid) }
      : { [`reactions.${emoji}`]: arrayUnion(user.uid) };
    updateDoc(msgRef, updateData).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: msgRef.path, operation: 'update', requestResourceData: updateData }));
    });
  };

  const handleDelete = () => {
    if (!db || !chatId) return;
    if (confirm("Аннигилировать этот сигнал для всех?")) {
      const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
      deleteDoc(msgRef).catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: msgRef.path, operation: 'delete' }));
      });
      toast({ title: "Сигнал удален" });
    }
  };

  const bubbleStyle = viewerProfile?.settings?.bubbleStyle || message.metadata?.bubbleStyle || 'default';
  const textSize = viewerProfile?.settings?.messageSize || 'medium';
  const borderRadius = viewerProfile?.settings?.messageRadius ?? 24;

  const styleClasses = {
    default: isMe ? "bg-primary text-white border-white/10 shadow-lg shadow-primary/10" : "obsidian-glass text-white/95 border-white/5",
    neon: isMe ? "bg-primary/20 text-white border-primary shadow-[0_0_25px_rgba(var(--primary),0.3)]" : "bg-white/5 border-white/10 text-white",
    gold: isMe ? "bg-gradient-to-br from-yellow-500/30 to-amber-700/30 text-white border-yellow-500/20 shadow-2xl" : "bg-white/5 border-white/10 text-white",
    ocean: isMe ? "bg-gradient-to-br from-cyan-500/30 to-blue-700/30 text-white border-cyan-500/20 shadow-2xl" : "bg-white/5 border-white/10 text-white",
  };

  const textClasses = { small: "text-[13px]", medium: "text-[15px]", large: "text-[18px]" };
  const rep = getReputationInfo(senderProfile?.reputation);
  const nameColor = senderProfile?.settings?.nameColor || 'text-primary/60';

  return (
    <div className={cn("w-full flex flex-col mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500", isMe ? "items-end" : "items-start")}>
      <ContextMenu>
        <ContextMenuTrigger className="w-full flex flex-col items-inherit">
          <div className={cn("flex gap-3 max-w-[85%] items-end", isMe ? "flex-row-reverse" : "flex-row")}>
            {!isMe && (
              <UserAvatar 
                userId={message.senderId} 
                className="h-9 w-9 border border-white/5 shadow-2xl mb-1 cursor-pointer hover:scale-110 transition-transform" 
                onClick={() => setInspectedUserId(message.senderId)} 
              />
            )}
            
            <div className={cn("flex flex-col min-w-[60px]", isMe ? "items-end" : "items-start")}>
              {!isMe && (
                <div className="flex items-center gap-2 ml-2 mb-1">
                   <span className={cn("text-[10px] font-black uppercase tracking-widest italic", nameColor)}>
                     {message.senderName || 'User'}
                   </span>
                   <span className={cn("text-[8px]", rep.color)}>{rep.icon}</span>
                </div>
              )}
              
              <div className="relative group">
                <div 
                  className={cn(
                    "p-3 px-4 relative shadow-2xl transition-all duration-500 border overflow-hidden pb-6",
                    styleClasses[bubbleStyle as keyof typeof styleClasses] || styleClasses.default,
                    isMe ? "rounded-br-lg" : "rounded-bl-lg",
                    message.contentType === 'sticker' && "bg-transparent border-none shadow-none p-0 pb-1"
                  )}
                  style={{ borderRadius: `${borderRadius}px`, borderBottomRightRadius: isMe ? '4px' : `${borderRadius}px`, borderBottomLeftRadius: isMe ? `${borderRadius}px` : '4px' }}
                >
                  {message.forwardFrom && (
                    <div className="flex items-center gap-1.5 mb-1.5 opacity-40">
                      <Share2 className="w-2.5 h-2.5" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Переслано от {message.forwardFrom}</span>
                    </div>
                  )}

                  {message.replyToId && (
                    <div className="mb-2.5 p-2 bg-white/10 rounded-xl border-l-4 border-primary flex flex-col gap-0.5 opacity-80 cursor-pointer overflow-hidden" onClick={() => document.getElementById(message.replyToId)?.scrollIntoView({ behavior: 'smooth' })}>
                       <span className="text-[9px] font-black text-primary uppercase tracking-widest truncate">{message.replyToSenderName || 'Signal'}</span>
                       <span className="text-[11px] text-white/60 truncate italic">{decryptSignal(message.replyToContent)}</span>
                    </div>
                  )}

                  {message.contentType === 'sticker' ? (
                    <div className="w-40 h-40 select-none">
                      <img src={message.content} alt="Sticker" className="w-full h-full object-contain" draggable={false} crossOrigin="anonymous" />
                    </div>
                  ) : message.contentType === 'audio' ? (
                    <div className="flex items-center gap-4 min-w-[180px] py-1">
                       <button className="h-9 w-9 rounded-full bg-white/10 shrink-0 flex items-center justify-center hover:bg-white/20 transition-all"><Play className="w-4 h-4 fill-current" /></button>
                       <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-primary/40 w-1/3 shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                       </div>
                       <span className="text-[9px] font-black opacity-30 tabular-nums">{message.metadata?.duration ? `${Math.floor(message.metadata.duration / 60)}:${(message.metadata.duration % 60).toString().padStart(2, '0')}` : '0:01'}</span>
                    </div>
                  ) : message.contentType === 'image' ? (
                    <div className="relative rounded-xl overflow-hidden border border-white/5 max-w-full shadow-2xl">
                       <img src={message.content} alt="Attachment" className="w-full h-auto object-cover" />
                    </div>
                  ) : (
                    <div className={cn("whitespace-pre-wrap font-medium leading-relaxed tracking-tight break-words", textClasses[textSize as keyof typeof textClasses])}>
                      {displayContent}
                    </div>
                  )}

                  <div className={cn("absolute bottom-1 right-2.5 flex items-center gap-1 opacity-40", message.contentType === 'sticker' && "bg-black/40 rounded-full px-2 py-0.5")}>
                     <span className="text-[8px] font-black tabular-nums">{formattedTime}</span>
                     {isMe && (message.isRead ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3" />)}
                  </div>
                </div>

                {message.reactions && Object.keys(message.reactions).length > 0 && (
                  <div className={cn("flex gap-1 mt-1 flex-wrap", isMe ? "justify-end" : "justify-start")}>
                    {Object.entries(message.reactions).map(([emoji, uids]: any) => (
                      uids.length > 0 && (
                        <button 
                          key={emoji} onClick={() => handleReaction(emoji)}
                          className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black border transition-all", uids.includes(user?.uid) ? "bg-primary/20 border-primary text-white" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10")}
                        >
                          <span>{emoji}</span> <span className="tabular-nums">{uids.length}</span>
                        </button>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-52 bg-[#121212]/98 backdrop-blur-2xl border-white/10 rounded-2xl p-2 shadow-2xl">
          <div className="flex justify-around p-1.5 mb-2 bg-white/5 rounded-xl border border-white/5">
            {['❤️', '🔥', '👍', '😂', '😮', '😢'].map(e => (<button key={e} onClick={() => handleReaction(e)} className="text-base hover:scale-125 transition-transform active:scale-90">{e}</button>))}
          </div>
          <ContextMenuItem onClick={() => onReply(message)} className="gap-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white"><Reply className="w-3.5 h-3.5 text-primary" /> Ответить</ContextMenuItem>
          <ContextMenuItem onClick={handleCopy} className="gap-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white"><Copy className="w-3.5 h-3.5 text-primary" /> Копировать</ContextMenuItem>
          <ContextMenuItem onClick={() => setForwardingMessage(message)} className="gap-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white"><Share2 className="w-3.5 h-3.5 text-primary" /> Переслать</ContextMenuItem>
          <ContextMenuItem onClick={handleDelete} className="gap-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-red-500"><Trash2 className="w-3.5 h-3.5" /> Удалить для всех</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';
