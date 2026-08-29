"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, collection, writeBatch, increment, addDoc, query, where } from 'firebase/firestore';
import { Gift, Sparkles, Loader2, Wallet, Zap, ChevronRight, Gem } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, StickerPack } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

/**
 * GIFT MODAL V5.2.2 «TITANIUM SYNC»
 * ИСПРАВЛЕНО: Прямые импорты хуков.
 */

const PREDEFINED_GIFTS = [
  { id: 'silver_star', name: 'Серебряная звезда', price: 40, icon: '⭐' },
  { id: 'lightning', name: 'Молния Ядра', price: 80, icon: '⚡' },
  { id: 'shield', name: 'Щит Защиты', price: 200, icon: '🛡️' },
  { id: 'golden_crown', name: 'Золотая корона', price: 400, icon: '👑' },
  { id: 'fire', name: 'Пламя Энергии', price: 600, icon: '🔥' },
  { id: 'diamond_ring', name: 'Бриллиант Ядра', price: 800, icon: '💎' },
  { id: 'unicorn', name: 'Единорог Удачи', price: 1200, icon: '🦄' },
  { id: 'rocket_signal', name: 'Квантовая ракета', price: 2000, icon: '🚀' },
  { id: 'saturn', name: 'Планета Nuxus', price: 3000, icon: '🪐' },
  { id: 'premium_orb', name: 'Сфера Nuxus Prime', price: 4500, icon: '🔮' },
  { id: 'trophy', name: 'Кубок Лидера', price: 9000, icon: '🏆' },
  { id: 'nft_genesis', name: 'Nuxus Genesis NFT', price: 45000, icon: '🖼️', isNft: true },
  { id: 'nft_dragon', name: 'Quantum Dragon', price: 140000, icon: '🐉', isNft: true },
  { id: 'nft_citadel', name: 'Galactic Citadel', price: 480000, icon: '🏰', isNft: true },
  { id: 'nft_singularity', name: 'Omega Singularity', price: 950000, icon: '🌑', isNft: true },
];

export function GiftModal({ open, onOpenChange, targetUser, chatId }: { open: boolean, onOpenChange: (o: boolean) => void, targetUser: User | null, chatId?: string | null }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const myProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: myProfile } = useDoc<User>(myProfileRef);

  const handleSendGift = async (gift: typeof PREDEFINED_GIFTS[0]) => {
    if (!db || !user || !targetUser || !myProfile) return;
    
    if ((myProfile.balance || 0) < gift.price) {
      toast({ title: "Недостаточно средств", description: "Пополните кошелек для покупки подарка", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const batch = writeBatch(db);
      
      const senderRef = doc(db, 'users', user.uid);
      const giftRef = doc(collection(db, 'users', targetUser.id, 'receivedGifts'));
      const txRef = doc(collection(db, 'users', user.uid, 'transactions'));

      batch.update(senderRef, { balance: increment(-gift.price) });

      batch.set(giftRef, {
        id: giftRef.id,
        senderId: user.uid,
        senderName: myProfile.name,
        giftId: gift.id,
        giftName: gift.name,
        giftIcon: gift.icon,
        price: gift.price,
        isNft: !!(gift as any).isNft,
        receivedAt: new Date().toISOString()
      });

      batch.set(txRef, {
        id: txRef.id,
        userId: user.uid,
        amount: -gift.price,
        type: 'gift_purchase',
        status: 'completed',
        otherPartyId: targetUser.id,
        otherPartyName: targetUser.name,
        createdAt: new Date().toISOString()
      });

      await batch.commit();

      if (chatId) {
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          chatId,
          senderId: user.uid,
          senderName: myProfile.name,
          content: `${myProfile.name} подарил подарок: ${gift.name} ${gift.icon}`,
          contentType: 'gift',
          sentAt: new Date().toISOString(),
          isRead: false,
          metadata: {
            giftId: gift.id,
            giftIcon: gift.icon,
            giftName: gift.name,
            isNft: !!(gift as any).isNft
          }
        });
      }

      toast({ title: "Подарок отправлен!", description: `${gift.name} теперь в коллекции ${targetUser.name}` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Ошибка отправки", description: e.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  if (!targetUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl flex flex-col">
        <DialogHeader className="p-6 border-b border-white/5 bg-primary/5">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" /> Отправить подарок
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Получатель: {targetUser.name}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-white uppercase">Ваш баланс</span>
            </div>
            <span className="text-lg font-black italic text-primary">{myProfile?.balance?.toFixed(2) || '0.00'} NX</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Выберите предмет (листайте)</span>
              <ChevronRight className="w-3 h-3 text-primary animate-pulse" />
            </div>
            
            <ScrollArea className="w-full pb-4">
              <div className="flex gap-3 px-1">
                {PREDEFINED_GIFTS.map(gift => (
                  <button
                    key={gift.id}
                    onClick={() => handleSendGift(gift)}
                    disabled={isSending}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 min-w-[140px] bg-white/5 rounded-3xl border border-white/5 hover:bg-primary/10 hover:border-primary/30 transition-all group shrink-0",
                      (gift as any).isNft && "border-accent/40 bg-accent/5 hover:bg-accent/10"
                    )}
                  >
                    <div className="relative">
                      <div className="text-5xl group-hover:scale-125 transition-transform duration-500 drop-shadow-2xl">{gift.icon}</div>
                      {(gift as any).isNft && (
                        <div className="absolute -top-2 -right-2 bg-accent text-black p-1 rounded-lg">
                          <Gem className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-bold text-white truncate w-24">{gift.name}</p>
                      <div className={cn(
                        "mt-2 px-2 py-1 rounded-lg border",
                        (gift as any).isNft ? "bg-accent/20 border-accent/20" : "bg-primary/20 border-primary/20"
                      )}>
                        <span className={cn("text-[10px] font-black", (gift as any).isNft ? "text-accent" : "text-primary")}>{gift.price} NX</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>

        {isSending && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-50">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white">Шифрование подарка...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}