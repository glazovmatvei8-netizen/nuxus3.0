
"use client"

import React, { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit, writeBatch, increment, getDocs, where, addDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, Zap, History, ShieldCheck, Loader2, Search, CheckCircle2, XCircle, Clock, AlertTriangle, Gift, Activity } from 'lucide-react';
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

const MAX_TOP_UP_AMOUNT = 500000;

/**
 * WALLET VIEW V35.0 «STABLE NAVIGATION»
 * Исправлены импорты и добавлена плавная загрузка.
 */
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

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<User>(userRef);

  const transactionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [db, user?.uid]);

  const { data: transactions, isLoading: isTxLoading } = useCollection<Transaction>(transactionsQuery);

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
        toast({ title: "Пользователь не найден", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Ошибка поиска", variant: "destructive" });
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleTopUpRequest = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0 || !db || !user || !profile) return;
    if (amount > MAX_TOP_UP_AMOUNT) {
      toast({ title: "Превышен лимит", description: `Максимум: ${MAX_TOP_UP_AMOUNT} NX`, variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      await addDoc(collection(db, 'topUpRequests'), {
        userId: user.uid,
        userName: profile.name || 'User',
        amount: amount,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast({ title: "Заявка отправлена" });
      setIsTopUpOpen(false);
    } catch (e) { toast({ title: "Ошибка", variant: "destructive" }); }
    finally { setIsProcessing(false); }
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
      toast({ title: "Перевод выполнен" });
      setIsTransferOpen(false); setFoundUser(null);
    } catch (e) { toast({ title: "Ошибка перевода", variant: "destructive" }); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
      <ScrollArea className="flex-1">
        <div className="px-6 pt-10 pb-40 space-y-8 animate-in fade-in duration-700">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Кошелек</h1>
              <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest mt-1">Центральный Банк Nuxus</span>
            </div>
            <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-xl">
               <Wallet className="w-6 h-6 text-primary" />
            </div>
          </div>
          
          <div className="relative bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03]"><Wallet className="w-40 h-40" /></div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-2">Доступный баланс</p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-white italic tracking-tighter tabular-nums">
                {(profile?.balance ?? 0).toFixed(2)}
              </span>
              <span className="text-xl font-bold text-primary italic">NX</span>
            </div>
            <div className="flex gap-4 mt-10">
              <Button onClick={() => setIsTopUpOpen(true)} className="flex-1 bg-primary text-white rounded-2xl h-16 font-black uppercase text-[10px] tracking-widest gap-2 shadow-2xl shadow-primary/20 hover:scale-105 transition-all">
                <Plus className="w-5 h-5" /> Пополнить
              </Button>
              <Button onClick={() => setIsTransferOpen(true)} variant="outline" className="flex-1 border-white/10 bg-white/5 rounded-2xl h-16 font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-white/10 transition-all">
                <ArrowUpRight className="w-5 h-5" /> Перевести
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40 italic flex items-center gap-3">
                 <History className="w-4 h-4" /> История операций
               </h3>
               <Activity className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="space-y-3">
              {isTxLoading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-40">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Синхронизация данных...</p>
                </div>
              ) : transactions && transactions.length > 0 ? (
                transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-5 obsidian-glass rounded-[2rem] hover:bg-white/[0.04] transition-all group">
                    <div className="flex items-center gap-5 text-left">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all", tx.amount > 0 ? "bg-green-500/10 text-green-500 border-green-500/10 group-hover:border-green-500/30" : "bg-red-500/10 text-red-500 border-red-500/10 group-hover:border-red-500/30")}>
                        {tx.amount > 0 ? <ArrowDownLeft className="w-7 h-7" /> : <ArrowUpRight className="w-7 h-7" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[15px] font-black text-white truncate w-40 uppercase italic tracking-tight">
                          {tx.type === 'deposit' ? 'Пополнение' : (tx.otherPartyName || 'Транзакция')}
                        </span>
                        <span className="text-[9px] text-white/20 uppercase font-black tracking-widest mt-1">
                          {tx.createdAt ? format(new Date(tx.createdAt), 'dd MMMM, HH:mm', { locale: ru }) : 'Недавно'}
                        </span>
                      </div>
                    </div>
                    <span className={cn("font-black text-xl italic tabular-nums tracking-tighter", tx.amount > 0 ? "text-green-500" : "text-white")}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-32 text-center opacity-10 space-y-6">
                   <History className="w-24 h-24 mx-auto" />
                   <p className="text-[12px] font-black uppercase tracking-[0.6em]">Сигналы отсутствуют</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* MODALS */}
      <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
        <DialogContent className="max-w-xs bg-[#0a0a0c]/98 border-white/10 rounded-[3rem] p-8 text-center shadow-2xl outline-none">
          <DialogHeader><DialogTitle className="text-2xl font-black uppercase italic text-white w-full text-center">Пополнение</DialogTitle></DialogHeader>
          <div className="py-6 space-y-4">
            <div className="relative">
              <Input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} className="bg-white/5 border-white/10 h-20 rounded-2xl text-center text-4xl font-black italic text-primary" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-white/20 italic">NX</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold leading-relaxed italic text-center px-4">Максимальный объем разового сигнала: {MAX_TOP_UP_AMOUNT} NX.</p>
          </div>
          <DialogFooter><Button disabled={isProcessing} onClick={handleTopUpRequest} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all">{isProcessing ? <Loader2 className="animate-spin" /> : "Отправить запрос"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-sm bg-[#0a0a0c]/98 border-white/10 rounded-[3rem] p-8 shadow-2xl outline-none">
          <DialogHeader><DialogTitle className="text-2xl font-black uppercase italic text-white text-center w-full">Перевод</DialogTitle></DialogHeader>
          <div className="py-6 space-y-6">
            {!foundUser ? (
              <div className="flex gap-3">
                <Input placeholder="@id_получателя" value={transferTarget} onChange={e => setTransferTarget(e.target.value)} className="bg-white/5 border-white/10 h-16 rounded-2xl pl-6 font-bold text-lg" />
                <Button size="icon" onClick={handleSearchUser} disabled={isSearchingUser} className="h-16 w-16 rounded-2xl shrink-0 bg-primary text-white shadow-xl">
                  {isSearchingUser ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                </Button>
              </div>
            ) : (
              <div className="space-y-6 animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-5 bg-white/5 p-5 rounded-[2rem] border border-primary/20 relative shadow-inner">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 text-primary font-black text-xl italic">{foundUser.name ? foundUser.name[0] : 'U'}</div>
                  <div className="flex flex-col text-left">
                    <span className="font-black text-white uppercase italic text-lg">{foundUser.name}</span>
                    <span className="text-[10px] text-primary font-black uppercase tracking-widest">{foundUser.username}</span>
                  </div>
                  <button onClick={() => setFoundUser(null)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 shadow-xl border-2 border-[#0a0a0c] hover:scale-110 transition-transform"><XCircle className="w-5 h-5 text-white" /></button>
                </div>
                <div className="relative">
                  <Input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="0.00" className="bg-white/5 border-white/10 h-20 rounded-[2rem] text-center text-4xl font-black italic text-primary" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              disabled={isProcessing || !foundUser || !transferAmount} 
              onClick={handleTransferAction} 
              className="w-full h-16 bg-white text-black rounded-[2rem] font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all"
            >
              {isProcessing ? <Loader2 className="animate-spin w-6 h-6" /> : "Перевести NX"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
