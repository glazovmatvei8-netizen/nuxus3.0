
"use client"

import React, { useState, useEffect, memo } from 'react';
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
  Languages, Loader2, Crown, Diamond, 
  Rocket, Flame, Heart, Zap, Trophy, Gem, PartyPopper, Cookie, Ghost, 
  Coffee, Pizza, Beer, Wine, Camera, Laptop, Watch, Smartphone, Car, 
  Plane, Sun, Moon, Cloud, Snowflake, Trees, Flower2, Dog, Cat, Bird, 
  Fish, Bitcoin, Coins, Gamepad2, Music, Smile, ThumbsUp, Bell, Mail, 
  Key, Lock, Shield, Sword, Anchor, Compass, Map, Flag, Briefcase, GraduationCap,
  Pin, Forward, Gift, PlayCircle, Edit2, Copy, Timer, EyeOff, Clock, Search, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, doc, query, where, getDocs, limit } from 'firebase/firestore';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { transcribeVoice } from '@/ai/flows/voice-to-text-flow';
import type { Message } from '@/lib/types';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const GIFT_ICONS: Record<string, any> = {
  gift_heart: Heart, gift_zap: Zap, gift_fire: Flame, gift_trophy: Trophy, 
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

export const MessageItem = memo(({ message, isMe, chatId, onReply, amIPremium = false, isAdmin = false, senderAvatarUrl = null, onEdit }: any) => {
  const { user } = useUser();
  const db = useFirestore();
  const { setForwardingMessage } = useAppState();
  const { toast } = useToast();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showOneTimeView, setShowOneTimeView] = useState(false);

  const formattedTime = message.sentAt ? format(new Date(message.sentAt), 'HH:mm') : '';

  useEffect(() => {
    if (message.expiresInSeconds && !message.isExpired && !countdown) {
      setCountdown(message.expiresInSeconds);
    }
  }, [message]);

  useEffect(() => {
    if (countdown !== null) {
      if (countdown <= 0) {
        deleteDocumentNonBlocking(doc(db, 'chats', chatId, 'messages', message.id));
        return;
      }
      const timer = setTimeout(() => setCountdown(countdown! - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, chatId, message.id, db]);

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

  const handleCopy = () => {
    if (message.contentType === 'text') {
      navigator.clipboard.writeText(message.content);
      toast({ title: "Текст скопирован" });
    }
  };

  const jumpToOriginal = () => {
    if (message.replyToId) {
      const el = document.getElementById(`msg-${message.replyToId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleOpenOneTime = () => {
    if (message.isExpired) return;
    setShowOneTimeView(true);
  };

  const handleCloseOneTime = () => {
    setShowOneTimeView(false);
    if (!isMe && message.isOneTimeView) {
      updateDocumentNonBlocking(doc(db, 'chats', chatId, 'messages', message.id), { isExpired: true });
    }
  };

  const handlePaymentAction = async (action: 'confirm' | 'reject', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin || !db || !message.paymentData || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
      const targetUserRef = doc(db, 'users', message.paymentData.targetUserId);
      if (action === 'confirm') {
        const targetData = (await getDocs(query(collection(db, 'users'), where('id', '==', message.paymentData.targetUserId), limit(1)))).docs[0]?.data();
        const currentExpiry = targetData?.premiumUntil ? new Date(targetData.premiumUntil) : new Date();
        const newExpiry = message.paymentData.unit === 'months' 
          ? addMonths(currentExpiry, message.paymentData.amount || 1).toISOString()
          : addYears(currentExpiry, message.paymentData.amount || 1).toISOString();
        updateDocumentNonBlocking(targetUserRef, { isPremium: true, premiumUntil: newExpiry });
        updateDocumentNonBlocking(msgRef, { contentType: 'service', content: `✅ Оплата принята: ${message.paymentData.itemName}` });
        toast({ title: "Оплата подтверждена" });
      } else {
        updateDocumentNonBlocking(msgRef, { contentType: 'service', content: `❌ Оплата отклонена: ${message.paymentData.itemName}` });
        toast({ title: "Оплата отклонена" });
      }
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setIsActionLoading(false);
    }
  };

  const parseMarkdown = (text: string) => {
    if (!text) return text;
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-black/20 px-1 rounded">$1</code>');
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const renderContent = () => {
    if (message.scheduledAt && new Date(message.scheduledAt).getTime() > Date.now()) {
      return (
        <div className="flex items-center gap-2 py-1 px-2 opacity-50">
          <Clock className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest italic">Запланировано</span>
        </div>
      );
    }
    if (message.isExpired) {
      return (
        <div className="flex items-center gap-2 py-1 px-2 opacity-50 italic text-[10px]">
          <EyeOff className="w-4 h-4" /> Сообщение просмотрено
        </div>
      );
    }
    if (message.contentType === 'payment_request' && message.paymentData) {
      const data = message.paymentData;
      return (
        <div className="flex flex-col gap-3 p-1 min-w-[200px] max-w-[260px]">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <Crown className="w-5 h-5 text-primary" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-bold uppercase tracking-widest text-primary">Запрос оплаты</span>
              <span className="text-sm font-bold text-white truncate">{data.itemName}</span>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 h-7 text-[9px]" onClick={(e) => handlePaymentAction('confirm', e)} disabled={isActionLoading}>Принять</Button>
              <Button size="sm" variant="outline" className="flex-1 h-7 text-[9px]" onClick={(e) => handlePaymentAction('reject', e)} disabled={isActionLoading}>Отказать</Button>
            </div>
          )}
        </div>
      );
    }
    if (message.contentType === 'gift') {
      const Icon = GIFT_ICONS[message.content] || Gift;
      return (
        <div className="flex flex-col items-center justify-center my-2 p-4 bg-card/40 rounded-3xl border border-white/5">
          <Icon className={cn("w-14 h-14 mb-2 text-primary")} />
          <div className="text-sm font-black text-white">{message.giftValue} ₽</div>
        </div>
      );
    }
    if (message.contentType === 'video' || message.contentType === 'image') {
      const isOneTime = message.isOneTimeView;
      return (
        <div className="flex flex-col gap-1">
          {isOneTime && <div className="flex items-center gap-1.5 mb-1 px-1"><EyeOff className="w-3 h-3 text-accent" /><span className="text-[8px] font-bold uppercase text-accent tracking-widest">Один просмотр</span></div>}
          <div onClick={isOneTime ? handleOpenOneTime : undefined} className={cn("relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-primary/30 bg-black mt-1 group", isOneTime && "cursor-pointer")}>
            {message.contentType === 'video' ? (<video src={message.content} className={cn("w-full h-full object-cover", isOneTime && "blur-2xl opacity-40")} autoPlay loop muted playsInline />) : (<img src={message.content} className={cn("w-full h-full object-cover", isOneTime && "blur-2xl opacity-40")} />)}
            {isOneTime ? (<div className="absolute inset-0 flex items-center justify-center"><Search className="w-10 h-10 text-white/70" /></div>) : (<PlayCircle className="absolute inset-0 m-auto w-10 h-10 text-white/50 pointer-events-none" />)}
          </div>
        </div>
      );
    }
    if (message.contentType === 'audio') {
      return (
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-xl">
            <Mic className="w-4 h-4 text-primary" />
            <span className="text-xs">Голосовое сообщение</span>
            {amIPremium && (<Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleTranscribe(); }} disabled={isTranscribing}>{isTranscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}</Button>)}
          </div>
          {transcription && <p className="text-[10px] italic opacity-80 p-2 bg-primary/5 rounded-lg text-left max-w-[200px] break-words">{transcription}</p>}
        </div>
      );
    }
    return (
      <div className="flex flex-col text-left">
        {message.forwardFrom && (<div className="flex items-center gap-1.5 mb-1 opacity-50 border-l-2 border-white/10 pl-2"><Forward className="w-2.5 h-2.5" /><span className="text-[8px] font-bold uppercase">Переслано от {message.forwardFrom}</span></div>)}
        {message.replyToId && (<div onClick={(e) => { e.stopPropagation(); jumpToOriginal(); }} className="mb-1 p-1.5 bg-black/10 rounded-lg border-l-2 border-primary cursor-pointer hover:bg-black/20 transition-all max-w-[200px]"><div className="text-[8px] font-bold text-primary uppercase">Ответ</div><div className="text-[10px] truncate opacity-60 italic">{message.replyToContent}</div></div>)}
        <div className="whitespace-pre-wrap text-sm break-words max-w-[300px]">{message.contentType === 'text' ? parseMarkdown(message.content) : message.content}{message.editedAt && <span className="text-[8px] ml-1 opacity-40 uppercase">(ред.)</span>}</div>
      </div>
    );
  };

  if (message.contentType === 'service') {
    return (
      <div className="w-full flex justify-center my-4 px-4 shrink-0">
        <div className="max-w-[75%] bg-white/5 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-sm">
          <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em] text-center break-words">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div id={`msg-${message.id}`} className={cn("w-full flex mb-2 transition-all", isMe ? "justify-end" : "justify-start")}>
      <div className={cn("flex gap-3 max-w-[85%] relative group px-2 items-end", isMe ? "flex-row-reverse ml-auto" : "flex-row mr-auto")}>
        {!isMe && <UserAvatar userId={null} manualAvatarUrl={senderAvatarUrl} className="h-9 w-9 shrink-0" fallbackName={message.senderName} />}
        <div className={cn("flex flex-col min-w-0 max-w-full relative", isMe ? "items-end ml-auto" : "items-start mr-auto")}>
          <div className="flex items-center gap-1.5 mb-0.5">{countdown !== null && (<div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 rounded-full text-[8px] font-black text-red-500 animate-pulse"><Timer className="w-2.5 h-2.5" /> {countdown}</div>)}</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className={cn("p-3 rounded-2xl cursor-pointer shadow-md border transition-all hover:opacity-95 relative", isMe ? "message-bubble-me border-none ml-auto" : "bg-card border-white/5 text-foreground mr-auto", (message.contentType === 'video' || message.contentType === 'image') && "p-1 rounded-3xl bg-card border-white/5 shadow-none")}>
                {renderContent()}
                <div className={cn("flex items-center justify-end gap-1 mt-1 opacity-60", (message.contentType === 'video' || message.contentType === 'image') && "absolute bottom-3 right-5 bg-black/40 px-1.5 py-0.5 rounded-full")}><span className="text-[9px]">{formattedTime}</span>{isMe && (message.isRead ? <CheckCheck className="w-3 h-3 text-accent" /> : <Check className="w-3 h-3" />)}</div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMe ? 'end' : 'start'} className="w-48 bg-card border-white/10">
              <DropdownMenuItem onClick={() => onReply(message)} className="gap-2"><CornerUpLeft className="w-4 h-4" /> Ответить</DropdownMenuItem>
              {isMe && message.contentType === 'text' && (<DropdownMenuItem onClick={() => onEdit(message)} className="gap-2"><Edit2 className="w-4 h-4" /> Изменить</DropdownMenuItem>)}
              <DropdownMenuItem onClick={handleCopy} className="gap-2"><Copy className="w-4 h-4" /> Копировать</DropdownMenuItem>
              <DropdownMenuItem onClick={handleForward} className="gap-2"><Forward className="w-4 h-4" /> Переслать</DropdownMenuItem>
              {isAdmin && <DropdownMenuItem onClick={handlePin} className="gap-2"><Pin className="w-4 h-4" /> Закрепить</DropdownMenuItem>}
              <DropdownMenuSeparator className="bg-white/5" />
              {(isMe || isAdmin) && (<DropdownMenuItem onClick={() => deleteDocumentNonBlocking(doc(db, 'chats', chatId, 'messages', message.id))} className="text-destructive gap-2"><Trash2 className="w-4 h-4" /> Удалить</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
    <Dialog open={showOneTimeView} onOpenChange={handleCloseOneTime}>
      <DialogContent className="max-w-3xl bg-black/95 border-none p-0 overflow-hidden flex items-center justify-center">
        <DialogHeader className="sr-only"><DialogTitle>Один просмотр</DialogTitle></DialogHeader>
        <div className="relative w-full aspect-square md:aspect-video flex items-center justify-center">
           {message.contentType === 'video' ? (<video src={message.content} className="w-full h-full object-contain" autoPlay controls />) : (<img src={message.content} className="w-full h-full object-contain" />)}
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full" onClick={handleCloseOneTime}><X className="w-6 h-6" /></Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
});
MessageItem.displayName = 'MessageItem';
