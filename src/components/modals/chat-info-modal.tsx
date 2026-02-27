"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Sparkles, Loader2, Trash2, Gift, XCircle, Crown, Star, Info, MessageSquare, ShieldAlert
} from 'lucide-react';
import { 
  Star as StarIcon, Heart, Zap, Flame, Trophy, Rocket, Diamond, 
  Cookie, PartyPopper, Ghost, Gem, Coffee, Pizza, Beer, Wine, 
  Camera, Laptop, Watch, Smartphone, Car, Plane, Sun, Moon, 
  Cloud, Snowflake, Trees, Flower2, Dog, Cat, Bird, Fish, 
  Bitcoin, Coins, Gamepad2, Music, Smile, ThumbsUp, Bell, 
  Mail, Key, Lock, Shield, Sword, Anchor, Compass, Map, 
  Flag, Briefcase, GraduationCap 
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc } from 'firebase/firestore';
import { chatConversationSummary } from '@/ai/flows/chat-conversation-summary-flow';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useAppState } from '@/lib/store';
import { cn, formatDisplayName, isUserPremium } from '@/lib/utils';
import type { Message, User, ReceivedGift } from '@/lib/types';
import { addMonths, addYears } from 'date-fns';

export const AVAILABLE_GIFTS = [
  { id: 'gift_star', name: 'Звезда', icon: StarIcon, color: 'text-yellow-400', value: 100 },
  { id: 'gift_heart', name: 'Сердце', icon: Heart, color: 'text-red-500', value: 150 },
  { id: 'gift_zap', name: 'Молния', icon: Zap, color: 'text-yellow-300', value: 250 },
  { id: 'gift_fire', name: 'Огонь', icon: Flame, color: 'text-orange-600', value: 300 },
  { id: 'gift_trophy', name: 'Трофей', icon: Trophy, color: 'text-amber-500', value: 500 },
  { id: 'gift_rocket', name: 'Ракета', icon: Rocket, color: 'text-orange-500', value: 1500, isNFT: true },
  { id: 'gift_diamond', name: 'Алмаз', icon: Diamond, color: 'text-blue-400', value: 5000, isNFT: true },
  { id: 'gift_crown', name: 'Корона', icon: Crown, color: 'text-purple-400', value: 10000, isNFT: true },
  { id: 'gift_cake', name: 'Торт', icon: Cookie, color: 'text-pink-400', value: 200 },
  { id: 'gift_popper', name: 'Хлопушка', icon: PartyPopper, color: 'text-green-400', value: 120 },
  { id: 'gift_ghost', name: 'Привидение', icon: Ghost, color: 'text-gray-400', value: 400 },
  { id: 'gift_gem', name: 'Изумруд', icon: Gem, color: 'text-emerald-400', value: 2500, isNFT: true },
  { id: 'gift_coffee', name: 'Кофе', icon: Coffee, color: 'text-amber-800', value: 50 },
  { id: 'gift_pizza', name: 'Пицца', icon: Pizza, color: 'text-orange-400', value: 80 },
  { id: 'gift_beer', name: 'Пиво', icon: Beer, color: 'text-yellow-600', value: 70 },
  { id: 'gift_wine', name: 'Вино', icon: Wine, color: 'text-red-700', value: 150 },
  { id: 'gift_camera', name: 'Камера', icon: Camera, color: 'text-blue-500', value: 600 },
  { id: 'gift_laptop', name: 'Ноутбук', icon: Laptop, color: 'text-slate-500', value: 2000 },
  { id: 'gift_watch', name: 'Часы', icon: Watch, color: 'text-indigo-400', value: 1200 },
  { id: 'gift_phone', name: 'Смартфон', icon: Smartphone, color: 'text-sky-400', value: 1800 },
  { id: 'gift_car', name: 'Машина', icon: Car, color: 'text-red-600', value: 15000, isNFT: true },
  { id: 'gift_plane', name: 'Самолет', icon: Plane, color: 'text-blue-300', value: 50000, isNFT: true },
  { id: 'gift_sun', name: 'Солнце', icon: Sun, color: 'text-yellow-500', value: 100 },
  { id: 'gift_moon', name: 'Луна', icon: Moon, color: 'text-slate-300', value: 100 },
  { id: 'gift_cloud', name: 'Облако', icon: Cloud, color: 'text-sky-200', value: 50 },
  { id: 'gift_snow', name: 'Снежинка', icon: Snowflake, color: 'text-blue-100', value: 80 },
  { id: 'gift_tree', name: 'Дерево', icon: Trees, color: 'text-green-600', value: 120 },
  { id: 'gift_flower', name: 'Цветок', icon: Flower2, color: 'text-pink-300', value: 90 },
  { id: 'gift_dog', name: 'Собака', icon: Dog, color: 'text-orange-300', value: 300 },
  { id: 'gift_cat', name: 'Кот', icon: Cat, color: 'text-slate-400', value: 300 },
  { id: 'gift_bird', name: 'Птица', icon: Bird, color: 'text-blue-400', value: 200 },
  { id: 'gift_fish', name: 'Рыба', icon: Fish, color: 'text-cyan-400', value: 250 },
  { id: 'gift_bitcoin', name: 'Биткоин', icon: Bitcoin, color: 'text-orange-500', value: 8000, isNFT: true },
  { id: 'gift_coins', name: 'Монеты', icon: Coins, color: 'text-yellow-600', value: 500 },
  { id: 'gift_game', name: 'Консоль', icon: Gamepad2, color: 'text-purple-500', value: 1100 },
  { id: 'gift_music', name: 'Музыка', icon: Music, color: 'text-pink-500', value: 300 },
  { id: 'gift_smile', name: 'Улыбка', icon: Smile, color: 'text-yellow-400', value: 20 },
  { id: 'gift_like', name: 'Лайк', icon: ThumbsUp, color: 'text-blue-500', value: 20 },
  { id: 'gift_bell', name: 'Колокольчик', icon: Bell, color: 'text-yellow-600', value: 100 },
  { id: 'gift_mail', name: 'Письмо', icon: Mail, color: 'text-slate-400', value: 40 },
  { id: 'gift_key', name: 'Ключ', icon: Key, color: 'text-amber-500', value: 1000, isNFT: true },
  { id: 'gift_lock', name: 'Замок', icon: Lock, color: 'text-slate-600', value: 500 },
  { id: 'gift_shield', name: 'Щит', icon: Shield, color: 'text-blue-700', value: 700 },
  { id: 'gift_sword', name: 'Меч', icon: Sword, color: 'text-slate-400', value: 800 },
  { id: 'gift_anchor', name: 'Якорь', icon: Anchor, color: 'text-blue-900', value: 400 },
  { id: 'gift_compass', name: 'Компас', icon: Compass, color: 'text-red-500', value: 300 },
  { id: 'gift_map', name: 'Карта', icon: Map, color: 'text-green-500', value: 450 },
  { id: 'gift_flag', name: 'Флаг', icon: Flag, color: 'text-blue-600', value: 200 },
  { id: 'gift_briefcase', name: 'Портфель', icon: Briefcase, color: 'text-amber-900', value: 600 },
  { id: 'gift_grad', name: 'Диплом', icon: GraduationCap, color: 'text-indigo-600', value: 700 },
];

