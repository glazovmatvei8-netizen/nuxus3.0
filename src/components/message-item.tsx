"use client"

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { SmilePlus, Play, Pause, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface MessageItemProps {
  message: any;
  isMe: boolean;
  chatId: string;
}

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏'];

export function MessageItem({ message, isMe, chatId }: MessageItemProps) {
  const { user } = useUser();
  const db = useFirestore();
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const [formattedTime, setFormattedTime] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (message.sentAt) {
      try {
        setFormattedTime(format(new Date(message.sentAt), 'HH:mm'));
      } catch (e) {
        setFormattedTime('');
      }
    }
  }, [message.sentAt]);

  const reactionsQuery = useMemoFirebase(() => {
    if (!db || !chatId || !message.id) return null;
    return collection(db, 'chats', chatId, 'messages', message.id, 'reactions');
  }, [db, chatId, message.id]);

  const { data: reactionsData } = useCollection(reactionsQuery);

  const handleAddReaction = (emoji: string) => {
    if (!user || !db) return;
    const existing = reactionsData?.find(r => r.emoji === emoji && r.reactorId === user.uid);
    if (existing) {
      deleteDocumentNonBlocking(doc(db, 'chats', chatId, 'messages', message.id, 'reactions', existing.id));
    } else {
      addDocumentNonBlocking(collection(db, 'chats', chatId, 'messages', message.id, 'reactions'), {
        messageId: message.id,
        reactorId: user.uid,
        emoji,
        reactedAt: new Date().toISOString(),
      });
    }
    setIsReactionPickerOpen(false);
  };

  const groupedReactions = (reactionsData || []).reduce((acc: Record<string, string[]>, curr) => {
    if (!acc[curr.emoji]) acc[curr.emoji] = [];
    acc[curr.emoji].push(curr.reactorId);
    return acc;
  }, {});

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const renderContent = () => {
    switch (message.contentType) {
      case 'image':
        return (
          <div className="mt-1 rounded-lg overflow-hidden border border-border/20 max-w-sm">
            <img src={message.content} alt="Sent image" className="w-full h-auto object-cover max-h-[300px]" />
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-3 p-2 bg-black/10 rounded-xl min-w-[200px]">
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-primary/20" onClick={toggleAudio}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>
            <div className="flex-1 h-1 bg-primary/20 rounded-full relative overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-primary" style={{ width: '40%' }}></div>
            </div>
            <audio ref={audioRef} src={message.content} onEnded={() => setIsPlaying(false)} className="hidden" />
            <span className="text-[10px] opacity-60">Voice</span>
          </div>
        );
      case 'video':
        return (
          <div className="mt-1 rounded-xl overflow-hidden border border-border/20 max-w-sm bg-black aspect-video flex items-center justify-center">
            <video src={message.content} controls className="max-w-full max-h-[300px]" />
          </div>
        );
      case 'service':
        return (
          <div className="flex justify-center my-4">
            <span className="bg-muted/30 px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-wider text-muted-foreground border border-border/20">
              {message.content}
            </span>
          </div>
        );
      default:
        return <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>;
    }
  };

  if (message.contentType === 'service') return renderContent() as any;

  return (
    <div className={cn(
      "flex gap-3 max-w-[85%] animate-in slide-in-from-bottom-2",
      isMe ? "ml-auto flex-row-reverse" : "mr-auto"
    )}>
      {!isMe && (
        <Avatar className="h-8 w-8 mt-auto shrink-0 ring-2 ring-primary/10">
          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">{message.senderName?.slice(0, 2)}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
        {!isMe && <span className="text-[10px] font-semibold text-muted-foreground ml-2">{message.senderName}</span>}
        
        <div className="relative group flex items-end gap-2">
          {isMe && (
            <Popover open={isReactionPickerOpen} onOpenChange={setIsReactionPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 rounded-full hover:bg-muted/50 mb-1">
                  <SmilePlus className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1 rounded-full border-border/40 backdrop-blur-xl bg-card/60" side="left">
                <div className="flex gap-1">
                  {REACTIONS.map(emoji => (
                    <button key={emoji} onClick={() => handleAddReaction(emoji)} className="hover:scale-125 transition-transform p-1 text-lg">{emoji}</button>
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
            {renderContent()}
            <div className={cn(
              "text-[9px] mt-1 text-right",
              isMe ? "text-white/60" : "text-muted-foreground/60"
            )}>
              {formattedTime}
            </div>
          </div>

          {!isMe && (
            <Popover open={isReactionPickerOpen} onOpenChange={setIsReactionPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 rounded-full hover:bg-muted/50 mb-1">
                  <SmilePlus className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1 rounded-full border-border/40 backdrop-blur-xl bg-card/60" side="right">
                <div className="flex gap-1">
                  {REACTIONS.map(emoji => (
                    <button key={emoji} onClick={() => handleAddReaction(emoji)} className="hover:scale-125 transition-transform p-1 text-lg">{emoji}</button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {Object.entries(groupedReactions).length > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
            {Object.entries(groupedReactions).map(([emoji, reactorIds]) => (
              <button
                key={emoji}
                onClick={() => handleAddReaction(emoji)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] border transition-all",
                  reactorIds.includes(user?.uid || '')
                    ? "bg-primary/20 border-primary/40 text-primary font-bold scale-105"
                    : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted/40"
                )}
              >
                <span>{emoji}</span>
                <span className="font-mono">{reactorIds.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}