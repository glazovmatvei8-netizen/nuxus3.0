"use client"

import React, { useState, useMemo, memo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useAppState } from '@/lib/store';
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
  CornerUpLeft, Trash2, Check, CheckCheck, Mic, Star, 
  Languages, Loader2, Crown, User as UserIcon, Calendar, Diamond, 
  Rocket, Flame, Heart, Zap, Trophy, Gem, PartyPopper, Cookie, Ghost, 
  Coffee, Pizza, Beer, Wine, Camera, Laptop, Watch, Smartphone, Car, 
  Plane, Sun, Moon, Cloud, Snowflake, Trees, Flower2, Dog, Cat, Bird, 
  Fish, Bitcoin, Coins, Gamepad2, Music, Smile, ThumbsUp, Bell, Mail, 
  Key, Lock, Shield, Sword, Anchor, Compass, Map, Flag, Briefcase, GraduationCap,
  Pin, Forward, Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, doc, query, where, getDocs, limit } from 'firebase/firestore';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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

export const MessageItem = memo(({ message, isMe, chatId, onReply, amIPremium = false, isAdmin = false, senderAvatarUrl = null }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { setForwardingMessage } = useAppState();
  const { toast } = useToast();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const formattedTime = useMemo(() => message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '', [message.sentAt]);

  const handleTranscribe = async () => {
    if (!amIPremium || transcription) { setTranscription(null); return; }
    setIsTranscribing(true);
    try {
      const { text } = await transcribeVoice({ audioDataUri: message.content });
      setTranscription(text);
    } catch (e) {} finally { setIsTranscribing(false); }
  };

  const handlePin = () => {
    if (!db || !chatId) return;
    updateDocumentNonBlocking(doc(db, 'chats', chatId), { pinnedMessageId: message.id });
    toast({ title: "Сообщение закреплено" });
  };

  const handleForward = () => {
    setForwardingMessage(message);
    toast({ title: "Выберите чат для пересылки" });
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

  const renderContent = () => {
    if (message.contentType === 'payment_request' && message.paymentData) {
      const data = message.paymentData;
      return (
        <div className="flex flex-col gap-3 p-1 min-w-[240px]">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <div className="bg-primary/20 p-2 rounded-xl">
              {data.type === 'premium' ? <Crown className="w-5 h-5 text-primary" /> : <Star className="w-5 h-5 text-accent" />}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-bold uppercase tracking-widest text-primary">Запрос оплаты</span>
              <span className="text-sm font-bold text-white">{data.itemName}</span>
            </div>
          </div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> Юзер:</span>
              <span className="text-white">{data.targetUserUsername}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Дата:</span>
              <span className="text-white">{formattedTime}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="font-bold">К оплате:</span>
              <span className="text-accent font-black">{data.price} ₽</span>
            </div>
          </div>
          {isAdmin && data.status === 'pending' && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 h-7 text-[9px]" onClick={(e) => handlePaymentAction('confirm', e)} disabled={isActionLoading}>
                {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />} Принять
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-7 text-[9px]" onClick={(e) => handlePaymentAction('reject', e)} disabled={isActionLoading}>
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
        <div className="flex flex-col items-center justify-center my-2">
          <div className={cn("bg-card/40 p-5 rounded-3xl border border-white/5 shadow-xl flex flex-col items-center gap-3 min-w-[200px]", message.isNFT && "ring-1 ring-accent/30")}>
            <div className="text-[9px] font-black text-primary uppercase tracking-widest opacity-60">ПОДАРОК</div>
            <Icon className={cn("w-14 h-14 drop-shadow-lg", message.isNFT ? "text-accent" : "text-primary")} />
            <div className="text-center">
              <div className="text-sm font-black text-white">{message.giftValue} ₽</div>
              {message.giftMessage && <p className="text-[10px] italic text-muted-foreground mt-1">"{message.giftMessage}"</p>}
            </div>
          </div>
        </div>
      );
    }
    
    if (message.contentType === 'image') {
      return (
        <div className="relative w-full max-w-[280px] aspect-square rounded-xl overflow-hidden mt-1">
          <Image src={message.content} alt="" fill className="object-cover" />
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
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleTranscribe(); }} disabled={isTranscribing}>
                {isTranscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
              </Button>
            )}
          </div>
          {transcription && <p className="text-[10px] italic opacity-80 p-2 bg-primary/5 rounded-lg">{transcription}</p>}
        </div>
      );
    }
    
    return (
      <div className="flex flex-col text-left">
        {message.forwardFrom && (
          <div className="flex items-center gap-1.5 mb-1 opacity-50 border-l-2 border-white/10 pl-2">
            <Forward className="w-2.5 h-2.5" />
            <span className="text-[8px] font-bold uppercase">Переслано от {message.forwardFrom}</span>
          </div>
        )}
        <div className="whitespace-pre-wrap text-sm break-words">{message.content}</div>
      </div>
    );
  };

  if (message.contentType === 'service') {
    return <div className="w-full flex justify-center my-2 text-center p-2 text-[10px] text-muted-foreground uppercase tracking-widest">{message.content}</div>;
  }

  return (
    <div id={`msg-${message.id}`} className={cn("flex gap-2 max-w-[85%] relative transition-colors duration-1000", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
      {!isMe && <UserAvatar userId={null} manualAvatarUrl={senderAvatarUrl} className="h-8 w-8 mt-auto shrink-0" fallbackName={message.senderName} />}
      <div className={cn("flex flex-col min-w-0", isMe ? "items-end" : "items-start")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className={cn(
              "p-3 rounded-2xl cursor-pointer shadow-sm border transition-all hover:bg-muted/10",
              isMe ? "bg-primary text-white border-primary" : "bg-card border-white/5 text-foreground"
            )}>
              {renderContent()}
              <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                <span className="text-[9px]">{formattedTime}</span>
                {isMe && (message.isRead ? <CheckCheck className="w-3 h-3 text-accent" /> : <Check className="w-3 h-3" />)}
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isMe ? 'end' : 'start'} className="w-48 bg-card border-white/10">
            <DropdownMenuItem onClick={() => onReply(message)} className="gap-2"><CornerUpLeft className="w-4 h-4" /> Ответить</DropdownMenuItem>
            <DropdownMenuItem onClick={handleForward} className="gap-2"><Forward className="w-4 h-4" /> Переслать</DropdownMenuItem>
            {isAdmin && <DropdownMenuItem onClick={handlePin} className="gap-2"><Pin className="w-4 h-4" /> Закрепить</DropdownMenuItem>}
            <DropdownMenuSeparator className="bg-white/5" />
            {(isMe || isAdmin) && (
              <DropdownMenuItem onClick={() => deleteDocumentNonBlocking(doc(db, 'chats', chatId, 'messages', message.id))} className="text-destructive gap-2">
                <Trash2 className="w-4 h-4" /> Удалить
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.message.id === next.message.id && 
         prev.message.content === next.message.content && 
         prev.message.isRead === next.message.isRead &&
         prev.amIPremium === next.amIPremium &&
         prev.isAdmin === next.isAdmin &&
         prev.senderAvatarUrl === next.senderAvatarUrl &&
         prev.chatId === next.chatId;
});

MessageItem.displayName = 'MessageItem';