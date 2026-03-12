
"use client"

import React, { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, Zap, History, ShieldCheck, CreditCard, ChevronRight } from 'lucide-react';
import { cn, formatDisplayName } from '@/lib/utils';
import type { User } from '@/lib/types';

export default function WalletView() {
  const { user } = useUser();
  const db = useFirestore();
  const [activeTab, setActiveTab] = useState<'balance' | 'cards'>('balance');

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

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
              <span className="text-5xl font-black text-white italic tracking-tighter">{profile?.balance || '0.00'}</span>
              <span className="text-xl font-bold text-primary italic">NX</span>
            </div>
            
            <div className="flex gap-3 mt-8">
              <Button className="flex-1 bg-primary text-white rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20">
                <Plus className="w-4 h-4" /> Пополнить
              </Button>
              <Button variant="outline" className="flex-1 border-white/10 bg-white/5 rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest gap-2">
                <ArrowUpRight className="w-4 h-4" /> Вывести
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <WalletAction icon={ArrowDownLeft} label="Перевести" color="text-green-500" />
          <WalletAction icon={History} label="История" color="text-blue-500" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 space-y-4 pb-32">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Последние транзакции</h3>
            <Button variant="link" className="text-[10px] font-bold uppercase text-primary p-0">Все</Button>
          </div>

          <div className="space-y-1">
            <TransactionItem type="receive" amount="+500" from="Nuxus Prime" date="Сегодня, 14:20" />
            <TransactionItem type="send" amount="-120" from="Sticker Bot" date="Вчера, 23:11" />
            <TransactionItem type="receive" amount="+50" from="Referral Bonus" date="24 мая" />
          </div>

          <div className="mt-8 bg-primary/5 border border-primary/10 rounded-[2rem] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-white uppercase italic">Безопасность Ядра</span>
                <span className="text-[9px] text-muted-foreground uppercase font-bold">Все транзакции шифруются QES</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed uppercase font-bold">
              Ваши средства находятся в изолированном контейнере и защищены протоколами Ядра Nuxus.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function WalletAction({ icon: Icon, label, color }: { icon: any, label: string, color: string }) {
  return (
    <button className="flex items-center justify-center gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group">
      <Icon className={cn("w-5 h-5", color, "group-hover:scale-110 transition-transform")} />
      <span className="text-[10px] font-black uppercase tracking-widest text-white">{label}</span>
    </button>
  );
}

function TransactionItem({ type, amount, from, date }: { type: 'receive' | 'send', amount: string, from: string, date: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5 group">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          type === 'receive' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
        )}>
          {type === 'receive' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-[14px] text-white">{from}</span>
          <span className="text-[10px] text-muted-foreground font-bold uppercase">{date}</span>
        </div>
      </div>
      <span className={cn("font-black text-[15px] italic", type === 'receive' ? "text-green-500" : "text-white")}>
        {amount} NX
      </span>
    </div>
  );
}
