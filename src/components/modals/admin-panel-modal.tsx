"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useFirestore } from '@/firebase/provider'; 
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { collection, query, doc, limit, writeBatch, orderBy } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Ban, Activity, 
  Search, Crown, Mail, Send, Sparkles,
  BarChart3, Scale, Zap, Terminal, X,
  Loader2
} from 'lucide-react';
import type { User } from '@/lib/types';
import { formatDisplayName, cn, isUserPremium } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/app-state';

/**
 * ADMIN PANEL MODAL V100.1 «BUILD STABILITY»
 * FIXED: Added missing Loader2 import and improved data handling.
 */
export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const { setInspectedUserId } = useAppState();
  
  const [activeTab, setActiveTab] = useState('analytics');
  const [userSearch, setUserSearch] = useState('');
  
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), limit(500));
  }, [db]);
  const { data: allUsers, isLoading: isUsersLoading } = useCollection<User>(usersQuery);

  const stats = useMemo(() => {
    if (!allUsers) return { total: 0, active: 0, premium: 0, banned: 0, emails: 0 };
    const banned = allUsers.filter(u => u.isBanned).length;
    const premium = allUsers.filter(u => isUserPremium(u)).length;
    const emails = allUsers.filter(u => u.email && !u.email.includes('@nuxus.chat')).length;
    return { total: allUsers.length, active: allUsers.length - banned, premium, banned, emails };
  }, [allUsers]);

  const handleStartBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastBody.trim() || !allUsers || !db) {
      toast({ title: "Ошибка данных" });
      return;
    }
    const targets = allUsers.filter(u => u.email && !u.email.includes('@nuxus.chat'));
    if (targets.length === 0) { toast({ title: "Нет адресатов" }); return; }
    
    setIsBroadcasting(true);
    try {
      const batch = writeBatch(db);
      targets.forEach(t => {
        const ref = doc(collection(db, 'mail'));
        batch.set(ref, {
          to: t.email,
          message: { subject: broadcastSubject, text: broadcastBody },
          createdAt: new Date().toISOString()
        });
      });
      await batch.commit();
      toast({ title: "Рассылка запущена" });
      setBroadcastSubject(''); setBroadcastBody('');
    } catch (e) { 
      toast({ title: "Сбой шлюза", variant: "destructive" }); 
    } finally { 
      setIsBroadcasting(false); 
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#020205] border-white/10 rounded-[3rem] p-0 overflow-hidden h-[90vh] md:h-[85vh] flex flex-col shadow-2xl outline-none">
        
        <DialogHeader className="p-6 md:p-8 border-b border-white/5 shrink-0 bg-primary/5 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,hsla(var(--primary),0.1),transparent_70%)]" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center shadow-lg">
                 <ShieldAlert className="w-7 h-7 text-primary animate-pulse" />
              </div>
              <div className="flex flex-col text-left">
                <DialogTitle className="text-2xl font-black uppercase italic text-white tracking-tighter">AEGIS CONTROL</DialogTitle>
                <DialogDescription className="text-[8px] font-black uppercase text-primary/60 tracking-[0.4em]">Node Protocol V100.1</DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 md:px-8 py-4 bg-black/20 border-b border-white/5 shrink-0">
            <TabsList className="flex bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar justify-start md:justify-center">
              <TabsTrigger value="analytics" className="flex-1 min-w-[100px] text-[9px] font-black uppercase tracking-widest py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">Статистика</TabsTrigger>
              <TabsTrigger value="users" className="flex-1 min-w-[100px] text-[9px] font-black uppercase tracking-widest py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">База узлов</TabsTrigger>
              <TabsTrigger value="broadcast" className="flex-1 min-w-[100px] text-[9px] font-black uppercase tracking-widest py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">Рассылка</TabsTrigger>
              <TabsTrigger value="logs" className="flex-1 min-w-[100px] text-[9px] font-black uppercase tracking-widest py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">Логи</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-6 md:p-8 space-y-10 pb-20">
                
                <TabsContent value="analytics" className="m-0 space-y-8 animate-in fade-in duration-500">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard icon={Users} label="Всего" value={stats.total} color="text-white" />
                      <StatCard icon={Mail} label="Emails" value={stats.emails} color="text-blue-400" />
                      <StatCard icon={Ban} label="Бан" value={stats.banned} color="text-red-500" />
                      <StatCard icon={Crown} label="Elite" value={stats.premium} color="text-accent" />
                   </div>
                   
                   <div className="bg-[#1C1C1E] p-6 rounded-[2.5rem] border border-white/[0.03] shadow-xl">
                      <h4 className="text-[10px] font-black uppercase text-white tracking-[0.3em] mb-6 flex items-center gap-3 italic">
                         <Activity className="w-4 h-4 text-primary" /> Системный пульс
                      </h4>
                      <div className="space-y-6">
                         <div className="flex justify-between items-end">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Нагрузка на шлюз</span>
                            <span className="text-xs font-black text-primary italic">14.2%</span>
                         </div>
                         <Progress value={14} className="h-2 bg-black/40" />
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="users" className="m-0 space-y-6 animate-in fade-in duration-500">
                   <div className="relative group sticky top-0 z-20">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                      <Input 
                        placeholder="Поиск по нику или имени..." 
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl font-bold focus:border-primary/40 shadow-inner"
                      />
                   </div>
                   
                   <div className="space-y-3">
                      {allUsers?.filter(u => 
                        u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
                        u.username?.toLowerCase().includes(userSearch.toLowerCase())
                      ).slice(0, 50).map(u => (
                        <div key={u.id} className="flex flex-wrap md:flex-nowrap items-center justify-between p-4 bg-white/[0.02] rounded-[1.8rem] border border-white/[0.05] hover:bg-white/[0.04] transition-all gap-4">
                           <div className="flex items-center gap-4 flex-1 min-w-0">
                              <UserAvatar userId={u.id} className="h-12 w-12 shrink-0" manualAvatarUrl={u.avatarUrl} />
                              <div className="flex flex-col text-left min-w-0">
                                 <span className="font-black text-white uppercase italic tracking-tight text-[14px] truncate">{u.name}</span>
                                 <span className="text-[9px] text-primary/60 font-black uppercase tracking-widest truncate">{u.username}</span>
                              </div>
                           </div>
                           <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                              <Button 
                                variant="ghost" 
                                onClick={() => setInspectedUserId(u.id)} 
                                className="flex-1 md:flex-none h-10 px-5 rounded-xl bg-white/5 font-black uppercase text-[8px] tracking-widest hover:bg-primary/20"
                              >
                                Профиль
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 rounded-xl text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all shrink-0"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                           </div>
                        </div>
                      ))}
                      {isUsersLoading && <div className="text-center py-10 animate-pulse text-white/10 uppercase font-black text-[10px]">Syncing Nodes...</div>}
                   </div>
                </TabsContent>

                <TabsContent value="broadcast" className="m-0 animate-in fade-in duration-500">
                   <div className="bg-[#1C1C1E] p-6 md:p-8 rounded-[2.5rem] border border-white/[0.03] space-y-6 shadow-xl">
                      <div className="flex flex-col gap-1">
                         <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                            <Terminal className="w-5 h-5 text-primary" /> Почтовый Резонанс
                         </h3>
                         <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Массовая трансляция на почтовые ящики</p>
                      </div>
                      
                      <div className="space-y-4">
                         <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase text-primary/60 ml-2 tracking-widest">Тема Сигнала</label>
                            <Input 
                              placeholder="Заголовок пакета..." 
                              value={broadcastSubject}
                              onChange={e => setBroadcastSubject(e.target.value)}
                              className="h-12 bg-black/40 border-white/10 rounded-xl font-bold"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase text-primary/60 ml-2 tracking-widest">Тело Сигнала</label>
                            <Textarea 
                              placeholder="Текст для передачи..." 
                              value={broadcastBody}
                              onChange={e => setBroadcastBody(e.target.value)}
                              className="min-h-[200px] bg-black/40 border-white/10 rounded-2xl p-4 text-xs leading-relaxed resize-none"
                            />
                         </div>
                      </div>

                      <Button 
                        onClick={handleStartBroadcast} 
                        disabled={isBroadcasting} 
                        className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
                      >
                        {isBroadcasting ? <Loader2 className="animate-spin w-5 h-5" /> : <><Send className="w-5 h-5 mr-3" /> Активировать Передачу</>}
                      </Button>
                   </div>
                </TabsContent>

                <TabsContent value="logs" className="m-0 text-center py-20 opacity-20">
                   <Activity className="w-12 h-12 mx-auto mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Логирование в режиме ожидания</p>
                </TabsContent>

              </div>
            </ScrollArea>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-[#1C1C1E] border border-white/[0.03] p-5 rounded-[2rem] flex flex-col gap-4 shadow-md relative overflow-hidden group">
       <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
       <div className="bg-black/40 p-2 rounded-lg w-fit border border-white/[0.05] relative z-10">
          <Icon className={cn("w-4 h-4", color)} />
       </div>
       <div className="flex flex-col relative z-10">
          <span className="text-xl font-black text-white italic tracking-tighter tabular-nums">{value}</span>
          <span className="text-[7px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">{label}</span>
       </div>
    </div>
  )
}
