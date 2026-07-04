
"use client"

import React, { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit, writeBatch, increment, getDocs, where, addDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, Zap, History, ShieldCheck, Loader2, Search, CheckCircle2, XCircle, Clock, AlertTriangle, Gift } from 'lucide-react';
import { cn, formatDisplayName } from '@/lib/utils';
import type { User, Transaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Увеличенный лимит пополнения: 500,000 NX
const MAX_TOP_UP_AMOUNT = 500000;

export default function WalletView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [topUpAmount, setTopUpAmount] = useState('1000');
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const transactionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [db, user]);

  const { data: transactions, isLoading: isTxLoading } = useCollection<Transaction>(transactionsQuery);

  const handleSearchUser = async () => {
    if (!transferTarget || !db) return;
    setIsSearchingUser(true);
    try {
      const searchVal = transferTarget.startsWith('@') ? transferTarget.toLowerCase() : '@' + transferTarget.toLowerCase();
      const q = query(collection(db, 'users'), where('username', '==', searchVal), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setFoundUser({ id: snap.docs[0].id, ...snap.docs[0].data() } as User);
      } else {
        setFoundUser(null);
        toast({ title: "Узел не найден", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Сбой поиска", variant: "destructive" });
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleTopUpRequest = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0 || !db || !user || !profile) return;

    if (amount > MAX_TOP_UP_AMOUNT) {
      toast({ title: "Лимит превышен", description: `Максимум: ${MAX_TOP_UP_AMOUNT} NX`, variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      await addDoc(collection(db, 'topUpRequests'), {
        userId: user.uid,
        userName: profile.name,
        amount: amount,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      toast({ 
        title: "Заявка передана", 
        description: `Администратор рассмотрит запрос на ${amount} NX.` 
      });
      setIsTopUpOpen(false);
    } catch (e) {
      toast({ title: "Ошибка системы", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferAction = async () => {
    const amount = parseFloat(transferAmount);
    if (!foundUser || isNaN(amount) || amount <= 0 || !db || !user || !profile) return;
    if ((profile.balance || 0) < amount) {
      toast({ title: "Недостаточно энергии", variant: "destructive" });
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

      batch.set(senderTxRef, {
        id: senderTxRef.id,
        userId: user.uid,
        amount: -amount,
        type: 'transfer_out',
        status: 'completed',
        otherPartyId: foundUser.id,
        otherPartyName: foundUser.name,
        createdAt: new Date().toISOString()
      });

      batch.set(receiverTxRef, {
        id: receiverTxRef.id,
        userId: foundUser.id,
        amount: amount,
        type: 'transfer_in',
        status: 'completed',
        otherPartyId: user.uid,
        otherPartyName: profile.name,
        createdAt: new Date().toISOString()
      });

      await batch.commit();
      toast({ title: "Сигнал передан", description: `${amount} NX отправлено ${foundUser.name}` });
      setIsTransferOpen(false);
      setFoundUser(null);
      setTransferTarget('');
      setTransferAmount('');
    } catch (e) {
      toast({ title: "Сбой передачи", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const isAmountOverLimit = parseFloat(topUpAmount) > MAX_TOP_UP_AMOUNT;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-4 pt-6 pb-4 shrink-0">
        <h1 className="text-[32px] font-black text-white tracking-tight mb-6">Банк Ядра</h1>
        
        <div className="relative group mb-8">
          <div className="absolute -inset-1 bg-gradient-to-tr from-primary/40 to-accent/40 rounded-[2.5rem] blur-[8px] opacity-50" />
          <div className="relative bg-[#1c1c1e] border border-white/10 rounded-[2.5rem] p-8 overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 mb-2">Node Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white italic tracking-tighter tabular-nums">{profile?.balance?.toFixed(2) || '0.00'}</span>
              <span className="text-xl font-bold text-primary italic">NX</span>
            </div>
            
            <div className="flex gap-3 mt-8">
              <Button onClick={() => setIsTopUpOpen(true)} className="flex-1 bg-primary text-white rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl">
                <Plus className="w-4 h-4" /> Пополнить
              </Button>
              <Button onClick={() => setIsTransferOpen(true)} variant="outline" className="flex-1 border-white/10 bg-white/5 rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest gap-2">
                <ArrowUpRight className="w-4 h-4" /> Перевести
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 pb-32">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2">Логи транзакций</h3>
          <div className="space-y-1">
            {isTxLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
            ) : transactions && transactions.length > 0 ? (
              transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-[1.8rem]">
                  <div className="flex items-center gap-4 text-left">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", tx.amount > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                      {tx.amount > 0 ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white truncate w-32">{tx.type === 'deposit' ? 'Система' : tx.otherPartyName}</span>
                      <span className="text-[9px] text-muted-foreground uppercase">{format(new Date(tx.createdAt), 'dd MMM, HH:mm', { locale: ru })}</span>
                    </div>
                  </div>
                  <span className={cn("font-black text-sm italic", tx.amount > 0 ? "text-green-500" : "text-white")}>
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount} NX
                  </span>
                </div>
              ))
            ) : (
              <div className="py-20 text-center opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
                 <History className="w-10 h-10 mx-auto mb-2" />
                 <p className="text-[10px] font-black uppercase">История пуста</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
        <DialogContent className="max-w-xs bg-card border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black uppercase italic text-white">Top Up</DialogTitle></DialogHeader>
          <div className="py-6 space-y-4">
            <div className="relative">
              <Input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} className="bg-white/5 border-white/10 h-16 rounded-2xl text-center text-3xl font-black italic text-primary" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-white/20 italic">NX</span>
            </div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold leading-relaxed">
              Лимит за сессию: {MAX_TOP_UP_AMOUNT} NX. Запрос будет направлен администратору.
            </p>
          </div>
          <DialogFooter>
            <Button disabled={isProcessing || isAmountOverLimit} onClick={handleTopUpRequest} className="w-full h-14 bg-primary rounded-2xl font-black uppercase italic tracking-widest shadow-xl">
              {isProcessing ? <Loader2 className="animate-spin" /> : "Отправить запрос"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-sm bg-card border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black uppercase italic text-white text-center">Transfer</DialogTitle></DialogHeader>
          <div className="py-6 space-y-6">
            {!foundUser ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="@node_id" value={transferTarget} onChange={e => setTransferTarget(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl" />
                  <Button size="icon" onClick={handleSearchUser} disabled={isSearchingUser} className="h-12 w-12 rounded-xl shrink-0 bg-accent text-black"><Search className="w-5 h-5" /></Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-accent/20 relative">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center border border-accent/30 text-accent font-black">{foundUser.name[0]}</div>
                  <div className="flex flex-col text-left"><span className="font-bold text-white">{foundUser.name}</span><span className="text-[10px] text-accent uppercase font-black">{foundUser.username}</span></div>
                  <button onClick={() => setFoundUser(null)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"><XCircle className="w-4 h-4 text-white" /></button>
                </div>
                <div className="relative">
                  <Input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="0.00" className="bg-white/5 border-white/10 h-14 rounded-2xl text-center text-2xl font-black italic text-accent" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-white/20 italic">NX</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button disabled={isProcessing || !foundUser || !transferAmount} onClick={handleTransferAction} className="w-full h-14 bg-accent text-black rounded-2xl font-black uppercase italic tracking-widest shadow-xl">
              {isProcessing ? <Loader2 className="animate-spin" /> : "Передать Сигнал"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
