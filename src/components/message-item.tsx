"use client"

import React, { useState, useEffect, memo, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/lib/store';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { SmilePlus, Play, Pause, CornerUpLeft, Pencil, Trash2, Check, CheckCheck, X, ZoomIn, Pin, Forward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Message } from '@/lib/types';
import Image from 'next/image';

interface MessageItemProps {
  message: Message;
  isMe: boolean;
  chatId: string;
  onReply?: () => void;
  onEdit?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏'];

export const MessageItem = memo(({ message, isMe, chatId, onReply, onEdit, size = 'medium' }: MessageItemProps) => {
  const { user } = useUser();
  const db = useFirestore();
  const { setForwardingMessage } = useAppState();
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isImageFullViewOpen, setIsImageFullViewOpen] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const formattedTime = useMemo(() => {
    if (!message.sentAt) return '';
    try {
      return format(new Date(message.sentAt), 'HH:mm');
    } catch (e) {
      return '';
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

  const handleDelete = () => {
    if (!db || !chatId || !message.id) return;
    deleteDocumentNonBlocking(doc(db, 'chats', chatId, 'messages', message.id));
  };

  const handlePin = () => {
    if (!db || !chatId || !message.id) return;
    updateDocumentNonBlocking(doc(db, 'chats', chatId), { pinnedMessageId: message.id });
  };

  const handleForward = () => {
    setForwardingMessage(message);
  };

  const groupedReactions = useMemo(() => {
    return (reactionsData || []).reduce((acc: Record<string, string[]>, curr) => {
      if (!acc[curr.emoji]) acc[curr.emoji] = [];
      acc[curr.emoji].push(curr.reactorId);
      return acc;
    }, {});
  }, [reactionsData]);

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
          <div 
            className="mt-1 rounded-lg overflow-hidden border border-border/20 max-w-sm relative aspect-video min-w-[200px] cursor-zoom-in group/img active:scale-[0.98] transition-transform"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { 
              e.preventDefault();
              e.stopPropagation(); 
              setIsImageFullViewOpen(true); 
            }}
          >
            <Image 
              src={message.content} 
              alt="Sent Image" 
              fill
              className="object-cover" 
              sizes="(max-width: 768px) 100vw, 400px"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn className="w-8 h-8 text-white/80" />
            </div>
          </div>
        );
      case 'audio':
        return (
          <div 
            className="flex items-center gap-3 p-2 bg-black/10 rounded-xl min-w-[240px]"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-primary/20 hover:bg-primary/30 shrink-0" onClick={toggleAudio}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center gap-1">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className={cn("w-0.5 bg-primary/40 rounded-full", i % 3 === 0 ? "h-4" : i % 2 === 0 ? "h-2" : "h-3", isPlaying && "animate-pulse")} />
                ))}
              </div>
              <span className="text-[9px] text-muted-foreground uppercase font-bold">Голосовое сообщение</span>
            </div>
            <audio ref={audioRef} src={message.content} onEnded={() => setIsPlaying(false)} className="hidden" />
          </div>
        );
      case 'video':
        return (
          <div 
            className="mt-1 flex justify-center"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-primary/40 bg-black shadow-lg">
              <video src={message.content} controls className="w-full h-full object-cover" />
            </div>
          </div>
        );
      case 'service':
        return (
          <div className="flex justify-center my-4 w-full text-center">
            <span className="bg-muted/30 px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-wider text-muted-foreground border border-border/20">
              {message.content}
            </span>
          </div>
        );
      default:
        return <div className="whitespace-pre-wrap leading-relaxed break-words">{message.content}</div>;
    }
  };

  if (message.contentType === 'service') return renderContent() as any;

  const sizeClasses = {
    small: "px-3 py-1.5 text-xs",
    medium: "px-4 py-2 text-sm",
    large: "px-5 py-3 text-base"
  };

  return (
    <>
      <div id={`msg-${message.id}`} className={cn(
        "flex gap-3 max-w-[85%] animate-in fade-in duration-150 px-1 py-0.5",
        isMe ? "ml-auto flex-row-reverse" : "mr-auto"
      )}>
        {!isMe && (
          <UserAvatar userId={message.senderId} className={cn("mt-auto shrink-0 ring-2 ring-primary/10", size === 'large' ? 'h-10 w-10' : 'h-8 w-8')} fallbackName={message.senderName} />
        )}
        
        <div className={cn("flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}>
          {!isMe && <span className="text-[10px] font-bold text-muted-foreground ml-2 opacity-70">{message.senderName}</span>}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="relative group cursor-pointer active:scale-[0.98] transition-transform outline-none">
                {message.replyToId && (
                  <div className={cn(
                    "px-3 py-1.5 rounded-t-xl text-[10px] border-l-2 border-primary max-w-full truncate opacity-70 mb-[-4px]",
                    isMe ? "bg-white/10" : "bg-black/5"
                  )}>
                    <span className="font-bold block text-primary">Ответ</span>
                    <span className="truncate block italic">{message.replyToContent}</span>
                  </div>
                )}

                <div className={cn(
                  "rounded-2xl shadow-sm relative group-hover:shadow-md transition-shadow",
                  message.contentType !== 'video' && message.contentType !== 'image' && message.contentType !== 'audio' ? sizeClasses[size] : (message.contentType === 'image' || message.contentType === 'audio' ? "p-0.5" : "p-1"),
                  isMe 
                    ? "bg-primary text-white rounded-br-none" 
                    : "bg-card text-foreground rounded-bl-none border border-border/40",
                  message.replyToId ? "rounded-tr-none rounded-tl-none" : ""
                )}>
                  {renderContent()}
                  <div className={cn(
                    "flex items-center justify-end gap-1 mt-1 text-[9px] select-none pb-1 pr-2",
                    isMe ? "text-white/60" : "text-muted-foreground/60"
                  )}>
                    {message.editedAt && <span>изменено</span>}
                    <span>{formattedTime}</span>
                    {isMe && (
                      message.isRead ? <CheckCheck className="w-3 h-3 text-accent" /> : <Check className="w-3 h-3" />
                    )}
                  </div>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 bg-card/95 backdrop-blur-xl border-border/40">
              <DropdownMenuItem onClick={onReply} className="gap-2"><CornerUpLeft className="w-4 h-4" /> Ответить</DropdownMenuItem>
              {isMe && message.contentType === 'text' && (
                <DropdownMenuItem onClick={onEdit} className="gap-2"><Pencil className="w-4 h-4" /> Изменить</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handlePin} className="gap-2"><Pin className="w-4 h-4" /> Закрепить</DropdownMenuItem>
              <DropdownMenuItem onClick={handleForward} className="gap-2"><Forward className="w-4 h-4" /> Переслать</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsReactionPickerOpen(true)} className="gap-2"><SmilePlus className="w-4 h-4" /> Реакция</DropdownMenuItem>
              {isMe && <DropdownMenuItem onClick={handleDelete} className="gap-2 text-destructive focus:text-destructive"><Trash2 className="w-4 h-4" /> Удалить</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>

          {Object.entries(groupedReactions).length > 0 && (
            <div className={cn("flex flex-wrap gap-1 mt-0.5", isMe ? "justify-end" : "justify-start")}>
              {Object.entries(groupedReactions).map(([emoji, reactorIds]) => (
                <button
                  key={emoji}
                  onClick={(e) => { e.stopPropagation(); handleAddReaction(emoji as string); }}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] border transition-all",
                    (reactorIds as string[]).includes(user?.uid || '')
                      ? "bg-primary/20 border-primary/40 text-primary font-bold"
                      : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <span>{emoji}</span>
                  <span className="font-mono">{(reactorIds as string[]).length}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {isReactionPickerOpen && (
          <Popover open={isReactionPickerOpen} onOpenChange={setIsReactionPickerOpen}>
            <PopoverTrigger asChild><div className="hidden" /></PopoverTrigger>
            <PopoverContent className="w-auto p-1 rounded-full border-border/40 backdrop-blur-xl bg-card/60" side="top">
              <div className="flex gap-1">
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => handleAddReaction(emoji)} className="hover:scale-125 transition-transform p-1 text-lg">{emoji}</button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <Dialog open={isImageFullViewOpen} onOpenChange={setIsImageFullViewOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden flex items-center justify-center z-[100]">
          <DialogTitle className="sr-only">Просмотр изображения</DialogTitle>
          <DialogDescription className="sr-only">Полноэкранный просмотр присланной фотографии</DialogDescription>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img 
              src={message.content} 
              alt="Full View" 
              className="max-w-full max-h-[90vh] object-contain animate-in zoom-in-95 duration-300"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.editedAt === nextProps.message.editedAt &&
    prevProps.message.isRead === nextProps.message.isRead &&
    prevProps.size === nextProps.size &&
    prevProps.isMe === nextProps.isMe
  );
});

MessageItem.displayName = 'MessageItem';
