"use client"

import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, Orbit, CircleDollarSign, TowerControl, 
  Satellite, Microscope, Atom, ChevronRight,
  Sparkles, Layers, Zap, Loader2
} from 'lucide-react';
import { useAppState } from '@/lib/app-state';
import { useUser, useFirestore } from '@/firebase/provider';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, limit } from 'firebase/firestore';
import { cn, formatDisplayName } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

/**
 * NAVIGATOR EXPLORE V98.0 «FUNCTIONAL HUB»
 * Теперь кнопки «Присоединиться» работают и добавляют пользователя в чаты.
 */
export default function DiscoveryView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const { setCurrentChatId, setActiveView } = useAppState();

  const handleJoin = async (chatUsername: string) => {
    if (!db || !user) return;
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
          toast({ title: "Доступ разрешен", description: "Узел интегрирован в кластер" });
        }
        
        setCurrentChatId(chatDoc.id);
        setActiveView('chats');
      } else {
        toast({ title: "Сбой сигнала", description: "Узел не обнаружен в базе", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Ошибка шлюза", variant: "destructive" });
    } finally {
      setIsJoining(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] overflow-hidden relative">
      {/* Top Header */}
      <div className="px-8 pt-16 pb-6 shrink-0 text-center relative z-10">
        <h1 className="text-4xl font-black text-primary italic tracking-tighter uppercase leading-none drop-shadow-[0_0_30px_hsla(var(--primary),0.3)]">
          EXPLORE
        </h1>
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-white/20 mt-3">Navigator Engine</p>
      </div>

      <div className="px-8 pb-8 shrink-0 relative z-10">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-all" />
          <Input 
            placeholder="Поиск узлов, каналов, пользователей..." 
            className="bg-[#1C1C1E] border-white/[0.05] h-16 rounded-[2rem] pl-16 text-md font-bold text-white placeholder:text-[#8E8E93]/40 focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 relative z-10">
        <div className="px-8 pb-40 space-y-12 animate-in fade-in duration-1000">
          
          {/* RECOMMENDED NODES */}
          <section className="space-y-6">
            <h3 className="text-[11px] font-black uppercase text-[#8E8E93] tracking-[0.3em] px-2 italic">
              Рекомендуемые узлы
            </h3>
            <ScrollArea className="w-full pb-6">
              <div className="flex gap-5">
                <RecommendCard 
                  id="aurora"
                  icon={<Orbit className="w-10 h-10 text-blue-400" />} 
                  title="Станция 'Аврора'" 
                  username="@aurora_node"
                  loading={isJoining === '@aurora_node'}
                  onClick={() => handleJoin('@aurora_node')}
                />
                <RecommendCard 
                  id="kepler"
                  icon={<CircleDollarSign className="w-10 h-10 text-yellow-500" />} 
                  title="Торговый путь" 
                  username="@kepler_trade"
                  loading={isJoining === '@kepler_trade'}
                  onClick={() => handleJoin('@kepler_trade')}
                />
                <RecommendCard 
                  id="beacon"
                  icon={<TowerControl className="w-10 h-10 text-primary" />} 
                  title="Звездный маяк" 
                  username="@star_beacon"
                  loading={isJoining === '@star_beacon'}
                  onClick={() => handleJoin('@star_beacon')}
                />
              </div>
            </ScrollArea>
          </section>

          {/* CATEGORIES */}
          <section className="space-y-6">
            <h3 className="text-[11px] font-black uppercase text-[#8E8E93] tracking-[0.3em] px-2 italic">
              Категории
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <CategoryItem icon={Satellite} label="Связь и Коммуникации" />
              <CategoryItem icon={Layers} label="Торговля и Ресурсы" />
              <CategoryItem icon={Microscope} label="Наука и Исследования" />
            </div>
          </section>

          {/* ACTIVE EVENTS */}
          <section className="space-y-6">
            <h3 className="text-[11px] font-black uppercase text-[#8E8E93] tracking-[0.3em] px-2 italic">
              Активные События
            </h3>
            <div className="nuxus-event-card p-8 flex items-center gap-8 group cursor-pointer hover:bg-[#1C1C1E]/90 transition-all shadow-2xl relative overflow-hidden">
               <div className="w-18 h-18 rounded-3xl bg-primary/20 border border-primary/30 flex items-center justify-center relative z-10">
                  <Atom className="w-10 h-10 text-primary animate-[spin_10s_linear_infinite]" />
               </div>
               <div className="flex flex-col text-left relative z-10">
                  <span className="text-[18px] font-black text-white italic tracking-tighter uppercase group-hover:text-primary transition-colors">
                    Квантовый Симпозиум
                  </span>
                  <div className="flex items-center gap-3 mt-2">
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_green]" />
                     <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">LIVE NOW</span>
                  </div>
               </div>
               <Zap className="absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 text-primary/5 group-hover:text-primary/20 transition-all" />
            </div>
          </section>

        </div>
      </ScrollArea>
    </div>
  );
}

function RecommendCard({ icon, title, username, onClick, loading }: any) {
  return (
    <div className="min-w-[190px] p-6 bg-[#1C1C1E] border border-white/[0.05] rounded-[3rem] flex flex-col gap-6 shadow-2xl group transition-all hover:border-primary/30">
       <div className="w-16 h-16 rounded-[1.8rem] bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
          {icon}
       </div>
       <div className="flex flex-col gap-2 text-left">
          <span className="text-[15px] font-black text-white italic uppercase leading-tight line-clamp-1">
            {title}
          </span>
          <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{username}</span>
          <Button 
            onClick={onClick}
            disabled={loading}
            className="mt-2 h-11 w-full bg-primary/10 border border-primary/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all shadow-lg active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Присоединиться'}
          </Button>
       </div>
    </div>
  );
}

function CategoryItem({ icon: Icon, label }: any) {
  return (
    <div className="flex items-center justify-between p-6 bg-[#1C1C1E]/70 rounded-[2.5rem] border border-white/[0.05] hover:bg-[#1C1C1E] transition-all cursor-pointer group shadow-xl">
       <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-all">
             <Icon className="w-6 h-6" />
          </div>
          <span className="text-[15px] font-black text-white italic uppercase tracking-tighter">
            {label}
          </span>
       </div>
       <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </div>
  );
}