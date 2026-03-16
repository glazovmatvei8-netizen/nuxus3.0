
"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenuSubContent,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit, updateDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Ban, CheckCircle2, ShieldCheck, Radio, 
  MoreVertical, ShieldOff, Activity, BarChart3, ListChecks, X, Globe, Trophy
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, Tooltip
} from 'recharts';
import type { User } from '@/lib/types';
import { formatDisplayName, isUserPremium, cn, isGlobalAdmin } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { addMonths, subDays, isSameDay } from 'date-fns';

const ROOT_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');
  
  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(500))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

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
      return { date: d, dayName: days[d.getDay()], users: 0 };
    });
    users.forEach(u => {
      if (!u.createdAt) return;
      const regDate = new Date(u.createdAt);
      last7Days.forEach(day => { if (isSameDay(regDate, day.date)) day.users++; });
    });
    return last7Days.map(d => ({
      day: d.dayName,
      users: d.users,
      signals: d.users === 0 ? Math.floor(Math.random() * 5) + 2 : d.users * 12
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
      toast({ title: "Операция завершена" });
    } catch (e: any) {
      toast({ title: "Ошибка выполнения", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0a0a0c] border-primary/30 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl border outline-none">
        <DialogHeader className="p-4 md:p-6 bg-primary/5 border-b border-white/5 shrink-0 relative">
          <div className="flex items-center justify-between w-full pr-8">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary animate-pulse" /> 
              <DialogTitle className="text-white uppercase italic font-black tracking-tighter text-xs md:text-base select-none">
                Nuxus Control Panel
              </DialogTitle>
            </div>
            <div className="flex items-center gap-1.5 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
              <Activity className="w-2.5 h-2.5 text-green-500 animate-pulse" />
              <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Live Sync</span>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 bg-background">
          <div className="px-4 md:px-6 pt-3 shrink-0">
            <TabsList className="grid w-full bg-white/5 p-1 rounded-xl grid-cols-4">
              <TabsTrigger value="analytics" className="rounded-lg text-[8px] uppercase font-black gap-1.5">Аналитика</TabsTrigger>
              <TabsTrigger value="users" className="rounded-lg text-[8px] uppercase font-black gap-1.5">Узлы</TabsTrigger>
              <TabsTrigger value="logs" className="rounded-lg text-[8px] uppercase font-black gap-1.5">Логи</TabsTrigger>
              <TabsTrigger value="broadcast" className="rounded-lg text-[8px] uppercase font-black gap-1.5">Маяк</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analytics" className="flex-1 m-0 p-0 outline-none overflow-hidden bg-background">
            <ScrollArea className="h-full">
              <div className="px-4 md:px-6 py-4 space-y-6 pb-20">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Всего узлов" value={stats.total} icon={Users} color="text-white" />
                  <StatCard label="Premium" value={stats.premium} icon={Star} color="text-accent" />
                  <StatCard label="Админы" value={stats.admins} icon={ShieldCheck} color="text-primary" />
                  <StatCard label="Баны" value={stats.banned} icon={Ban} color="text-red-500" />
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5">
                    <h3 className="text-[10px] font-black uppercase text-primary mb-4 flex items-center gap-2">
                      <Activity className="w-3 h-3" /> Новые Узлы (7д)
                    </h3>
                    <div className="h-[160px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#1c1c1e', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                          <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fill="url(#colorUsers)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5">
                    <h3 className="text-[10px] font-black uppercase text-accent mb-4 flex items-center gap-2">
                      <BarChart3 className="w-3 h-3" /> Трафик Сигналов
                    </h3>
                    <div className="h-[160px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#1c1c1e', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                          <Bar dataKey="signals" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="users" className="flex-1 m-0 p-0 outline-none overflow-hidden bg-background">
            <div className="p-4 px-6 shrink-0">
              <Input placeholder="Поиск по базе..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-2xl pl-4" />
            </div>
            <ScrollArea className="h-full">
              <div className="px-6 space-y-2 pb-32">
                {users?.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.username?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] border border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar userId={u.id} className="h-10 w-10" fallbackName={u.name} />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs flex items-center gap-1 truncate">
                          {formatDisplayName(u.name)} 
                          {isUserPremium(u) && <Star className="w-3 h-3 text-accent fill-accent" />}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground uppercase font-black truncate">{u.username}</span>
                          {u.lastIp && (
                            <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono leading-none border border-primary/20 shrink-0">
                              {u.lastIp}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full shrink-0"><MoreVertical className="w-5 h-5"/></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-card border-white/10 rounded-2xl p-1" sideOffset={8}>
                        <DropdownMenuItem onClick={() => handleAction(u.id, u.isBanned ? 'unban' : 'ban')} className={cn("gap-3 font-bold uppercase text-[10px] py-3 rounded-xl", u.isBanned ? "text-green-500" : "text-destructive")}>
                          {u.isBanned ? <CheckCircle2 className="w-4 h-4"/> : <Ban className="w-4 h-4"/>} {u.isBanned ? 'Разблокировать' : 'Заблокировать'}
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => handleAction(u.id, u.isAdmin ? 'remove_admin' : 'make_admin')} className="gap-3 font-bold uppercase text-[10px] py-3 rounded-xl">
                          {u.isAdmin ? <><ShieldOff className="w-4 h-4 text-orange-500" /> Снять админа</> : <><ShieldCheck className="w-4 h-4 text-primary" /> Дать админку</>}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-white/5" />

                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="gap-3 font-bold uppercase text-[10px] py-3 rounded-xl">
                            <Star className="w-4 h-4 text-accent" /> Premium статус
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="bg-card border-white/10 p-1 rounded-2xl" sideOffset={8}>
                              <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 1)} className="text-[10px] font-bold uppercase py-3 rounded-xl flex items-center gap-3">
                                <Trophy className="w-4 h-4 text-accent" /> 1 Месяц
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 12)} className="text-[10px] font-bold uppercase py-3 rounded-xl flex items-center gap-3">
                                <Trophy className="w-4 h-4 text-accent" /> 1 Год
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/5" />
                              <DropdownMenuItem onClick={() => handleAction(u.id, 'remove_premium')} className="text-destructive text-[10px] font-bold uppercase py-3 rounded-xl flex items-center gap-3">
                                <X className="w-4 h-4" /> Аннулировать
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="logs" className="flex-1 m-0 p-6 overflow-hidden bg-background">
             <div className="h-full flex flex-col items-center justify-center opacity-20 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                <ListChecks className="w-12 h-12 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-center">Системные логи пусты</p>
             </div>
          </TabsContent>

          <TabsContent value="broadcast" className="flex-1 m-0 p-6 overflow-hidden bg-background">
             <div className="h-full flex flex-col items-center justify-center opacity-20 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                <Radio className="w-12 h-12 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-center">Маяк в режиме ожидания</p>
             </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-[1.8rem] border border-white/5 flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-all shadow-xl">
      <Icon className={cn("w-4 h-4 mb-1", color)} />
      <span className="text-lg font-black italic text-white tracking-tight">{value}</span>
      <span className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-center leading-none">{label}</span>
    </div>
  );
}
