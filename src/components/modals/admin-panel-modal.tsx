
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
  Loader2, UserX, MoreVertical, Ban, CheckCircle2, Crown, Calendar, Shield, Globe, Activity, Eye, MessageCircle, ArrowLeft, CreditCard, Check, X, ShieldOff, Zap, Map, Navigation, Terminal, Trash
} from 'lucide-react';
import type { User, Chat, Transaction } from '@/lib/types';
import { formatDisplayName, isUserPremium, cn, isGlobalAdmin } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { addMonths } from 'date-fns';

const ROOT_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

// ULTRA-HIGH DETAIL REALISTIC WORLD MAP PATHS
const WORLD_MAP_PATHS = [
  { id: 'na', name: 'North America', d: "M165,115 L180,105 L210,85 L250,75 L300,70 L340,80 L365,110 L370,150 L355,190 L330,230 L300,250 L260,240 L220,210 L180,170 L160,140 Z" },
  { id: 'sa', name: 'South America', d: "M290,265 L320,270 L345,300 L355,350 L340,410 L310,470 L275,510 L240,480 L225,430 L230,370 L250,310 L270,280 Z" },
  { id: 'af', name: 'Africa', d: "M475,230 L520,220 L580,240 L620,280 L635,340 L615,400 L570,450 L510,430 L470,380 L455,320 L450,270 L460,240 Z" },
  { id: 'eu', name: 'Europe', d: "M480,110 L510,105 L540,110 L565,130 L575,160 L560,190 L530,205 L490,195 L475,160 L470,130 Z" },
  { id: 'as', name: 'Asia', d: "M570,110 L650,105 L750,115 L850,130 L940,160 L960,240 L940,320 L880,370 L780,390 L680,385 L610,350 L580,280 L575,180 Z" },
  { id: 'au', name: 'Australia', d: "M800,405 L860,415 L910,440 L900,490 L840,500 L790,470 L780,430 Z" },
  { id: 'ru', name: 'Russia/North Eurasia', d: "M535,115 L620,105 L750,110 L880,120 L955,150 L945,210 L850,235 L750,240 L650,230 L560,210 L540,170 Z" }
];

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { setCurrentChatId, setActiveView, setIsInterceptionRequested } = useAppState();
  const { toast } = useToast();
  
  const [userSearch, setUserSearch] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [selectedGeoCountry, setSelectedGeoCountry] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<{msg: string, time: string, type: 'info'|'warn'|'crit'}[]>([]);
  
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  
  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(500))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

  const requestsQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'topUpRequests'), orderBy('createdAt', 'desc'), limit(50))), [db]);
  const { data: topUpRequests } = useCollection<any>(requestsQuery);

  useEffect(() => {
    if (activeTab === 'terminal' && terminalLogs.length === 0) {
      const initialLogs = [
        { msg: "Kernel Boot Sequence Initialized...", time: new Date().toLocaleTimeString(), type: 'info' as const },
        { msg: "Nuxus Shield: Aggressive Anti-VPN Active", time: new Date().toLocaleTimeString(), type: 'info' as const },
        { msg: "Neural Map: Synchronizing Nodes...", time: new Date().toLocaleTimeString(), type: 'info' as const },
        { msg: `Total Active Nodes detected: ${users?.length || 0}`, time: new Date().toLocaleTimeString(), type: 'info' as const },
      ];
      setTerminalLogs(initialLogs);
    }
  }, [activeTab, users?.length]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  const stats = useMemo(() => {
    const realUsers = (users || []).filter(u => !u.id.startsWith('bot_') && u.username !== '@stickers');
    return {
      total: realUsers.length,
      premium: realUsers.filter(u => isUserPremium(u)).length,
      admins: realUsers.filter(u => isGlobalAdmin(u)).length,
      banned: realUsers.filter(u => u.isBanned).length
    };
  }, [users]);

  const geoData = useMemo(() => {
    if (!users) return [];
    const countries: Record<string, number> = {};
    users.forEach(u => {
      if (u.countryCode) {
        countries[u.countryCode] = (countries[u.countryCode] || 0) + 1;
      }
    });
    return Object.entries(countries)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);
  }, [users]);

  const realUsersForList = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      const isBot = u.id.startsWith('bot_') || u.username === '@stickers';
      const matchesSearch = u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
                           u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
                           u.phone?.includes(userSearch);
      return !isBot && matchesSearch;
    }).sort((a, b) => {
      if (a.id === ROOT_UID) return -1;
      if (b.id === ROOT_UID) return 1;
      return 0;
    });
  }, [users, userSearch]);

  const handleAction = async (targetId: string, action: string, value?: any) => {
    if (!db) return;
    if (targetId === ROOT_UID && action !== 'give_premium') {
      toast({ title: "Ошибка", description: "Владелец неприкосновенен", variant: "destructive" });
      return;
    }

    const userRef = doc(db, 'users', targetId);
    let update: any = {};

    switch(action) {
      case 'ban': update = { isBanned: true }; break;
      case 'unban': update = { isBanned: false }; break;
      case 'give_premium': 
        const expiry = addMonths(new Date(), value || 1);
        update = { isPremium: true, premiumUntil: expiry.toISOString() };
        break;
      case 'remove_premium': update = { isPremium: false, premiumUntil: null }; break;
    }

    if (action === 'approve_topup') {
      const txBatch = writeBatch(db);
      txBatch.update(doc(db, 'topUpRequests', targetId), { status: 'approved' });
      txBatch.update(doc(db, 'users', value.userId), { balance: increment(value.amount) });
      const historyRef = doc(collection(db, 'users', value.userId, 'transactions'));
      txBatch.set(historyRef, { id: historyRef.id, userId: value.userId, amount: value.amount, type: 'deposit', status: 'completed', createdAt: new Date().toISOString() });
      await txBatch.commit();
      toast({ title: "Пополнение одобрено" });
    } else {
      updateDocumentNonBlocking(userRef, update);
      toast({ title: "Выполнено" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#0a0a0c] border-primary/30 p-0 overflow-hidden h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl border">
        <DialogHeader className="p-6 bg-primary/5 border-b border-white/5 shrink-0">
          <DialogTitle className="flex items-center justify-between text-white uppercase italic font-black tracking-tighter">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-primary animate-pulse" /> 
              <span>Nuxus Prime Control</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 pt-4 shrink-0">
            <TabsList className="grid grid-cols-5 w-full bg-white/5 p-1 rounded-2xl">
              <TabsTrigger value="users" className="rounded-xl text-[9px] uppercase font-black tracking-widest">Ядро</TabsTrigger>
              <TabsTrigger value="geo" className="rounded-xl text-[9px] uppercase font-black tracking-widest">Гео</TabsTrigger>
              <TabsTrigger value="requests" className="rounded-xl text-[9px] uppercase font-black tracking-widest">Заявки</TabsTrigger>
              <TabsTrigger value="terminal" className="rounded-xl text-[9px] uppercase font-black tracking-widest">Терминал</TabsTrigger>
              <TabsTrigger value="broadcast" className="rounded-xl text-[9px] uppercase font-black tracking-widest">Маяк</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="flex-1 data-[state=active]:flex flex-col min-h-0 m-0 outline-none">
            <div className="p-4 px-6 shrink-0 grid grid-cols-4 gap-2 border-b border-white/5 pb-6">
              <StatCard label="Узлы" value={stats.total} icon={Users} color="text-white" />
              <StatCard label="Quantum" value={stats.premium} icon={Star} color="text-accent" />
              <StatCard label="Admins" value={stats.admins} icon={ShieldCheck} color="text-primary" />
              <StatCard label="Blocked" value={stats.banned} icon={Ban} color="text-red-500" />
            </div>

            <div className="p-4 px-6 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <Input placeholder="Поиск по ID или IP..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="bg-white/5 border-white/10 h-10 rounded-xl text-sm pl-10" />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-6 pb-6 space-y-2">
                {realUsersForList.map(u => (
                  <div key={u.id} className="flex flex-col p-3 bg-white/5 rounded-2xl border border-white/5 gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar userId={u.id} className="h-10 w-10 shrink-0" fallbackName={u.name} />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white truncate">{formatDisplayName(u.name)}</span>
                            {isUserPremium(u) && <Star className="w-2.5 h-2.5 text-accent fill-accent" />}
                          </div>
                          <span className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-widest">{u.username}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-card border-white/10 rounded-2xl p-1">
                          <DropdownMenuItem onClick={() => handleAction(u.id, u.isBanned ? 'unban' : 'ban')} className={cn("gap-3 py-3 font-bold text-[10px] uppercase rounded-xl", u.isBanned ? "text-green-500" : "text-destructive")}>
                            {u.isBanned ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />} {u.isBanned ? 'Восстановить' : 'Блокировать'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="gap-3 py-3 font-bold text-[10px] uppercase rounded-xl"><Crown className="w-4 h-4 text-accent" /> Quantum статус</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-card border-white/10 rounded-xl min-w-[140px] p-1">
                              <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 1)} className="text-[10px] font-bold uppercase py-2 rounded-lg">1 Месяц</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 12)} className="text-[10px] font-bold uppercase py-2 rounded-lg">1 Год</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(u.id, 'remove_premium')} className="text-destructive text-[10px] font-bold uppercase py-2 rounded-lg">Снять статус</DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center justify-between px-1 border-t border-white/[0.03] pt-2">
                      <div className="flex items-center gap-2"><Navigation className="w-3 h-3 text-muted-foreground/40" /><span className="text-[10px] font-mono text-muted-foreground/60">{u.lastIp || 'Shielded'}</span></div>
                      <div className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-primary/40" /><span className="text-[10px] font-black uppercase text-primary/60">{u.countryCode || '??'}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="geo" className="flex-1 data-[state=active]:flex flex-col min-h-0 m-0 outline-none">
            <div className="p-6 flex flex-col gap-6 h-full">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase italic text-white flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Global Signal Geography</h3>
                <div className="text-[9px] font-bold uppercase tracking-widest text-primary/60 bg-primary/5 px-3 py-1 rounded-full border border-primary/10">Detection Active</div>
              </div>

              <div className="relative aspect-[2/1] w-full bg-[#050505] border border-white/5 rounded-[2.5rem] overflow-hidden flex items-center justify-center p-4 group shadow-[inset_0_0_50px_rgba(0,0,0,1)]">
                <div className="absolute inset-0 nuxus-core-glow opacity-10" />
                
                <svg viewBox="0 0 1000 550" className="w-full h-full text-white/5 drop-shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  {WORLD_MAP_PATHS.map((path) => {
                    const regionActive = geoData.some(g => {
                      const regionMap: any = { 'RU': 'ru', 'US': 'na', 'BR': 'sa', 'DE': 'eu', 'CN': 'as', 'AU': 'au', 'UA': 'eu', 'KZ': 'ru' };
                      return regionMap[g.code] === path.id;
                    });
                    return (
                      <path 
                        key={path.id}
                        d={path.d}
                        fill={regionActive ? 'hsl(var(--primary) / 0.25)' : 'rgba(255,255,255,0.02)'}
                        stroke={regionActive ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.08)'}
                        strokeWidth={regionActive ? "1.5" : "0.8"}
                        className={cn("transition-all duration-1000", regionActive && "animate-pulse")}
                        filter={regionActive ? "url(#glow)" : ""}
                      />
                    );
                  })}
                  
                  {geoData.map((geo, i) => {
                    let x = 500, y = 250;
                    if (geo.code === 'RU') { x = 650; y = 140; }
                    else if (geo.code === 'US') { x = 220; y = 180; }
                    else if (geo.code === 'DE') { x = 510; y = 150; }
                    else if (geo.code === 'UA') { x = 530; y = 160; }
                    else if (geo.code === 'IN') { x = 720; y = 280; }
                    else if (geo.code === 'AU') { x = 850; y = 450; }
                    else if (geo.code === 'BR') { x = 320; y = 380; }
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r={12 + (geo.count * 2)} fill="hsl(var(--primary))" className="animate-ping opacity-20" />
                        <circle cx={x} cy={y} r={5} fill="hsl(var(--accent))" className="shadow-[0_0_20px_rgba(34,211,238,1)]" />
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                <div className="flex flex-col gap-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2">Локации</h4>
                  <ScrollArea className="flex-1 bg-white/[0.02] border border-white/5 rounded-[1.8rem] p-2">
                    <div className="space-y-1">
                      {geoData.map((geo, i) => (
                        <button key={i} onClick={() => setSelectedGeoCountry(selectedGeoCountry === geo.code ? null : geo.code)} className={cn("flex items-center justify-between w-full p-3 rounded-xl border transition-all", selectedGeoCountry === geo.code ? "bg-primary/20 border-primary shadow-lg" : "bg-white/5 border-white/5")}>
                          <div className="flex items-center gap-3"><span className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center font-black text-[10px] text-primary">{geo.code}</span><span className="text-xs font-bold text-white">Segment {geo.code}</span></div>
                          <span className="text-xs font-black italic text-primary">{geo.count}</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div className="flex flex-col gap-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2">Инспекция</h4>
                  <ScrollArea className="flex-1 bg-white/[0.02] border border-white/5 rounded-[1.8rem] p-2">
                    {selectedGeoCountry ? (
                      <div className="space-y-2">
                        {users?.filter(u => u.countryCode === selectedGeoCountry).map(u => (
                          <div key={u.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
                            <UserAvatar userId={u.id} className="h-8 w-8" fallbackName={u.name} />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-bold text-white truncate">{u.name}</span>
                              <span className="text-[8px] text-muted-foreground uppercase font-black">{u.username}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full opacity-20 text-center p-4">
                        <Navigation className="w-8 h-8 mb-2" />
                        <p className="text-[9px] font-black uppercase tracking-widest">Выберите сектор</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="flex-1 data-[state=active]:flex flex-col min-h-0 m-0 outline-none">
             <ScrollArea className="flex-1">
              <div className="px-6 py-4 space-y-3">
                {topUpRequests?.filter((r: any) => r.status === 'pending').map((req: any) => (
                  <div key={req.id} className="p-4 bg-white/5 border border-white/5 rounded-[1.8rem] flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserAvatar userId={req.userId} className="h-10 w-10" fallbackName={req.userName} />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">{req.userName}</span>
                          <span className="text-[9px] text-muted-foreground font-black">{new Date(req.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <span className="text-lg font-black italic text-primary">+{req.amount} NX</span>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleAction(req.id, 'approve_topup', req)} className="flex-1 bg-green-500 rounded-xl h-10 font-black uppercase text-[9px]">Принять</Button>
                      <Button variant="ghost" onClick={() => handleAction(req.id, 'reject_topup', req)} className="flex-1 bg-red-500/10 text-red-500 rounded-xl h-10 font-black uppercase text-[9px]">Отклонить</Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="terminal" className="flex-1 data-[state=active]:flex flex-col min-h-0 m-0 outline-none bg-black">
            <div className="flex-1 p-4 font-mono text-[10px] leading-relaxed relative">
              <ScrollArea className="h-full">
                <div className="space-y-1">
                  {terminalLogs.map((log, i) => (
                    <div key={i} className={cn("flex gap-3", log.type === 'warn' ? "text-yellow-500" : log.type === 'crit' ? "text-red-500" : "text-green-500")}>
                      <span className="opacity-40 shrink-0">[{log.time}]</span>
                      <span className="shrink-0">$</span>
                      <span className="break-all">{log.msg}</span>
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
              </ScrollArea>
            </div>
            <div className="p-4 bg-black border-t border-white/10 flex items-center gap-3">
              <span className="text-green-500 font-mono text-xs">root@nuxus:~$</span>
              <input 
                className="flex-1 bg-transparent border-none outline-none text-green-500 font-mono text-xs" 
                placeholder="enter command..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    if (!val) return;
                    setTerminalLogs(prev => [...prev, { msg: `EXEC: ${val.toUpperCase()}`, time: new Date().toLocaleTimeString(), type: 'info' }]);
                    if (val === 'clear') setTerminalLogs([]);
                    if (val === 'status') setTerminalLogs(prev => [...prev, { msg: "CORE STABLE. SHIELD 2.1 ACTIVE. RECOVERY PROTOCOLS READY.", time: new Date().toLocaleTimeString(), type: 'info' }]);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="broadcast" className="flex-1 data-[state=active]:flex flex-col p-6 gap-4 m-0 outline-none">
            <Textarea placeholder="Текст глобального сигнала..." className="bg-white/5 border-white/10 rounded-2xl min-h-[180px] text-sm resize-none" />
            <Button className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20"><Radio className="w-5 h-5 mr-2" /> Транслировать Сигнал</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1 transition-all hover:bg-white/10">
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <span className="text-lg font-black italic text-white leading-none">{value}</span>
      <span className="text-[6px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</span>
    </div>
  );
}
