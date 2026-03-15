
"use client"

import React, { useState, useMemo } from 'react';
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
  Loader2, UserX, MoreVertical, Ban, CheckCircle2, Crown, Calendar, Shield, Globe, Activity, Eye, MessageCircle, ArrowLeft, CreditCard, Check, X, ShieldOff, Zap, Map, Navigation
} from 'lucide-react';
import type { User, Chat, Transaction } from '@/lib/types';
import { formatDisplayName, isUserPremium, cn, isGlobalAdmin } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { addMonths } from 'date-fns';

const ROOT_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

// HIGH-DETAIL REALISTIC WORLD MAP PATHS (CONTINENTS SILHOUETTES)
const WORLD_MAP_PATHS = [
  { id: 'na', name: 'North America', d: "M150,80 L180,60 L240,55 L280,70 L310,110 L320,160 L290,200 L250,215 L210,200 L170,160 L140,120 Z" },
  { id: 'sa', name: 'South America', d: "M265,235 L310,245 L325,295 L315,365 L295,435 L260,475 L225,435 L215,365 L235,295 L250,245 Z" },
  { id: 'af', name: 'Africa', d: "M460,205 L520,195 L580,225 L615,285 L595,365 L545,415 L485,385 L455,305 L445,245 Z" },
  { id: 'eu', name: 'Europe', d: "M465,100 L505,95 L545,105 L565,135 L555,165 L525,180 L485,175 L470,145 Z" },
  { id: 'as', name: 'Asia', d: "M565,105 L655,95 L805,110 L925,145 L945,245 L885,335 L755,355 L635,335 L585,255 L570,175 Z" },
  { id: 'au', name: 'Australia', d: "M785,365 L855,375 L895,415 L865,465 L805,455 L775,405 Z" },
  { id: 'ru', name: 'Russia/Eurasia Upper', d: "M525,105 L655,95 L855,105 L935,145 L915,195 L765,215 L615,210 L535,185 L525,125 Z" }
];

