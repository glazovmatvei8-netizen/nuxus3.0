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
 * MESSAGE ITEM V24.0 «CRYSTAL SIGNAL»
 * Премиальный дизайн пакетов данных с неоновым резонансом.
 */
export const MessageItem = memo(({ message, isMe, chatId, onReply, onForward, amIPremium, isAdmin = false, viewerProfile }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { setInspectedUserId } = useAppState();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const displayContent = useMemo(() => {
    return message.contentType === 'text' ? decryptSignal(message.content) : message.content;
  }, [message.content, message.contentType]);

  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  return (
    <div className={cn("w-full flex flex-col mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700", isMe ? "items-end" : "items-start")}>
      <div className={cn("flex gap-4 max-w-[88%] sm:max-w-[78%] items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && <UserAvatar userId={message.senderId} className="h-10 w-10 border border-white/10 shadow-2xl" onClick={() => setInspectedUserId(message.senderId)} />}
        
        <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
          <div className="relative group">
            <div className={cn(
              "p-5 px-6 rounded-[2.5rem] relative shadow-2xl transition-all duration-500 border-2 overflow-hidden",
              isMe 
                ? "bg-gradient-to-br from-primary/90 to-primary/60 border-primary/30 text-white rounded-br-none neon-glow-primary" 
                : "bg-white/[0.03] backdrop-blur-3xl border-white/[0.08] text-white/90 rounded-bl-none"
            )}>
              {/* Premium Runner Animation */}
              {isMe && amIPremium && (
                 <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite]" />
                 </div>
              )}

              {message.contentType === 'audio' ? (
                <div className="space-y-4 min-w-[220px]">
                   <div className="flex items-center gap-4">
                      <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-white/10 shrink-0 shadow-inner"><Play className="w-6 h-6 fill-current" /></Button>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                         <div className="h-full bg-white/40 w-1/3 shadow-[0_0_10px_white]" />
                      </div>
                      <span className="text-[11px] font-black opacity-60 tabular-nums">0:01</span>
                   </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-[16px] font-medium leading-relaxed tracking-tight italic">{displayContent}</div>
              )}

              <div className={cn(
                "mt-3 flex items-center gap-2 opacity-50",
                isMe ? "justify-end" : "justify-start"
              )}>
                 <span className="text-[10px] font-black tabular-nums tracking-widest">{formattedTime}</span>
                 {isMe && (message.isRead ? <CheckCheck className="w-4 h-4 text-accent" /> : <Check className="w-4 h-4" />)}
              </div>

              {/* Advanced Menu Toggle */}
              <button 
                onClick={() => setIsMenuOpen(true)}
                className={cn(
                  "absolute top-0 p-2.5 rounded-full text-white/20 opacity-0 group-hover:opacity-100 transition-all hover:text-white hover:bg-white/5",
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
