
"use client"

import React, { useState, useMemo, memo, useCallback } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { format, addMonths, addYears } from 'date-fns';
import { 
  SmilePlus, CornerUpLeft, Pencil, Trash2, Check, CheckCheck, Mic, Star, 
  Languages, Loader2, Lock, Gift, Crown, Diamond, Rocket, Flame, Heart, Zap, Trophy, PartyPopper, 
  Cookie, Ghost, Gem, Music, Gamepad2, Coffee, Pizza, Beer, Wine, Camera, Laptop, Watch, Smartphone, 
  Car, Plane, Anchor, Sun, Moon, Cloud, Snowflake, Trees, Flower2, Dog, Cat, Bird, Fish, Smile, 
  ThumbsUp, Bell, Mail, Key, Shield, Sword, Compass, Map, Flag, Briefcase, GraduationCap, Bitcoin, Coins,
  Calendar, User as UserIcon, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, doc, increment, query, where, getDocs, limit } from 'firebase/firestore';
import { deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';
import type { Message } from '@/lib/types';
import Image from 'next/image';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';

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

export const MessageItem = memo(({ message, isMe, chatId, onReply, onEdit, onOpenReactions, amIPremium = false, isAdmin = false, senderAvatarUrl = null }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const formattedTime = useMemo(() => message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '', [message.sentAt]);

  const reactionsQuery = useMemoFirebase(() => {
    if (!db || !chatId || !message.id) return null;
    return collection(db, 'chats', chatId, 'messages', message.id, 'reactions');
  }, [db, chatId, message.id]);
  
  const { data: reactionsData } = useCollection(reactionsQuery);

  const handleToggleReaction = useCallback((emoji: string) => {
    if (!user || !db) return;
    const existing = reactionsData?.find(r => r.emoji === emoji && r.reactorId === user.uid);
    if (existing) {
      deleteDocumentNonBlocking(doc(db, 'chats', chatId, 'messages', message.id, 'reactions', existing.id));
    } else {
      addDocumentNonBlocking(collection(db, 'chats', chatId, 'messages', message.id, 'reactions'), {
        messageId: message.id, reactorId: user.uid, emoji, reactedAt: new Date().toISOString(),
      });
    }
  }, [reactionsData, user, db, chatId, message.id]);

  const handleTranscribe = async () => {
    if (!amIPremium || transcription) { setTranscription(null); return; }
    setIsTranscribing(true);
    try {
      const { text } = await transcribeVoice({ audioDataUri: message.content });
      setTranscription(text);
    } catch (e) {} finally { setIsTranscribing(false); }
  };

  const handlePaymentAction = async (action: 'confirm' | 'reject', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAdmin || !db || !message.paymentData || isActionLoading) return;
    setIsActionLoading(true);

    try {
      const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
      const targetUserRef = doc(db, 'users', message.paymentData.targetUserId);

      if (action === 'confirm') {
        if (message.paymentData.type === 'premium') {
          const targetUserSnap = await getDocs(query(collection(db, 'users'), where('id', '==', message.paymentData.targetUserId), limit(1)));
          const targetData = targetUserSnap.docs[0]?.data();
          const currentExpiry = targetData?.premiumUntil ? new Date(targetData.premiumUntil) : new Date();
          const newExpiry = message.paymentData.unit === 'months' 
            ? addMonths(currentExpiry, message.paymentData.amount || 1).toISOString()
            : addYears(currentExpiry, message.paymentData.amount || 1).toISOString();
          
          updateDocumentNonBlocking(targetUserRef, { isPremium: true, premiumUntil: newExpiry });
        } else if (message.paymentData.type === 'stars') {
          updateDocumentNonBlocking(targetUserRef, { stars: increment(message.paymentData.stars || 0) });
        }

        updateDocumentNonBlocking(msgRef, {
          contentType: 'service',
          content: `✅ Оплата подтверждена: ${message.paymentData.itemName}`,
          paymentData: { ...message.paymentData, status: 'confirmed' }
        });
        toast({ title: "Оплата подтверждена" });
      } else {
        updateDocumentNonBlocking(msgRef, {
          contentType: 'service',
          content: `❌ Оплата отклонена: ${message.paymentData.itemName}`,
          paymentData: { ...message.paymentData, status: 'rejected' }
        });
        toast({ title: "Оплата отклонена" });
      }
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setIsActionLoading(false);
    }
  };

  const groupedReactions = useMemo(() => {
    return (reactionsData || []).reduce((acc: any, curr) => {
      if (!acc[curr.emoji]) acc[curr.emoji] = [];
      acc[curr.emoji].push(curr.reactorId);
      return acc;
    }, {});
  }, [reactionsData]);

  const renderContent = () => {
    if (message.contentType === 'payment_request' && message.paymentData) {
      const data = message.paymentData;
      return (
        <div className="flex flex-col gap-4 p-2 min-w-[260px]">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <div className="bg-primary/20 p-2 rounded-xl">
              {data.type === 'premium' ? <Crown className="w-5 h-5 text-primary" /> : <Star className="w-5 h-5 text-accent" />}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Запрос оплаты</span>
              <span className="text-sm font-black text-white">{data.itemName}</span>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> Пользователь:</span>
              <span className="text-white font-medium">{data.targetUserUsername}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Дата:</span>
              <span className="text-white font-medium">{formattedTime}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="font-bold">К оплате:</span>
              <span className="text-accent font-black text-sm">{data.price} ₽</span>
            </div>
          </div>
          {isAdmin && data.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1 rounded-xl" onClick={(e) => handlePaymentAction('confirm', e)} disabled={isActionLoading}>
                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Принять
              </Button>
              <Button size="sm" variant="outline" className="flex-1 rounded-xl" onClick={(e) => handlePaymentAction('reject', e)} disabled={isActionLoading}>
                Отказать
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (message.contentType === 'gift') {
      const Icon = GIFT_ICONS[message.content] || Gift;
      return (
        <div className="flex flex-col items-center justify-center my-4 w-full">
          <div className={cn("bg-card/40 backdrop-blur-2xl p-6 rounded-[32px] border border-white/10 shadow-xl flex flex-col items-center gap-3 max-w-[280px] relative overflow-hidden", message.isNFT && "ring-2 ring-accent/40")}>
            {message.isNFT && <div className="absolute top-0 right-0 bg-accent text-[8px] px-3 py-1 rounded-bl-xl font-black text-white tracking-widest">NFT</div>}
            <div className="text-[10px] font-black text-primary uppercase tracking-widest opacity-60">ПОДАРОК</div>
            <Icon className={cn("w-16 h-16 drop-shadow-2xl", message.isNFT ? "text-accent" : "text-primary")} />
            <div className="text-center">
              <div className="text-lg font-black text-white">{message.giftValue} ⭐</div>
              {message.giftMessage && <p className="text-xs italic text-muted-foreground mt-2">"{message.giftMessage}"</p>}
            </div>
          </div>
        </div>
      );
    }
    
    if (message.contentType === 'image') {
      return (
        <div className="relative w-full max-w-[300px] aspect-square rounded-xl overflow-hidden mt-1">
          <Image src={message.content} alt="" fill className="object-cover" />
        </div>
      );
    }
    
    if (message.contentType === 'video') {
      return (
        <div className="relative w-60 h-60 rounded-full overflow-hidden mt-1 border-4 border-primary/20">
          <video src={message.content} autoPlay muted loop className="w-full h-full object-cover" />
        </div>
      );
    }
    
    if (message.contentType === 'audio') {
      return (
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-xl">
            <Mic className="w-4 h-4 text-primary" />
            <span className="text-xs">Голос</span>
            {amIPremium && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleTranscribe} disabled={isTranscribing}>
                {isTranscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
              </Button>
            )}
          </div>
          {transcription && <p className="text-[10px] italic opacity-80 p-2 bg-primary/5 rounded-lg">{transcription}</p>}
        </div>
      );
    }
    
    return <div className="whitespace-pre-wrap text-sm break-words">{message.content}</div>;
  };

  if (message.contentType === 'service') {
    return <div className="w-full flex justify-center my-2 text-center p-2 text-[10px] text-muted-foreground uppercase tracking-widest">{message.content}</div>;
  }

  return (
    <div id={`msg-${message.id}`} className={cn("flex gap-2 max-w-[85%] relative", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
      {!isMe && <UserAvatar userId={null} manualAvatarUrl={senderAvatarUrl} className="h-8 w-8 mt-auto shrink-0" fallbackName={message.senderName} />}
      <div className={cn("flex flex-col min-w-0", isMe ? "items-end" : "items-start")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className={cn(
              "p-3 rounded-2xl cursor-pointer shadow-sm border transition-all hover:brightness-105",
              isMe ? "bg-primary text-white border-primary" : "bg-card border-border text-foreground"
            )}>
              {renderContent()}
              <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                <span className="text-[9px]">{formattedTime}</span>
                {isMe && (message.isRead ? <CheckCheck className="w-3 h-3 text-accent" /> : <Check className="w-3 h-3" />)}
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isMe ? 'end' : 'start'} className="w-48">
            <DropdownMenuItem onClick={() => onReply(message)} className="gap-2"><CornerUpLeft className="w-4 h-4" /> Ответить</DropdownMenuItem>
            {isMe && message.contentType === 'text' && <DropdownMenuItem onClick={() => onEdit(message)} className="gap-2"><Pencil className="w-4 h-4" /> Изменить</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => onOpenReactions(message)} className="gap-2"><SmilePlus className="w-4 h-4" /> Реакция</DropdownMenuItem>
            <DropdownMenuSeparator />
            {(isMe || isAdmin) && <DropdownMenuItem onClick={() => deleteDocumentNonBlocking(doc(db, 'chats', chatId, 'messages', message.id))} className="text-destructive gap-2"><Trash2 className="w-4 h-4" /> Удалить</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>

        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(groupedReactions).map(([emoji, uids]: any) => (
              <button key={emoji} onClick={() => handleToggleReaction(emoji)} className={cn("bg-muted/40 px-2 py-0.5 rounded-full text-[10px] border border-white/5", uids.includes(user?.uid) && "ring-1 ring-primary/40 bg-primary/10")}>
                {emoji} {uids.length}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.message.id === next.message.id && 
         prev.message.content === next.message.content && 
         prev.message.isRead === next.message.isRead &&
         prev.amIPremium === next.amIPremium &&
         prev.isAdmin === next.isAdmin &&
         prev.senderAvatarUrl === next.senderAvatarUrl;
});

MessageItem.displayName = 'MessageItem';
