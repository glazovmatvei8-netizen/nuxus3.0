
"use client"

import React, { useState, memo, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase/provider';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from 'date-fns';
import { 
  CornerUpLeft, Trash2, Check, CheckCheck, Play, Share2, Copy, MoreHorizontal, 
  ShieldCheck, Wand2, Loader2, RotateCcw, EyeOff, Eye, Heart, Smile, Zap, Star, Ghost, Bot, Sparkles
} from 'lucide-react';
import { cn, decryptSignal, isUserPremium } from '@/lib/utils';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';

/**
 * MESSAGE ITEM V34.0 «FLUID SIGNAL»
 * Оптимизированная плотность, отображение имен и аватаров.
 */
export const MessageItem = memo(({ message, isMe, chatId, onReply, onForward, amIPremium, viewerProfile }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { setInspectedUserId } = useAppState();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const displayContent = useMemo(() => {
    return message.contentType === 'text' ? decryptSignal(message.content) : message.content;
  }, [message.content, message.contentType]);

  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  return (
    <div className={cn(
      "w-full flex flex-col mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500", 
      isMe ? "items-end" : "items-start"
    )}>
      <div className={cn(
        "flex gap-2 max-w-[85%] sm:max-w-[75%] items-end", 
        isMe ? "flex-row-reverse" : "flex-row"
      )}>
        {!isMe && (
          <UserAvatar 
            userId={message.senderId} 
            className="h-8 w-8 border border-white/5 shadow-lg mb-1" 
            onClick={() => setInspectedUserId(message.senderId)} 
          />
        )}
        
        <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
          {!isMe && (
            <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest ml-3 mb-0.5 italic">
              {message.senderName || 'Узел'}
            </span>
          )}
          
          <div className="relative group">
            <div className={cn(
              "p-3 px-4 rounded-2xl relative shadow-xl transition-all duration-300 border overflow-hidden",
              isMe 
                ? "bg-primary text-white border-white/10 rounded-tr-sm" 
                : "bg-white/5 backdrop-blur-xl border-white/5 text-white/95 rounded-tl-sm"
            )}>
              {/* Premium Effect */}
              {isMe && amIPremium && (
                 <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              )}

              {message.contentType === 'audio' ? (
                <div className="flex items-center gap-3 min-w-[180px] py-1">
                   <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/10 shrink-0"><Play className="w-4 h-4 fill-current" /></Button>
                   <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white/40 w-1/3 shadow-[0_0_8px_white]" />
                   </div>
                   <span className="text-[10px] font-bold opacity-60 tabular-nums">0:01</span>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-[15px] font-medium leading-normal tracking-tight">
                  {displayContent}
                </div>
              )}

              <div className={cn(
                "mt-1 flex items-center gap-1.5 opacity-40 justify-end",
              )}>
                 <span className="text-[9px] font-bold tabular-nums">{formattedTime}</span>
                 {isMe && (message.isRead ? <CheckCheck className="w-3 h-3 text-white" /> : <Check className="w-3 h-3" />)}
              </div>

              {/* Action Menu Trigger */}
              <button 
                onClick={() => setIsMenuOpen(true)}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 p-2 rounded-full text-white/20 opacity-0 group-hover:opacity-100 transition-all hover:text-white hover:bg-white/10",
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
