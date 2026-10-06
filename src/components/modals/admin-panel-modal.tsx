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
  BarChart3, Scale, Zap, Terminal
} from 'lucide-react';
import type { User, TopUpRequest, Appeal } from '@/lib/types';
import { formatDisplayName, cn, isUserAnomaly, isUserPremium } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/app-state';

/**
 * ADMIN PANEL MODAL V98.0 «CLEAN UI RECONSTRUCTION»
 * Исправлено наложение текста на текст, улучшена читаемость и структура.
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

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), limit(500));
  }, [db]);
  const { data: allUsers, isLoading: isUsersLoading } = useCollection<User>(usersQuery);

  const stats = useMemo(() => {
    if (!allUsers) return { total: 0, active: 0, premium: 0, banned: 0, emails: 0 };
    const banned = allUsers.filter(u => u.isBanned).length;
    const premium = allUsers.filter(u => isUserPremium(u)).length;
    const emails = allUsers.filter(u => u.email && !u.email.includes('@nuxus.app')).length;
    return { total: allUsers.length, active: allUsers.length - banned, premium, banned, emails };
  }, [allUsers]);

  const handleStartBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastBody.trim() || !allUsers || !db) {
      toast({ title: "Ошибка данных" });
      return;
    }
    const targets = allUsers.filter(u => u.email && !u.email.includes('@nuxus.app'));
    if (targets.length === 0) { toast({ title: "Нет адресатов" }); return; }
    
    setIsBroadcasting(true);
    try {
      const batch = writeBatch(db);
      targets.forEach(t => {
        const ref = doc(collection(db, 'mail'));
        batch.set(ref, {
          to: t.email,
          message: { subject: broadcastSubject, text: broadcastBody },
          createdAt: new Date().toISOString()
        });
      });
      await batch.commit();
      toast({ title: "Рассылка запущена" });
      setBroadcastSubject(''); setBroadcastBody('');
    } catch (e) { toast({ title: "Сбой шлюза" }); }
    finally { setIsBroadcasting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-[#020205] border-white/10 rounded-[3rem] p-0 overflow-hidden h-[92vh] flex flex-col shadow-2xl outline-none">
        
        {/* HEADER */}
        <DialogHeader className="p-10 border-b border-white/5 shrink-0 bg-primary/5 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,hsla(var(--primary),0.15),transparent_70%)]" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-[2.2rem] bg-primary/20 border border-primary/20 flex items-center justify-center shadow-xl">
                 <ShieldAlert className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <div className="flex flex-col text-left gap-1">
                <DialogTitle className="text-4xl font-black uppercase italic text-white tracking-tighter leading-none">AEGIS TERMINAL</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase text-primary/60 tracking-[0.5em]">Global Control V98.0</DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-10 mt-8">
            <TabsList className="grid grid-cols-4 bg-white/5 p-1.5 rounded-[1.8rem] border border-white/5">
              <TabsTrigger value="analytics" className="text-[10px] font-black uppercase tracking-widest py-3 data-[state=active]:bg-primary data-[state=active]:text-white">Статистика</TabsTrigger>
              <TabsTrigger value="users" className="text-[10px] font-black uppercase tracking-widest py-3 data-[state=active]:bg-primary data-[state=active]:text-white">База узлов</TabsTrigger>
              <TabsTrigger value="broadcast" className="text-[10px] font-black uppercase tracking-widest py-3 data-[state=active]:bg-primary data-[state=active]:text-white">Рассылка</TabsTrigger>
              <TabsTrigger value="logs" className="text-[10px] font-black uppercase tracking-widest py-3 data-[state=active]:bg-primary data-[state=active]:text-white">Логи</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-10 space-y-12">
              
              <TabsContent value="analytics" className="m-0 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={Users} label="Узлов в сети" value={stats.total} color="text-white" />
                    <StatCard icon={Mail} label="Email Identities" value={stats.emails} color="text-blue-400" />
                    <StatCard icon={Ban} label="Аннигилировано" value={stats.banned} color="text-red-500" />
                    <StatCard icon={Crown} label="Elite Nodes" value={stats.premium} color="text-accent" />
                 </div>
                 
                 <div className="bg-[#1C1C1E] p-8 rounded-[2.5rem] border border-white/[0.03] shadow-2xl">
                    <h4 className="text-[12px] font-black uppercase text-white tracking-[0.3em] mb-6 flex items-center gap-3">
                       <Activity className="w-4 h-4 text-primary" /> Системный пульс
                    </h4>
                    <div className="grid grid-cols-1 gap-6">
                       <div className="flex justify-between items-end">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Нагрузка на шлюз</span>
                          <span className="text-sm font-black text-primary italic">14.2%</span>
                       </div>
                       <Progress value={14} className="h-2.5 bg-black/40" />
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="users" className="m-0 space-y-8">
                 <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="Поиск по идентификатору или имени..." 
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="pl-16 h-16 bg-white/5 border-white/10 rounded-2xl text-lg font-bold focus:border-primary/40"
                    />
                 </div>
                 
                 <div className="grid grid-cols-1 gap-3">
                    {allUsers?.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.username?.toLowerCase().includes(userSearch.toLowerCase())).slice(0, 50).map(u => (
                      <div key={u.id} className="flex items-center justify-between p-5 bg-white/[0.03] rounded-3xl border border-white/[0.05] hover:bg-white/[0.06] transition-all">
                         <div className="flex items-center gap-5">
                            <UserAvatar userId={u.id} className="h-14 w-14" manualAvatarUrl={u.avatarUrl} />
                            <div className="flex flex-col text-left">
                               <span className="font-black text-white uppercase italic tracking-tight text-[16px]">{u.name}</span>
                               <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest">{u.username}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <Button variant="ghost" onClick={() => setInspectedUserId(u.id)} className="h-12 px-6 rounded-xl bg-white/5 font-black uppercase text-[9px] tracking-widest hover:bg-primary/20">Профиль</Button>
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all"><Ban className="w-5 h-5" /></Button>
                         </div>
                      </div>
                    ))}
                    {isUsersLoading && <div className="text-center py-20 animate-pulse text-white/20">SCAPPING NODES...</div>}
                 </div>
              </TabsContent>

              <TabsContent value="broadcast" className="m-0">
                 <div className="bg-[#1C1C1E] p-10 rounded-[3rem] border border-white/[0.03] space-y-8 shadow-2xl">
                    <div className="flex flex-col gap-2">
                       <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                          <Terminal className="w-7 h-7 text-primary" /> Почтовый Резонанс
                       </h3>
                       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Отправка сигналов на реальные почтовые адреса</p>
                    </div>
                    
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">Тема Сигнала</label>
                          <Input 
                            placeholder="Название пакета данных..." 
                            value={broadcastSubject}
                            onChange={e => setBroadcastSubject(e.target.value)}
                            className="h-14 bg-black/40 border-white/10 rounded-2xl font-bold"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">Тело Сигнала</label>
                          <Textarea 
                            placeholder="Введите данные для трансляции..." 
                            value={broadcastBody}
                            onChange={e => setBroadcastBody(e.target.value)}
                            className="min-h-[250px] bg-black/40 border-white/10 rounded-[2rem] p-8 text-sm leading-relaxed"
                          />
                       </div>
                    </div>

                    <Button 
                      onClick={handleStartBroadcast} 
                      disabled={isBroadcasting} 
                      className="w-full h-18 bg-primary text-white rounded-[2.2rem] font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 transition-all hover:scale-105"
                    >
                      {isBroadcasting ? <Loader2 className="animate-spin" /> : <><Send className="w-6 h-6 mr-3" /> Активировать Передачу</>}
                    </Button>
                 </div>
              </TabsContent>

            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-[#1C1C1E] border border-white/[0.03] p-8 rounded-[2.8rem] flex flex-col gap-6 shadow-xl relative overflow-hidden group">
       <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
       <div className="bg-black/40 p-3 rounded-2xl w-fit border border-white/[0.05] relative z-10"><Icon className={cn("w-6 h-6", color)} /></div>
       <div className="flex flex-col relative z-10">
          <span className="text-3xl font-black text-white italic tracking-tighter tabular-nums">{value}</span>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-2">{label}</span>
       </div>
    </div>
  )
}