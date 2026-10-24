
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, collection, query, orderBy, limit, addDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Send, ArrowDown, RefreshCcw, 
  Wallet, Info, FileText, Loader2, Coins, Zap, ShieldCheck, Database, ArrowRightLeft, CreditCard, Activity
} from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import type { User, Transaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/hooks/use-translations';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * WALLET VIEW V221.0 «INFINITE LEDGER»
 * UPDATED: Header is now part of the scroll flow.
 */
export default function WalletView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslations();
  const [mounted, setMounted] = useState(false);
  
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<User>(userRef);

  const transactionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'transactions'), orderBy('createdAt', 'desc'), limit(20));
  }, [db, user?.uid]);
  const { data: transactions, isLoading: isTxLoading } = useCollection<Transaction>(transactionsQuery);

  const handleTopUpRequest = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount < 10 || !db || !user || !profile) {
      toast({ title: "Ошибка", description: "Минимальная сумма — 10 RUB", variant: "destructive" });
      return;
    }

    setIsSubmittingRequest(true);
    triggerHaptic();
    try {
      await addDoc(collection(db, 'topUpRequests'), {
        userId: user.uid,
        userName: profile.name || profile.username,
        amount: amount,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      toast({ title: "Сигнал передан", description: "Ожидайте верификации Администратором." });
      setIsTopUpOpen(false);
      setTopUpAmount('');
    } catch (e) {
      toast({ title: "Сбой", variant: "destructive" });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const copyWalletId = () => {
    if (typeof window !== 'undefined' && profile?.username) {
      try {
        navigator.clipboard.writeText(profile.username).then(() => {
          toast({ title: "ID скопирован", description: "Используйте его для переводов внутри сети." });
        }).catch(() => {
          console.warn("Clipboard access denied by policy.");
        });
      } catch (e) {}
    }
  };

  if (!mounted) return <div className="flex-1 bg-[#010103]" />;

  return (
    <div className="flex flex-col h-full bg-[#050608] overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--primary),0.06),transparent_80%)] pointer-events-none" />

      <ScrollArea className="flex-1 no-scrollbar">
        <div className="flex flex-col">
          {/* HEADER IN SCROLL */}
          <div className="px-6 pt-12 pb-6 text-center shrink-0">
             <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">MIG <span className="text-primary">FINANCE</span></h1>
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mt-2">Quantum Asset Protocol V2.1</p>
          </div>

          <div className="px-6 space-y-10 pb-40">
            <div className="relative group cursor-pointer" onClick={copyWalletId}>
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-600/30 rounded-[3rem] blur-xl opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative h-56 w-full bg-[#0d101a] border border-white/10 rounded-[3rem] p-8 overflow-hidden shadow-2xl flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
                
                <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] italic">Available Balance</span>
                      <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-black text-white italic tracking-tighter tabular-nums">
                            {isProfileLoading ? '...' : (profile?.balance ?? 0).toFixed(2)}
                          </span>
                          <span className="text-xl font-black text-primary/60 italic">STK</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                      <CreditCard className="w-6 h-6 text-primary" />
                    </div>
                </div>

                <div className="flex items-center justify-between relative z-10 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center backdrop-blur-md">
                            <ArrowDown className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center backdrop-blur-md">
                            <Send className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Active Channels: 02</span>
                    </div>
                    <span className="text-[8px] font-black text-primary/40 uppercase bg-primary/5 px-2 py-1 rounded-md border border-primary/10">LEDGER SYNCED</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FinanceAction icon={Send} label="SEND" onClick={() => toast({ title: "В разработке", description: "Модуль внешних переводов калибруется." })} />
              <FinanceAction icon={ArrowDown} label="TOP UP" active onClick={() => setIsTopUpOpen(true)} />
              <FinanceAction icon={ArrowRightLeft} label="TRADE" onClick={() => toast({ title: "В разработке", description: "Рынок артефактов временно закрыт." })} />
            </div>

            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                  <ShieldCheck className="w-20 h-20 text-primary" />
              </div>
              <div className="flex items-start gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg">
                    <Database className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2 text-left">
                    <h3 className="text-sm font-black uppercase italic text-white tracking-widest">Quantum Vault Information</h3>
                    <p className="text-[10px] text-white/50 leading-relaxed font-medium">
                        Все транзакции STK (Stellar Credits) защищены протоколом QES 28.4. Ваши активы хранятся в изолированном сегменте Ядра.
                    </p>
                  </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <h3 className="text-[11px] font-black uppercase text-white/40 tracking-[0.4em] italic">Signal Stream</h3>
                  </div>
                  <span className="text-[9px] font-black text-primary/40 uppercase">LIVE LEDGER</span>
              </div>
              
              <div className="space-y-3">
                  {isTxLoading ? (
                    <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary/40 mx-auto" /></div>
                  ) : transactions && transactions.length > 0 ? (
                    transactions.map(tx => <QuantumTxItem key={tx.id} tx={tx} />)
                  ) : (
                    <div className="py-20 text-center opacity-10 space-y-4">
                      <Zap className="w-12 h-12 mx-auto" />
                      <p className="text-[10px] font-black uppercase tracking-[0.6em]">No Pulse Detected</p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
        <DialogContent className="max-w-sm bg-[#0a0c12]/95 backdrop-blur-[60px] border-white/10 rounded-[3rem] p-8 shadow-2xl outline-none">
          <DialogHeader>
            <div className="flex flex-col items-center gap-4 mb-4">
               <div className="w-16 h-16 rounded-[1.8rem] bg-primary/20 border border-primary/40 flex items-center justify-center shadow-xl">
                  <Coins className="w-8 h-8 text-primary animate-bounce" />
               </div>
               <DialogTitle className="text-2xl font-black uppercase italic text-white tracking-tighter">Пополнение</DialogTitle>
            </div>
            <DialogDescription className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">
               Система конвертирует рубли в STK по курсу 1:1
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 space-y-6">
             <div className="space-y-2">
                <Label className="text-[8px] font-black uppercase text-primary/60 ml-2 tracking-widest">Amount to deposit (RUB)</Label>
                <div className="relative">
                   <Input 
                     type="number" 
                     placeholder="0.00" 
                     value={topUpAmount} 
                     onChange={e => setTopUpAmount(e.target.value.replace(/\D/g, ''))}
                     className="h-16 bg-white/5 border-white/10 rounded-2xl text-center text-3xl font-black italic text-white focus:border-primary/50 transition-all pr-12"
                   />
                   <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-white/20 italic">RUB</span>
                </div>
             </div>
             <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 shadow-inner">
                <p className="text-[10px] text-primary/80 font-bold uppercase text-center leading-relaxed italic">
                   Запрос будет передан в Aegis Security сегмент для ручного подтверждения.
                </p>
             </div>
          </div>
          <DialogFooter>
             <Button 
               disabled={isSubmittingRequest || !topUpAmount} 
               onClick={handleTopUpRequest}
               className="w-full h-16 bg-primary text-white rounded-[1.8rem] font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all border border-white/10"
             >
               {isSubmittingRequest ? <Loader2 className="animate-spin w-6 h-6" /> : "Отправить Сигнал"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FinanceAction({ icon: Icon, label, onClick, active }: any) {
  return (
    <button 
      onClick={() => { triggerHaptic(); onClick(); }} 
      className={cn(
        "flex flex-col items-center gap-3 p-6 rounded-[2.5rem] border transition-all active:scale-90 shadow-xl group",
        active ? "bg-primary text-white border-primary/20" : "bg-white/5 text-white/30 border-white/5 hover:bg-white/10"
      )}
    >
      <Icon className={cn("w-6 h-6 group-hover:scale-110 transition-transform", active ? "text-white" : "text-primary")} />
      <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}

function QuantumTxItem({ tx }: { tx: Transaction }) {
  const isPositive = tx.amount > 0 || tx.type.includes('in') || tx.type.includes('deposit');
  const timestamp = tx.createdAt ? format(new Date(tx.createdAt), 'HH:mm • dd MMM', { locale: ru }) : 'Unknown';

  return (
    <div className="group relative">
       <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
       <div className="relative flex items-center justify-between p-5 bg-[#0e1018] rounded-2xl border border-white/5 group-hover:border-white/10 transition-all shadow-md">
          <div className="flex items-center gap-4">
             <div className={cn(
               "w-10 h-10 rounded-xl flex items-center justify-center border",
               isPositive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
             )}>
                {isPositive ? <ArrowDown className="w-5 h-5" /> : <Send className="w-5 h-5" />}
             </div>
             <div className="flex flex-col text-left">
                <span className="text-[13px] font-black text-white italic tracking-tight uppercase leading-none">{tx.type.replace('_', ' ')}</span>
                <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest mt-1">{timestamp}</span>
             </div>
          </div>
          <div className="text-right flex flex-col items-end">
             <span className={cn("text-[15px] font-black italic", isPositive ? "text-emerald-400" : "text-red-400")}>
               {isPositive ? '+' : ''}{tx.amount.toFixed(2)}
             </span>
             <span className="text-[7px] text-white/20 font-black uppercase tracking-widest">Signal Verified</span>
          </div>
       </div>
    </div>
  );
}
