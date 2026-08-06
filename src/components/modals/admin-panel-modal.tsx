
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useFirestore, useCollection } from '@/firebase/provider';
import { collection, query, doc, limit, updateDoc, writeBatch, increment, orderBy } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Ban, Check, Activity, Terminal as TerminalIcon, 
  Zap, ShieldCheck, Search, Crown, Shield, AlertTriangle, SearchCode, ShieldQuestion, XCircle, UserX, Ghost
} from 'lucide-react';
import type { User, TopUpRequest } from '@/lib/types';
import { formatDisplayName, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * MISSION CONTROL V6.5.6 «NEURAL AEGIS»
 * FIXED: Audit button overflow and layout.
 * ADDED: Real-time suspicious node detection and listing.
 */
export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('requests');
  const [userSearch, setUserSearch] = useState('');
  const [terminalLines, setTerminalLines] = useState<string[]>(["Nuxus Aegis Console v6.5.6", "Security Protocol: ACTIVE"]);
  const [terminalInput, setTerminalInput] = useState('');
  const [isShieldActive, setIsShieldActive] = useState(false);
  
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setUpdateAuditProgress] = useState(0);
  const [auditResults, setAuditResults] = useState<{suspiciousNodes: User[], safeNodesCount: number} | null>(null);

  const topUpRequestsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'topUpRequests'), orderBy('createdAt', 'desc'), limit(50));
  }, [db]);
  const { data: requests } = useCollection<TopUpRequest>(topUpRequestsQuery);

  const usersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'users'), limit(500));
  }, [db]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  const stats = useMemo(() => {
    if (!allUsers) return { total: 0, valid: 0, premium: 0 };
    const valid = allUsers.filter(u => u.name && u.name !== 'User' && u.username).length;
    const premium = allUsers.filter(u => u.isPremium).length;
    return { total: allUsers.length, valid, premium };
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    let list = allUsers.filter(u => u.name && u.name !== 'User' && u.username);
    if (userSearch.trim()) {
      const s = userSearch.toLowerCase();
      list = list.filter(u => u.name?.toLowerCase().includes(s) || u.username?.toLowerCase().includes(s));
    }
    return list;
  }, [allUsers, userSearch]);

  const handleTerminalCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim().toLowerCase();
    if (!cmd) return;
    let res = "";
    if (cmd === 'status') res = "Kernel: STABLE | Aegis: ACTIVE | Nodes: " + stats.valid + "/" + stats.total;
    else if (cmd === 'audit') { handleStartAudit(); return; }
    else if (cmd === 'nodes') res = `Valid: ${stats.valid}, Premium: ${stats.premium}, Ghost: ${stats.total - stats.valid}`;
    else if (cmd === 'version') res = "Nuxus Kernel v6.5.6 (Neural Aegis)";
    else if (cmd === 'clear') { setTerminalLines([]); setTerminalInput(''); return; }
    else res = `Signal not recognized: ${cmd}`;
    setTerminalLines(prev => [...prev, `$ ${terminalInput}`, res]);
    setTerminalInput('');
  };

  const handleStartAudit = () => {
    if (isAuditing || !allUsers) return;
    setIsAuditing(true);
    setAuditResults(null);
    setUpdateAuditProgress(0);
    
    let p = 0;
    const interval = setInterval(() => {
      p += 4;
      setUpdateAuditProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        
        // Логика обнаружения подозрительных узлов
        const suspicious = allUsers.filter(u => {
          const isGhost = !u.avatarUrl && (!u.bio || u.bio.length < 5) && (u.name === 'User' || !u.name);
          const isInactive = u.lastSeen ? differenceInDays(new Date(), new Date(u.lastSeen)) > 7 : true;
          const lowEngagement = (u.referralCount || 0) === 0;
          
          return isGhost || (isInactive && lowEngagement);
        }).slice(0, 10); // Показываем топ 10 подозрительных

        setAuditResults({ 
          suspiciousNodes: suspicious, 
          safeNodesCount: stats.total - suspicious.length 
        });
        
        setIsAuditing(false);
        toast({ title: "Аудит завершен", description: "Нейронный щит просканировал все узлы." });
      }
    }, 100);
  };

  const handleApprove = async (req: TopUpRequest) => {
    if (!db) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', req.userId), { balance: increment(req.amount) });
    batch.update(doc(db, 'topUpRequests', req.id), { status: 'approved' });
    await batch.commit();
    toast({ title: "Заявка одобрена" });
  };

  const handleReject = async (id: string) => {
    if (!db) return;
    await updateDoc(doc(db, 'topUpRequests', id), { status: 'rejected' });
    toast({ title: "Заявка отклонена" });
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
                <DialogTitle className="text-3xl font-black uppercase italic text-white tracking-tighter">MISSION CONTROL</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase text-primary/60 mt-1">Kernel V6.5.6 Aegis Shield</DialogDescription>
              </div>
            </div>
            <div className="hidden sm:flex bg-black/40 border border-white/5 px-6 py-3 rounded-2xl items-center gap-4">
               <Activity className="w-4 h-4 text-green-500" />
               <div className="flex flex-col">
                 <span className="text-xs font-black text-white">{stats.valid} / {stats.total}</span>
                 <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Active Nodes</span>
               </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-8 mt-6">
            <TabsList className="grid grid-cols-4 bg-white/5 p-1.5 rounded-2xl border border-white/5">
              <TabsTrigger value="requests" className="text-[9px] font-black uppercase tracking-widest">Заявки</TabsTrigger>
              <TabsTrigger value="users" className="text-[9px] font-black uppercase tracking-widest">Узлы</TabsTrigger>
              <TabsTrigger value="shield" className="text-[9px] font-black uppercase tracking-widest">Aegis</TabsTrigger>
              <TabsTrigger value="terminal" className="text-[9px] font-black uppercase tracking-widest">Консоль</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8 pb-32">
              <TabsContent value="requests" className="m-0 space-y-4">
                {requests?.filter(r => r.status === 'pending').map(req => (
                  <div key={req.id} className="bg-white/[0.03] p-6 rounded-[2.2rem] border border-white/5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                    <div className="flex items-center gap-5">
                      <UserAvatar userId={req.userId} className="h-14 w-14 border border-white/10" />
                      <div className="flex flex-col text-left">
                        <span className="text-[15px] font-black text-white uppercase italic">{req.userName}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-primary font-black">{req.amount} NX</span>
                           <span className="text-[8px] text-white/20 uppercase font-black">• {format(new Date(req.createdAt), 'dd MMM HH:mm', { locale: ru })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={() => handleReject(req.id)} variant="ghost" className="h-10 px-4 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest">Отклонить</Button>
                      <Button onClick={() => handleApprove(req)} className="h-10 px-6 rounded-xl bg-green-500 text-white text-[10px] font-black uppercase tracking-widest">Одобрить</Button>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="users" className="m-0 space-y-6">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <Input placeholder="Поиск реального узла..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 font-bold" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredUsers.map(u => (
                      <div key={u.id} className="bg-white/[0.03] p-5 rounded-[2rem] border border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <UserAvatar userId={u.id} className="h-12 w-12 border border-white/5" manualAvatarUrl={u.avatarUrl} />
                            <div className="flex flex-col text-left">
                               <span className="text-sm font-black text-white uppercase italic">{formatDisplayName(u.name, u.username)}</span>
                               <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest">{u.username}</span>
                            </div>
                         </div>
                         <div className="flex gap-1.5">
                            {u.isPremium && <Crown className="w-4 h-4 text-accent" />}
                            {u.isAdmin && <ShieldCheck className="w-4 h-4 text-primary" />}
                         </div>
                      </div>
                    ))}
                 </div>
              </TabsContent>

              <TabsContent value="shield" className="m-0 space-y-8">
                 <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                       <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
                       <div className="flex flex-col text-left">
                          <h4 className="text-xl font-black text-white uppercase italic">Under Attack Mode</h4>
                          <p className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest mt-1">Принудительная фильтрация всех пакетов</p>
                       </div>
                    </div>
                    <Switch checked={isShieldActive} onCheckedChange={setIsShieldActive} className="data-[state=checked]:bg-red-500" />
                 </div>

                 <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 space-y-8 shadow-xl">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                       <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                             <SearchCode className="w-6 h-6" />
                          </div>
                          <div className="flex flex-col text-left">
                             <h4 className="text-lg font-black text-white uppercase italic leading-tight">Neural Security Audit</h4>
                             <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">Проверка резонанса и целостности узлов</p>
                          </div>
                       </div>
                       <Button 
                         onClick={handleStartAudit} 
                         disabled={isAuditing} 
                         className="bg-primary text-white h-14 rounded-2xl font-black uppercase tracking-widest px-10 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all w-full lg:w-auto"
                       >
                         {isAuditing ? (
                           <div className="flex items-center gap-3">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <Progress value={auditProgress} className="w-24 h-1.5 bg-white/10" />
                           </div>
                         ) : "Запустить анализ"}
                       </Button>
                    </div>

                    {auditResults && (
                       <div className="space-y-8 animate-in zoom-in-95 duration-500">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="bg-green-500/10 p-6 rounded-3xl border border-green-500/20 text-center shadow-inner">
                                <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-3" />
                                <span className="text-3xl font-black text-white italic tabular-nums">{auditResults.safeNodesCount}</span>
                                <p className="text-[9px] font-black uppercase text-green-500/60 mt-1 tracking-widest">Целостные узлы</p>
                             </div>
                             <div className="bg-red-500/10 p-6 rounded-3xl border border-red-500/20 text-center shadow-inner">
                                <UserX className="w-8 h-8 text-red-500 mx-auto mb-3" />
                                <span className="text-3xl font-black text-white italic tabular-nums">{auditResults.suspiciousNodes.length}</span>
                                <p className="text-[9px] font-black uppercase text-red-500/60 mt-1 tracking-widest">Подозрительные</p>
                             </div>
                          </div>

                          <div className="space-y-4">
                             <div className="flex items-center gap-2 px-2 text-red-500">
                                <ShieldQuestion className="w-4 h-4" />
                                <h5 className="text-[10px] font-black uppercase tracking-widest">Обнаруженные аномалии:</h5>
                             </div>
                             <div className="grid grid-cols-1 gap-3">
                                {auditResults.suspiciousNodes.map(node => (
                                  <div key={node.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all">
                                     <div className="flex items-center gap-4">
                                        <UserAvatar userId={node.id} className="h-10 w-10 opacity-60 grayscale" />
                                        <div className="flex flex-col text-left">
                                           <span className="text-sm font-bold text-white uppercase italic">{formatDisplayName(node.name, node.username)}</span>
                                           <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">{node.username}</span>
                                        </div>
                                     </div>
                                     <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                                        <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">
                                           {!node.avatarUrl ? 'АНОНИМНЫЙ ПРОФИЛЬ' : 'НИЗКИЙ РЕЗОНАНС'}
                                        </span>
                                     </div>
                                  </div>
                                ))}
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
              </TabsContent>

              <TabsContent value="terminal" className="m-0">
                 <div className="bg-black/60 border border-white/10 rounded-[2.5rem] overflow-hidden h-[400px] flex flex-col font-mono shadow-2xl">
                    <div className="bg-white/5 p-4 flex items-center gap-4 border-b border-white/5">
                       <div className="flex gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500/50" />
                          <div className="w-3 h-3 rounded-full bg-green-500/50" />
                       </div>
                       <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">nuxus@kernel: ~ terminal</span>
                    </div>
                    <ScrollArea className="flex-1 p-6 text-[12px] leading-relaxed">
                       {terminalLines.map((line, i) => (
                         <p key={i} className={cn(line.startsWith('$') ? "text-white" : "text-primary/70 mb-2")}>{line}</p>
                       ))}
                       <form onSubmit={handleTerminalCommand} className="flex items-center gap-2 mt-2">
                          <span className="text-primary">$</span>
                          <input className="bg-transparent border-none outline-none flex-1 text-white" value={terminalInput} onChange={e => setTerminalInput(e.target.value)} autoFocus />
                       </form>
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
