
"use client"

import React, { useState, useMemo, useEffect, useRef } from 'react';
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

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('requests');
  const [userSearch, setUserSearch] = useState('');
  const [terminalLines, setTerminalLines] = useState<string[]>(["Nuxus Kernel Console v5.9.0", "Type 'help' for available commands."]);
  const [terminalInput, setTerminalInput] = useState('');
  const terminalScrollRef = useRef<HTMLDivElement>(null);

  const topUpRequestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'topUpRequests'), orderBy('createdAt', 'desc'), limit(50));
  }, [db]);
  const { data: requests } = useCollection<TopUpRequest>(topUpRequestsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), limit(500));
  }, [db]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    // V5.9.0 Cleanup: Filter out phantoms (no name and no username)
    let list = allUsers.filter(u => (u.name && u.name !== 'User') || u.username);
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

    let response = "";
    if (cmd === 'help') response = "Available: status, nodes --count, clear, version, help";
    else if (cmd === 'status') response = "System: STABLE. Nodes: SYNCHRONIZED.";
    else if (cmd === 'nodes --count') response = `Active network nodes: ${filteredUsers.length}`;
    else if (cmd === 'version') response = "Nuxus OS: V5.9.0 Pulse";
    else if (cmd === 'clear') { setTerminalLines([]); setTerminalInput(''); return; }
    else response = `Command not found: ${cmd}`;

    setTerminalLines(prev => [...prev, `$ ${terminalInput}`, response]);
    setTerminalInput('');
  };

  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [terminalLines]);

  const handleApprove = async (req: TopUpRequest) => {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', req.userId), { balance: increment(req.amount) });
      batch.update(doc(db, 'topUpRequests', req.id), { status: 'approved' });
      await batch.commit();
      toast({ title: "Заявка одобрена" });
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
    await updateDoc(doc(db, 'users', uid), { [field]: value });
    toast({ title: "Профиль обновлен" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-[#020205] border-white/10 rounded-[3rem] p-0 overflow-hidden h-[90vh] flex flex-col shadow-2xl outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 bg-primary/10 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(168,85,247,0.1)_0%,transparent_70%)]" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-[1.8rem] bg-primary/20 border border-primary/20 flex items-center justify-center shadow-2xl">
                 <ShieldAlert className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="flex flex-col text-left">
                <DialogTitle className="text-3xl font-black uppercase italic text-white tracking-tighter leading-none">MISSION CONTROL</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60 mt-2">Nuxus Kernel Management v5.9.0</DialogDescription>
              </div>
            </div>
            <div className="hidden md:flex gap-4">
               <div className="bg-black/40 border border-white/5 px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-3">
                  <Users className="w-4 h-4 text-white" />
                  <div className="flex flex-col"><span className="text-xs font-black text-white">{filteredUsers.length}</span><span className="text-[7px] font-black text-white/20 uppercase">NODES</span></div>
               </div>
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
            <div className="p-8 pb-32">
              <TabsContent value="requests" className="m-0 space-y-4">
                {requests?.filter(r => r.status === 'pending').map(req => (
                  <div key={req.id} className="bg-white/[0.03] p-6 rounded-[2.2rem] border border-white/5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                    <div className="flex items-center gap-5">
                      <UserAvatar userId={req.userId} className="h-14 w-14 border border-white/10" />
                      <div className="flex flex-col text-left">
                        <span className="text-[15px] font-black text-white uppercase italic">{req.userName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                           <span className="text-primary font-black tabular-nums">{req.amount} NX</span>
                           <span className="text-[8px] text-white/20 uppercase font-black">• {format(new Date(req.createdAt), 'dd MMM HH:mm', { locale: ru })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button onClick={() => handleReject(req.id)} variant="ghost" className="h-11 px-6 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 font-black uppercase text-[10px] tracking-widest">Отказ</Button>
                      <Button onClick={() => handleApprove(req)} className="h-11 px-6 rounded-xl bg-green-500 text-white shadow-lg font-black uppercase text-[10px] tracking-widest">Принять</Button>
                    </div>
                  </div>
                ))}
                {requests?.filter(r => r.status === 'pending').length === 0 && <div className="py-20 text-center opacity-20"><Wallet className="w-12 h-12 mx-auto mb-4" /><p className="text-[10px] font-black uppercase">Очередь пуста</p></div>}
              </TabsContent>

              <TabsContent value="users" className="m-0 space-y-6">
                 <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    <Input placeholder="Поиск активного узла..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 font-bold focus:border-primary/50" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredUsers.map(u => (
                      <div key={u.id} className="bg-white/[0.03] p-5 rounded-[2rem] border border-white/5 flex flex-col gap-5">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <UserAvatar userId={u.id} className="h-12 w-12 border border-white/5" manualAvatarUrl={u.avatarUrl} />
                               <div className="flex flex-col text-left">
                                  <span className="text-sm font-black text-white uppercase italic">{formatDisplayName(u.name, u.username)}</span>
                                  <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest">{u.username || '@id'+u.id.slice(0,6)}</span>
                               </div>
                            </div>
                            <div className="flex gap-1.5">
                               {u.isPremium && <Crown className="w-4 h-4 text-accent" />}
                               {u.isAdmin && <ShieldCheck className="w-4 h-4 text-primary" />}
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
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <StatsCard icon={Globe} title="Network Nodes" value={filteredUsers.length} sub="Filtered valid nodes" />
                    <StatsCard icon={Zap} title="Kernel Pulse" value="1.0ms" sub="Excellent" />
                    <StatsCard icon={ShieldCheck} title="Protocol" value="V5.9.0" sub="Latest Stable" />
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
                       <span className="text-[10px] text-white/40 uppercase font-black ml-4">nuxus@kernel: ~ console</span>
                    </div>
                    <ScrollArea className="flex-1 p-6 text-[12px] leading-relaxed" ref={terminalScrollRef}>
                       {terminalLines.map((line, i) => (
                         <p key={i} className={cn(line.startsWith('$') ? "text-white" : "text-primary/80 mb-2")}>{line}</p>
                       ))}
                       <form onSubmit={handleTerminalCommand} className="flex items-center gap-2 mt-2">
                          <span className="text-primary">$</span>
                          <input 
                            className="bg-transparent border-none outline-none flex-1 text-white" 
                            autoFocus 
                            value={terminalInput}
                            onChange={e => setTerminalInput(e.target.value)}
                            spellCheck={false} 
                          />
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
    <div className="bg-white/5 p-8 rounded-[2.2rem] border border-white/5 flex flex-col gap-4 text-left shadow-xl hover:border-primary/20 transition-all">
       <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
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
