
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
  ArrowUpRight, ArrowDownLeft, 
  Wallet, ArrowRight, Loader2, Search, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User, Transaction, ReceivedGift } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

const MAX_TOP_UP_AMOUNT = 500000;

/**
 * WALLET VIEW V94.0 «MASTER REPLICA»
 * Полное визуальное соответствие референсу.
 */
export default function WalletView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
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
    return query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
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
    } catch (e) {
      toast({ title: "Ошибка поиска", variant: "destructive" });
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
      
      batch.set(senderTxRef, { 
        id: senderTxRef.id, userId: user.uid, amount: -amount, 
        type: 'transfer_out', status: 'completed', 
        otherPartyId: foundUser.id, otherPartyName: foundUser.name, 
        createdAt: new Date().toISOString() 
      });
      
      batch.set(receiverTxRef, { 
        id: receiverTxRef.id, userId: foundUser.id, amount: amount, 
        type: 'transfer_in', status: 'completed', 
        otherPartyId: user.uid, otherPartyName: profile.name, 
        createdAt: new Date().toISOString() 
      });
      
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
          
          {/* HEADER: КОШЕЛЕК */}
          <h1 className="text-3xl font-black text-primary italic tracking-tighter uppercase text-center w-full">
            КОШЕЛЕК
          </h1>

          {/* BALANCE CARD: AMBER GRADIENT REPLICA */}
          <div className="relative h-44 w-full rounded-[2.5rem] p-[1px] bg-gradient-to-r from-primary/40 via-primary/80 to-primary/40 shadow-[0_20px_60px_rgba(229,142,56,0.3)]">
             <div className="h-full w-full bg-[#121212] rounded-[2.5rem] flex flex-col items-center justify-center relative overflow-hidden">
                {/* Internal Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(229,142,56,0.15)_0%,transparent_70%)]" />
                
                <div className="relative z-10 text-center space-y-1">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-black text-white italic tracking-tighter tabular-nums">
                      {(profile?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-2xl font-black text-primary italic">STK</span>
                  </div>
                  <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest">
                    Доступный Баланс
                  </p>
                </div>
             </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="space-y-4">
             <h3 className="text-[11px] font-black uppercase text-[#8E8E93] tracking-[0.2em] px-1">
               Быстрые Действия
             </h3>
             <div className="grid grid-cols-3 gap-4">
                <ActionBtn icon={Send} label="Отправить" onClick={() => setIsTransferOpen(true)} />
                <ActionBtn icon={ArrowDown} label="Получить" onClick={() => setIsTopUpOpen(true)} />
                <ActionBtn icon={RefreshCcw} label="Обмен" onClick={() => toast({ title: "Exchange Node Offline" })} />
             </div>
          </div>

          {/* RECENT TRANSACTIONS */}
          <div className="space-y-5">
             <h3 className="text-[11px] font-black uppercase text-[#8E8E93] tracking-[0.2em] px-1">
               Последние Транзакции
             </h3>
             <div className="space-y-2">
               {transactions && transactions.length > 0 ? (
                 transactions.map(tx => (
                   <TxItem key={tx.id} tx={tx} />
                 ))
               ) : (
                 <div className="p-8 bg-[#1C1C1E]/40 rounded-3xl border border-white/[0.03] text-center opacity-20">
                   <span className="text-[10px] font-black uppercase tracking-widest">Нет сигналов</span>
                 </div>
               )}
             </div>
          </div>

          {/* ASSETS SECTION */}
          <div className="space-y-4">
             <h3 className="text-[11px] font-black uppercase text-[#8E8E93] tracking-[0.2em] px-1">
               Мои Активы
             </h3>
             <div className="bg-[#1C1C1E]/60 backdrop-blur-md rounded-[2.5rem] border border-white/[0.05] overflow-hidden divide-y divide-white/[0.03] shadow-xl">
                <AssetRow label="Stellar Credits (STK)" value={`${(profile?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} STK`} />
                <AssetRow label="Quantum Tokens (QTK)" value="55.00 QTK" />
                <AssetRow label="Digital Art NFT 'Nebula'" value={`${gifts?.filter(g => g.isNft).length || 0} шт.`} />
             </div>
          </div>
        </div>
      </ScrollArea>

      {/* MODALS */}
      <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
        <DialogContent className="max-w-xs bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 text-center shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-black uppercase text-white text-center w-full">ПОПОЛНЕНИЕ</DialogTitle></DialogHeader>
          <div className="py-6 space-y-4">
            <Input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} className="bg-white/5 border-white/10 h-16 rounded-2xl text-center text-3xl font-black italic text-primary" />
            <p className="text-[9px] text-[#8E8E93] uppercase font-bold italic">Запрос будет направлен оператору Ядра.</p>
          </div>
          <DialogFooter><Button onClick={() => setIsTopUpOpen(false)} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic shadow-xl">Отправить Запрос</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-sm bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-black uppercase text-white text-center w-full">ПЕРЕВОД STK</DialogTitle></DialogHeader>
          <div className="py-6 space-y-6">
            {!foundUser ? (
              <div className="flex gap-2">
                <Input placeholder="@username" value={transferTarget} onChange={e => setTransferTarget(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-xl font-bold" />
                <Button size="icon" onClick={handleSearchUser} disabled={isSearchingUser} className="h-14 w-14 rounded-xl bg-primary text-white">
                  {isSearchingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-primary/20 relative">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black uppercase">{foundUser.name[0]}</div>
                  <div className="flex flex-col text-left">
                    <span className="font-black text-white uppercase italic">{foundUser.name}</span>
                    <span className="text-[9px] text-primary font-black uppercase">{foundUser.username}</span>
                  </div>
                  <button onClick={() => setFoundUser(null)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"><XCircle size={16} className="text-white" /></button>
                </div>
                <Input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="0.00" className="bg-white/5 border-white/10 h-16 rounded-2xl text-center text-3xl font-black italic text-primary" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button disabled={!foundUser || isProcessing} onClick={handleTransfer} className="w-full h-16 bg-white text-black rounded-2xl font-black uppercase italic tracking-widest shadow-xl">
              {isProcessing ? <Loader2 className="animate-spin" /> : "ПОДТВЕРДИТЬ ПЕРЕДАЧУ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-4 bg-[#1C1C1E] border border-white/[0.03] rounded-[2.2rem] transition-all active:scale-95 group shadow-lg"
    >
      <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center relative overflow-hidden">
         <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
         <Icon className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(229,142,56,0.6)]" />
      </div>
      <span className="text-[9px] font-black uppercase text-[#8E8E93] tracking-widest group-hover:text-white transition-colors">{label}</span>
    </button>
  );
}

function TxItem({ tx }: { tx: Transaction }) {
  const isPositive = tx.amount > 0;
  const label = tx.type === 'deposit' ? 'Пополнение' : (tx.type === 'transfer_out' ? 'Перевод' : (tx.type === 'gift_purchase' ? 'Оплата' : 'Транзакция'));
  const target = tx.otherPartyName || (tx.type === 'deposit' ? "Узел 'Аврора'" : "Лицензия ПО");

  return (
    <div className="flex items-center justify-between p-4 bg-[#1C1C1E]/40 rounded-2xl border border-white/[0.03]">
       <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center border transition-all",
            isPositive ? "bg-green-500/10 text-green-500 border-green-500/10" : "bg-red-500/10 text-red-500 border-red-500/10"
          )}>
            {isPositive ? <ArrowDown className="w-5 h-5" /> : (tx.type === 'transfer_out' ? <ArrowRight className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />)}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[13px] font-black text-white italic tracking-tight uppercase">
              {label} | <span className="text-[#8E8E93] lowercase font-bold">{target}</span>
            </span>
          </div>
       </div>
       <span className={cn(
         "text-[13px] font-black italic tabular-nums",
         isPositive ? "text-green-500" : "text-red-500"
       )}>
         {isPositive ? '+' : ''}{tx.amount.toLocaleString()} STK
       </span>
    </div>
  );
}

function AssetRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-5 px-6">
       <span className="text-[12px] font-bold text-[#8E8E93] italic tracking-tight">{label}</span>
       <span className="text-[13px] font-black text-white italic tabular-nums">{value}</span>
    </div>
  );
}