export function ChatInfoModal({ open, onOpenChange, chat }: { open: boolean, onOpenChange: (o: boolean) => void, chat: any }) {
  const db = useFirestore();
  const { user } = useUser();
  const { setCurrentChatId } = useAppState();
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showGiftSelection, setShowGiftSelection] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const { toast } = useToast();

  const isOwner = user && chat.ownerId === user.uid;
  const isPrivate = chat.type === 'private';
  const otherId = isPrivate && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: currentUserProfile } = useDoc<User>(userProfileRef);
  const isAdmin = currentUserProfile?.phone === '+79513332147' || user?.uid === 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';
  
  const otherUserProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUserProfile } = useDoc<User>(otherUserProfileRef);

  const receivedGiftsQuery = useMemoFirebase(() => {
    if (!db || !otherId) return null;
    return query(collection(db, 'users', otherId, 'receivedGifts'), orderBy('receivedAt', 'desc'));
  }, [db, otherId]);
  const { data: receivedGifts } = useCollection<ReceivedGift>(receivedGiftsQuery);

  const handleSendGift = async (gift: typeof AVAILABLE_GIFTS[0]) => {
    if (!isAdmin || !db || !chat.id || !otherId) return;
    
    const serialNumber = gift.isNFT ? Math.floor(Math.random() * 500) + 1 : undefined;

    const messageData: any = {
      chatId: chat.id,
      senderId: user?.uid || 'admin',
      senderName: currentUserProfile?.name || 'Admin',
      content: gift.id,
      contentType: 'gift' as const,
      giftValue: gift.value,
      isNFT: gift.isNFT || false,
      sentAt: new Date().toISOString(),
      isRead: false
    };

    if (giftMessage.trim()) messageData.giftMessage = giftMessage.trim();
    if (serialNumber) messageData.serialNumber = serialNumber;

    const giftDocData: any = {
      giftType: gift.id,
      senderId: user?.uid || 'admin',
      senderName: currentUserProfile?.name || 'Admin',
      value: gift.value,
      isNFT: gift.isNFT || false,
      receivedAt: new Date().toISOString(),
      isSold: false
    };

    if (giftMessage.trim()) giftDocData.message = giftMessage.trim();
    if (serialNumber) giftDocData.serialNumber = serialNumber;

    addDocumentNonBlocking(collection(db, 'chats', chat.id, 'messages'), messageData);
    addDocumentNonBlocking(collection(db, 'users', otherId, 'receivedGifts'), giftDocData);
    
    setGiftMessage('');
    setShowGiftSelection(false);
    toast({ title: "Подарок отправлен!" });
  };

  const handleGrantPremium = (amount: number, unit: 'months' | 'years') => {
    if (!isAdmin || !db || !otherId) return;
    const currentExpiry = otherUserProfile?.premiumUntil ? new Date(otherUserProfile.premiumUntil) : new Date();
    const newExpiry = unit === 'months' 
      ? addMonths(currentExpiry, amount).toISOString() 
      : addYears(currentExpiry, amount).toISOString();
      
    updateDocumentNonBlocking(doc(db, 'users', otherId), { isPremium: true, premiumUntil: newExpiry });
    toast({ title: "Premium выдан!" });
  };

  const handleSummarize = async () => {
    if (!db || !chat.id) return;
    setIsSummarizing(true);
    try {
      const msgsQuery = query(collection(db, 'chats', chat.id, 'messages'), orderBy('sentAt', 'desc'), limit(30));
      const snap = await getDocs(msgsQuery);
      const msgs = snap.docs.map(d => ({
        senderName: d.data().senderName || 'Unknown',
        text: d.data().contentType === 'text' ? d.data().content : `[${d.data().contentType}]`
      })).reverse();
      const { summary: aiSummary } = await chatConversationSummary({ chatMessages: msgs });
      setSummary(aiSummary);
    } catch (e) {
      toast({ title: "Ошибка AI", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

  const chatName = formatDisplayName(chat.name || otherUserProfile?.name || 'Чат');
  const chatUsername = otherUserProfile?.username || chat.username;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden h-[90vh] flex flex-col">
        <DialogHeader className="p-6 bg-muted/30 border-b border-border text-center flex flex-col items-center shrink-0">
          <UserAvatar userId={isPrivate ? otherId : null} manualAvatarUrl={chat.avatarUrl} className="h-20 w-20 mb-3" fallbackName={chatName} />
          <DialogTitle className="text-xl flex items-center justify-center gap-2">
            {chatName} {isUserPremium(otherUserProfile) && <Star className="w-4 h-4 text-accent fill-accent" />}
          </DialogTitle>
          <DialogDescription className="text-xs">{chatUsername}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 h-10 bg-muted p-1 shrink-0">
            <TabsTrigger value="info">Инфо</TabsTrigger>
            <TabsTrigger value="members">Участники</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="flex-1 min-h-0 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {isPrivate && otherId && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Gift className="w-3 h-3" /> Подарки и NFT</h3>
                      {isAdmin && <Button variant="ghost" size="sm" className="h-7 text-xs text-primary font-bold" onClick={() => setShowGiftSelection(!showGiftSelection)}>Подарить</Button>}
                    </div>
                    
                    {showGiftSelection && isAdmin && (
                      <div className="space-y-3 p-3 bg-muted/50 rounded-2xl border border-border">
                        <Input placeholder="Сообщение..." value={giftMessage} onChange={e => setGiftMessage(e.target.value)} className="h-9 text-xs" />
                        <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                          {AVAILABLE_GIFTS.map(g => (
                            <button key={g.id} onClick={() => handleSendGift(g)} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-muted transition-colors group relative">
                              <g.icon className={cn("w-6 h-6", g.color)} />
                              <span className="text-[8px] font-bold uppercase truncate w-full text-center">{g.name}</span>
                              {g.isNFT && <div className="absolute top-0 right-0 bg-accent text-[6px] text-white px-1 rounded-bl-lg font-bold">NFT</div>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2 p-3 bg-muted/20 rounded-2xl min-h-[60px]">
                      {receivedGifts?.filter(g => !g.isSold).map(g => {
                        const giftInfo = AVAILABLE_GIFTS.find(ag => ag.id === g.giftType);
                        const Icon = giftInfo?.icon || Gift;
                        return (
                          <div key={g.id} className="relative group p-2 rounded-xl bg-muted/30 border border-white/5 flex flex-col items-center gap-1">
                            <Icon className={cn("w-6 h-6", giftInfo?.color)} />
                            <span className="text-[7px] font-bold text-center truncate w-full">{giftInfo?.name}</span>
                            {g.isNFT && <div className="text-[6px] text-accent font-black">#{g.serialNumber}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isAdmin && isPrivate && otherId && (
                  <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2"><Crown className="w-3 h-3" /> Управление Premium</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => handleGrantPremium(1, 'months')}>1 Мес.</Button>
                      <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => handleGrantPremium(3, 'months')}>3 Мес.</Button>
                      <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => handleGrantPremium(6, 'months')}>6 Мес.</Button>
                      <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => handleGrantPremium(1, 'years')}>1 Год</Button>
                      <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => handleGrantPremium(2, 'years')}>2 Года</Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Sparkles className="w-3 h-3" /> AI Суммаризация</h3>
                  <div className="bg-muted/30 p-4 rounded-xl border border-border">
                    {summary ? <p className="text-sm italic">{summary}</p> : <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleSummarize} disabled={isSummarizing}>Суммаризировать</Button>}
                  </div>
                </div>

                <div className="pt-4 pb-12">
                  <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10" onClick={() => {
                    if (confirm('Удалить этот чат?')) {
                      deleteDocumentNonBlocking(doc(db, 'chats', chat.id));
                      setCurrentChatId(null);
                      onOpenChange(false);
                    }
                  }}>Удалить чат</Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="members" className="flex-1 min-h-0 m-0 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                {chat.participantIds?.map((pid: string) => (
                  <MemberRow key={pid} userId={pid} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({ userId }: { userId: string }) {
  const db = useFirestore();
  const userRef = useMemoFirebase(() => (!db ? null : doc(db, 'users', userId)), [db, userId]);
  const { data: m } = useDoc<User>(userRef);
  if (!m) return null;
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <UserAvatar userId={m.id} className="h-10 w-10" fallbackName={m.name} />
        <div className="flex flex-col">
          <span className="text-sm font-semibold flex items-center gap-1">{formatDisplayName(m.name)} {isUserPremium(m) && <Star className="w-3 h-3 text-accent fill-accent" />}</span>
          <span className="text-[10px] text-muted-foreground">{m.username}</span>
        </div>
      </div>
    </div>
  );
}