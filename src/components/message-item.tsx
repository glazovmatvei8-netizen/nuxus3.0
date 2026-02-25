"use client"

import React, { useState } from 'react';
import type { Message } from '@/lib/types';
import { useAppState } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageItemProps {
  message: Message;
  isMe: boolean;
  chatId: string;
}

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏'];

export function MessageItem({ message, isMe, chatId }: MessageItemProps) {
  const { addReaction, currentUser } = useAppState();
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);

  const handleAddReaction = (emoji: string) => {
    if (!currentUser) return;
    addReaction(chatId, message.id, emoji, currentUser.phone);
    setIsReactionPickerOpen(false);
  };

  if (message.type === 'service') {
    return (
      <div className="flex justify-center my-4">
        <span className="bg-muted/30 px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-wider text-muted-foreground backdrop-blur-sm border border-border/20">
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-3 max-w-[85%] animate-in slide-in-from-bottom-2",
      isMe ? "ml-auto flex-row-reverse" : "mr-auto"
    )}>
      {!isMe && (
        <Avatar className="h-8 w-8 mt-auto shrink-0 ring-2 ring-primary/10">
          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">{message.senderName.slice(0, 2)}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
        {!isMe && <span className="text-[10px] font-semibold text-muted-foreground ml-2">{message.senderName}</span>}
        
        <div className="relative group flex items-end gap-2">
          {isMe && (
            <Popover open={isReactionPickerOpen} onOpenChange={setIsReactionPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-muted/50 mb-1">
                  <SmilePlus className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1 rounded-full border-border/40 backdrop-blur-xl bg-card/60" side="left">
                <div className="flex gap-1">
                  {REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleAddReaction(emoji)}
                      className="hover:scale-125 transition-transform p-1 text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <div className={cn(
            "px-4 py-2.5 rounded-2xl text-sm shadow-md transition-all",
            isMe 
              ? "bg-primary text-white rounded-br-none shadow-primary/20" 
              : "bg-card text-foreground rounded-bl-none shadow-black/10 border border-border/40"
          )}>
            <div className="whitespace-pre-wrap leading-relaxed">{message.text}</div>
            <div className={cn(
              "text-[9px] mt-1 text-right",
              isMe ? "text-white/60" : "text-muted-foreground/60"
            )}>
              {format(message.time, 'HH:mm')}
            </div>
          </div>

          {!isMe && (
            <Popover open={isReactionPickerOpen} onOpenChange={setIsReactionPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-muted/50 mb-1">
                  <SmilePlus className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1 rounded-full border-border/40 backdrop-blur-xl bg-card/60" side="right">
                <div className="flex gap-1">
                  {REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleAddReaction(emoji)}
                      className="hover:scale-125 transition-transform p-1 text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {message.reactions && Object.entries(message.reactions).length > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => handleAddReaction(emoji)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] border transition-all",
                  users.includes(currentUser?.phone || '')
                    ? "bg-primary/20 border-primary/40 text-primary font-bold scale-105"
                    : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted/40"
                )}
              >
                <span>{emoji}</span>
                <span className="font-mono">{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}