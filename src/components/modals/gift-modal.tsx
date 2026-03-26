
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, writeBatch, increment, addDoc } from 'firebase/firestore';
import { Gift, Sparkles, Loader2, Wallet, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';

const PREDEFINED_GIFTS = [
  { id: 'silver_star', name: 'Серебряная звезда', price: 50, icon: '⭐' },
  { id: 'golden_crown', name: 'Золотая корона', price: 500, icon: '👑' },
  { id: 'diamond_ring', name: 'Бриллиант Ядра', price: 1000, icon: '💎' },
  { id: 'rocket_signal', name: 'Квантовая ракета', price: 2500, icon: '🚀' },
  { id: 'premium_orb', name: 'Сфера Nuxus Prime', price: 5000, icon: '🔮' },
];

export function GiftModal({ open, onOpenChange, targetUser }: { open: boolean, onOpenChange: (o: boolean) => void, targetUser: User | null }) {
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

      // 1. Списание баланса
      batch.update(senderRef, { balance: increment(-gift.price) });

      // 2. Добавление подарка получателю
      batch.set(giftRef, {
        id: giftRef.id,
        senderId: user.uid,
        senderName: myProfile.name,
        giftId: gift.id,
        giftName: gift.name,
        giftIcon: gift.icon,
        price: gift.price,
        receivedAt: new Date().toISOString()
      });

      // 3. Запись транзакции
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

      // 4. Сервисное сообщение (опционально в личку)
      try {
        const chatQ = collection(db, 'chats');
        // Здесь можно было бы найти чат, но для MVP просто уведомляем
      } catch (e) {}

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

          <div className="grid grid-cols-1 gap-2">
            {PREDEFINED_GIFTS.map(gift => (
              <button
                key={gift.id}
                onClick={() => handleSendGift(gift)}
                disabled={isSending}
                className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-primary/10 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl group-hover:scale-125 transition-transform">{gift.icon}</div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-bold text-white">{gift.name}</span>
                    <span className="text-[9px] text-muted-foreground uppercase font-black">Nuxus Collectible</span>
                  </div>
                </div>
                <div className="bg-primary/20 px-4 py-2 rounded-xl border border-primary/20">
                  <span className="text-xs font-black text-primary">{gift.price} NX</span>
                </div>
              </button>
            ))}
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
