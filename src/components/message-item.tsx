
"use client"

import React, { useState, useMemo, memo, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
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
import { SmilePlus, CornerUpLeft, Pencil, Trash2, Check, CheckCheck, ZoomIn, Pin, Play, Pause, Mic, Star, Languages, Loader2, Lock, Gift, Crown, Diamond, Rocket, Flame, Heart, Zap, Trophy } from 'lucide-react';
import { cn, isUserPremium } from '@/lib/utils';
import { collection, doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';
import type { Message, User } from '@/lib/types';
import Image from 'next/image';

interface MessageItemProps {
  message: Message;
  isMe: boolean;
  chatId: string;
  onReply?: () => void;
  onEdit?: () => void;
  size?: 'small' | 'medium' | 'large';
  isAdmin?: boolean;
}

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉', '💎', '🦄', '🌈', '⚡'];

export const MessageItem = memo(({ message, isMe, chatId, onReply, onEdit, size = 'medium', isAdmin = false }: MessageItemProps) => {
  const { user } = useUser();
  const db = useFirestore();
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const [isImageFullViewOpen, setIsImageFullViewOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const senderRef = useMemoFirebase(() => {
    if (!db || !message.senderId || message.senderId === 'system') return null;
    return doc(db, 'users', message.senderId);
  }, [db, message.senderId]);
  const { data: senderProfile } = useDoc<User>(senderRef);
  const isSenderPremium = isUserPremium(senderProfile);

  const meRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: meProfile } = useDoc<User>(meRef);
  const amIPremium = isUserPremium(meProfile);

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
    
    addDocumentNonBlocking(collection(db, 'chats', chatId, 'messages'), {
      chatId: chatId,
      senderId: 'system',
      senderName: 'Nuxus',
      content: `${user?.displayName || 'Пользователь'} закрепил(а) сообщение`,
      contentType: 'service',
      sentAt: new Date().toISOString()
    });
  };

  const handleTranscribe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!amIPremium) return;
    if (transcription) {
      setTranscription(null);
      return;
    }
    setIsTranscribing(true);
    try {
      const { text } = await transcribeVoice({ audioDataUri: message.content });
      setTranscription(text);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsVideoPlaying(true);
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    }
  };

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
        setIsAudioPlaying(true);
      } else {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      }
    }
  };

  const groupedReactions = useMemo(() => {
    return (reactionsData || []).reduce((acc: Record<string, string[]>, curr) => {
      if (!acc[curr.emoji]) acc[curr.emoji] = [];
      acc[curr.emoji].push(curr.reactorId);
      return acc;
    }, {});
  }, [reactionsData]);

  const renderContent = () => {
    switch (message.contentType) {
      case 'image':
        return (
          <div 
            className="mt-1 rounded-lg overflow-hidden border border-border/20 max-w-sm relative aspect-video min-w-[200px] cursor-zoom-in group/img"
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
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn className="w-8 h-8 text-white/80" />
            </div>
          </div>
        );
      case 'video':
        return (
          <div 
            className="mt-1 relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-primary/20 shadow-2xl cursor-pointer group/video self-center mx-auto"
            onClick={toggleVideo}
          >
            <video 
              ref={videoRef}
              src={message.content} 
              className="w-full h-full object-cover"
              loop
              playsInline
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
            />
            {!isVideoPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/video:bg-black/40 transition-all">
                <Play className="w-12 h-12 text-white fill-white" />
              </div>
            )}
            {isVideoPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-transparent opacity-0 group-hover/video:opacity-100 transition-all">
                <Pause className="w-12 h-12 text-white fill-white" />
              </div>
            )}
          </div>
        );
      case 'audio':
        return (
          <div className="flex flex-col gap-1">
            <div 
              className={cn(
                "mt-1 flex items-center gap-3 p-2 rounded-xl border border-border/20 min-w-[200px]",
                isMe ? "bg-primary/20" : "bg-muted/30"
              )}
              onClick={toggleAudio}
            >
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-primary text-white shrink-0">
                {isAudioPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
              </Button>
              <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <Mic className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Голосовое</span>
                </div>
                <div className="h-4 w-full flex items-center gap-1">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className={cn("w-0.5 rounded-full bg-primary/40", i % 2 === 0 ? "h-2" : "h-3", isAudioPlaying && "animate-pulse")} />
                  ))}
                </div>
              </div>
              {amIPremium && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className={cn("h-8 w-8 rounded-full transition-colors", isTranscribing ? "text-accent" : "text-muted-foreground")}
                  onClick={handleTranscribe}
                  disabled={isTranscribing}
                >
                  {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                </Button>
              )}
              <audio 
                ref={audioRef} 
                src={message.content} 
                onPlay={() => setIsAudioPlaying(true)} 
                onPause={() => setIsAudioPlaying(false)}
                onEnded={() => setIsAudioPlaying(false)}
              />
            </div>
            {transcription && (
              <div className="p-3 bg-muted/40 rounded-xl border border-primary/20 animate-in slide-in-from-top-2">
                <p className="text-xs italic text-foreground/90">{transcription}</p>
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-[8px] font-bold text-accent uppercase tracking-tighter">Расшифровано AI</span>
                </div>
              </div>
            )}
          </div>
        );
      case 'service':
        return (
          <div className="flex justify-center my-4 w-full text-center px-4">
            <span className="bg-muted/30 px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-wider text-muted-foreground border border-border/20">
              {message.content}
            </span>
          </div>
        );
      case 'gift':
        let GiftIcon = Gift;
        let giftTitle = 'Подарок Nuxus';
        let giftColor = 'text-primary';

        if (message.content === 'gift_star') { GiftIcon = Star; giftTitle = 'Звезда Nuxus'; giftColor = 'text-yellow-400'; }
        else if (message.content === 'gift_diamond') { GiftIcon = Diamond; giftTitle = 'Бриллиант'; giftColor = 'text-blue-400'; }
        else if (message.content === 'gift_crown') { GiftIcon = Crown; giftTitle = 'Корона Premium'; giftColor = 'text-purple-400'; }
        else if (message.content === 'gift_rocket') { GiftIcon = Rocket; giftTitle = 'Ракета Nuxus'; giftColor = 'text-orange-500'; }
        else if (message.content === 'gift_heart') { GiftIcon = Heart; giftTitle = 'Сердце Nuxus'; giftColor = 'text-red-500'; }
        else if (message.content === 'gift_fire') { GiftIcon = Flame; giftTitle = 'Огонь Nuxus'; giftColor = 'text-orange-600'; }
        else if (message.content === 'gift_zap') { GiftIcon = Zap; giftTitle = 'Молния Nuxus'; giftColor = 'text-yellow-300'; }
        else if (message.content === 'gift_trophy') { GiftIcon = Trophy; giftTitle = 'Трофей'; giftColor = 'text-amber-500'; }

        return (
          <div className="flex flex-col items-center justify-center my-8 w-full animate-in zoom-in-50 duration-500">
            <div className="bg-muted/20 backdrop-blur-xl p-8 rounded-[40px] border-2 border-white/10 shadow-[0_0_50px_rgba(var(--primary),0.2)] flex flex-col items-center gap-4 group/gift cursor-default">
              <div className="text-[12px] font-bold text-primary uppercase tracking-[0.2em] mb-2">Вам отправили подарок</div>
              <div className="relative">
                <div className={cn("absolute inset-0 blur-2xl rounded-full scale-150 group-hover/gift:scale-[2] transition-transform duration-700 opacity-20", giftColor.replace('text-', 'bg-'))} />
                <div className="relative animate-bounce [animation-duration:3s]">
                  <GiftIcon className={cn("w-16 h-16 fill-current", giftColor)} />
                </div>
              </div>
              <div className="text-xl font-black text-white mt-4 drop-shadow-lg">{giftTitle}</div>
              <div className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest mt-1">От {message.senderName}</div>
            </div>
          </div>
        );
      default:
        return <div className="whitespace-pre-wrap leading-relaxed break-words">{message.content}</div>;
    }
  };

  if (message.contentType === 'service' || message.contentType === 'gift') return renderContent() as any;

  const sizeClasses = {
    small: "px-3 py-1.5 text-xs",
    medium: "px-4 py-2 text-sm",
    large: "px-5 py-3 text-base"
  };

  return (
    <>
      <div id={`msg-${message.id}`} className={cn(
        "flex gap-3 max-w-[85%] animate-in fade-in duration-150 px-1 py-0.5 transition-colors",
        isMe ? "ml-auto flex-row-reverse" : "mr-auto",
        message.contentType === 'video' ? "w-full max-w-none justify-center" : ""
      )}>
        {!isMe && message.contentType !== 'video' && (
          <UserAvatar userId={message.senderId} className={cn("mt-auto shrink-0 ring-2 ring-primary/10", size === 'large' ? 'h-10 w-10' : 'h-8 w-8')} fallbackName={message.senderName} />
        )}
        
        <div className={cn("flex flex-col gap-0.5", isMe ? "items-end" : "items-start", message.contentType === 'video' ? "items-center w-full" : "")}>
          {!isMe && message.contentType !== 'video' && (
            <span className="text-[10px] font-bold text-muted-foreground ml-2 opacity-70 flex items-center gap-1">
              {message.senderName}
              {isSenderPremium && <Star className="w-2.5 h-2.5 text-accent fill-accent" />}
            </span>
          )}
          {message.contentType === 'video' && (
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 flex items-center gap-1">
              {message.senderName}
              {isSenderPremium && <Star className="w-3 h-3 text-accent fill-accent" />}
            </span>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className={cn("relative group cursor-pointer active:scale-[0.98] transition-transform outline-none", message.contentType === 'video' ? "w-full flex flex-col items-center" : "")}>
                {message.replyToId && message.contentType !== 'video' && (
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
                  (message.contentType !== 'image' && message.contentType !== 'video' && message.contentType !== 'audio') ? sizeClasses[size] : "p-0.5",
                  message.contentType === 'video' ? "bg-transparent shadow-none border-none p-0" :
                  (isMe ? "bg-primary text-white rounded-br-none" : "bg-card text-foreground rounded-bl-none border border-border/40"),
                  message.replyToId ? "rounded-tr-none rounded-tl-none" : ""
                )}>
                  {renderContent()}
                  {message.contentType !== 'video' && (
                    <div className={cn(
                      "flex items-center justify-end gap-1 mt-1 text-[9px] select-none pb-1 pr-2",
                      isMe ? "text-white/60" : "text-muted-foreground/60"
                    )}>
                      {message.editedAt && <span>изменено</span>}
                      <span>{formattedTime}</span>
                      {isMe && (
                        message.isRead ? <CheckCheck className="w-3 h-3 text-accent" /> : <Check className="w-3 h-3 text-white/70" />
                      )}
                    </div>
                  )}
                </div>
                {message.contentType === 'video' && (
                  <div className="flex items-center gap-2 mt-2 bg-card/40 backdrop-blur-md px-3 py-1 rounded-full border border-border/20">
                     <span className="text-[10px] font-bold text-muted-foreground">{formattedTime}</span>
                     {isMe && (
                        message.isRead ? <CheckCheck className="w-3 h-3 text-accent" /> : <Check className="w-3 h-3 text-muted-foreground" />
                      )}
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 bg-card/95 backdrop-blur-xl border-border/40">
              <DropdownMenuItem onClick={onReply} className="gap-2"><CornerUpLeft className="w-4 h-4" /> Ответить</DropdownMenuItem>
              {isMe && message.contentType === 'text' && (
                <DropdownMenuItem onClick={onEdit} className="gap-2"><Pencil className="w-4 h-4" /> Изменить</DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem onClick={handlePin} className="gap-2"><Pin className="w-4 h-4" /> Закрепить</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsReactionPickerOpen(true)} className="gap-2"><SmilePlus className="w-4 h-4" /> Реакция</DropdownMenuItem>
              {(isMe || isAdmin) && <DropdownMenuItem onClick={handleDelete} className="gap-2 text-destructive focus:text-destructive"><Trash2 className="w-4 h-4" /> Удалить</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>

          {Object.entries(groupedReactions).length > 0 && (
            <div className={cn("flex flex-wrap gap-1 mt-0.5", isMe ? "justify-end" : "justify-start", message.contentType === 'video' ? "justify-center" : "")}>
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
              <div className="flex gap-1 flex-wrap max-w-[200px] justify-center">
                {REACTIONS.map(emoji => {
                  const isPremiumEmoji = ['🎉', '💎', '🦄', '🌈', '⚡'].includes(emoji);
                  return (
                    <button 
                      key={emoji} 
                      onClick={() => handleAddReaction(emoji)} 
                      disabled={isPremiumEmoji && !amIPremium}
                      className={cn(
                        "hover:scale-125 transition-transform p-1 text-lg relative",
                        isPremiumEmoji && !amIPremium && "opacity-40 grayscale cursor-not-allowed"
                      )}
                    >
                      {emoji}
                      {isPremiumEmoji && !amIPremium && <Lock className="absolute -top-1 -right-1 w-2.5 h-2.5 text-accent" />}
                    </button>
                  );
                })}
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
}, (prev, next) => {
  return prev.message.id === next.message.id && 
         prev.message.isRead === next.message.isRead && 
         prev.message.content === next.message.content &&
         prev.message.editedAt === next.message.editedAt &&
         prev.isAdmin === next.isAdmin;
});

MessageItem.displayName = 'MessageItem';
