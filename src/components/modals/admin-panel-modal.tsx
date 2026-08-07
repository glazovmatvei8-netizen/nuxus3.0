
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useCollection } from '@/firebase/provider';
import { collection, query, doc, limit, updateDoc, writeBatch, increment, orderBy, deleteDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Ban, Check, Activity, Terminal as TerminalIcon, 
  Zap, ShieldCheck, Search, Crown, Shield, AlertTriangle, SearchCode, ShieldQuestion, XCircle, UserX, Ghost, Loader2, Phone, MessageSquare, Scale, CheckCircle2
} from 'lucide-react';
import type { User, TopUpRequest, Appeal } from '@/lib/types';
import { formatDisplayName, cn, isUserAnomaly } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAppState } from '@/lib/store.tsx';

/**
 * MISSION CONTROL V8.8.0 «AEGIS JUSTICE»
 * ADDED: Appeals management for banned users.
 */
export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const { setInspectedUserId } = useAppState();
  
  const [activeTab, setActiveTab] = useState('appeals');
  const [userSearch, setUserSearch] = useState('');
  const [terminalLines, setTerminalLines] = useState<string[]>(["Nuxus Aegis Console v8.8.0", "Justice Protocol: ACTIVE"]);
  const [terminalInput, setTerminalInput] = useState('');
  const [adminComment, setAdminComment] = useState('');
  
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setUpdateAuditProgress] = useState(0);
  const [auditResults, setAuditResults] = useState<{suspiciousNodes: {user: User, reason: string}[], safeNodesCount: number} | null>(null);

  // APPEALS DATA
  const appealsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'appeals'), orderBy('createdAt', 'desc'), limit(50));
  }, [db]);
  const { data: appeals } = useCollection<Appeal>(appealsQuery);

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
    const valid = allUsers.filter(u => !isUserAnomaly(u)).length;
    const premium = allUsers.filter(u => u.isPremium).length;
    return { total: allUsers.length, valid, premium };
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    let list = allUsers.filter(u => !isUserAnomaly(u));
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
    if (cmd === 'status') res = "Kernel: STABLE | Aegis: ACTIVE | Pending Appeals: " + appeals?.filter(a => a.status === 'pending').length;
    else if (cmd === 'audit') { handleStartAudit(); return; }
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
      p += 10;
      setUpdateAuditProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        const suspicious: {user: User, reason: string}[] = [];
        allUsers.forEach(u => {
          if (isUserAnomaly(u)) {
             const name = (u.name || '').trim().toLowerCase();
             const reason = name === 'user' ? 'GHOST IDENTITY (Name: User)' : 'CORRUPTED ID (Empty Username)';
             suspicious.push({ user: u, reason });
          }
        });
        setAuditResults({ suspiciousNodes: suspicious, safeNodesCount: allUsers.length - suspicious.length });
        setIsAuditing(false);
        toast({ title: "Аудит завершен", description: `Найдено ${suspicious.length} аномалий.` });
      }
    }, 50);
  };

  const handleMassBan = async () => {
    if (!db || !auditResults || auditResults.suspiciousNodes.length === 0) return;
    if (!confirm(`Аннигилировать доступ для ${auditResults.suspiciousNodes.length} узлов?`)) return;
    const batch = writeBatch(db);
    auditResults.suspiciousNodes.forEach(item => {
      batch.update(doc(db, 'users', item.user.id), { isBanned: true, bannedAt: new Date().toISOString() });
    });
    try {
      await batch.commit();
      toast({ title: "Протокол Aegis исполнен", description: "Все аномалии заблокированы." });
      setAuditResults(null);
    } catch (e) { toast({ title: "Сбой протокола", variant: "destructive" }); }
  };

  // APPEAL ACTIONS
  const handleAppealJustice = async (appeal: Appeal, action: 'accept' | 'reject' | 'comment') => {
    if (!db) return;
    const batch = writeBatch(db);
    const appealRef = doc(db, 'appeals', appeal.id);
    const userRef = doc(db, 'users', appeal.userId);

    if (action === 'accept' || action === 'comment') {
      batch.update(userRef, { isBanned: false, bannedAt: null });
      if (action === 'comment' && adminComment.trim()) {
        batch.update(userRef, { statusText: `[Admin]: ${adminComment}` });
      }
      batch.update(appealRef, { status: 'accepted', adminComment: adminComment.trim() || 'Разблокирован', resolvedAt: new Date().toISOString() });
      toast({ title: "Узел восстановлен" });
    } else {
      batch.update(appealRef, { status: 'rejected', adminComment: adminComment.trim() || 'Отказано', resolvedAt: new Date().toISOString() });
      toast({ title: "Апелляция отклонена" });
    }

    try {
      await batch.commit();
      setAdminComment('');
    } catch (e) { toast({ title: "Сбой правосудия", variant: "destructive" }); }
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
                <DialogDescription className="text-[10px] font-black uppercase text-primary/60 mt-1">Aegis Executive Dashboard</DialogDescription>
              </div>
            </div>
            <div className="hidden sm:flex bg-black/40 border border-white/5 px-6 py-3 rounded-2xl items-center gap-4">
               <Activity className="w-4 h-4 text-green-500" />
               <div className="flex flex-col">
                 <span className="text-xs font-black text-white">{stats.valid} / {stats.total}</span>
                 <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Integrity Secured</span>
               </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-8 mt-6">
            <TabsList className="grid grid-cols-5 bg-white/5 p-1.5 rounded-2xl border border-white/5">
              <TabsTrigger value="appeals" className="text-[9px] font-black uppercase tracking-widest">Апелляции</TabsTrigger>
              <TabsTrigger value="requests" className="text-[9px] font-black uppercase tracking-widest">Банк</TabsTrigger>
              <TabsTrigger value="users" className="text-[9px] font-black uppercase tracking-widest">Узлы</TabsTrigger>
              <TabsTrigger value="shield" className="text-[9px] font-black uppercase tracking-widest">Защита</TabsTrigger>
              <TabsTrigger value="terminal" className="text-[9px] font-black uppercase tracking-widest">Консоль</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8 pb-32">
              
              <TabsContent value="appeals" className="m-0 space-y-6">
                 {appeals?.filter(a => a.status === 'pending').length === 0 ? (
                   <div className="text-center py-20 opacity-20">
                      <Scale className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-[11px] font-black uppercase tracking-[0.5em]">Жалобы отсутствуют</p>
                   </div>
                 ) : (
                   <div className="space-y-4">
                      {appeals?.filter(a => a.status === 'pending').map(appeal => (
                        <div key={appeal.id} className="bg-white/[0.03] p-6 rounded-[2.5rem] border border-white/5 space-y-6 group hover:bg-white/[0.05] transition-all shadow-xl">
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                 <UserAvatar userId={appeal.userId} className="h-14 w-14 border border-white/10" />
                                 <div className="flex flex-col text-left">
                                    <span className="text-lg font-black text-white uppercase italic">{appeal.userName}</span>
                                    <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">ID: {appeal.userId} • {appeal.userPhone}</span>
                                 </div>
                              </div>
                              <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                                 <span className="text-[9px] font-black text-primary uppercase tracking-widest">Входящий сигнал</span>
                              </div>
                           </div>
                           
                           <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                              <p className="text-sm text-white/90 leading-relaxed italic">"{appeal.reason}"</p>
                           </div>

                           <div className="space-y-3">
                              <Label className="text-[8px] font-black uppercase text-white/40 ml-2">Ваш ответ / комментарий</Label>
                              <Input 
                                placeholder="Введите текст сообщения или обоснования..." 
                                value={adminComment} 
                                onChange={e => setAdminComment(e.target.value)}
                                className="h-12 bg-white/5 border-white/5 rounded-xl font-bold"
                              />
                           </div>

                           <div className="flex flex-wrap gap-3">
                              <Button 
                                onClick={() => handleAppealJustice(appeal, 'accept')}
                                className="h-12 px-6 bg-green-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all"
                              >
                                 <CheckCircle2 className="w-4 h-4 mr-2" /> Принять и разбанить
                              </Button>
                              <Button 
                                onClick={() => handleAppealJustice(appeal, 'comment')}
                                className="h-12 px-6 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all"
                              >
                                 <MessageSquare className="w-4 h-4 mr-2" /> Разбанить с комм.
                              </Button>
                              <Button 
                                onClick={() => handleAppealJustice(appeal, 'reject')}
                                variant="destructive"
                                className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all"
                              >
                                 <XCircle className="w-4 h-4 mr-2" /> Отказать
                              </Button>
                           </div>
                        </div>
                      ))}
                   </div>
                 )}
              </TabsContent>

              <TabsContent value="requests" className="m-0 space-y-4">
                {requests?.filter(r => r.status === 'pending').map(req => (
                  <div key={req.id} className="bg-white/[0.03] p-6 rounded-[2.2rem] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 group hover:bg-white/[0.05] transition-all">
                    <div className="flex items-center gap-5 w-full sm:w-auto">
                      <UserAvatar userId={req.userId} className="h-14 w-14 border border-white/10" />
                      <div className="flex flex-col text-left">
                        <span className="text-[15px] font-black text-white uppercase italic">{req.userName}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-primary font-black">{req.amount} NX</span>
                           <span className="text-[8px] text-white/20 uppercase font-black">• {format(new Date(req.createdAt), 'dd MMM HH:mm', { locale: ru })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <Button onClick={() => handleReject(req.id)} variant="ghost" className="flex-1 sm:flex-none h-10 px-4 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest">Отклонить</Button>
                      <Button onClick={() => handleApprove(req)} className="flex-1 sm:flex-none h-10 px-6 rounded-xl bg-green-500 text-white text-[10px] font-black uppercase tracking-widest">Одобрить</Button>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="users" className="m-0 space-y-6">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <Input placeholder="Поиск активного узла..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 font-bold" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredUsers.map(u => (
                      <div key={u.id} onClick={() => setInspectedUserId(u.id)} className="bg-white/[0.03] p-5 rounded-[2rem] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/[0.08] transition-all group">
                         <div className="flex items-center gap-4 min-w-0">
                            <UserAvatar userId={u.id} className="h-12 w-12 border border-white/5 shrink-0" manualAvatarUrl={u.avatarUrl} />
                            <div className="flex flex-col text-left min-w-0">
                               <span className="text-sm font-black text-white uppercase italic group-hover:text-primary transition-colors truncate">{formatDisplayName(u.name, u.username)}</span>
                               <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest truncate">{u.username}</span>
                            </div>
                         </div>
                         <div className="flex gap-1.5 shrink-0">
                            {u.isPremium && <Crown className="w-4 h-4 text-accent" />}
                            {u.isAdmin && <ShieldCheck className="w-4 h-4 text-primary" />}
                            {u.isBanned && <Ban className="w-4 h-4 text-red-500" />}
                         </div>
                      </div>
                    ))}
                 </div>
              </TabsContent>

              <TabsContent value="shield" className="m-0 space-y-8">
                 <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 space-y-8 shadow-xl">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                       <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                             <SearchCode className="w-6 h-6" />
                          </div>
                          <div className="flex flex-col text-left">
                             <h4 className="text-lg font-black text-white uppercase italic leading-tight">Ghost Node Audit</h4>
                             <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">Поиск профилей "User" и пустых ID</p>
                          </div>
                       </div>
                       <Button 
                         onClick={handleStartAudit} 
                         disabled={isAuditing} 
                         className="bg-primary text-white h-14 rounded-2xl font-black uppercase tracking-widest px-10 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all w-full lg:w-auto"
                       >
                         {isAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Запустить анализ базы"}
                       </Button>
                    </div>

                    {auditResults && (
                       <div className="space-y-8 animate-in zoom-in-95 duration-500">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="bg-green-500/10 p-6 rounded-3xl border border-green-500/20 text-center shadow-inner">
                                <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-3" />
                                <span className="text-3xl font-black text-white italic tabular-nums">{auditResults.safeNodesCount}</span>
                                <p className="text-[9px] font-black uppercase text-green-500/60 mt-1 tracking-widest">Корректные узлы</p>
                             </div>
                             <div className="bg-red-500/10 p-6 rounded-3xl border border-red-500/20 text-center shadow-inner">
                                <UserX className="w-8 h-8 text-red-500 mx-auto mb-3" />
                                <span className="text-3xl font-black text-white italic tabular-nums">{auditResults.suspiciousNodes.length}</span>
                                <p className="text-[9px] font-black uppercase text-red-500/60 mt-1 tracking-widest">Аномалии обнаружены</p>
                             </div>
                          </div>

                          {auditResults.suspiciousNodes.length > 0 && (
                            <div className="flex flex-col gap-6">
                               <Button onClick={handleMassBan} className="w-full h-16 bg-red-600 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl shadow-red-600/20">
                                  <Ban className="w-5 h-5 mr-3" /> Аннигилировать все аномалии
                               </Button>

                               <div className="space-y-4">
                                  <div className="flex items-center gap-2 px-2 text-red-500">
                                     <ShieldQuestion className="w-4 h-4" />
                                     <h5 className="text-[10px] font-black uppercase tracking-widest">Список на блокировку:</h5>
                                  </div>
                                  <div className="grid grid-cols-1 gap-3">
                                     {auditResults.suspiciousNodes.map(item => (
                                       <div 
                                         key={item.user.id} 
                                         onClick={() => setInspectedUserId(item.user.id)}
                                         className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group gap-4"
                                       >
                                          <div className="flex items-center gap-4 min-w-0 flex-1">
                                             <UserAvatar userId={item.user.id} className="h-10 w-10 shrink-0 opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                                             <div className="flex flex-col text-left min-w-0 overflow-hidden flex-1">
                                                <span className="text-sm font-bold text-white uppercase italic truncate group-hover:text-primary">{formatDisplayName(item.user.name, item.user.username)}</span>
                                                <div className="flex flex-wrap items-center gap-2">
                                                   <span className="text-[9px] text-white/30 font-black uppercase tracking-widest truncate">{item.user.username || 'NO ID'}</span>
                                                </div>
                                             </div>
                                          </div>
                                          <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 shadow-lg shrink-0 self-start sm:self-center">
                                             <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter whitespace-nowrap">
                                                {item.reason}
                                             </span>
                                          </div>
                                       </div>
                                     ))}
                                  </div>
                               </div>
                            </div>
                          )}
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
                       <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">nuxus@kernel: ~ aegis-terminal</span>
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
