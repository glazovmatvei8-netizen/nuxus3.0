"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useFirestore } from '@/firebase/provider'; 
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { collection, query, doc, limit, writeBatch, orderBy } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Ban, Activity, 
  Search, Crown, Mail, Send, Sparkles,
  BarChart3, Scale, Zap
} from 'lucide-react';
import type { User, TopUpRequest, Appeal } from '@/lib/types';
import { formatDisplayName, cn, isUserAnomaly, isUserPremium } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/app-state';

/**
 * ADMIN PANEL MODAL V73.1 «STABILITY PATCH»
 * ИСПРАВЛЕНО: Прямые импорты хуков из файловой системы.
 * Стабилизированы запросы Firestore для предотвращения бесконечных циклов рендеринга.
 */
export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const { setInspectedUserId } = useAppState();
  
  const [activeTab, setActiveTab] = useState('analytics');
  const [userSearch, setUserSearch] = useState('');
  
  // Broadcast State
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState(0);

  // DATA FETCHING: Стабилизированные запросы через useMemoFirebase
  const appealsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'appeals'), orderBy('createdAt', 'desc'), limit(50));
  }, [db]);
  const { data: appeals } = useCollection<Appeal>(appealsQuery);

  const topUpRequestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'topUpRequests'), orderBy('createdAt', 'desc'), limit(50));
  }, [db]);
  const { data: requests } = useCollection<TopUpRequest>(topUpRequestsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), limit(1000));
  }, [db]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  const stats = useMemo(() => {
    if (!allUsers) return { total: 0, active: 0, premium: 0, banned: 0, anomalies: 0, emails: 0 };
    
    const banned = allUsers.filter(u => u.isBanned).length;
    const anomalies = allUsers.filter(u => isUserAnomaly(u)).length;
    const premium = allUsers.filter(u => isUserPremium(u)).length;
    const emails = allUsers.filter(u => u.email && u.email.includes('@')).length;
    const total = allUsers.length;
    const active = total - banned;

    return { 
      total, 
      active: active < 0 ? 0 : active, 
      premium, 
      banned, 
      anomalies,
      emails
    };
  }, [allUsers]);

  const handleStartBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastBody.trim() || !allUsers || !db) {
      toast({ title: "Ошибка", description: "Заполните все данные", variant: "destructive" });
      return;
    }

    const targets = allUsers.filter(u => u.email && u.email.includes('@') && !u.email.includes('@nuxus.app'));
    
    if (targets.length === 0) {
      toast({ title: "Ошибка", description: "Нет реальных Email адресов", variant: "destructive" });
      return;
    }

    if (!confirm(`ВНИМАНИЕ: Запустить рассылку на ${targets.length} адресов?`)) return;

    setIsBroadcasting(true);
    setBroadcastProgress(0);
    
    try {
      const batch = writeBatch(db);
      let count = 0;

      for (const target of targets) {
        const mailRef = doc(collection(db, 'mail'));
        batch.set(mailRef, {
          to: target.email,
          message: {
            subject: broadcastSubject,
            html: `<div style="font-family: sans-serif; padding: 20px;">${broadcastBody.replace(/\n/g, '<br/>')}</div>`,
            text: broadcastBody,
          },
          from: 'Nuxus Support <support@nuxus.fun>',
          createdAt: new Date().toISOString()
        });
        
        count++;
        if (count % 10 === 0 || count === targets.length) {
          setBroadcastProgress(Math.round((count / targets.length) * 100));
        }
      }

      await batch.commit();
      toast({ title: "Рассылка активирована", description: `Пакет из ${targets.length} писем отправлен.` });
      setBroadcastSubject('');
      setBroadcastBody('');
    } catch (e) {
      toast({ title: "Сбой шлюза", variant: "destructive" });
    } finally {
      setTimeout(() => {
        setIsBroadcasting(false);
        setBroadcastProgress(0);
      }, 1000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-[#020205] border-white/10 rounded-[3rem] p-0 overflow-hidden h-[90vh] flex flex-col shadow-2xl outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 bg-primary/10 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(168,85,247,0.1)_0%,transparent_70%)]" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-[1.8rem] bg-primary/20 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                 <ShieldAlert className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="flex flex-col text-left">
                <DialogTitle className="text-3xl font-black uppercase italic text-white tracking-tighter leading-none">AEGIS BROADCAST</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase text-primary/60 mt-2 tracking-widest">Global Communication Terminal v73.1</DialogDescription>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
               <div className="flex flex-col items-center">
                  <span className="text-xl font-black text-white italic">{stats.emails}</span>
                  <span className="text-[7px] font-bold text-white/40 uppercase">Real Emails</span>
               </div>
               <div className="w-px h-8 bg-white/10" />
               <div className="flex flex-col items-center">
                  <span className="text-xl font-black text-primary italic">{stats.total}</span>
                  <span className="text-[7px] font-bold text-white/40 uppercase">Nodes</span>
               </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-8 mt-6">
            <TabsList className="grid grid-cols-5 bg-white/5 p-1.5 rounded-2xl border border-white/5">
              <TabsTrigger value="analytics" className="text-[9px] font-black uppercase tracking-widest gap-2"><BarChart3 className="w-3 h-3" /> Статистика</TabsTrigger>
              <TabsTrigger value="broadcast" className="text-[9px] font-black uppercase tracking-widest gap-2"><Mail className="w-3 h-3" /> Почта (Real)</TabsTrigger>
              <TabsTrigger value="appeals" className="text-[9px] font-black uppercase tracking-widest gap-2"><Scale className="w-3 h-3" /> Апелляции</TabsTrigger>
              <TabsTrigger value="requests" className="text-[9px] font-black uppercase tracking-widest gap-2"><Zap className="w-3 h-3" /> Финансы</TabsTrigger>
              <TabsTrigger value="users" className="text-[9px] font-black uppercase tracking-widest gap-2"><Users className="w-3 h-3" /> Узлы</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8 pb-32">
              
              <TabsContent value="analytics" className="m-0 space-y-8">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Users} label="Всего Узлов" value={stats.total} sub="В базе" color="text-white" />
                    <StatCard icon={Mail} label="Реальные Почты" value={stats.emails} sub="Для рассылки" color="text-primary" />
                    <StatCard icon={Ban} label="Блокировки" value={stats.banned} sub="Вне сети" color="text-red-500" />
                    <StatCard icon={Crown} label="Elite" value={stats.premium} sub="Premium статус" color="text-accent" />
                 </div>
              </TabsContent>

              <TabsContent value="broadcast" className="m-0 space-y-6">
                 <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-8 relative overflow-hidden">
                    <div className="space-y-4 relative z-10">
                       <h3 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
                          <Sparkles className="w-6 h-6 text-primary" /> Реальная Email Рассылка
                       </h3>
                       <div className="space-y-6 pt-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-white/40 ml-2 tracking-widest">Тема письма</label>
                             <Input 
                               placeholder="Тема..." 
                               value={broadcastSubject}
                               onChange={e => setBroadcastSubject(e.target.value)}
                               className="h-14 bg-black/40 border-white/10 rounded-2xl text-lg font-bold"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-white/40 ml-2 tracking-widest">Текст сообщения</label>
                             <Textarea 
                               placeholder="Текст..." 
                               value={broadcastBody}
                               onChange={e => setBroadcastBody(e.target.value)}
                               className="min-h-[250px] bg-black/40 border-white/10 rounded-2xl p-6 text-base"
                             />
                          </div>
                       </div>

                       {isBroadcasting ? (
                         <div className="space-y-4 pt-6">
                            <Progress value={broadcastProgress} className="h-3 bg-white/5" />
                            <p className="text-[10px] font-black text-primary uppercase text-center animate-pulse">Трансляция сигнала: {broadcastProgress}%</p>
                         </div>
                       ) : (
                         <Button 
                           onClick={handleStartBroadcast}
                           className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic text-sm tracking-widest shadow-2xl active:scale-95 transition-all mt-4"
                         >
                           <Send className="w-5 h-5 mr-3" /> Запустить рассылку
                         </Button>
                       )}
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="appeals" className="m-0 py-10 text-center opacity-20">
                 <ShieldAlert className="w-12 h-12 mx-auto mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-widest">Раздел в разработке</p>
              </TabsContent>

              <TabsContent value="users" className="m-0 space-y-4">
                 <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <Input 
                      placeholder="Поиск узла..." 
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl"
                    />
                 </div>
                 <div className="grid grid-cols-1 gap-2">
                    {allUsers?.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.username?.toLowerCase().includes(userSearch.toLowerCase())).slice(0, 20).map(u => (
                      <div key={u.id} onClick={() => setInspectedUserId(u.id)} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 cursor-pointer border border-white/5 transition-all">
                         <div className="flex items-center gap-4">
                            <UserAvatar userId={u.id} className="h-10 w-10" manualAvatarUrl={u.avatarUrl} />
                            <div className="flex flex-col text-left">
                               <span className="font-bold text-sm text-white">{u.name}</span>
                               <span className="text-[10px] text-white/30 uppercase font-black">{u.username}</span>
                            </div>
                         </div>
                         <Button variant="ghost" size="icon" className="text-white/20"><Zap className="w-4 h-4" /></Button>
                      </div>
                    ))}
                 </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[2rem] flex flex-col gap-4 shadow-xl">
       <div className="flex items-center justify-between">
          <div className="bg-white/5 p-2 rounded-xl border border-white/10"><Icon className={cn("w-4 h-4", color)} /></div>
       </div>
       <div className="flex flex-col">
          <span className="text-2xl font-black text-white italic tracking-tighter tabular-nums">{value}</span>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">{label}</span>
       </div>
    </div>
  )
}
