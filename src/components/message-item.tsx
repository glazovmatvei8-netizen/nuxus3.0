"use client"

import React, { useState, memo, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase/provider';
import { UserAvatar } from '@/components/user-avatar';
import { format } from 'date-fns';
import { 
  Check, CheckCheck, Play, MoreHorizontal, ShieldCheck, Star
} from 'lucide-react';
import { cn, decryptSignal, formatDisplayName } from '@/lib/utils';
import { useAppState } from '@/lib/store';

export const MessageItem = memo(({ message, isMe, chatId, amIPremium, viewerProfile }: any) => {
  const { setInspectedUserId } = useAppState();
  
  const displayContent = useMemo(() => {
    return message.contentType === 'text' ? decryptSignal(message.content) : message.content;
  }, [message.content, message.contentType]);

  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  const bubbleStyle = viewerProfile?.settings?.bubbleStyle || message.metadata?.bubbleStyle || 'default';
  const textSize = viewerProfile?.settings?.messageSize || 'medium';

  const styleClasses = {
    default: isMe ? "bg-primary text-white border-white/10" : "bg-white/5 backdrop-blur-xl border-white/5 text-white/95",
    neon: isMe ? "bg-primary/20 text-white border-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]" : "bg-white/5 border-white/10 text-white shadow-xl",
    gold: isMe ? "bg-gradient-to-br from-yellow-500/40 to-amber-700/40 text-white border-yellow-500/30" : "bg-white/5 border-white/10 text-white",
    ocean: isMe ? "bg-gradient-to-br from-cyan-500/40 to-blue-700/40 text-white border-cyan-500/30" : "bg-white/5 border-white/10 text-white",
  };

  const textClasses = {
    small: "text-[13px]",
    medium: "text-[15px]",
    large: "text-[18px]",
  };

  return (
    <div className={cn(
      "w-full flex flex-col mb-1.5 animate-in fade-in slide-in-from-bottom-1 duration-500", 
      isMe ? "items-end" : "items-start"
    )}>
      <div className={cn(
        "flex gap-2 max-w-[85%] items-end", 
        isMe ? "flex-row-reverse" : "flex-row"
      )}>
        {!isMe && (
          <UserAvatar 
            userId={message.senderId} 
            className="h-8 w-8 border border-white/5 shadow-lg mb-0.5" 
            onClick={() => setInspectedUserId(message.senderId)} 
          />
        )}
        
        <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
          {!isMe && (
            <div className="flex items-center gap-2 ml-2 mb-0.5">
               <span className="text-[10px] font-bold text-primary/80 uppercase tracking-tight">
                 {message.senderName || 'Узел'}
               </span>
               {message.metadata?.isBot && <span className="text-[7px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-md font-black uppercase">BOT</span>}
            </div>
          )}
          
          <div className="relative group">
            <div className={cn(
              "p-2.5 px-4 rounded-[1.5rem] relative shadow-xl transition-all duration-300 border overflow-hidden",
              styleClasses[bubbleStyle as keyof typeof styleClasses] || styleClasses.default,
              isMe ? "rounded-br-sm" : "rounded-bl-sm"
            )}>
              {isMe && amIPremium && (
                 <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              )}

              {message.contentType === 'audio' ? (
                <div className="flex items-center gap-3 min-w-[180px] py-1">
                   <button className="h-8 w-8 rounded-full bg-white/10 shrink-0 flex items-center justify-center hover:bg-white/20 transition-all"><Play className="w-4 h-4 fill-current" /></button>
                   <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white/40 w-1/3 shadow-[0_0_8px_white]" />
                   </div>
                   <span className="text-[10px] font-bold opacity-60 tabular-nums">{message.metadata?.duration ? `${Math.floor(message.metadata.duration / 60)}:${(message.metadata.duration % 60).toString().padStart(2, '0')}` : '0:01'}</span>
                </div>
              ) : message.contentType === 'image' ? (
                <div className="relative rounded-xl overflow-hidden border border-white/5 max-w-[280px] shadow-2xl">
                   <img src={message.content} alt="Attachment" className="w-full h-auto object-cover" />
                </div>
              ) : message.contentType === 'video' ? (
                <div className="relative rounded-xl overflow-hidden border border-white/5 max-w-[280px] bg-black/40 shadow-2xl">
                   <video src={message.content} controls className="w-full h-auto" />
                </div>
              ) : (
                <div className={cn("whitespace-pre-wrap font-medium leading-normal tracking-tight", textClasses[textSize as keyof typeof textClasses])}>
                  {displayContent}
                </div>
              )}

              <div className="mt-1 flex items-center gap-1.5 opacity-40 justify-end">
                 <span className="text-[9px] font-bold tabular-nums">{formattedTime}</span>
                 {isMe && (message.isRead ? <CheckCheck className="w-3 h-3 text-white" /> : <Check className="w-3 h-3" />)}
              </div>

              <button 
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full text-white/10 opacity-0 group-hover:opacity-100 transition-all hover:text-white hover:bg-white/5",
                  isMe ? "-left-10" : "-right-10"
                )}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';
