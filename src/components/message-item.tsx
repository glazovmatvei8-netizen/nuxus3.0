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
  CornerUpLeft, Trash2, Check, CheckCheck, Play, Share2, Copy, MoreHorizontal, ShieldCheck, Wand2, Loader2, RotateCcw, EyeOff, Eye, Heart, Smile, Zap, Star, Ghost, Bot, Trophy, Rocket, Sparkles
} from 'lucide-react';
import { cn, decryptSignal, isUserPremium } from '@/lib/utils';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';
import type { Message, BotButton } from '@/lib/types';

/**
 * MESSAGE ITEM V19.0 «CRYSTAL BUBBLES»
 * Элитный дизайн сообщений с эффектом стекла и неоновым свечением.
 */
export const MessageItem = memo(({ message, isMe, chatId, onReply, onForward, amIPremium, isAdmin = false, viewerProfile }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { setInspectedUserId } = useAppState();
  const { toast } = useToast();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const displayContent = useMemo(() => {
    return message.contentType === 'text' ? decryptSignal(message.content) : message.content;
  }, [message.content, message.contentType]);

  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  return (
    <div className={cn("w-full flex flex-col mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500", isMe ? "items-end" : "items-start")}>
      <div className={cn("flex gap-3 max-w-[85%] sm:max-w-[75%] items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && <UserAvatar userId={message.senderId} className="h-10 w-10 border border-white/5 shadow-lg" onClick={() => setInspectedUserId(message.senderId)} />}
        
        <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
          <div className="relative group">
            <div className={cn(
              "p-4 px-5 rounded-[2.2rem] relative shadow-2xl transition-all duration-500",
              isMe 
                ? "bg-gradient-to-br from-primary to-primary/80 text-white rounded-br-none premium-glow" 
                : "bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] text-white rounded-bl-none"
            )}>
              {message.contentType === 'audio' ? (
                <div className="space-y-3 min-w-[200px]">
                   <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/10 shrink-0"><Play className="w-5 h-5 fill-current" /></Button>
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-white/40 w-1/3" /></div>
                      <span className="text-[10px] font-black opacity-60 tabular-nums">0:01</span>
                   </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed tracking-tight">{displayContent}</div>
              )}

              <div className={cn(
                "mt-2 flex items-center gap-1.5 opacity-40",
                isMe ? "justify-end" : "justify-start"
              )}>
                 <span className="text-[9px] font-black tabular-nums tracking-widest">{formattedTime}</span>
                 {isMe && (message.isRead ? <CheckCheck className="w-3.5 h-3.5 text-accent" /> : <Check className="w-3.5 h-3.5" />)}
              </div>

              {/* Interaction Menu Handle */}
              <button 
                onClick={() => setIsMenuOpen(true)}
                className={cn(
                  "absolute top-0 p-2 rounded-full text-white/20 opacity-0 group-hover:opacity-100 transition-all",
                  isMe ? "-left-10" : "-right-10"
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