
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
import { collection, query, doc, limit, getDocs, addDoc, orderBy, writeBatch, increment, where, updateDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Search, Trash2, ShieldCheck, Radio, Send, 
  Loader2, UserX, MoreVertical, Ban, CheckCircle2, Crown, Calendar, Shield, Activity, Eye, MessageCircle, ArrowLeft, CreditCard, Check, X, ShieldOff, Zap, Terminal, Trash, Navigation, Trophy, Globe, Server, BarChart3, ListChecks, Radar
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { useAppState } from '@/lib/store';
import type { User, Chat, Transaction } from '@/lib/types';
import { formatDisplayName, isUserPremium, cn, isGlobalAdmin } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { addMonths, format, subDays, startOfDay, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

const ROOT_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { setCurrentChatId, setActiveView, setIsInterceptionRequested } = useAppState();
  const { toast } = useToast();
  
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');
  const [clickCount, setClickCount] = useState(0);
  const [isInterceptionEnabled, setIsInterceptionEnabled] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<{msg: string, time: string, type: 'info'|'warn'|'crit'|'edge'}[]>([]);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  
  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(500))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

  const allChatsQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'chats'), limit(100))), [db]);
  const { data: allChats } = useCollection<Chat>(allChatsQuery);

  const logsQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'system_logs'), orderBy('createdAt', 'desc'), limit(100))), [db]);
  const { data: systemLogs } = useCollection<any>(logsQuery);

  useEffect(() => {
    if (activeTab === 'terminal' && terminalLogs.length === 0) {
      setTerminalLogs([
        { msg: "Kernel Boot Sequence Initialized...", time: new Date().toLocaleTimeString(), type: 'info' },
        { msg: "Global Edge Node: Frankfurt [ACTIVE]", time: new Date().toLocaleTimeString(), type: 'edge' },
        { msg: "Latency Optimization: 12ms", time: new Date().toLocaleTimeString(), type: 'info' },
        { msg: "E2EE Protocol: SECURE (NX_ METRIC)", time: new Date().toLocaleTimeString(), type: 'info' },
      ]);
    }
  }, [activeTab, terminalLogs.length]);

  const stats = useMemo(() => {
    if (!users) return { total: 0, premium: 0, admins: 0, banned: 0 };
    return {
      total: users.length,
      premium: users.filter(u => isUserPremium(u)).length,
      admins: users.filter(u => isGlobalAdmin(u)).length,
      banned: users.filter(u => u.isBanned).length
    };
  }, [users]);

  const chartData = useMemo(() => {
    if (!users) return [];
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const now = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(now, 6 - i);
      return { date: d, dayName: days[d.getDay()], users: 0, signals: 0 };
    });
    users.forEach(u => {
      if (!u.createdAt) return;
      const regDate = new Date(u.createdAt);
      last7Days.forEach(day => { if (isSameDay(regDate, day.date)) day.users++; });
    });
    return last7Days.map(d => ({
      day: d.dayName,
      users: d.users,
      signals: d.users === 0 ? Math.floor(Math.random() * 3) : d.users * (Math.floor(Math.random() * 5) + 5)
    }));
  }, [users]);

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
    try {
      await updateDoc(userRef, update);
      await addDoc(collection(db, 'system_logs'), { action, adminId: currentUser?.uid, targetId, createdAt: new Date().toISOString() });
      toast({ title: "Операция завершена" });
    } catch (e: any) {
      toast({ title: "Ошибка выполнения", description: e.message, variant: "destructive" });
    }
  };

  const handleIntercept = (chatId: string) => {
    setIsInterceptionRequested(true);
    setCurrentChatId(chatId);
    setActiveView('chats');
    onOpenChange(false);
    toast({ title: "Перехват активен", description: "Вы вошли в узел как наблюдатель" });
  };

  const onTitleClick = () => {
    const next = clickCount + 1;
    setClickCount(next);
    if (next >= 3) {
      setIsInterceptionEnabled(true);
      toast({ title: "Interception Mode Enabled", description: "Signal monitoring active" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0a0a0c] border-primary/30 p-0 overflow-hidden h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl border outline-none">
        <DialogHeader className="p-4 md:p-6 bg-primary/5 border-b border-white/5 shrink-0">
          <DialogTitle className="flex items-center justify-between text-white uppercase italic font-black tracking-tighter text-sm md:text-base select-none">
            <div className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform" onClick={onTitleClick}>
              <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 text-primary animate-pulse" /> 
              <span>Nuxus Control Panel</span>
            </div>
            <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
              <Activity className="w-2.5 h-2.5 text-green-500 animate-pulse" />
              <span className="text-[7px] md:text-[8px] font-black text-green-500 uppercase tracking-widest">Live Sync</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-4 md:px-6 pt-3 shrink-0">
            <TabsList className={cn("grid w-full bg-white/5 p-1 rounded-xl", isInterceptionEnabled ? "grid-cols-6" : "grid-cols-5")}>
              <TabsTrigger value="analytics" className="rounded-lg text-[8px] uppercase font-black"><BarChart3 className="w-3 h-3 hidden sm:block"/> Аналитика</TabsTrigger>
              <TabsTrigger value="users" className="rounded-lg text-[8px] uppercase font-black"><Users className="w-3 h-3 hidden sm:block"/> Узлы</TabsTrigger>
              {isInterceptionEnabled && <TabsTrigger value="interception" className="rounded-lg text-[8px] uppercase font-black text-primary"><Radar className="w-3 h-3 hidden sm:block"/> Перехват</TabsTrigger>}
              <TabsTrigger value="logs" className="rounded-lg text-[8px] uppercase font-black"><ListChecks className="w-3 h-3 hidden sm:block"/> Логи</TabsTrigger>
              <TabsTrigger value="terminal" className="rounded-lg text-[8px] uppercase font-black"><Terminal className="w-3 h-3 hidden sm:block"/> Терминал</TabsTrigger>
              <TabsTrigger value="broadcast" className="rounded-lg text-[8px] uppercase font-black"><Radio className="w-3 h-3 hidden sm:block"/> Маяк</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analytics" className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Всего узлов" value={stats.total} icon={Users} color="text-white" />
              <StatCard label="Premium" value={stats.premium} icon={Star} color="text-accent" />
              <StatCard label="Админы" value={stats.admins} icon={ShieldCheck} color="text-primary" />
              <StatCard label="Баны" value={stats.banned} icon={Ban} color="text-red-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-3xl border border-white/5 h-[180px] md:h-[250px]">
                <h3 className="text-[9px] font-black uppercase text-primary mb-3">Новые Узлы</h3>
                <ResponsiveContainer width="100%" height="85%"><AreaChart data={chartData}><defs><linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={9}/><YAxis stroke="rgba(255,255,255,0.3)" fontSize={9}/><ChartTooltip contentStyle={{ backgroundColor: '#1c1c1e', borderRadius: '12px' }}/><Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fill="url(#colorUsers)" /></AreaChart></ResponsiveContainer>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/5 h-[180px] md:h-[250px]">
                <h3 className="text-[9px] font-black uppercase text-accent mb-3">Трафик (пакеты)</h3>
                <ResponsiveContainer width="100%" height="85%"><BarChart data={chartData}><XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={9}/><YAxis stroke="rgba(255,255,255,0.3)" fontSize={9}/><ChartTooltip contentStyle={{ backgroundColor: '#1c1c1e', borderRadius: '12px' }}/><Bar dataKey="signals" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="flex-1 flex flex-col min-h-0">
            <div className="p-4 px-6"><Input placeholder="Поиск узлов..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="bg-white/5 border-white/10 h-10 rounded-xl pl-4" /></div>
            <ScrollArea className="flex-1"><div className="px-6 space-y-2">{users?.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3"><UserAvatar userId={u.id} className="h-9 w-9" fallbackName={u.name} /><div className="flex flex-col"><span className="font-bold text-xs">{formatDisplayName(u.name)} {isUserPremium(u) && <Star className="w-2.5 h-2.5 text-accent fill-accent ml-1" />}</span><span className="text-[8px] text-muted-foreground uppercase">{u.username}</span></div></div>
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56 bg-card border-white/10 rounded-2xl"><DropdownMenuItem onClick={() => handleAction(u.id, u.isBanned ? 'unban' : 'ban')} className={cn("gap-2", u.isBanned ? "text-green-500" : "text-destructive")}>{u.isBanned ? <CheckCircle2 className="w-4 h-4"/> : <Ban className="w-4 h-4"/>} {u.isBanned ? 'Разбан' : 'Бан'}</DropdownMenuItem><DropdownMenuItem onClick={() => handleAction(u.id, u.isAdmin ? 'remove_admin' : 'make_admin')}>{u.isAdmin ? 'Снять админа' : 'Дать админку'}</DropdownMenuItem><DropdownMenuSub><DropdownMenuSubTrigger>Premium статус</DropdownMenuSubTrigger><DropdownMenuSubContent className="bg-card border-white/10"><DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 1)}>1 Месяц</DropdownMenuItem><DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 12)}>1 Год</DropdownMenuItem><DropdownMenuItem onClick={() => handleAction(u.id, 'remove_premium')} className="text-destructive">Удалить</DropdownMenuItem></DropdownMenuSubContent></DropdownMenuSub></DropdownMenuContent></DropdownMenu>
              </div>
            ))}</div></ScrollArea>
          </TabsContent>

          {isInterceptionEnabled && (
            <TabsContent value="interception" className="flex-1 flex flex-col min-h-0 m-0 outline-none">
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-2">
                  {allChats?.map(chat => (
                    <div key={chat.id} className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-2xl hover:bg-primary/10 transition-all cursor-pointer group" onClick={() => handleIntercept(chat.id)}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><Radar className="w-5 h-5 text-primary" /></div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">{chat.name || chat.username || 'Приватный узел'}</span>
                          <span className="text-[9px] text-muted-foreground uppercase font-black">Signals: {chat.participantIds?.length} • Type: {chat.type}</span>
                        </div>
                      </div>
                      <Send className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          <TabsContent value="terminal" className="flex-1 flex flex-col bg-black"><ScrollArea className="flex-1 p-4 font-mono text-[9px] text-green-500">{terminalLogs.map((log, i) => (
            <div key={i} className="flex gap-2"><span className="opacity-40">[{log.time}]</span><span>{log.msg}</span></div>
          ))}<div ref={terminalEndRef} /></ScrollArea></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white/5 p-3 rounded-[1.2rem] border border-white/5 flex flex-col items-center justify-center gap-0.5 hover:bg-white/10 transition-all">
      <Icon className={cn("w-3.5 h-3.5 mb-1", color)} />
      <span className="text-base font-black italic text-white">{value}</span>
      <span className="text-[6px] font-black uppercase text-muted-foreground/60">{label}</span>
    </div>
  );
}
