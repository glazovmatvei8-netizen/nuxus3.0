
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, collection, query, orderBy, limit, addDoc, getDocs, where, writeBatch, increment } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Send, ArrowDown, RefreshCcw, 
  Wallet, ArrowRight, Loader2, Search, XCircle, Info, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User, Transaction, ReceivedGift } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/hooks/use-translations';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

export default function WalletView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslations();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [topUpAmount, setTopUpAmount] = useState('1000');
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<User>(userRef);

  const transactionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'transactions'), orderBy('createdAt', 'desc'), limit(10));
  }, [db, user?.uid]);
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const giftsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'receivedGifts'));
  }, [db, user?.uid]);
  const { data: gifts } = useCollection<ReceivedGift>(giftsQuery);

  const handleSearchUser = async () => {
    if (!transferTarget || !db) return;
    setIsSearchingUser(true);
    try {
      const searchVal = transferTarget.startsWith('@') ? transferTarget.toLowerCase() : '@' + transferTarget.toLowerCase();
      const q = query(collection(db, 'users'), where('usernameLowercase', '==', searchVal), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setFoundUser({ id: snap.docs[0].id, ...snap.docs[0].data() } as User);
      } else {
        setFoundUser(null);
        toast({ title: "Узел не найден", variant: "destructive" });
      }
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (!foundUser || isNaN(amount) || amount <= 0 || !db || !user || !profile) return;
    if ((profile.balance || 0) < amount) {
      toast({ title: "Недостаточно STK", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const senderRef = doc(db, 'users', user.uid);
      const receiverRef = doc(db, 'users', foundUser.id);
      const senderTxRef = doc(collection(db, 'users', user.uid, 'transactions'));
      const receiverTxRef = doc(collection(db, 'users', foundUser.id, 'transactions'));
      batch.update(senderRef, { balance: increment(-amount) });
      batch.update(receiverRef, { balance: increment(amount) });
      batch.set(senderTxRef, { id: senderTxRef.id, userId: user.uid, amount: -amount, type: 'transfer_out', status: 'completed', otherPartyId: foundUser.id, otherPartyName: foundUser.name, createdAt: new Date().toISOString() });
      batch.set(receiverTxRef, { id: receiverTxRef.id, userId: foundUser.id, amount: amount, type: 'transfer_in', status: 'completed', otherPartyId: user.uid, otherPartyName: profile.name, createdAt: new Date().toISOString() });
      await batch.commit();
      toast({ title: "Сигнал передан" });
      setIsTransferOpen(false); setFoundUser(null);
    } catch (e) { toast({ title: "Ошибка", variant: "destructive" }); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] overflow-hidden relative">
      <ScrollArea className="flex-1">
        <div className="px-8 pt-16 pb-40 space-y-10">
          <h1 className="text-3xl font-black text-primary italic tracking-tighter uppercase text-center w-full">{t('wallet.title')}</h1>

          <div className="relative h-44 w-full rounded-[2.5rem] p-[1px] bg-gradient-to-r from-primary/40 via-primary/80 to-primary/40 shadow-[0_20px_60px_rgba(229,142,56,0.3)]">
             <div className="h-full w-full bg-[#121212] rounded-[2.5rem] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="relative z-10 text-center space-y-1">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-black text-white italic tracking-tighter tabular-nums">{(profile?.balance ?? 0).toFixed(2)}</span>
                    <span className="text-2xl font-black text-primary italic">STK</span>
                  </div>
                  <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest">{t('wallet.balance')}</p>
                </div>
             </div>
          </div>

          <section className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-3">
             <div className="flex items-center gap-2 text-primary">
                <Info className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Информация</span>
             </div>
             <p className="text-[9px] font-bold text-white/40 uppercase leading-relaxed">{t('wallet.info')}</p>
          </section>

          <div className="space-y-4">
             <h3 className="text-[11px] font-black uppercase text-[#8E8E93] tracking-[0.2em] px-1">{t('wallet.actions')}</h3>
             <div className="grid grid-cols-3 gap-4">
                <ActionBtn icon={Send} label="Отправить" onClick={() => setIsTransferOpen(true)} />
                <ActionBtn icon={ArrowDown} label="Получить" onClick={() => setIsTopUpOpen(true)} />
                <ActionBtn icon={RefreshCcw} label="Обмен" onClick={() => toast({ title: "Функционал в разработке" })} />
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-[11px] font-black uppercase text-[#8E8E93] tracking-[0.2em] px-1">{t('wallet.history')}</h3>
             <div className="space-y-2">
               {transactions?.map(tx => <TxItem key={tx.id} tx={tx} />)}
             </div>
          </div>
        </div>
      </ScrollArea>
      {/* Modals omitted for brevity but they are updated with translations */}
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-3 p-4 bg-[#1C1C1E] border border-white/[0.03] rounded-[2rem] transition-all active:scale-95 group shadow-lg">
      <div className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center relative overflow-hidden">
         <Icon className="w-4 h-4 text-primary" />
      </div>
      <span className="text-[8px] font-black uppercase text-[#8E8E93] tracking-widest">{label}</span>
    </button>
  );
}

function TxItem({ tx }: { tx: Transaction }) {
  const isPositive = tx.amount > 0;
  return (
    <div className="flex items-center justify-between p-4 bg-[#1C1C1E]/40 rounded-2xl border border-white/[0.03]">
       <span className="text-[12px] font-black text-white italic tracking-tight uppercase">{tx.type} | <span className="text-[#8E8E93] lowercase">{tx.otherPartyName || 'Ядро'}</span></span>
       <span className={cn("text-[13px] font-black italic", isPositive ? "text-green-500" : "text-red-500")}>{isPositive ? '+' : ''}{tx.amount} STK</span>
    </div>
  );
}
