
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase/provider';
import { doc, collection, writeBatch, query, where, getDocs, limit } from 'firebase/firestore';
import { ArrowRightLeft, Search, Loader2, Zap, User as UserIcon, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, ReceivedGift } from '@/lib/types';
import { UserAvatar } from '@/components/user-avatar';
import { formatDisplayName } from '@/lib/utils';

/**
 * TRADE MODAL V5.2.0
 * ИСПРАВЛЕНО: Пути импорта хуков.
 */
export function TradeModal({ open, onOpenChange, gift }: { open: boolean, onOpenChange: (o: boolean) => void, gift: ReceivedGift | null }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !db) return;
    setIsSearching(true);
    try {
      const cleanInput = searchQuery.startsWith('@') ? searchQuery.toLowerCase() : '@' + searchQuery.toLowerCase();
      const q = query(collection(db, 'users'), where('username', '==', cleanInput), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const found = { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
        if (found.id === user?.uid) {
          toast({ title: "Ошибка", description: "Нельзя передать артефакт самому себе.", variant: "destructive" });
        } else {
          setTargetUser(found);
        }
      } else {
        setTargetUser(null);
        toast({ title: "Узел не найден", variant: "destructive" });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleTrade = async () => {
    if (!db || !user || !targetUser || !gift) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      
      // Ссылки на документы
      const senderGiftRef = doc(db, 'users', user.uid, 'receivedGifts', gift.id);
      const receiverGiftRef = doc(collection(db, 'users', targetUser.id, 'receivedGifts'));
      
      const senderTxRef = doc(collection(db, 'users', user.uid, 'transactions'));
      const receiverTxRef = doc(collection(db, 'users', targetUser.id, 'transactions'));

      // 1. Удаляем у отправителя
      batch.delete(senderGiftRef);

      // 2. Создаем у получателя
      batch.set(receiverGiftRef, {
        ...gift,
        id: receiverGiftRef.id,
        senderId: user.uid,
        senderName: "Transfer from Node", 
        receivedAt: new Date().toISOString()
      });

      // 3. Логируем транзакции
      batch.set(senderTxRef, {
        id: senderTxRef.id,
        userId: user.uid,
        amount: 0,
        type: 'transfer_out',
        status: 'completed',
        otherPartyId: targetUser.id,
        otherPartyName: `Trade: ${gift.giftName}`,
        createdAt: new Date().toISOString()
      });

      batch.set(receiverTxRef, {
        id: receiverTxRef.id,
        userId: targetUser.id,
        amount: 0,
        type: 'transfer_in',
        status: 'completed',
        otherPartyId: user.uid,
        otherPartyName: `Received: ${gift.giftName}`,
        createdAt: new Date().toISOString()
      });

      await batch.commit();
      toast({ title: "Передача завершена", description: `${gift.giftName} теперь у ${targetUser.name}` });
      onOpenChange(false);
    } catch (e) {
      console.error("Trade transaction error in trade-modal:", e);
      toast({ title: "Критический сбой", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if(!o) { setTargetUser(null); setSearchQuery(''); } }}>
      <DialogContent className="max-w-sm bg-card border-white/10 rounded-[2.5rem] p-8 shadow-2xl outline-none">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase italic text-white text-center flex items-center justify-center gap-3">
            <ArrowRightLeft className="w-6 h-6 text-primary" /> Передача
          </DialogTitle>
          <DialogDescription className="text-[9px] uppercase font-black tracking-widest text-primary/60 text-center w-full mt-1">
            Квантовый протокол обмена
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {!targetUser ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="@username получателя" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-white/5 border-white/10 h-12 rounded-xl text-center"
                />
                <Button size="icon" onClick={handleSearch} disabled={isSearching} className="h-12 w-12 rounded-xl shrink-0 bg-primary text-white">
                  {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </Button>
              </div>
              <p className="text-[8px] text-center text-muted-foreground uppercase font-bold tracking-widest">Введите ID узла для идентификации получателя</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
               <div className="bg-primary/10 p-6 rounded-[2rem] border border-primary/20 flex flex-col items-center gap-4 shadow-xl">
                  <UserAvatar userId={targetUser.id} className="h-20 w-20 border-4 border-white/5" manualAvatarUrl={targetUser.avatarUrl} />
                  <div className="text-center">
                    <h4 className="text-lg font-black text-white uppercase italic tracking-tighter">{targetUser.name}</h4>
                    <p className="text-[10px] text-primary font-black uppercase tracking-widest">{targetUser.username}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setTargetUser(null)} className="text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-white">Сменить получателя</Button>
               </div>

               <div className="flex items-center justify-center gap-4 text-white/20">
                  <div className="text-4xl opacity-50">{gift?.giftIcon}</div>
                  <ArrowRightLeft className="w-5 h-5 animate-pulse" />
                  <ShieldCheck className="w-10 h-10 text-primary opacity-40" />
               </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            disabled={!targetUser || isProcessing} 
            onClick={handleTrade}
            className="w-full h-14 bg-white text-black rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all"
          >
            {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : "Активировать Обмен"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
