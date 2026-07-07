
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
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit, updateDoc, writeBatch, getDocs, where, orderBy, increment } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Ban, ShieldCheck, 
  MoreVertical, Send, Loader2, Database, Zap, Wallet, Check, X, Clock, Activity, Target, ShieldX, CalendarDays
} from 'lucide-react';
import type { User, TopUpRequest } from '@/lib/types';
import { formatDisplayName, isUserPremium, cn, isGlobalAdmin } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { addMonths, addYears } from 'date-fns';

const ROOT_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

/**
 * ADMIN PANEL V29.2.0 «PRO INTEGRITY»
 * Оптимизировано: Прокрутка, управление Premium (1, 3, 6 мес) и фикс видимости заявок.
 */
export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');
  const [requestFilter, setRequestFilter] = useState<'pending' | 'all'>('pending');
  const [broadcastText, setBroadcastText] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Users List
  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(1000))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

  // Top-Up Requests List
  const topUpRequestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    if (requestFilter === 'pending') {
      return query(collection(db, 'topUpRequests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    }
    return query(collection(db, 'topUpRequests'), orderBy('createdAt', 'desc'), limit(200));
  }, [db, requestFilter]);
  
  const { data: rawTopUpRequests, isLoading: isRequestsLoading } = useCollection<TopUpRequest>(topUpRequestsQuery);

  const stats = useMemo(() => {
    if (!users) return { total: 0, premium: 0, admins: 0, banned: 0 };
    return {
      total: users.length,
      premium: users.filter(u => isUserPremium(u)).length,
      admins: users.filter(u => isGlobalAdmin(u)).length,
      banned: users.filter(u => u.isBanned).length
    };
  }, [users]);

  const handleAction = async (targetId: string, action: string, value?: any) => {
    if (!db) return;
    if (targetId === ROOT_UID && (action === 'ban' || action === 'remove_admin')) {
      toast({ title: "Ошибка доступа", description: "Главный узел неприкосновенен.", variant: "destructive" });
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
        let expiry = new Date();
        if (value === '1m') expiry = addMonths(new Date(), 1);
        else if (value === '3m') expiry = addMonths(new Date(), 3);
        else if (value === '6m') expiry = addMonths(new Date(), 6);
        else if (value === '1y') expiry = addYears(new Date(), 1);
        update = { isPremium: true, premiumUntil: expiry.toISOString() };
        break;
      case 'remove_premium': 
        update = { isPremium: false, premiumUntil: null }; 
        break;
    }

    try {
      await updateDoc(userRef, update);
      toast({ title: "Узел обновлен", description: "Конфигурация сигнала успешно изменена." });
    } catch (e: any) {
      toast({ title: "Сбой", description: e.message, variant: "destructive" });
    }
  };

  const handleApproveTopUp = async (req: TopUpRequest) => {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', req.userId);
      const reqRef = doc(db, 'topUpRequests', req.id);
      const txRef = doc(collection(db, 'users', req.userId, 'transactions'));

      batch.update(userRef, { balance: increment(req.amount) });
      batch.update(reqRef, { status: 'approved' });
      batch.set(txRef, {
        id: txRef.id,
        userId: req.userId,
        amount: req.amount,
        type: 'deposit',
        status: 'completed',
        otherPartyName: 'Пополнение Ядра 🛡️',
        createdAt: new Date().toISOString()
      });

      await batch.commit();
      toast({ title: "Заявка одобрена", description: `${req.amount} NX начислено.` });
    } catch (e: any) {
      toast({ title: "Сбой одобрения", variant: "destructive" });
    }
  };

  const handleRejectTopUp = async (reqId: string) => {
    if (!db) return;
    await updateDoc(doc(db, 'topUpRequests', reqId), { status: 'rejected' });
    toast({ title: "Заявка отклонена" });
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
           chatId: chatDoc.id, senderId: 'system_broadcast', senderName: 'Nuxus Kernel 📡', 
           content: `NX_SECURE_${btoa(encodeURIComponent(broadcastText.trim()))}`,
           contentType: 'broadcast', sentAt: new Date().toISOString() 
        });
      });
      await batch.commit();
      toast({ title: "Трансляция завершена" });
      setBroadcastText('');
    } catch (e) {
      toast({ title: "Сбой трансляции", variant: "destructive" });
    } finally { setIsBroadcasting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0a0a0c]/98 backdrop-blur-[50px] border-primary/30 p-0 overflow-hidden h-[90vh] flex flex-col rounded-[3rem] shadow-[0_0_120px_rgba(0,0,0,1)] border outline-none">
        
        <DialogHeader className="p-8 pb-6 shrink-0 border-b border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4 text-left">
              <div className="bg-primary/20 p-3 rounded-2xl border border-primary/20 shadow-lg shadow-primary/10">
                <ShieldAlert className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-white uppercase italic font-black tracking-tighter text-3xl">Mission Control</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Activity className="w-3 h-3 text-primary/60" />
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/40">Global Kernel Management v29.2</p>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
               <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]" />
               <span className="text-[10px] font-black uppercase text-white/60 tracking-widest">Core Status: Stable</span>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-8 pt-6 shrink-0">
            <TabsList className="grid w-full bg-white/5 p-1.5 rounded-[1.6rem] grid-cols-4 gap-1.5 border border-white/5 shadow-inner">
              <TabsTrigger value="analytics" className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary transition-all">Сводка</TabsTrigger>
              <TabsTrigger value="users" className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary transition-all">Узлы</TabsTrigger>
              <TabsTrigger value="requests" className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary transition-all">Заявки ({rawTopUpRequests?.filter(r => r.status === 'pending').length || 0})</TabsTrigger>
              <TabsTrigger value="broadcast" className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary transition-all">Маяк</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 relative mt-4 overflow-hidden">
            {/* TAB: ANALYTICS */}
            <TabsContent value="analytics" className="h-full m-0 animate-in fade-in duration-500 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-8 space-y-8 pb-24">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Всего узлов" value={stats.total} icon={Users} color="text-white" sub="Network Nodes" />
                    <StatCard label="Premium Elite" value={stats.premium} icon={Star} color="text-accent" sub="Elite Status" />
                    <StatCard label="Администраторы" value={stats.admins} icon={ShieldCheck} color="text-primary" sub="Kernel Lords" />
                    <StatCard label="Заблокировано" value={stats.banned} icon={Ban} color="text-red-500" sub="Blacklisted" />
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
                     <div className="flex items-center gap-5 text-left">
                        <div className="bg-accent/10 p-4 rounded-2xl"><Target className="w-8 h-8 text-accent" /></div>
                        <div>
                           <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Целостность Ядра</h3>
                           <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Квантовый протокол работает стабильно.</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-black text-white italic">100%</span>
                          <span className="text-[7px] font-black uppercase text-primary/40">Uptime</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-black text-white italic">0</span>
                          <span className="text-[7px] font-black uppercase text-red-500/40">Errors</span>
                        </div>
                     </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* TAB: USERS LIST */}
            <TabsContent value="users" className="h-full m-0 p-0 flex flex-col animate-in fade-in duration-500 overflow-hidden">
              <div className="px-8 pt-2 pb-4 shrink-0">
                <div className="relative group">
                   <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40 group-focus-within:text-primary transition-colors" />
                   <Input 
                     placeholder="Поиск по идентификаторам узлов..." 
                     value={userSearch} 
                     onChange={e => setUserSearch(e.target.value)} 
                     className="bg-white/5 border-white/10 h-14 rounded-2xl pl-14 text-sm font-bold tracking-tight focus:border-primary/40 transition-all" 
                   />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="px-8 space-y-3 pb-32">
                  {users?.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.username?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                    <div key={u.id} className="flex items-center justify-between p-5 bg-white/[0.03] rounded-[2rem] border border-white/5 hover:bg-white/[0.06] transition-all group shadow-xl">
                      <div className="flex items-center gap-4 text-left min-w-0 flex-1">
                        <UserAvatar userId={u.id} className="h-14 w-14 border border-white/5 group-hover:scale-105 transition-transform" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-black text-base text-white flex items-center gap-2 italic tracking-tight uppercase truncate">
                            {formatDisplayName(u.name)}
                            {isGlobalAdmin(u) && <ShieldCheck className="w-4 h-4 text-primary" />}
                            {isUserPremium(u) && <Star className="w-3.5 h-3.5 text-accent fill-accent animate-pulse" />}
                          </span>
                          <span className="text-[10px] text-primary/60 font-black tracking-[0.2em] uppercase truncate">{u.username}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all shadow-lg">
                            <MoreVertical className="w-6 h-6" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 bg-[#0a0a0c]/98 backdrop-blur-xl rounded-[2rem] p-2 border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
                           <DropdownMenuItem onClick={() => handleAction(u.id, u.isAdmin ? 'remove_admin' : 'make_admin')} className="gap-4 font-black uppercase text-[11px] tracking-widest py-4 rounded-2xl hover:bg-primary/10 transition-colors">
                             {u.isAdmin ? <><ShieldX className="w-5 h-5 text-red-400" /> Снять Админа</> : <><ShieldCheck className="w-5 h-5 text-primary" /> Назначить Админа</>}
                           </DropdownMenuItem>

                           <DropdownMenuSub>
                             <DropdownMenuSubTrigger className="gap-4 font-black uppercase text-[11px] tracking-widest py-4 rounded-2xl hover:bg-accent/10 text-accent transition-colors">
                               <Star className="w-5 h-5 fill-accent" /> Выдать Premium
                             </DropdownMenuSubTrigger>
                             <DropdownMenuSubContent className="bg-[#0a0a0c] border-white/10 rounded-2xl p-2 w-48">
                               <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', '1m')} className="py-3 font-bold uppercase text-[10px] tracking-widest rounded-xl">1 Месяц</DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', '3m')} className="py-3 font-bold uppercase text-[10px] tracking-widest rounded-xl">3 Месяца</DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', '6m')} className="py-3 font-bold uppercase text-[10px] tracking-widest rounded-xl">6 Месяцев</DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', '1y')} className="py-3 font-bold uppercase text-[10px] tracking-widest rounded-xl">1 Год</DropdownMenuItem>
                             </DropdownMenuSubContent>
                           </DropdownMenuSub>

                           {isUserPremium(u) && (
                             <DropdownMenuItem onClick={() => handleAction(u.id, 'remove_premium')} className="gap-4 font-black uppercase text-[11px] tracking-widest py-4 rounded-2xl hover:bg-red-500/10 text-red-400 transition-colors">
                               <Zap className="w-5 h-5" /> Снять Premium
                             </DropdownMenuItem>
                           )}

                           <DropdownMenuSeparator className="bg-white/5 mx-2 my-1" />
                           
                           <DropdownMenuItem onClick={() => handleAction(u.id, u.isBanned ? 'unban' : 'ban')} className={cn("gap-4 font-black uppercase text-[11px] tracking-widest py-4 rounded-2xl transition-colors", u.isBanned ? "text-green-400 hover:bg-green-400/10" : "text-red-500 hover:bg-red-500/10")}>
                             {u.isBanned ? <><ShieldCheck className="w-5 h-5" /> Разбанить</> : <><Ban className="w-5 h-5" /> Забанить</>}
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* TAB: TOP-UP REQUESTS */}
            <TabsContent value="requests" className="h-full m-0 p-0 flex flex-col animate-in fade-in duration-500 overflow-hidden">
               <div className="px-8 pt-2 pb-4 shrink-0 flex gap-3">
                 <button onClick={() => setRequestFilter('pending')} className={cn("flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-lg", requestFilter === 'pending' ? "bg-primary border-primary text-white" : "bg-white/5 border-white/5 text-white/30")}>В очереди</button>
                 <button onClick={() => setRequestFilter('all')} className={cn("flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-lg", requestFilter === 'all' ? "bg-primary border-primary text-white" : "bg-white/5 border-white/5 text-white/30")}>Все запросы</button>
               </div>
               <ScrollArea className="flex-1">
                  <div className="p-8 space-y-4 pb-32">
                    {isRequestsLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                         <Loader2 className="w-12 h-12 animate-spin text-primary" />
                         <p className="text-[10px] font-black uppercase tracking-widest">Синхронизация заявок...</p>
                      </div>
                    ) : (rawTopUpRequests?.length || 0) > 0 ? (rawTopUpRequests || []).map(req => (
                      <div key={req.id} className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-[2.5rem] hover:bg-white/[0.05] transition-all shadow-[0_15px_40px_rgba(0,0,0,0.3)] group gap-6">
                         <div className="flex items-center gap-5 text-left min-w-0 flex-1 w-full">
                           <div className="relative shrink-0">
                             <UserAvatar userId={req.userId} className="h-16 w-16 shadow-2xl border-2 border-white/5" />
                             <div className={cn("absolute -bottom-1 -right-1 p-1.5 rounded-lg border-2 border-[#0a0a0c] shadow-lg", req.status === 'pending' ? "bg-primary" : req.status === 'approved' ? "bg-green-500" : "bg-red-500")}>
                                {req.status === 'pending' ? <Clock className="w-3 h-3 text-white" /> : req.status === 'approved' ? <Check className="w-3 h-3 text-white" /> : <X className="w-3 h-3 text-white" />}
                             </div>
                           </div>
                           <div className="flex flex-col min-w-0 overflow-hidden">
                             <span className="font-black text-white text-lg truncate uppercase italic tracking-tighter leading-none">{req.userName || 'Unknown Node'}</span>
                             <div className="flex items-center gap-3 mt-2 flex-wrap">
                               <div className="bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">
                                 <span className="text-xl text-primary font-black italic tracking-tighter tabular-nums">{req.amount} NX</span>
                               </div>
                               <span className="text-[9px] text-white/20 font-black uppercase flex items-center gap-1.5 whitespace-nowrap"><Clock className="w-3 h-3" /> {req.createdAt ? new Date(req.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                             </div>
                           </div>
                         </div>
                         
                         {req.status === 'pending' ? (
                           <div className="flex gap-3 shrink-0 w-full sm:w-auto">
                             <Button size="icon" onClick={() => handleApproveTopUp(req)} className="flex-1 sm:h-16 sm:w-16 h-14 bg-green-500 hover:bg-green-600 rounded-[1.6rem] shadow-xl shadow-green-500/20 active:scale-90 transition-all border border-white/10">
                               <Check className="w-8 h-8 text-white stroke-[3]" />
                             </Button>
                             <Button size="icon" onClick={() => handleRejectTopUp(req.id)} className="flex-1 sm:h-16 sm:w-16 h-14 bg-white/5 hover:bg-red-600 rounded-[1.6rem] shadow-xl active:scale-90 transition-all border border-white/10 text-white/40">
                               <X className="w-8 h-8 stroke-[3]" />
                             </Button>
                           </div>
                         ) : (
                           <div className={cn("px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-inner whitespace-nowrap", req.status === 'approved' ? "text-green-500 border-green-500/20 bg-green-500/10" : "text-red-500 border-red-500/20 bg-red-500/10")}>
                             {req.status === 'approved' ? 'ВЫПОЛНЕНО' : 'ОТКЛОНЕНО'}
                           </div>
                         )}
                      </div>
                    )) : (
                      <div className="py-40 text-center opacity-20 flex flex-col items-center gap-8">
                        <Wallet className="w-24 h-24 text-white/10 animate-pulse" />
                        <div className="space-y-2">
                           <p className="text-lg font-black uppercase tracking-[0.5em] text-white">Очередь пуста</p>
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Сигналы не обнаружены</p>
                        </div>
                      </div>
                    )}
                  </div>
               </ScrollArea>
            </TabsContent>

            {/* TAB: BROADCAST */}
            <TabsContent value="broadcast" className="h-full m-0 animate-in fade-in duration-500 overflow-hidden">
               <ScrollArea className="h-full">
                 <div className="p-8 pb-32 flex flex-col gap-6">
                   <div className="bg-primary/5 p-10 rounded-[3.5rem] border border-primary/20 space-y-8 shadow-[0_30px_100px_rgba(168,85,247,0.1)] flex-1 flex flex-col justify-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-10 opacity-[0.03] -rotate-12"><Send className="w-64 h-64 text-primary" /></div>
                      <div className="text-center space-y-3 relative z-10">
                        <h3 className="text-3xl font-black text-white uppercase italic tracking-widest leading-none">Квантовый Маяк</h3>
                        <p className="text-[10px] text-primary/60 font-black uppercase tracking-[0.5em] ml-1">Broadcast Signal Alpha</p>
                      </div>
                      <Textarea 
                        placeholder="Текст глобального оповещения..." 
                        value={broadcastText} 
                        onChange={e => setBroadcastText(e.target.value)} 
                        className="bg-black/40 border-white/10 min-h-[200px] rounded-[2.5rem] resize-none text-lg p-8 font-medium tracking-tight shadow-inner focus:border-primary/50 transition-all placeholder:text-white/5" 
                      />
                      <Button 
                        onClick={handleBroadcast} 
                        disabled={isBroadcasting || !broadcastText.trim()} 
                        className="w-full h-20 bg-primary text-white font-black uppercase italic tracking-[0.3em] gap-4 rounded-[1.8rem] shadow-2xl shadow-primary/30 active:scale-95 transition-all text-sm border border-white/10 group overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        {isBroadcasting ? <Loader2 className="animate-spin w-7 h-7" /> : <><Send className="w-6 h-6 fill-current group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Активировать Маяк</>}
                      </Button>
                   </div>
                 </div>
               </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-white/[0.03] p-6 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center gap-3 shadow-xl hover:bg-white/[0.07] transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity"><Icon className="w-16 h-16" /></div>
      <div className={cn("p-4 rounded-2xl bg-black/40 border border-white/5 group-hover:scale-110 transition-transform shadow-lg", color)}>
        <Icon className="w-7 h-7" />
      </div>
      <div className="text-center relative z-10">
        <span className="text-3xl font-black italic text-white tabular-nums block tracking-tighter leading-none">{value}</span>
        <div className="mt-2 space-y-0.5">
           <span className="text-[9px] font-black uppercase text-muted-foreground/40 tracking-[0.3em] block">{label}</span>
           <span className="text-[7px] font-black uppercase text-primary/30 tracking-[0.2em] block italic">{sub}</span>
        </div>
      </div>
    </div>
  );
}
