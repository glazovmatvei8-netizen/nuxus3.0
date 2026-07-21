"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit, updateDoc, writeBatch, where, orderBy, increment, deleteDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Ban, Check, Activity, Wallet, Clock, 
  Terminal as TerminalIcon, X, Zap, ShieldCheck, Search, Trash2, Crown, Globe
} from 'lucide-react';
import type { User, TopUpRequest } from '@/lib/types';
import { formatDisplayName, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * MISSION CONTROL V5.8 «ULTIMATE FORCE»
 * Полностью новый интерфейс и расширенный функционал управления.
 */
export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('requests');
  const [userSearch, setUserSearch] = useState('');

  // 1. Заявки на пополнение
  const topUpRequestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'topUpRequests'), orderBy('createdAt', 'desc'), limit(50));
  }, [db]);
  const { data: requests } = useCollection<TopUpRequest>(topUpRequestsQuery);

  // 2. Список пользователей для управления
  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), limit(100));
  }, [db]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    if (!userSearch.trim()) return allUsers;
    const s = userSearch.toLowerCase();
    return allUsers.filter(u => u.name?.toLowerCase().includes(s) || u.username?.toLowerCase().includes(s));
  }, [allUsers, userSearch]);

  const handleApprove = async (req: TopUpRequest) => {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', req.userId);
      const reqRef = doc(db, 'topUpRequests', req.id);
      batch.update(userRef, { balance: increment(req.amount) });
      batch.update(reqRef, { status: 'approved' });
      await batch.commit();
      toast({ title: "Заявка одобрена", description: `${req.amount} NX начислено.` });
    } catch (e) { toast({ title: "Ошибка", variant: "destructive" }); }
  };

  const handleReject = async (reqId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'topUpRequests', reqId), { status: 'rejected' });
      toast({ title: "Заявка отклонена" });
    } catch (e) { toast({ title: "Ошибка", variant: "destructive" }); }
  };

  const updateUserRole = async (uid: string, field: string, value: any) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'users', uid), { [field]: value });
      toast({ title: "Сигнал обновлен" });
    } catch (e) { toast({ title: "Сбой синхронизации" }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-[#020205] border-white/10 rounded-[3rem] p-0 overflow-hidden h-[90vh] flex flex-col shadow-[0_0_100px_rgba(168,85,247,0.2)] outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 bg-primary/10 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(168,85,247,0.15)_0%,transparent_70%)]" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-[1.8rem] bg-primary/20 border border-primary/20 flex items-center justify-center shadow-2xl">
                 <ShieldAlert className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="flex flex-col text-left">
                <DialogTitle className="text-3xl font-black uppercase italic text-white tracking-tighter leading-none">MISSION CONTROL</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60 mt-2">Nuxus Kernel Management v5.8</DialogDescription>
              </div>
            </div>
            <div className="hidden md:flex gap-4">
               <StatItem icon={Users} value={allUsers?.length || 0} label="NODES" />
               <StatItem icon={Zap} value={requests?.filter(r => r.status === 'pending').length || 0} label="QUEUED" color="text-yellow-400" />
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-8 mt-6">
            <TabsList className="grid grid-cols-4 bg-white/5 p-1.5 rounded-2xl border border-white/5">
              <TabsTrigger value="requests" className="text-[9px] font-black uppercase tracking-widest gap-2"><Wallet className="w-3 h-3" /> Заявки</TabsTrigger>
              <TabsTrigger value="users" className="text-[9px] font-black uppercase tracking-widest gap-2"><Users className="w-3 h-3" /> Узлы</TabsTrigger>
              <TabsTrigger value="stats" className="text-[9px] font-black uppercase tracking-widest gap-2"><Activity className="w-3 h-3" /> Статус</TabsTrigger>
              <TabsTrigger value="terminal" className="text-[9px] font-black uppercase tracking-widest gap-2"><TerminalIcon className="w-3 h-3" /> Терминал</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8">
              <TabsContent value="requests" className="m-0 space-y-4">
                {requests?.map(req => (
                  <div key={req.id} className="bg-white/[0.03] p-6 rounded-[2.2rem] border border-white/5 flex items-center justify-between group hover:bg-white/[0.05] transition-all shadow-xl">
                    <div className="flex items-center gap-5">
                      <UserAvatar userId={req.userId} className="h-14 w-14 border border-white/10" />
                      <div className="flex flex-col text-left">
                        <span className="text-[15px] font-black text-white uppercase italic tracking-tight">{req.userName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                           <span className="text-primary font-black tabular-nums">{req.amount} NX</span>
                           <span className="text-[8px] text-white/20 uppercase font-black">• {format(new Date(req.createdAt), 'dd MMM HH:mm', { locale: ru })}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {req.status === 'pending' ? (
                        <>
                          <Button onClick={() => handleReject(req.id)} variant="ghost" className="h-11 px-6 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 font-black uppercase text-[10px] tracking-widest">Отказ</Button>
                          <Button onClick={() => handleApprove(req)} className="h-11 px-6 rounded-xl bg-green-500 text-white shadow-lg shadow-green-500/20 font-black uppercase text-[10px] tracking-widest">Принять</Button>
                        </>
                      ) : (
                        <div className={cn(
                          "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                          req.status === 'approved' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                        )}>
                          {req.status === 'approved' ? 'ВЫПОЛНЕНО' : 'ОТКЛОНЕНО'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!requests || requests.length === 0) && <EmptyState icon={Wallet} label="Заявок на пополнение нет" />}
              </TabsContent>

              <TabsContent value="users" className="m-0 space-y-6">
                 <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="Поиск узла в базе данных..." 
                      value={userSearch} 
                      onChange={e => setUserSearch(e.target.value)} 
                      className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 font-bold focus:border-primary/50" 
                    />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredUsers.map(u => (
                      <div key={u.id} className="bg-white/[0.03] p-5 rounded-[2rem] border border-white/5 flex flex-col gap-5">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <UserAvatar userId={u.id} className="h-12 w-12 border border-white/5" manualAvatarUrl={u.avatarUrl} />
                               <div className="flex flex-col text-left">
                                  <span className="text-sm font-black text-white uppercase italic">{u.name}</span>
                                  <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest">{u.username}</span>
                               </div>
                            </div>
                            <div className="flex gap-1.5">
                               {u.isPremium && <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent"><Crown className="w-4 h-4" /></div>}
                               {u.isAdmin && <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary"><ShieldCheck className="w-4 h-4" /></div>}
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-3 gap-2">
                            <AdminActionBtn label="Premium" active={u.isPremium} onClick={() => updateUserRole(u.id, 'isPremium', !u.isPremium)} />
                            <AdminActionBtn label="Admin" active={u.isAdmin} onClick={() => updateUserRole(u.id, 'isAdmin', !u.isAdmin)} />
                            <AdminActionBtn label="Ban" active={u.isBanned} danger onClick={() => updateUserRole(u.id, 'isBanned', !u.isBanned)} />
                         </div>
                      </div>
                    ))}
                 </div>
              </TabsContent>

              <TabsContent value="stats" className="m-0 space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatsCard icon={Globe} title="Global Nodes" value={allUsers?.length || 0} sub="Активных в Ядре" />
                    <StatsCard icon={Zap} title="Signal Load" value="1.2ms" sub="Задержка отклика" />
                    <StatsCard icon={ShieldCheck} title="QES Status" value="ACTIVE" sub="Версия 24.1" />
                 </div>
                 
                 <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 text-center space-y-4">
                    <Activity className="w-12 h-12 text-primary mx-auto animate-pulse" />
                    <h3 className="text-xl font-black text-white uppercase italic">Система стабильна</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed max-w-sm mx-auto">Все узлы синхронизированы. Критических сбоев сигнала за последние 24 часа не обнаружено.</p>
                 </div>
              </TabsContent>

              <TabsContent value="terminal" className="m-0">
                 <div className="bg-black/60 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl h-[400px] flex flex-col font-mono">
                    <div className="bg-white/5 p-3 flex items-center gap-2 border-b border-white/5 shrink-0">
                       <div className="flex gap-1.5 ml-2">
                          <div className="w-3 h-3 rounded-full bg-red-500/50" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                          <div className="w-3 h-3 rounded-full bg-green-500/50" />
                       </div>
                       <span className="text-[10px] text-white/40 uppercase font-black ml-4">nuxus@kernel: ~</span>
                    </div>
                    <ScrollArea className="flex-1 p-6 text-[12px] leading-relaxed">
                       <p className="text-primary font-bold">Nuxus Kernel OS v5.8 [Booting...]</p>
                       <p className="text-white/60">Initialising secure enclave...</p>
                       <p className="text-white/60">Loading user metadata database...</p>
                       <p className="text-green-500">Node Sync: 100% SUCCESS</p>
                       <p className="mt-4 text-white"># Waiting for command...</p>
                       <div className="flex items-center gap-2 mt-2">
                          <span className="text-primary">$</span>
                          <input className="bg-transparent border-none outline-none flex-1 text-white" autoFocus spellCheck={false} />
                       </div>
                    </ScrollArea>
                 </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatItem({ icon: Icon, value, label, color = "text-white" }: any) {
  return (
    <div className="flex items-center gap-3 bg-black/40 border border-white/5 px-5 py-2.5 rounded-2xl shadow-xl">
       <Icon className={cn("w-4 h-4", color)} />
       <div className="flex flex-col">
          <span className="text-xs font-black italic tabular-nums text-white leading-none">{value}</span>
          <span className="text-[7px] font-black uppercase text-white/20 tracking-widest">{label}</span>
       </div>
    </div>
  );
}

function AdminActionBtn({ label, active, onClick, danger }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "h-10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
        active 
          ? (danger ? "bg-red-500 border-red-500 text-white" : "bg-primary border-primary text-white shadow-lg")
          : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
      )}
    >
      {label}
    </button>
  );
}

function StatsCard({ icon: Icon, title, value, sub }: any) {
  return (
    <div className="bg-white/5 p-8 rounded-[2.2rem] border border-white/5 flex flex-col gap-4 text-left shadow-xl hover:border-primary/20 transition-all group">
       <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
          <Icon className="w-6 h-6" />
       </div>
       <div>
          <h4 className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1">{title}</h4>
          <span className="text-3xl font-black italic text-white tracking-tighter">{value}</span>
          <p className="text-[9px] font-black uppercase text-primary/60 mt-1">{sub}</p>
       </div>
    </div>
  );
}

function EmptyState({ icon: Icon, label }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-20 opacity-20 border-2 border-dashed border-white/5 rounded-[2.5rem]">
       <Icon className="w-12 h-12 mb-4" />
       <p className="text-[11px] font-black uppercase tracking-[0.4em]">{label}</p>
    </div>
  );
}
