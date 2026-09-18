
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useFirestore, useCollection } from '@/firebase/provider'; 
import { collection, query, doc, limit, updateDoc, writeBatch, increment, orderBy, addDoc, getDocs } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Ban, Check, Activity, 
  Zap, ShieldCheck, Search, Crown, Shield, AlertTriangle, 
  XCircle, UserX, Ghost, Loader2, Phone, MessageSquare, 
  Scale, CheckCircle2, BarChart3, PieChart, MoreVertical, 
  ShieldPlus, UserMinus, Mail, Send, Sparkles
} from 'lucide-react';
import type { User, TopUpRequest, Appeal } from '@/lib/types';
import { formatDisplayName, cn, isUserAnomaly, isUserPremium } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/app-state';

/**
 * ADMIN PANEL MODAL V71.0 «BROADCAST EDITION»
 * Добавлена система массовых рассылок по Email.
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

  // DATA FETCHING
  const appealsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'appeals'), orderBy('createdAt', 'desc'), limit(50));
  }, [db]);
  const { data: appeals } = useCollection<Appeal>(appealsQuery);

  const topUpRequestsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'topUpRequests'), orderBy('createdAt', 'desc'), limit(50));
  }, [db]);
  const { data: requests } = useCollection<TopUpRequest>(topUpRequestsQuery);

  const usersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'users'), limit(1000));
  }, [db]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  const stats = useMemo(() => {
    if (!allUsers) return { total: 0, valid: 0, premium: 0, banned: 0, anomalies: 0, emails: 0 };
    
    const banned = allUsers.filter(u => u.isBanned).length;
    const anomalies = allUsers.filter(u => isUserAnomaly(u)).length;
    const premium = allUsers.filter(u => isUserPremium(u)).length;
    const emails = allUsers.filter(u => u.email).length;
    const total = allUsers.length;
    const active = total - banned - anomalies;

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
      toast({ title: "Ошибка", description: "Заполните тему и текст рассылки", variant: "destructive" });
      return;
    }

    const targets = allUsers.filter(u => u.email);
    if (targets.length === 0) {
      toast({ title: "Ошибка", description: "В базе нет пользователей с привязанной почтой", variant: "destructive" });
      return;
    }

    if (!confirm(`Запустить рассылку на ${targets.length} адресов? Отправитель: support@nuxus.fun`)) return;

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
            html: broadcastBody,
            text: broadcastBody.replace(/<[^>]*>?/gm, ''), // Simple strip tags
          },
          from: 'Nuxus Support <support@nuxus.fun>',
          createdAt: new Date().toISOString(),
          status: 'pending'
        });
        
        count++;
        if (count % 10 === 0) {
          setBroadcastProgress(Math.round((count / targets.length) * 100));
        }
      }

      await batch.commit();
      toast({ title: "Рассылка запущена", description: `Пакет из ${targets.length} писем передан в очередь отправки.` });
      setBroadcastSubject('');
      setBroadcastBody('');
      setBroadcastProgress(100);
    } catch (e) {
      toast({ title: "Сбой рассылки", variant: "destructive" });
    } finally {
      setTimeout(() => {
        setIsBroadcasting(false);
        setBroadcastProgress(0);
      }, 2000);
    }
  };

  const handleAppealJustice = async (appeal: Appeal, action: 'accept' | 'reject') => {
    if (!db) return;
    const batch = writeBatch(db);
    const appealRef = doc(db, 'appeals', appeal.id);
    const userRef = doc(db, 'users', appeal.userId);

    if (action === 'accept') {
      batch.update(userRef, { isBanned: false, bannedAt: null });
      batch.update(appealRef, { status: 'accepted', resolvedAt: new Date().toISOString() });
      toast({ title: "Узел восстановлен" });
    } else {
      batch.update(appealRef, { status: 'rejected', resolvedAt: new Date().toISOString() });
      toast({ title: "Апелляция отклонена" });
    }
    await batch.commit();
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
                <DialogTitle className="text-3xl font-black uppercase italic text-white tracking-tighter leading-none">MISSION CONTROL</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase text-primary/60 mt-2 tracking-widest">Aegis Executive Dashboard v71.0</DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-8 mt-6">
            <TabsList className="grid grid-cols-5 bg-white/5 p-1.5 rounded-2xl border border-white/5">
              <TabsTrigger value="analytics" className="text-[9px] font-black uppercase tracking-widest gap-2"><BarChart3 className="w-3 h-3" /> Статистика</TabsTrigger>
              <TabsTrigger value="broadcast" className="text-[9px] font-black uppercase tracking-widest gap-2"><Mail className="w-3 h-3" /> Рассылка</TabsTrigger>
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
                    <StatCard icon={Mail} label="Email База" value={stats.emails} sub="Для рассылки" color="text-primary" />
                    <StatCard icon={Ban} label="Блокировки" value={stats.banned} sub="Вне сети" color="text-red-500" />
                    <StatCard icon={Crown} label="Elite" value={stats.premium} sub="Premium статус" color="text-accent" />
                 </div>
              </TabsContent>

              <TabsContent value="broadcast" className="m-0 space-y-6">
                 <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5 -z-0"><Send className="w-40 h-40" /></div>
                    
                    <div className="space-y-4 relative z-10">
                       <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
                             <Sparkles className="w-6 h-6 text-primary" /> Новый сигнал рассылки
                          </h3>
                          <div className="bg-primary/20 px-3 py-1 rounded-full text-[9px] font-black text-primary uppercase tracking-widest border border-primary/20">
                             Sender: support@nuxus.fun
                          </div>
                       </div>
                       
                       <div className="space-y-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-white/40 ml-2 tracking-widest">Тема письма</label>
                             <Input 
                               placeholder="Важное обновление системы Nuxus..." 
                               value={broadcastSubject}
                               onChange={e => setBroadcastSubject(e.target.value)}
                               className="h-14 bg-black/40 border-white/10 rounded-2xl text-lg font-bold"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-white/40 ml-2 tracking-widest">Сообщение (HTML поддерживается)</label>
                             <Textarea 
                               placeholder="Введите текст сообщения для всех пользователей..." 
                               value={broadcastBody}
                               onChange={e => setBroadcastBody(e.target.value)}
                               className="min-h-[250px] bg-black/40 border-white/10 rounded-2xl p-6 text-base leading-relaxed"
                             />
                          </div>
                       </div>

                       {isBroadcasting ? (
                         <div className="space-y-4 pt-6">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                               <span>Трансляция данных...</span>
                               <span>{broadcastProgress}%</span>
                            </div>
                            <Progress value={broadcastProgress} className="h-3 bg-white/5" />
                         </div>
                       ) : (
                         <Button 
                           onClick={handleStartBroadcast}
                           className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic text-sm tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all"
                         >
                           <Send className="w-5 h-5 mr-3" /> Запустить глобальный сигнал
                         </Button>
                       )}
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="appeals" className="m-0 space-y-6">
                 {appeals?.filter(a => a.status === 'pending').map(appeal => (
                    <div key={appeal.id} className="bg-white/[0.03] p-6 rounded-[2.5rem] border border-white/5 space-y-6">
                       <div className="flex items-center gap-4">
                          <UserAvatar userId={appeal.userId} className="h-14 w-14 border border-white/10" />
                          <div className="flex flex-col text-left">
                             <span className="text-lg font-black text-white uppercase italic">{appeal.userName}</span>
                             <span className="text-[9px] text-white/30 font-black uppercase">ID: {appeal.userId}</span>
                          </div>
                       </div>
                       <p className="bg-black/40 p-5 rounded-2xl border border-white/5 text-sm italic">"{appeal.reason}"</p>
                       <div className="flex gap-3">
                          <Button onClick={() => handleAppealJustice(appeal, 'accept')} className="bg-green-500 h-12 rounded-xl uppercase font-black text-[10px]">Принять</Button>
                          <Button onClick={() => handleAppealJustice(appeal, 'reject')} variant="destructive" className="h-12 rounded-xl uppercase font-black text-[10px]">Отказать</Button>
                       </div>
                    </div>
                 ))}
              </TabsContent>

              <TabsContent value="requests" className="m-0 space-y-4">
                {requests?.filter(r => r.status === 'pending').map(req => (
                  <div key={req.id} className="bg-white/[0.03] p-6 rounded-[2.2rem] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <UserAvatar userId={req.userId} className="h-14 w-14 border border-white/10" />
                      <div className="flex flex-col text-left">
                        <span className="text-[15px] font-black text-white uppercase italic">{req.userName}</span>
                        <span className="text-primary font-black">{req.amount} NX</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={() => updateDoc(doc(db!, 'topUpRequests', req.id), { status: 'approved' })} className="bg-green-500 h-10 rounded-xl font-black text-[10px]">OK</Button>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="users" className="m-0 space-y-6">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <Input 
                      placeholder="Поиск активного узла..." 
                      value={userSearch} 
                      onChange={e => setUserSearch(e.target.value)} 
                      className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 font-bold" 
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allUsers?.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase())).slice(0, 50).map(u => (
                      <div key={u.id} className="bg-white/[0.03] p-5 rounded-[2rem] border border-white/5 flex items-center justify-between hover:bg-white/[0.08] transition-all cursor-pointer" onClick={() => setInspectedUserId(u.id)}>
                         <div className="flex items-center gap-4">
                            <UserAvatar userId={u.id} className="h-12 w-12 border border-white/5" manualAvatarUrl={u.avatarUrl} />
                            <div className="flex flex-col text-left">
                               <span className="text-sm font-black text-white uppercase italic">{formatDisplayName(u.name, u.username)}</span>
                               <span className="text-[10px] text-primary/60 font-black uppercase">{u.username}</span>
                            </div>
                         </div>
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
