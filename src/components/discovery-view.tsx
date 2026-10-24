"use client"

import React, { useState, useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, Orbit, CircleDollarSign, TowerControl, 
  Loader2, Info, ChevronRight, LayoutGrid, Radio, ShieldCheck, Zap
} from 'lucide-react';
import { useAppState } from '@/lib/app-state';
import { useUser, useFirestore } from '@/firebase/provider';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, limit } from 'firebase/firestore';
import { cn, triggerHaptic } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/hooks/use-translations';

export default function DiscoveryView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslations();
  const [search, setSearch] = useState('');
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const { setCurrentChatId, setActiveView } = useAppState();

  const handleJoin = async (chatUsername: string) => {
    if (!db || !user) return;
    triggerHaptic();
    setIsJoining(chatUsername);
    try {
      const q = query(collection(db, 'chats'), where('username', '==', chatUsername), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const chatDoc = snap.docs[0];
        const chatData = chatDoc.data();
        
        if (!chatData.participantIds.includes(user.uid)) {
          await updateDoc(doc(db, 'chats', chatDoc.id), {
            participantIds: arrayUnion(user.uid)
          });
          toast({ title: t('explore.join'), description: "Узел интегрирован в кластер" });
        }
        
        setCurrentChatId(chatDoc.id);
        setActiveView('chats');
      } else {
        toast({ title: t('explore.devMode'), description: t('explore.nodeNotFound') });
      }
    } catch (e) {
      console.error("Discovery node join error:", e);
      toast({ title: "Ошибка шлюза", variant: "destructive" });
    } finally {
      setIsJoining(null);
    }
  };

  const RECOMMEND_NODES = [
    { id: 'aurora', icon: Orbit, color: 'text-blue-400', title: "Станция 'Аврора'", username: "@aurora_node" },
    { id: 'kepler', icon: CircleDollarSign, color: 'text-yellow-500', title: "Торговой Путь", username: "@kepler_trade" },
    { id: 'beacon', icon: TowerControl, color: 'text-primary', title: "Звездный маяк", username: "@star_beacon" }
  ];

  const CATEGORIES = [
    { name: 'Торговля', icon: CircleDollarSign },
    { name: 'Связь', icon: Radio },
    { name: 'Архив', icon: LayoutGrid },
    { name: 'Защита', icon: ShieldCheck }
  ];

  const filteredNodes = useMemo(() => {
    if (!search) return RECOMMEND_NODES;
    return RECOMMEND_NODES.filter(n => 
      n.title.toLowerCase().includes(search.toLowerCase()) || 
      n.username.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, RECOMMEND_NODES]);

  return (
    <div className="flex flex-col h-full bg-[#121212] overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(229,142,56,0.03)_0%,transparent_70%)] pointer-events-none" />

      <div className="px-6 pt-12 pb-4 shrink-0 text-center relative z-10">
        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
          EXPLORE <span className="text-primary">OMEGA</span>
        </h1>
        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/20 mt-2">{t('explore.subtitle')}</p>
      </div>

      <div className="px-6 pb-6 shrink-0 relative z-10">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-all" />
          <Input 
            placeholder={t('explore.searchPlaceholder')} 
            className="bg-[#1C1C1E] border-white/[0.05] h-12 rounded-2xl pl-12 text-sm font-bold text-white focus:border-primary/40 transition-all shadow-inner"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 relative z-10">
        <div className="px-6 pb-40 space-y-10">
          <section className="bg-primary/5 border border-primary/10 p-5 rounded-3xl flex gap-4 items-start shadow-xl">
             <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
             <p className="text-[10px] font-bold text-white/60 leading-relaxed uppercase tracking-tight">
               Навигатор Omega позволяет находить скрытые узлы, рынки и специализированные каналы управления Ядром.
             </p>
          </section>

          <section className="space-y-4">
             <h3 className="text-[10px] font-black uppercase text-[#8E8E93] tracking-[0.3em] px-2 italic">Категории</h3>
             <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map(cat => (
                  <div key={cat.name} className="p-4 bg-[#1C1C1E] border border-white/[0.03] rounded-2xl flex items-center gap-3 hover:border-primary/20 transition-all cursor-pointer group">
                     <cat.icon className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                     <span className="text-[10px] font-black uppercase text-white/60">{cat.name}</span>
                  </div>
                ))}
             </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-[#8E8E93] tracking-[0.3em] px-2 italic">
              {t('explore.recommended')}
            </h3>
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4">
                {filteredNodes.map(node => (
                  <RecommendCard 
                    key={node.id}
                    icon={<node.icon className={cn("w-10 h-10", node.color)} />} 
                    title={node.title} 
                    username={node.username}
                    loading={isJoining === node.username}
                    onClick={() => handleJoin(node.username)}
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="bg-white/5" />
            </ScrollArea>
          </section>

          <section className="bg-[#1C1C1E]/40 border border-white/[0.05] p-6 rounded-[2.5rem] space-y-4">
             <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />
                <h3 className="text-[11px] font-black uppercase text-white italic tracking-widest">Активные события</h3>
             </div>
             <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                   <span className="text-[10px] font-bold text-white/40 uppercase">Aegis Stress Test</span>
                   <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-2 rounded-full font-black uppercase">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                   <span className="text-[10px] font-bold text-white/40 uppercase">Genesis Migration</span>
                   <span className="text-[8px] bg-blue-500/20 text-blue-400 px-2 rounded-full font-black uppercase">Ended</span>
                </div>
             </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

function RecommendCard({ icon, title, username, onClick, loading }: any) {
  const { t } = useTranslations();
  return (
    <div className="min-w-[170px] max-w-[170px] p-5 bg-[#1C1C1E] border border-white/[0.05] rounded-[2.5rem] flex flex-col gap-5 shadow-2xl group transition-all hover:border-primary/30">
       <div className="w-14 h-14 rounded-[1.5rem] bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
          {icon}
       </div>
       <div className="flex flex-col gap-1.5 text-left">
          <span className="text-[14px] font-black text-white italic uppercase leading-tight line-clamp-1">
            {title}
          </span>
          <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{username}</span>
          <Button 
            onClick={onClick}
            disabled={loading}
            className="mt-3 h-10 w-full bg-primary/10 border border-primary/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all shadow-lg active:scale-95"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : t('explore.join')}
          </Button>
       </div>
    </div>
  );
}