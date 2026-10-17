
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Send, ArrowDown, RefreshCcw, 
  Wallet, Info, FileText, Loader2
} from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import type { User, Transaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/hooks/use-translations';
import { useAppState } from '@/lib/app-state';

/**
 * WALLET VIEW V135.0 «TITANIUM HARDENING»
 * FIXED: Исправлен вылет из-за неопределенных переменных и отсутствия проверок данных.
 */
export default function WalletView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t, currentLang } = useTranslations();
  const { setIsLegalOpen } = useAppState();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<User>(userRef);

  const transactionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'transactions'), orderBy('createdAt', 'desc'), limit(15));
  }, [db, user?.uid]);
  const { data: transactions, isLoading: isTxLoading } = useCollection<Transaction>(transactionsQuery);

  if (!mounted) return <div className="flex-1 bg-[#121212]" />;

  return (
    <div className="flex flex-col h-full bg-[#121212] overflow-hidden relative">
      <ScrollArea className="flex-1">
        <div className="px-6 pt-16 pb-40 space-y-10">
          <h1 className="text-3xl font-black text-primary italic tracking-tighter uppercase text-center w-full">{t('wallet.title')}</h1>

          <div className="relative h-48 w-full rounded-[3rem] p-[1.5px] bg-gradient-to-r from-primary/40 via-primary/80 to-primary/40 shadow-[0_20px_60px_rgba(229,142,56,0.3)]">
             <div className="h-full w-full bg-[#121212] rounded-[3rem] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="relative z-10 text-center space-y-1">
                  {isProfileLoading ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                  ) : (
                    <>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-5xl font-black text-white italic tracking-tighter tabular-nums">{(profile?.balance ?? 0).toFixed(2)}</span>
                        <span className="text-2xl font-black text-primary italic">STK</span>
                      </div>
                      <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest">{t('wallet.balance')}</p>
                    </>
                  )}
                </div>
                <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-primary/10 blur-3xl rounded-full" />
             </div>
          </div>

          <section className="bg-white/5 border border-white/10 p-6 rounded-[2.2rem] space-y-4">
             <div className="flex items-center gap-3 text-primary">
                <Info className="w-5 h-5" />
                <span className="text-[11px] font-black uppercase tracking-widest">О Системе STK</span>
             </div>
             <p className="text-[10px] font-bold text-white/50 uppercase leading-relaxed tracking-tight italic">
               {t('wallet.info')}
             </p>
             <Button variant="ghost" onClick={() => setIsLegalOpen(true)} className="w-full h-10 bg-white/5 rounded-xl text-[9px] font-black uppercase gap-2 hover:bg-white/10 transition-all">
                <FileText className="w-3.5 h-3.5" /> {currentLang === 'en' ? "Legal Disclaimer" : "Юридический отказ"}
             </Button>
          </section>

          <div className="space-y-4">
             <h3 className="text-[11px] font-black uppercase text-[#8E8E93] tracking-[0.2em] px-2 italic">{t('wallet.actions')}</h3>
             <div className="grid grid-cols-3 gap-4">
                <ActionBtn icon={Send} label="Отправить" onClick={() => toast({ title: "Скоро", description: "Переводы между узлами в разработке" })} />
                <ActionBtn icon={ArrowDown} label="Получить" onClick={() => toast({ title: "Пополнение", description: "Обратитесь к Администратору Ядра" })} />
                <ActionBtn icon={RefreshCcw} label="Обмен" onClick={() => toast({ title: "Скоро", description: "Обмен артефактов в разработке" })} />
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-[11px] font-black uppercase text-[#8E8E93] tracking-[0.2em] px-2 italic">{t('wallet.history')}</h3>
             <div className="space-y-2">
               {isTxLoading ? (
                 <div className="py-10 text-center opacity-20"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
               ) : transactions && transactions.length > 0 ? (
                 transactions.map(tx => <TxItem key={tx.id} tx={tx} />)
               ) : (
                 <div className="py-10 text-center opacity-10 space-y-3">
                    <Wallet className="w-10 h-10 mx-auto" />
                    <p className="text-[9px] font-black uppercase tracking-widest">История пуста</p>
                 </div>
               )}
             </div>
          </div>
          
          <p className="text-[8px] text-center text-white/10 font-bold uppercase tracking-widest px-10">
             {t('wallet.disclaimer')}
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: any) {
  return (
    <button onClick={() => { triggerHaptic(); onClick(); }} className="flex flex-col items-center gap-3 p-5 bg-[#1C1C1E] border border-white/[0.03] rounded-[2.5rem] transition-all active:scale-95 group shadow-lg hover:border-primary/20">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center relative overflow-hidden group-hover:bg-primary/10">
         <Icon className="w-5 h-5 text-primary" />
      </div>
      <span className="text-[8px] font-black uppercase text-[#8E8E93] tracking-widest group-hover:text-white transition-colors">{label}</span>
    </button>
  );
}

function TxItem({ tx }: { tx: Transaction }) {
  const isPositive = tx.amount > 0;
  return (
    <div className="flex items-center justify-between p-5 bg-[#1C1C1E]/40 rounded-[1.8rem] border border-white/[0.03] shadow-md">
       <div className="flex flex-col">
          <span className="text-[12px] font-black text-white italic tracking-tight uppercase">{tx.type}</span>
          <span className="text-[9px] text-[#8E8E93] font-bold uppercase tracking-widest">{tx.otherPartyName || 'Ядро'}</span>
       </div>
       <span className={cn("text-[14px] font-black italic", isPositive ? "text-green-500" : "text-red-500")}>
         {isPositive ? '+' : ''}{tx.amount} STK
       </span>
    </div>
  );
}
