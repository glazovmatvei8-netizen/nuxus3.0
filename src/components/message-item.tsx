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
 * MESSAGE ITEM V25.0 «ETHEREAL SIGNAL»
 * Новый дизайн пакетов данных с глубоким размытием и неоновым резонансом.
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
    <div className={cn("w-full flex flex-col mb-10 animate-in fade-in slide-in-from-bottom-6 duration-1000", isMe ? "items-end" : "items-start")}>
      <div className={cn("flex gap-5 max-w-[90%] sm:max-w-[80%] items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && <UserAvatar userId={message.senderId} className="h-12 w-12 border border-white/10 shadow-2xl" onClick={() => setInspectedUserId(message.senderId)} />}
        
        <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
          <div className="relative group">
            <div className={cn(
              "p-6 px-8 rounded-[3rem] relative shadow-2xl transition-all duration-700 border-2 overflow-hidden",
              isMe 
                ? "bg-gradient-to-br from-primary/95 to-primary/70 border-primary/40 text-white rounded-br-none neon-glow-primary" 
                : "bg-white/[0.04] backdrop-blur-[40px] border-white/[0.1] text-white/95 rounded-bl-none"
            )}>
              {/* Premium Resonator Effect */}
              {isMe && amIPremium && (
                 <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
                 </div>
              )}

              {message.contentType === 'audio' ? (
                <div className="space-y-5 min-w-[240px]">
                   <div className="flex items-center gap-5">
                      <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-white/15 shrink-0 shadow-inner"><Play className="w-7 h-7 fill-current" /></Button>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                         <div className="h-full bg-white/50 w-1/3 shadow-[0_0_15px_white]" />
                      </div>
                      <span className="text-[12px] font-black opacity-70 tabular-nums">0:01</span>
                   </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-[17px] font-medium leading-relaxed tracking-tight italic">{displayContent}</div>
              )}

              <div className={cn(
                "mt-4 flex items-center gap-3 opacity-60",
                isMe ? "justify-end" : "justify-start"
              )}>
                 <span className="text-[11px] font-black tabular-nums tracking-[0.2em]">{formattedTime}</span>
                 {isMe && (message.isRead ? <CheckCheck className="w-4 h-4 text-accent" /> : <Check className="w-4 h-4" />)}
              </div>

              {/* Advanced Controls Toggle */}
              <button 
                onClick={() => setIsMenuOpen(true)}
                className={cn(
                  "absolute top-0 p-3 rounded-full text-white/30 opacity-0 group-hover:opacity-100 transition-all hover:text-white hover:bg-white/10",
                  isMe ? "-left-14" : "-right-14"
                )}
              >
                <MoreHorizontal className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';
