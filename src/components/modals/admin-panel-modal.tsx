
"use client"

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, doc, limit, getDocs, addDoc, orderBy, writeBatch, increment, where } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Search, Trash2, ShieldCheck, Radio, Send, 
  Loader2, UserX, MoreVertical, Ban, CheckCircle2, Crown, Calendar, Shield, Activity, Eye, MessageCircle, ArrowLeft, CreditCard, Check, X, ShieldOff, Zap, Terminal, Trash, Navigation, Trophy, Globe, Server, BarChart3, ListChecks
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import type { User, Chat, Transaction } from '@/lib/types';
import { formatDisplayName, isUserPremium, cn, isGlobalAdmin } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { addMonths, subDays, format } from 'date-fns';

const ROOT_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

// Фиктивные данные для аналитики
const MOCK_ANALYTICS = [
  { day: 'Пн', users: 400, signals: 2400 },
  { day: 'Вт', users: 300, signals: 1398 },
  { day: 'Ср', users: 200, signals: 9800 },
  { day: 'Чт', users: 278, signals: 3908 },
  { day: 'Пт', users: 189, signals: 4800 },
  { day: 'Суб', users: 239, signals: 3800 },
  { day: 'Вс', users: 349, signals: 4300 },
];

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');
  const [terminalLogs, setTerminalLogs] = useState<{msg: string, time: string, type: 'info'|'warn'|'crit'|'edge'}[]>([]);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  
  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(500))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

  const logsQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'system_logs'), orderBy('createdAt', 'desc'), limit(100))), [db]);
  const { data: systemLogs } = useCollection<any>(logsQuery);

  useEffect(() => {
    if (activeTab === 'terminal' && terminalLogs.length === 0) {
      setTerminalLogs([
        { msg: "Kernel Boot Sequence Initialized...", time: new Date().toLocaleTimeString(), type: 'info' },
        { msg: "Geo-Distributed Mesh: Syncing 4 active nodes...", time: new Date().toLocaleTimeString(), type: 'edge' },
        { msg: "E2EE Handshake Protocol: STABLE", time: new Date().toLocaleTimeString(), type: 'info' },
      ]);
    }
  }, [activeTab]);

  const stats = useMemo(() => {
    if (!users) return { total: 0, premium: 0, admins: 0, banned: 0 };
    return {
      total: users.length,
      premium: users.filter(u => isUserPremium(u)).length,
      admins: users.filter(u => isGlobalAdmin(u)).length,
      banned: users.filter(u => u.isBanned).length
    };
  }, [users]);

  const realUsersForList = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      const s = userSearch.toLowerCase();
      return u.name?.toLowerCase().includes(s) || u.username?.toLowerCase().includes(s) || u.phone?.includes(s);
    }).sort((a, b) => (a.id === ROOT_UID ? -1 : 1));
  }, [users, userSearch]);

  const handleAction = async (targetId: string, action: string, value?: any) => {
    if (!db) return;
    if (targetId === ROOT_UID && action === 'ban') {
      toast({ title: "Ошибка", description: "Владелец неприкосновенен", variant: "destructive" });
      return;
    }

    const userRef = doc(db, 'users', targetId);
    let update: any = {};

    switch(action) {
      case 'ban': update = { isBanned: true }; break;
      case 'unban': update = { isBanned: false }; break;
      case 'make_admin': update = { isAdmin: true }; break;
      case 'remove_admin': update = { isAdmin: false }; break;
      case 'give_premium': 
        const expiry = addMonths(new Date(), value || 1);
        update = { isPremium: true, premiumUntil: expiry.toISOString() };
        break;
      case 'remove_premium': update = { isPremium: false, premiumUntil: null }; break;
    }

    await updateDoc(userRef, update);
    
    // Логируем действие
    await addDoc(collection(db, 'system_logs'), {
      action,
      adminId: currentUser?.uid,
      targetId,
      createdAt: new Date().toISOString()
    });

    toast({ title: "Действие выполнено" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0a0a0c] border-primary/30 p-0 overflow-hidden h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl border">
        <DialogHeader className="p-6 bg-primary/5 border-b border-white/5 shrink-0">
          <DialogTitle className="flex items-center justify-between text-white uppercase italic font-black tracking-tighter">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-primary animate-pulse" /> 
              <span>Nuxus Prime Control v2.5</span>
            </div>
            <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
              <Activity className="w-3 h-3 text-green-500 animate-pulse" />
              <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Core Status: Stable</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4 shrink-0">
            <TabsList className="grid grid-cols-5 w-full bg-white/5 p-1 rounded-2xl">
              <TabsTrigger value="analytics" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-2"><BarChart3 className="w-3 h-3"/> Аналитика</TabsTrigger>
              <TabsTrigger value="users" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-2"><Users className="w-3 h-3"/> Узлы</TabsTrigger>
              <TabsTrigger value="logs" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-2"><ListChecks className="w-3 h-3"/> Логи</TabsTrigger>
              <TabsTrigger value="terminal" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-2"><Terminal className="w-3 h-3"/> Терминал</TabsTrigger>
              <TabsTrigger value="broadcast" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-2"><Radio className="w-3 h-3"/> Маяк</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analytics" className="flex-1 data-[state=active]:flex flex-col p-6 m-0 outline-none overflow-y-auto">
            <div className="grid grid-cols-4 gap-4 mb-8">
              <StatCard label="Всего узлов" value={stats.total} icon={Users} color="text-white" />
              <StatCard label="Premium" value={stats.premium} icon={Star} color="text-accent" />
              <StatCard label="Активность" value="98%" icon={Zap} color="text-yellow-500" />
              <StatCard label="Баны" value={stats.banned} icon={Ban} color="text-red-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[300px] mb-8">
              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                <h3 className="text-[10px] font-black uppercase text-primary mb-4 tracking-widest">Рост Сигнала (Узлы)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MOCK_ANALYTICS}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                    <ChartTooltip 
                      contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '10px' }}
                    />
                    <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorUsers)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                <h3 className="text-[10px] font-black uppercase text-accent mb-4 tracking-widest">Нагрузка (Пакеты)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_ANALYTICS}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                    <ChartTooltip 
                      contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    />
                    <Bar dataKey="signals" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="flex-1 data-[state=active]:flex flex-col min-h-0 m-0 outline-none">
            <div className="p-4 px-6 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <Input placeholder="Поиск по ID или нику..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="bg-white/5 border-white/10 h-10 rounded-xl text-sm pl-10" />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-6 pb-6 space-y-2">
                {realUsersForList.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 group">
                    <div className="flex items-center gap-3">
                      <UserAvatar userId={u.id} className="h-10 w-10" fallbackName={u.name} />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white">{formatDisplayName(u.name)}</span>
                          {isUserPremium(u) && <Star className="w-2.5 h-2.5 text-accent fill-accent" />}
                        </div>
                        <span className="text-[9px] text-muted-foreground/60 uppercase font-black">{u.username}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4"/></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-card border-white/10 rounded-2xl p-1">
                        <DropdownMenuItem onClick={() => handleAction(u.id, u.isBanned ? 'unban' : 'ban')} className={cn("gap-3 py-3 font-bold text-[10px] uppercase rounded-xl", u.isBanned ? "text-green-500" : "text-destructive")}>
                          {u.isBanned ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />} {u.isBanned ? 'Разблокировать' : 'Бан'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem onClick={() => handleAction(u.id, u.isAdmin ? 'remove_admin' : 'make_admin')} className="gap-3 py-3 font-bold text-[10px] uppercase rounded-xl">
                          <ShieldCheck className="w-4 h-4 text-primary" /> {u.isAdmin ? 'Снять админа' : 'Дать админку'}
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="gap-3 py-3 font-bold text-[10px] uppercase rounded-xl">
                            <Star className="w-4 h-4 text-accent" /> Premium статус
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="bg-card border-white/10 rounded-xl p-1">
                            <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 1)} className="text-[10px] font-bold uppercase py-2">1 Месяц</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 12)} className="text-[10px] font-bold uppercase py-2">1 Год</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={() => handleAction(u.id, 'remove_premium')} className="text-destructive text-[10px] font-bold uppercase py-2">Удалить</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="logs" className="flex-1 data-[state=active]:flex flex-col min-h-0 m-0 outline-none">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-3">
                {systemLogs?.map((log: any) => (
                  <div key={log.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-white">{log.action}</span>
                        <span className="text-[8px] text-muted-foreground">Admin: {log.adminId?.slice(0,8)}...</span>
                      </div>
                    </div>
                    <span className="text-[8px] text-muted-foreground font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="terminal" className="flex-1 data-[state=active]:flex flex-col min-h-0 m-0 outline-none bg-black">
            <div className="flex-1 p-4 font-mono text-[10px] leading-relaxed relative overflow-y-auto">
              <div className="space-y-1">
                {terminalLogs.map((log, i) => (
                  <div key={i} className={cn("flex gap-3", log.type === 'edge' ? "text-cyan-400" : "text-green-500")}>
                    <span className="opacity-40 shrink-0">[{log.time}]</span>
                    <span className="break-all">{log.msg}</span>
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="broadcast" className="flex-1 data-[state=active]:flex flex-col p-6 gap-4 m-0 outline-none">
            <Textarea placeholder="Текст глобального маяка..." className="bg-white/5 border-white/10 rounded-2xl min-h-[180px] text-sm resize-none" />
            <Button className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20"><Radio className="w-5 h-5 mr-2" /> Транслировать Сигнал</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-[1.8rem] border border-white/5 flex flex-col items-center justify-center gap-1 transition-all hover:bg-white/10">
      <Icon className={cn("w-4 h-4 mb-1", color)} />
      <span className="text-xl font-black italic text-white">{value}</span>
      <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</span>
    </div>
  );
}
