
"use client"

import React, { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit, writeBatch, increment, getDocs, where, addDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, Zap, History, ShieldCheck, Loader2, Search, CheckCircle2, XCircle } from 'lucide-react';
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

export default function WalletView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // States for Top Up
  const [topUpAmount, setTopUpAmount] = useState('100');

  // States for Transfer
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
        toast({ title: "Пользователь не найден", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Ошибка поиска", variant: "destructive" });
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleTopUpAction = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0 || !db || !user) return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const uRef = doc(db, 'users', user.uid);
      const tRef = doc(collection(db, 'users', user.uid, 'transactions'));

      batch.update(uRef, { balance: increment(amount) });
      batch.set(tRef, {
        id: tRef.id,
        userId: user.uid,
        amount: amount,
        type: 'deposit',
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      await batch.commit();
      toast({ title: "Баланс пополнен", description: `Зачислено ${amount} NX` });
      setIsTopUpOpen(false);
    } catch (e) {
      toast({ title: "Ошибка пополнения", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferAction = async () => {
    const amount = parseFloat(transferAmount);
    if (!foundUser || isNaN(amount) || amount <= 0 || !db || !user || !profile) return;
    if ((profile.balance || 0) < amount) {
      toast({ title: "Недостаточно средств", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const senderRef = doc(db, 'users', user.uid);
      const receiverRef = doc(db, 'users', foundUser.id);
      
      const senderTxRef = doc(collection(db, 'users', user.uid, 'transactions'));
      const receiverTxRef = doc(collection(db, 'users', foundUser.id, 'transactions'));

      // Update balances
      batch.update(senderRef, { balance: increment(-amount) });
      batch.update(receiverRef, { balance: increment(amount) });

      // Records
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
      toast({ title: "Перевод выполнен", description: `Отправлено ${amount} NX пользователю ${foundUser.name}` });
      setIsTransferOpen(false);
      setFoundUser(null);
      setTransferTarget('');
      setTransferAmount('');
    } catch (e) {
      toast({ title: "Ошибка перевода", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      <div className="px-4 pt-6 pb-4 shrink-0">
        <h1 className="text-[32px] font-black text-white tracking-tight mb-6">Кошелек</h1>
        
        <div className="relative group mb-8">
          <div className="absolute -inset-1 bg-gradient-to-tr from-primary/40 to-accent/40 rounded-[2.5rem] blur-[8px] opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative bg-[#1c1c1e] border border-white/10 rounded-[2.5rem] p-8 overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Wallet className="w-32 h-32" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 mb-2">Quantum Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white italic tracking-tighter">{profile?.balance?.toFixed(2) || '0.00'}</span>
              <span className="text-xl font-bold text-primary italic">NX</span>
            </div>
            
            <div className="flex gap-3 mt-8">
              <Button onClick={() => setIsTopUpOpen(true)} className="flex-1 bg-primary text-white rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20">
                <Plus className="w-4 h-4" /> Пополнить
              </Button>
              <Button onClick={() => setIsTransferOpen(true)} variant="outline" className="flex-1 border-white/10 bg-white/5 rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest gap-2">
                <ArrowUpRight className="w-4 h-4" /> Перевести
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <WalletAction icon={ArrowDownLeft} label="История" color="text-blue-500" onClick={() => {}} />
          <WalletAction icon={ShieldCheck} label="Защита QES" color="text-primary" onClick={() => {}} />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 space-y-4 pb-32">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Транзакции Ядра</h3>
            <Zap className="w-3 h-3 text-primary animate-pulse" />
          </div>

          <div className="space-y-1">
            {isTxLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
            ) : transactions && transactions.length > 0 ? (
              transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-[1.8rem] hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center",
                      tx.type === 'deposit' || tx.type === 'transfer_in' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {tx.type === 'deposit' && <Plus className="w-5 h-5" />}
                      {tx.type === 'transfer_in' && <ArrowDownLeft className="w-5 h-5" />}
                      {tx.type === 'transfer_out' && <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">
                        {tx.type === 'deposit' ? 'Пополнение' : 
                         tx.type === 'transfer_in' ? `От ${tx.otherPartyName}` :
                         `Для ${tx.otherPartyName}`}
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase font-black">
                        {format(new Date(tx.createdAt), 'dd MMM, HH:mm', { locale: ru })}
                      </span>
                    </div>
                  </div>
                  <span className={cn(
                    "font-black text-sm italic",
                    tx.amount > 0 ? "text-green-500" : "text-white"
                  )}>
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount} NX
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
                 <History className="w-10 h-10 mb-2" />
                 <p className="text-[10px] font-black uppercase tracking-widest">Нет активных сигналов</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Top Up Modal */}
      <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
        <DialogContent className="max-w-xs bg-card border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic text-white tracking-tighter">Top Up</DialogTitle>
            <DialogDescription className="text-[9px] uppercase font-black tracking-[0.3em] text-primary/60">Quantum Ingestion</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="relative">
              <Input 
                type="number" 
                value={topUpAmount} 
                onChange={e => setTopUpAmount(e.target.value)}
                className="bg-white/5 border-white/10 h-16 rounded-2xl text-center text-3xl font-black italic text-primary"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-white/20 italic">NX</span>
            </div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold px-4">Введите сумму для мгновенной синхронизации баланса с Ядром.</p>
          </div>
          <DialogFooter>
            <Button disabled={isProcessing} onClick={handleTopUpAction} className="w-full h-14 bg-primary rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20">
              {isProcessing ? <Loader2 className="animate-spin" /> : "Authorize Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Modal */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-sm bg-card border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic text-white tracking-tighter text-center">Transfer</DialogTitle>
            <DialogDescription className="text-[9px] uppercase font-black tracking-[0.3em] text-accent/60 text-center">Signal Redirection</DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            {!foundUser ? (
              <div className="space-y-3">
                <Label className="text-[9px] uppercase font-black text-muted-foreground ml-2">Адрес Узла (@username)</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="@node_id" 
                    value={transferTarget}
                    onChange={e => setTransferTarget(e.target.value)}
                    className="bg-white/5 border-white/10 h-12 rounded-xl"
                  />
                  <Button size="icon" onClick={handleSearchUser} disabled={isSearchingUser} className="h-12 w-12 rounded-xl shrink-0 bg-accent text-black">
                    {isSearchingUser ? <Loader2 className="animate-spin" /> : <Search className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-accent/20 relative group">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center border border-accent/30 text-accent font-black">
                    {foundUser.name[0]}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-white">{foundUser.name}</span>
                    <span className="text-[10px] text-accent uppercase font-black">{foundUser.username}</span>
                  </div>
                  <button onClick={() => setFoundUser(null)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <XCircle className="w-4 h-4 text-white" />
                  </button>
                </div>

                <div className="space-y-3">
                  <Label className="text-[9px] uppercase font-black text-muted-foreground ml-2">Сумма Перевода</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={transferAmount}
                      onChange={e => setTransferAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-white/5 border-white/10 h-14 rounded-2xl text-center text-2xl font-black italic text-accent"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-white/20 italic">NX</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              disabled={isProcessing || !foundUser || !transferAmount} 
              onClick={handleTransferAction}
              className="w-full h-14 bg-accent text-black rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-accent/20"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : "Transmit Signal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WalletAction({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-center gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group">
      <Icon className={cn("w-5 h-5", color, "group-hover:scale-110 transition-transform")} />
      <span className="text-[10px] font-black uppercase tracking-widest text-white">{label}</span>
    </button>
  );
}

function Label({ children, className }: any) {
  return <label className={cn("block font-medium", className)}>{children}</label>;
}
