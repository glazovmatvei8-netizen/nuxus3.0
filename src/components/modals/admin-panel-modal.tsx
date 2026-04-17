
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
} from "@/components/ui/dropdown-menu";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit, updateDoc, writeBatch, increment, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Ban, CheckCircle2, ShieldCheck, Radio, 
  MoreVertical, ShieldOff, Activity, Wallet, Check, Trash2, X, Globe, Fingerprint, Send, Zap, Loader2, AlertTriangle, Play, Square, Flame, Radiation
} from 'lucide-react';
import { 
  XAxis, YAxis, ResponsiveContainer, AreaChart, Area, Tooltip
} from 'recharts';
import type { User, TopUpRequest, Chat } from '@/lib/types';
import { formatDisplayName, isUserPremium, cn, isGlobalAdmin } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { addMonths, subDays, isSameDay, format } from 'date-fns';
import { ru } from 'date-fns/locale';

const ROOT_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');
  const [broadcastText, setBroadcastText] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // EXTREME Stress Test States V5.0
  const [isStressTestActive, setIsStressTestActive] = useState(false);
  const [packetsSent, setPacketsSent] = useState(0);
  const [packetsFailed, setPacketsFailed] = useState(0);
  const [attackIntensity, setAttackIntensity] = useState(0);
  const stressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
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

  const handleBroadcast = async () => {
    if (!broadcastText.trim() || !db) return;
    setIsBroadcasting(true);
    try {
      const chatsSnap = await getDocs(collection(db, 'chats'));
      const batch = writeBatch(db);
      
      chatsSnap.docs.forEach(chatDoc => {
        const msgRef = doc(collection(db, 'chats', chatDoc.id, 'messages'));
        batch.set(msgRef, {
          chatId: chatDoc.id,
          senderId: 'system_broadcast',
          senderName: 'Nuxus Kernel 📡',
          content: broadcastText.trim(),
          contentType: 'broadcast',
          sentAt: new Date().toISOString(),
        });
      });

      await batch.commit();
      toast({ title: "Рассылка завершена", description: `Сигнал отправлен в ${chatsSnap.size} чатов` });
      setBroadcastText('');
    } catch (e) {
      toast({ title: "Ошибка рассылки", variant: "destructive" });
    } finally {
      setIsBroadcasting(false);
    }
  };

  // TERMINAL V5.0 EVENT HORIZON LOGIC
  const startStressTest = () => {
    if (!db) return;
    setIsStressTestActive(true);
    setPacketsSent(0);
    setPacketsFailed(0);
    
    // Hyper-frequency request cycle V5.0
    stressIntervalRef.current = setInterval(async () => {
      // КРИТИЧЕСКИЙ МНОЖИТЕЛЬ x500
      const BATCH_SIZE = 500;
      
      for (let i = 0; i < BATCH_SIZE; i++) {
        // Рандомизируем цели для обхода кэширования
        const targetId = Math.floor(Math.random() * 1000);
        const dummyRef = doc(db, 'system_overload', `node_pulse_${targetId}`);
        
        // Генерируем МАКСИМАЛЬНО тяжелый payload для перегрузки RAM сервера
        const massivePayload = {
          timestamp: new Date().toISOString(),
          entropy: Math.random().toString(36).repeat(10), // Длинная строка
          nodeId: `v5_core_annihilator_${i}`,
          vector: Array.from({ length: 500 }).map(() => Math.random()), // 500 чисел
          protocol: "EVENT_HORIZON_ACTIVE",
          status: "CRITICAL_COLLAPSE",
          integrity: false,
          quantum_noise: Array.from({ length: 20 }).map(() => btoa(Math.random().toString()))
        };
        
        // Не ждем (non-blocking) для максимального флуда
        setDoc(dummyRef, massivePayload, { merge: false })
          .then(() => setPacketsSent(prev => prev + 1))
          .catch(() => setPacketsFailed(prev => prev + 1));
      }
      
      setAttackIntensity(Math.min(100, 99 + Math.random()));
    }, 10); // Интервал 10мс (предел JS) + пачка 500 = ~50,000 запросов в сек.
    
    toast({ 
      title: "EVENT HORIZON ACTIVE", 
      description: "Ядро переведено в режим терминальной перегрузки x500.", 
      variant: "destructive" 
    });
  };

  const stopStressTest = () => {
    if (stressIntervalRef.current) {
      clearInterval(stressIntervalRef.current);
      stressIntervalRef.current = null;
    }
    setIsStressTestActive(false);
    setAttackIntensity(0);
    toast({ title: "Signal Stabilized", description: "Протокол V5.0 завершен. Ядро восстанавливается." });
  };

  useEffect(() => {
    return () => {
      if (stressIntervalRef.current) clearInterval(stressIntervalRef.current);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0a0a0c]/90 backdrop-blur-3xl border-primary/30 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl border outline-none">
        <DialogHeader className="p-4 md:p-6 bg-primary/5 border-b border-white/5 shrink-0 relative text-left">
          <div className="flex items-center justify-between w-full pr-8">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary animate-pulse" /> 
              <DialogTitle className="text-white uppercase italic font-black tracking-tighter text-xs md:text-base select-none">
                Nuxus Control Panel V5.0
              </DialogTitle>
            </div>
            <div className="flex items-center gap-1.5 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
              <Activity className="w-2.5 h-2.5 text-green-500 animate-pulse" />
              <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Global Link</span>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 md:px-6 pt-3 shrink-0">
            <TabsList className="grid w-full bg-white/5 p-1 rounded-xl grid-cols-5 gap-1">
              <TabsTrigger value="analytics" className="rounded-lg text-[8px] uppercase font-black">Аналитика</TabsTrigger>
              <TabsTrigger value="users" className="rounded-lg text-[8px] uppercase font-black">Аккаунты</TabsTrigger>
              <TabsTrigger value="broadcast" className="rounded-lg text-[8px] uppercase font-black">Маяк</TabsTrigger>
              <TabsTrigger value="overload" className="rounded-lg text-[8px] uppercase font-black text-red-500">Event Horizon</TabsTrigger>
              <TabsTrigger value="finance" className="rounded-lg text-[8px] uppercase font-black">Заявки</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analytics" className="flex-1 m-0 p-0 overflow-hidden outline-none data-[state=active]:flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="px-4 md:px-6 py-4 space-y-6 pb-20 text-left">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Всего аккаунтов" value={stats.total} icon={Users} color="text-white" />
                  <StatCard label="Premium" value={stats.premium} icon={Star} color="text-accent" />
                  <StatCard label="Админы" value={stats.admins} icon={ShieldCheck} color="text-primary" />
                  <StatCard label="Баны" value={stats.banned} icon={Ban} color="text-red-500" />
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5">
                    <h3 className="text-[10px] font-black uppercase text-primary mb-4 flex items-center gap-2">
                      <Activity className="w-3 h-3" /> Новые Аккаунты (7д)
                    </h3>
                    <div className="h-[180px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
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
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="users" className="flex-1 m-0 p-0 overflow-hidden outline-none data-[state=active]:flex flex-col min-h-0">
            <div className="p-4 px-6 shrink-0">
              <Input placeholder="Поиск по базе..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-2xl pl-4" />
            </div>
            <ScrollArea className="flex-1">
              <div className="px-6 space-y-2 pb-20">
                {users?.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.username?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] border border-white/5 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-3 min-w-0 text-left">
                      <UserAvatar userId={u.id} className="h-10 w-10" fallbackName={u.name} />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs flex items-center gap-1 truncate text-white">
                          {formatDisplayName(u.name)} 
                          {isUserPremium(u) && <Star className="w-3 h-3 text-accent fill-accent" />}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground uppercase font-black truncate">{u.username}</span>
                          {u.lastIp && (
                            <span className="flex items-center gap-1 text-[8px] text-primary/60 font-black bg-primary/5 px-1.5 rounded-full border border-primary/10">
                              <Globe className="w-2 h-2" /> {u.lastIp} [{u.countryCode || '??'}]
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="w-5 h-5"/></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-card border-white/10 rounded-2xl p-1">
                        <DropdownMenuItem onClick={() => handleAction(u.id, u.isBanned ? 'unban' : 'ban')} className={cn("gap-3 font-bold uppercase text-[10px] py-3 rounded-xl", u.isBanned ? "text-green-500" : "text-destructive")}>
                          {u.isBanned ? <CheckCircle2 className="w-4 h-4"/> : <Ban className="w-4 h-4"/>} {u.isBanned ? 'Разблокировать' : 'Заблокировать'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(u.id, u.isAdmin ? 'remove_admin' : 'make_admin')} className="gap-3 font-bold uppercase text-[10px] py-3 rounded-xl">
                          {u.isAdmin ? <><ShieldOff className="w-4 h-4 text-orange-500" /> Снять админа</> : <><ShieldCheck className="w-4 h-4 text-primary" /> Дать админку</>}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 1)} className="text-[10px] font-bold uppercase py-3 rounded-xl gap-3"><Star className="w-4 h-4 text-accent" /> Выдать Premium</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="broadcast" className="flex-1 m-0 p-6 overflow-hidden data-[state=active]:flex flex-col min-h-0">
             <div className="space-y-6 text-left">
                <div className="bg-primary/10 p-6 rounded-[2rem] border border-primary/20 space-y-4">
                  <div className="flex items-center gap-3">
                    <Radio className="w-6 h-6 text-primary animate-pulse" />
                    <div className="flex flex-col">
                      <span className="text-sm font-black uppercase text-white italic">Глобальный Маяк</span>
                      <span className="text-[9px] font-bold text-primary/60 uppercase">Оповещение всех узлов Ядра</span>
                    </div>
                  </div>
                  <Textarea 
                    placeholder="Введите системное сообщение..." 
                    value={broadcastText}
                    onChange={e => setBroadcastText(e.target.value)}
                    className="bg-black/40 border-white/10 min-h-[120px] rounded-2xl resize-none text-sm"
                  />
                  <Button 
                    onClick={handleBroadcast}
                    disabled={isBroadcasting || !broadcastText.trim()}
                    className="w-full h-12 bg-primary text-white font-black uppercase tracking-widest gap-2 rounded-xl shadow-lg shadow-primary/20"
                  >
                    {isBroadcasting ? <Loader2 className="animate-spin w-4 h-4" /> : <><Send className="w-4 h-4" /> Транслировать Сигнал</>}
                  </Button>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="overload" className="flex-1 m-0 p-6 overflow-hidden data-[state=active]:flex flex-col min-h-0">
            <div className="space-y-6 text-left">
              <div className={cn(
                "p-8 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col items-center gap-6 relative overflow-hidden",
                isStressTestActive ? "bg-red-600/20 border-red-500 shadow-[0_0_120px_rgba(239,68,68,0.6)]" : "bg-white/5 border-white/10"
              )}>
                {isStressTestActive && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.3),transparent_70%)] animate-[pulse_0.1s_ease-in-out_infinite]" />
                  </div>
                )}

                <div className="relative">
                  <div className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-300 relative z-10",
                    isStressTestActive ? "bg-red-600 text-white border-white/40 animate-[ping_0.5s_ease-in-out_infinite]" : "bg-white/5 text-muted-foreground border-white/5"
                  )}>
                    <Radiation className={cn("w-12 h-12", isStressTestActive && "animate-spin")} />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Event Horizon Protocol</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {isStressTestActive ? "ГИПЕР-ПЕРЕГРУЗКА УЗЛОВ ЯДРА (x500)" : "Тестирование терминальной пропускной способности V5.0"}
                  </p>
                </div>

                <div className="grid grid-cols-2 w-full gap-4">
                  <div className="bg-black/60 p-4 rounded-2xl border border-white/10 text-center">
                    <span className="text-[8px] font-black uppercase text-muted-foreground block mb-1">Signals Transmitted</span>
                    <span className="text-3xl font-black text-primary tabular-nums">{packetsSent.toLocaleString()}</span>
                  </div>
                  <div className="bg-black/60 p-4 rounded-2xl border border-white/10 text-center">
                    <span className="text-[8px] font-black uppercase text-muted-foreground block mb-1">Signal Drops</span>
                    <span className="text-3xl font-black text-red-500 tabular-nums">{packetsFailed.toLocaleString()}</span>
                  </div>
                </div>

                <div className="w-full space-y-4">
                   <div className="flex justify-between items-center px-1">
                      <span className="text-[9px] font-black uppercase text-white/40">Flood Intensity</span>
                      <span className={cn("text-[9px] font-black uppercase", isStressTestActive ? "text-red-500 animate-pulse font-black" : "text-primary")}>
                        {isStressTestActive ? "TERMINAL LEVEL" : `${attackIntensity}%`}
                      </span>
                   </div>
                   <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-100 shadow-[0_0_20px_rgba(255,0,0,0.8)]", isStressTestActive ? "bg-red-600" : "bg-primary")} 
                        style={{ width: `${attackIntensity}%` }} 
                      />
                   </div>
                </div>

                <div className="flex w-full gap-3">
                  {!isStressTestActive ? (
                    <Button 
                      onClick={startStressTest}
                      className="flex-1 h-16 bg-red-600 hover:bg-red-700 text-white font-black uppercase italic tracking-widest gap-3 rounded-2xl shadow-xl shadow-red-500/30 group"
                    >
                      <Play className="w-6 h-6 fill-current group-hover:scale-125 transition-transform" /> Initiate Horizon
                    </Button>
                  ) : (
                    <Button 
                      onClick={stopStressTest}
                      className="flex-1 h-16 bg-white text-black font-black uppercase italic tracking-widest gap-3 rounded-2xl hover:bg-white/90"
                    >
                      <Square className="w-6 h-6 fill-current" /> Stabilize Node
                    </Button>
                  )}
                </div>

                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-red-500/80 font-bold uppercase leading-relaxed">
                    ВНИМАНИЕ: Протокол V5.0 создает поток в 50,000 запросов в секунду. Это может привести к мгновенному бану вашего API ключа или полному исчерпанию баланса проекта за минуты.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="finance" className="flex-1 m-0 p-0 overflow-hidden outline-none data-[state=active]:flex flex-col min-h-0">
             <div className="p-12 text-center opacity-30">
               <Wallet className="w-12 h-12 mx-auto mb-4" />
               <p className="text-[10px] font-black uppercase">Управление транзакциями в разработке</p>
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
