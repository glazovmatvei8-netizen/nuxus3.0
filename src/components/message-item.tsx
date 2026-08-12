"use client"

import React, { memo, useMemo } from 'react';
import { UserAvatar } from '@/components/user-avatar';
import { format } from 'date-fns';
import { 
  Check, CheckCheck, Play, MoreHorizontal
} from 'lucide-react';
import { cn, decryptSignal } from '@/lib/utils';
import { useAppState } from '@/lib/store';

export const MessageItem = memo(({ message, isMe, amIPremium, viewerProfile }: any) => {
  const { setInspectedUserId } = useAppState();
  
  const displayContent = useMemo(() => {
    return message.contentType === 'text' ? decryptSignal(message.content) : message.content;
  }, [message.content, message.contentType]);

  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  const bubbleStyle = viewerProfile?.settings?.bubbleStyle || message.metadata?.bubbleStyle || 'default';
  const textSize = viewerProfile?.settings?.messageSize || 'medium';

  const styleClasses = {
    default: isMe ? "bg-primary text-white border-white/10 shadow-lg shadow-primary/10" : "obsidian-glass text-white/95",
    neon: isMe ? "bg-primary/20 text-white border-primary shadow-[0_0_25px_rgba(var(--primary),0.3)]" : "bg-white/5 border-white/10 text-white",
    gold: isMe ? "bg-gradient-to-br from-yellow-500/30 to-amber-700/30 text-white border-yellow-500/20 shadow-2xl" : "bg-white/5 border-white/10 text-white",
    ocean: isMe ? "bg-gradient-to-br from-cyan-500/30 to-blue-700/30 text-white border-cyan-500/20 shadow-2xl" : "bg-white/5 border-white/10 text-white",
  };

  const textClasses = {
    small: "text-[13px]",
    medium: "text-[15px]",
    large: "text-[18px]",
  };

  return (
    <div className={cn(
      "w-full flex flex-col mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500", 
      isMe ? "items-end" : "items-start"
    )}>
      <div className={cn(
        "flex gap-3 max-w-[90%] items-end", 
        isMe ? "flex-row-reverse" : "flex-row"
      )}>
        {!isMe && (
          <UserAvatar 
            userId={message.senderId} 
            className="h-10 w-10 border border-white/5 shadow-2xl mb-1" 
            onClick={() => setInspectedUserId(message.senderId)} 
          />
        )}
        
        <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
          {!isMe && (
            <div className="flex items-center gap-2 ml-1 mb-1">
               <span className="text-[11px] font-black text-primary/60 uppercase tracking-widest italic">
                 {message.senderName || 'User'}
               </span>
               {message.metadata?.isBot && <span className="text-[7px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black uppercase">AI</span>}
            </div>
          )}
          
          <div className="relative group">
            <div className={cn(
              "p-4 px-6 rounded-[2rem] relative shadow-2xl transition-all duration-500 border overflow-hidden",
              styleClasses[bubbleStyle as keyof typeof styleClasses] || styleClasses.default,
              isMe ? "rounded-br-lg" : "rounded-bl-lg"
            )}>
              {isMe && amIPremium && (
                 <div className="absolute top-0 left-0 w-full h-[1px] liquid-shimmer opacity-40" />
              )}

              {message.contentType === 'audio' ? (
                <div className="flex items-center gap-4 min-w-[200px] py-1">
                   <button className="h-10 w-10 rounded-full bg-white/10 shrink-0 flex items-center justify-center hover:bg-white/20 transition-all"><Play className="w-5 h-5 fill-current" /></button>
                   <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary/40 w-1/3 shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                   </div>
                   <span className="text-[10px] font-black opacity-30 tabular-nums">{message.metadata?.duration ? `${Math.floor(message.metadata.duration / 60)}:${(message.metadata.duration % 60).toString().padStart(2, '0')}` : '0:01'}</span>
                </div>
              ) : message.contentType === 'image' ? (
                <div className="relative rounded-2xl overflow-hidden border border-white/5 max-w-[300px] shadow-2xl">
                   <img src={message.content} alt="Attachment" className="w-full h-auto object-cover" />
                </div>
              ) : (
                <div className={cn("whitespace-pre-wrap font-medium leading-relaxed tracking-tight", textClasses[textSize as keyof typeof textClasses])}>
                  {displayContent}
                </div>
              )}

              <div className="mt-2 flex items-center gap-2 opacity-30 justify-end h-4">
                 <span className="text-[9px] font-black tabular-nums">{formattedTime}</span>
                 {isMe && (message.isRead ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />)}
              </div>

              <button 
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 p-2 rounded-full text-white/5 opacity-0 group-hover:opacity-100 transition-all hover:text-white/40 hover:bg-white/5",
                  isMe ? "-left-12" : "-right-12"
                )}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';
