
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
import { 
  SmilePlus, CornerUpLeft, Pencil, Trash2, Check, CheckCheck, ZoomIn, Pin, Play, Pause, Mic, Star, 
  Languages, Loader2, Lock, Gift, Crown, Diamond, Rocket, Flame, Heart, Zap, Trophy, PartyPopper, 
  Cookie, Ghost, Gem, Music, Gamepad2, Coffee, Pizza, Beer, Wine, Camera, Laptop, Watch, Smartphone, 
  Car, Plane, Anchor, Sun, Moon, Cloud, Snowflake, Trees, Flower2, Dog, Cat, Bird, Fish, Smile, 
  ThumbsUp, Bell, Mail, Key, Shield, Sword, Compass, Map, Flag, Briefcase, GraduationCap, Bitcoin, Coins
} from 'lucide-react';
import { cn, isUserPremium } from '@/lib/utils';
import { collection, doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';
import type { Message, User } from '@/lib/types';
import Image from 'next/image';

const GIFT_ICONS: Record<string, any> = {
  gift_star: Star, gift_heart: Heart, gift_zap: Zap, gift_fire: Flame, gift_trophy: Trophy, 
  gift_rocket: Rocket, gift_diamond: Diamond, gift_crown: Crown, gift_cake: Cookie, 
  gift_popper: PartyPopper, gift_ghost: Ghost, gift_gem: Gem, gift_coffee: Coffee,
  gift_pizza: Pizza, gift_beer: Beer, gift_wine: Wine, gift_camera: Camera,
  gift_laptop: Laptop, gift_watch: Watch, gift_phone: Smartphone, gift_car: Car,
  gift_plane: Plane, gift_sun: Sun, gift_moon: Moon, gift_cloud: Cloud, gift_snow: Snowflake,
  gift_tree: Trees, gift_flower: Flower2, gift_dog: Dog, gift_cat: Cat, gift_bird: Bird,
  gift_fish: Fish, gift_bitcoin: Bitcoin, gift_coins: Coins, gift_game: Gamepad2,
  gift_music: Music, gift_smile: Smile, gift_like: ThumbsUp, gift_bell: Bell,
  gift_mail: Mail, gift_key: Key, gift_lock: Lock, gift_shield: Shield, gift_sword: Sword,
  gift_anchor: Anchor, gift_compass: Compass, gift_map: Map, gift_flag: Flag,
  gift_briefcase: Briefcase, gift_grad: GraduationCap
};

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉', '💎', '🦄', '⚡'];

export const MessageItem = memo(({ message, isMe, chatId, onReply, onEdit, size = 'medium', isAdmin = false }: any) => {
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

  const formattedTime = useMemo(() => message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '', [message.sentAt]);

  const reactionsQuery = useMemoFirebase(() => {
    if (!db || !chatId || !message.id) return null;
    return collection(db, 'chats', chatId, 'messages', message.id, 'reactions');
  }, [db, chatId, message.id]);
  const { data: reactionsData } = useCollection(reactionsQuery);

  const handleAddReaction = (emoji: string) => {
    if (!user || !db) return;
    const existing = reactionsData?.find(r => r.emoji === emoji && r.reactorId === user.uid);
    if (existing) deleteDocumentNonBlocking(doc(db, 'chats', chatId, 'messages', message.id, 'reactions', existing.id));
    else addDocumentNonBlocking(collection(db, 'chats', chatId, 'messages', message.id, 'reactions'), {
      messageId: message.id, reactorId: user.uid, emoji, reactedAt: new Date().toISOString(),
    });
    setIsReactionPickerOpen(false);
  };

  const handleTranscribe = async () => {
    if (!amIPremium || transcription) { setTranscription(null); return; }
    setIsTranscribing(true);
    try {
      const { text } = await transcribeVoice({ audioDataUri: message.content });
      setTranscription(text);
    } catch (e) {} finally { setIsTranscribing(false); }
  };

  const groupedReactions = useMemo(() => {
    return (reactionsData || []).reduce((acc: any, curr) => {
      if (!acc[curr.emoji]) acc[curr.emoji] = [];
      acc[curr.emoji].push(curr.reactorId);
      return acc;
    }, {});
  }, [reactionsData]);

  const renderContent = () => {
    if (message.contentType === 'gift') {
      const Icon = GIFT_ICONS[message.content] || Gift;
      return (
        <div className="flex flex-col items-center justify-center my-6 w-full animate-in zoom-in-95 duration-500">
          <div className={cn(
            "bg-card/40 backdrop-blur-2xl p-6 rounded-[32px] border border-white/10 shadow-xl flex flex-col items-center gap-3 max-w-[280px] relative overflow-hidden",
            message.isNFT && "ring-2 ring-accent/40"
          )}>
            {message.isNFT && <div className="absolute top-0 right-0 bg-accent text-[8px] px-3 py-1 rounded-bl-xl font-black text-white tracking-widest">NFT COLLECTIBLE</div>}
            <div className="text-[10px] font-black text-primary uppercase tracking-widest opacity-60">
              {message.isNFT ? 'Лимитированный подарок' : 'Вам отправили подарок'}
            </div>
            <div className="relative py-2">
              <Icon className={cn("w-16 h-16 drop-shadow-2xl", message.isNFT ? "text-accent" : "text-primary")} />
              {message.isNFT && <div className="absolute -bottom-2 -right-2 bg-background/80 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-accent">#{message.serialNumber}</div>}
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-white">{message.giftValue} ⭐</div>
              {message.giftMessage && <p className="text-xs italic text-muted-foreground mt-2 line-clamp-3">"{message.giftMessage}"</p>}
              <div className="text-[9px] text-muted-foreground uppercase mt-2 opacity-50">от {message.senderName}</div>
            </div>
          </div>
        </div>
      );
    }
    // ... other content types (already implemented in original but simplified here)
    if (message.contentType === 'image') return <Image src={message.content} alt="" fill className="object-cover" />;
    if (message.contentType === 'video') return <video src={message.content} controls className="rounded-full w-48 h-48 object-cover" />;
    if (message.contentType === 'audio') return <div className="p-2 bg-muted/30 rounded-xl">Голосовое сообщение</div>;
    if (message.contentType === 'service') return <div className="text-center p-2 text-[10px] text-muted-foreground uppercase">{message.content}</div>;
    return <div className="whitespace-pre-wrap">{message.content}</div>;
  };

  if (message.contentType === 'gift' || message.contentType === 'service') return renderContent();

  return (
    <div id={`msg-${message.id}`} className={cn("flex gap-2 max-w-[85%] animate-in fade-in", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
      {!isMe && <UserAvatar userId={message.senderId} className="h-8 w-8 mt-auto" fallbackName={message.senderName} />}
      <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className={cn("p-3 rounded-2xl cursor-pointer shadow-sm border", isMe ? "bg-primary text-white border-primary" : "bg-card border-border")}>
              {renderContent()}
              <div className="text-[9px] mt-1 opacity-50 flex justify-end gap-1">
                {formattedTime} {isMe && (message.isRead ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onReply}>Ответить</DropdownMenuItem>
            {isMe && <DropdownMenuItem onClick={onEdit}>Изменить</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => setIsReactionPickerOpen(true)}>Реакция</DropdownMenuItem>
            {(isMe || isAdmin) && <DropdownMenuItem onClick={() => deleteDocumentNonBlocking(doc(db, 'chats', chatId, 'messages', message.id))} className="text-destructive">Удалить</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex gap-1 mt-1">
            {Object.entries(groupedReactions).map(([emoji, uids]: any) => (
              <div key={emoji} className="bg-muted/40 px-2 rounded-full text-[10px]">{emoji} {uids.length}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
