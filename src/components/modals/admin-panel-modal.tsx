
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
  Loader2, UserX, MoreVertical, Ban, CheckCircle2, Crown, Calendar, Shield, Activity, Eye, MessageCircle, ArrowLeft, CreditCard, Check, X, ShieldOff, Zap, Terminal, Trash, Navigation
} from 'lucide-react';
import type { User, Chat, Transaction } from '@/lib/types';
import { formatDisplayName, isUserPremium, cn, isGlobalAdmin } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { addMonths } from 'date-fns';

const ROOT_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { setCurrentChatId, setActiveView } = useAppState();
  const { toast } = useToast();
  
  const [userSearch, setUserSearch] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [terminalLogs, setTerminalLogs] = useState<{msg: string, time: string, type: 'info'|'warn'|'crit'}[]>([]);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  
  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(500))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

  const requestsQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'topUpRequests'), orderBy('createdAt', 'desc'), limit(50))), [db]);
  const { data: topUpRequests } = useCollection<any>(requestsQuery);

  useEffect(() => {
    if (activeTab === 'terminal' && terminalLogs.length === 0) {
      const initialLogs = [
        { msg: "Kernel Boot Sequence Initialized...", time: new Date().toLocaleTimeString(), type: 'info' as const },
        { msg: "Nuxus Shield: Quantum Scan Active", time: new Date().toLocaleTimeString(), type: 'info' as const },
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
            <TabsList className="grid grid-cols-4 w-full bg-white/5 p-1 rounded-2xl">
              <TabsTrigger value="users" className="rounded-xl text-[9px] uppercase font-black tracking-widest">Ядро</TabsTrigger>
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
                      <div className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-primary/40" /><span className="text-[10px] font-black uppercase text-primary/60">{u.countryCode || '??'}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
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