const COUNTRY_TO_REGION: Record<string, string> = {
  'RU': 'ru', 'US': 'na', 'CA': 'na', 'BR': 'sa', 'DE': 'eu', 'FR': 'eu', 'GB': 'eu',
  'CN': 'as', 'IN': 'as', 'KZ': 'as', 'UA': 'eu', 'BY': 'eu', 'AU': 'au', 'EG': 'af', 'ZA': 'af'
};

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { setCurrentChatId, setActiveView, setIsInterceptionRequested } = useAppState();
  const { toast } = useToast();
  
  const [userSearch, setUserSearch] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [selectedGeoCountry, setSelectedGeoCountry] = useState<string | null>(null);
  
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  
  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(500))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

  const chatsQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'chats'), limit(1000))), [db]);
  const { data: allChats } = useCollection<Chat>(chatsQuery);

  const requestsQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'topUpRequests'), orderBy('createdAt', 'desc'), limit(50))), [db]);
  const { data: topUpRequests } = useCollection<any>(requestsQuery);

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
      const isMe = u.id === currentUser?.uid;
      const isBot = u.id.startsWith('bot_') || u.username === '@stickers';
      const matchesSearch = u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
                           u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
                           u.phone?.includes(userSearch);
      return !isMe && !isBot && matchesSearch;
    }).sort((a, b) => {
      if (a.id === ROOT_UID) return -1;
      if (b.id === ROOT_UID) return 1;
      return 0;
    });
  }, [users, currentUser?.uid, userSearch]);

  const usersInSelectedCountry = useMemo(() => {
    if (!selectedGeoCountry || !users) return [];
    return users.filter(u => u.countryCode === selectedGeoCountry);
  }, [selectedGeoCountry, users]);

  const handleAction = async (targetId: string, action: string, value?: any) => {
    if (!db) return;
    if (targetId === ROOT_UID) {
      toast({ title: "Ошибка", description: "Запрещено изменять параметры Владельца", variant: "destructive" });
      return;
    }

    const userRef = doc(db, 'users', targetId);
    let update: any = {};

    switch(action) {
      case 'ban': update = { isBanned: true }; toast({ title: "Узел заблокирован" }); break;
      case 'unban': update = { isBanned: false }; toast({ title: "Доступ восстановлен" }); break;
      case 'set_admin': update = { isAdmin: true }; toast({ title: "Права админа выданы" }); break;
      case 'remove_admin': update = { isAdmin: false }; toast({ title: "Админ разжалован" }); break;
      case 'give_premium': 
        const expiry = addMonths(new Date(), value || 1);
        update = { isPremium: true, premiumUntil: expiry.toISOString() };
        toast({ title: `Premium выдан на ${value} мес.` });
        break;
      case 'remove_premium': update = { isPremium: false, premiumUntil: null }; toast({ title: "Premium статус снят" }); break;
      case 'approve_topup':
        const txBatch = writeBatch(db);
        txBatch.update(doc(db, 'topUpRequests', targetId), { status: 'approved' });
        txBatch.update(doc(db, 'users', value.userId), { balance: increment(value.amount) });
        const historyRef = doc(collection(db, 'users', value.userId, 'transactions'));
        txBatch.set(historyRef, { id: historyRef.id, userId: value.userId, amount: value.amount, type: 'deposit', status: 'completed', createdAt: new Date().toISOString() });
        await txBatch.commit();
        toast({ title: "Пополнение подтверждено" });
        break;
      case 'reject_topup':
        updateDocumentNonBlocking(doc(db, 'topUpRequests', targetId), { status: 'rejected' });
        toast({ title: "Заявка отклонена" });
        break;
    }

    if (!['approve_topup', 'reject_topup'].includes(action)) {
      updateDocumentNonBlocking(userRef, update);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if(!o) setInspectingUser(null); }}>
      <DialogContent className="max-w-2xl bg-[#0a0a0c] border-primary/30 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-[0_0_50px_rgba(139,92,246,0.3)] border">
        <DialogHeader className="p-6 bg-primary/5 border-b border-white/5 shrink-0">
          <DialogTitle className="flex items-center justify-between text-white uppercase italic font-black tracking-tighter">
            <div className="flex items-center gap-3">
              {inspectingUser ? (
                <button onClick={() => setInspectingUser(null)} className="flex items-center gap-2 hover:text-primary transition-colors text-left">
                  <ArrowLeft className="w-5 h-5 shrink-0" />
                  <span className="truncate max-w-[150px]">Узел: {inspectingUser.name}</span>
                </button>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5 text-primary animate-pulse" /> 
                  <span>Nuxus Kernel Admin</span>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {!inspectingUser ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-6 pt-4 shrink-0">
              <TabsList className="grid grid-cols-4 w-full bg-white/5 p-1 rounded-2xl">
                <TabsTrigger value="users" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-1">Ядро</TabsTrigger>
                <TabsTrigger value="geo" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-1">География</TabsTrigger>
                <TabsTrigger value="requests" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-1">Заявки</TabsTrigger>
                <TabsTrigger value="broadcast" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-1">Маяк</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="users" className="flex-1 data-[state=active]:flex flex-col min-h-0 m-0 overflow-hidden outline-none">
              <div className="px-6 pt-4 pb-2 shrink-0">
                <div className="grid grid-cols-4 gap-2">
                  <StatCard label="Nodes" value={stats.total} icon={Users} color="text-white" />
                  <StatCard label="Premium" value={stats.premium} icon={Star} color="text-accent" />
                  <StatCard label="Admins" value={stats.admins} icon={ShieldCheck} color="text-primary" />
                  <StatCard label="Blocked" value={stats.banned} icon={Ban} color="text-red-500" />
                </div>
              </div>

              <div className="p-4 px-6 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input placeholder="Поиск по узлам..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="bg-white/5 border-white/10 h-10 rounded-xl text-sm pl-10" />
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
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setInspectingUser(u)} className="h-8 rounded-xl bg-primary/10 text-primary font-black uppercase text-[8px] tracking-widest px-3">Инфо</Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-card border-white/10 rounded-2xl p-1">
                              <DropdownMenuItem onClick={() => handleAction(u.id, u.isBanned ? 'unban' : 'ban')} className={cn("gap-3 py-3 font-bold text-[10px] uppercase rounded-xl", u.isBanned ? "text-green-500" : "text-destructive")}>
                                {u.isBanned ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />} {u.isBanned ? 'Разблокировать' : 'Заблокировать'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/5" />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="gap-3 py-3 font-bold text-[10px] uppercase rounded-xl"><Crown className="w-4 h-4 text-accent" /> Premium статус</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent sideOffset={8} className="bg-card border-white/10 rounded-xl min-w-[140px] p-1">
                                  <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 1)} className="text-[10px] font-bold uppercase py-2.5 rounded-lg">1 Месяц</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 3)} className="text-[10px] font-bold uppercase py-2.5 rounded-lg">3 Месяца</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 12)} className="text-[10px] font-bold uppercase py-2.5 rounded-lg">1 Год</DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-white/5" />
                                  <DropdownMenuItem onClick={() => handleAction(u.id, 'remove_premium')} className="text-destructive text-[10px] font-bold uppercase py-2.5 rounded-lg">Снять Premium</DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuItem onClick={() => handleAction(u.id, u.isAdmin ? 'remove_admin' : 'set_admin')} className="gap-3 py-3 font-bold text-[10px] uppercase rounded-xl">
                                <ShieldCheck className="w-4 h-4 text-primary" /> {u.isAdmin ? 'Снять Админку' : 'Назначить Админом'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-1 border-t border-white/[0.03] pt-2">
                        <div className="flex items-center gap-2"><Navigation className="w-3 h-3 text-muted-foreground/40" /><span className="text-[10px] font-mono text-muted-foreground/60">{u.lastIp || 'No Signal'}</span></div>
                        <div className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-primary/40" /><span className="text-[10px] font-black uppercase text-primary/60">{u.countryCode || '??'}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="geo" className="flex-1 data-[state=active]:flex flex-col min-h-0 m-0 overflow-hidden outline-none">
              <div className="p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase italic text-white flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Глобальное присутствие Ядра</h3>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-primary/60 bg-primary/5 px-3 py-1 rounded-full border border-primary/10">Signal Active</div>
                </div>

                <div className="relative aspect-[2/1] w-full bg-[#050505] border border-white/5 rounded-[2.5rem] overflow-hidden flex items-center justify-center p-4 group">
                  <div className="absolute inset-0 nuxus-core-glow opacity-10 group-hover:opacity-20 transition-opacity" />
                  
                  <svg viewBox="0 0 1000 500" className="w-full h-full text-white/5 drop-shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                    {WORLD_MAP_PATHS.map((path) => {
                      const regionActive = geoData.some(g => COUNTRY_TO_REGION[g.code] === path.id);
                      return (
                        <path 
                          key={path.id}
                          d={path.d}
                          fill={regionActive ? 'hsl(var(--primary) / 0.2)' : 'rgba(255,255,255,0.03)'}
                          stroke={regionActive ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.1)'}
                          strokeWidth="1"
                          className={cn("transition-all duration-700", regionActive && "animate-pulse")}
                        />
                      );
                    })}
                    
                    {/* Active Node Markers */}
                    {geoData.map((geo, i) => {
                      let x = 500, y = 250;
                      if (geo.code === 'RU') { x = 650; y = 110; }
                      else if (geo.code === 'US') { x = 230; y = 140; }
                      else if (geo.code === 'DE') { x = 510; y = 110; }
                      else if (geo.code === 'IN') { x = 720; y = 220; }
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r={8 + (geo.count * 2)} fill="hsl(var(--primary))" className="animate-ping opacity-30" style={{ animationDuration: '4s' }} />
                          <circle cx={x} cy={y} r={3} fill="hsl(var(--accent))" className="shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2">Локации Сигнала</h4>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {geoData.map((geo, i) => (
                          <button key={i} onClick={() => setSelectedGeoCountry(selectedGeoCountry === geo.code ? null : geo.code)} className={cn("flex items-center justify-between w-full p-3 rounded-xl border transition-all", selectedGeoCountry === geo.code ? "bg-primary/20 border-primary shadow-lg" : "bg-white/5 border-white/5")}>
                            <div className="flex items-center gap-3"><div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center font-black text-[10px] text-primary">{geo.code}</div><span className="text-xs font-bold text-white">Узлы: {geo.code}</span></div>
                            <span className="text-xs font-black italic text-primary">{geo.count}</span>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  <div className="flex flex-col gap-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2">{selectedGeoCountry ? `Узлы: ${selectedGeoCountry}` : 'Территория'}</h4>
                    <ScrollArea className="h-[200px] bg-white/[0.02] border border-white/5 rounded-[1.8rem] p-2">
                      {selectedGeoCountry ? (
                        <div className="space-y-2">{usersInSelectedCountry.map(u => (<div key={u.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl"><UserAvatar userId={u.id} className="h-8 w-8" fallbackName={u.name} /><div className="flex flex-col min-w-0"><span className="text-[11px] font-bold text-white truncate">{u.name}</span><span className="text-[8px] text-muted-foreground uppercase font-black">{u.username}</span></div></div>))}</div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-20 gap-2 text-center p-4"><Navigation className="w-8 h-8" /><p className="text-[9px] font-black uppercase tracking-widest">Выберите страну</p></div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="requests" className="flex-1 data-[state=active]:flex flex-col min-h-0 m-0 overflow-hidden outline-none">
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

            <TabsContent value="broadcast" className="flex-1 data-[state=active]:flex flex-col p-6 gap-4 m-0 overflow-hidden outline-none">
              <Textarea placeholder="Текст сигнала..." value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} className="bg-white/5 border-white/10 rounded-2xl min-h-[180px] text-sm resize-none" />
              <Button onClick={() => { toast({ title: "Сигнал передан" }); setBroadcastMessage(''); }} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest"><Radio className="w-5 h-5 mr-2" /> Инициировать Сигнал</Button>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/5 shrink-0 text-left">
              <div className="flex items-center gap-4">
                <UserAvatar userId={inspectingUser.id} className="h-14 w-14" manualAvatarUrl={inspectingUser.avatarUrl} />
                <div className="flex flex-col">
                  <h3 className="font-black text-lg text-white leading-none mb-1">{formatDisplayName(inspectingUser.name)}</h3>
                  <span className="text-[10px] text-primary uppercase font-bold tracking-[0.2em]">{inspectingUser.username}</span>
                </div>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-3">
                {allChats?.filter(c => c.participantIds.includes(inspectingUser.id)).map(chat => (
                  <div key={chat.id} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] border border-white/5 hover:border-accent/30 transition-all group">
                    <div className="flex items-center gap-4 min-w-0 text-left">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">{chat.type === 'private' ? <Shield className="w-5 h-5 text-blue-400" /> : <Users className="w-5 h-5 text-purple-400" />}</div>
                      <div className="flex flex-col min-w-0"><span className="font-bold text-sm text-white truncate">{chat.name || (chat.type === 'private' ? 'Личный чат' : 'Сообщество')}</span><span className="text-[9px] text-muted-foreground/60 uppercase font-black">{chat.type}</span></div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setIsInterceptionRequested(true); setCurrentChatId(chat.id); setActiveView('chats'); onOpenChange(false); }} className="h-8 rounded-xl bg-accent/10 text-accent hover:bg-accent font-black uppercase text-[8px] tracking-widest px-4">Войти</Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1">
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <span className="text-lg font-black italic text-white leading-none">{value}</span>
      <span className="text-[6px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</span>
    </div>
  );
}
