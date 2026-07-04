
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
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit, updateDoc, writeBatch, getDocs, where, orderBy, increment, deleteDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Ban, ShieldCheck, 
  MoreVertical, Send, Loader2, Database, Package, FileText, UserPlus, ShieldX, CalendarClock, Wallet, Check, X, Trash2
} from 'lucide-react';
import type { User, TopUpRequest } from '@/lib/types';
import { formatDisplayName, isUserPremium, cn, isGlobalAdmin } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { addDays, addMonths, addYears } from 'date-fns';

const ROOT_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');
  const [broadcastText, setBroadcastText] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(500))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

  const topUpRequestsQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'topUpRequests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'))), [db]);
  const { data: topUpRequests } = useCollection<TopUpRequest>(topUpRequestsQuery);

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
        let expiry = new Date();
        if (value === '1d') expiry = addDays(new Date(), 1);
        else if (value === '1m') expiry = addMonths(new Date(), 1);
        else if (value === '3m') expiry = addMonths(new Date(), 3);
        else if (value === '6m') expiry = addMonths(new Date(), 6);
        else if (value === '1y') expiry = addYears(new Date(), 1);
        else if (value === '2y') expiry = addYears(new Date(), 2);
        update = { isPremium: true, premiumUntil: expiry.toISOString() };
        break;
      case 'remove_premium': update = { isPremium: false, premiumUntil: null }; break;
    }

    try {
      await updateDoc(userRef, update);
      toast({ title: "Узел обновлен" });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
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
        otherPartyName: 'Admin Approval',
        createdAt: new Date().toISOString()
      });

      await batch.commit();
      toast({ title: "Заявка одобрена", description: `${req.amount} NX начислено ${req.userName}` });
    } catch (e: any) {
      toast({ title: "Ошибка одобрения", variant: "destructive" });
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
           content: broadcastText.trim(), contentType: 'broadcast', sentAt: new Date().toISOString() 
        });
      });
      await batch.commit();
      toast({ title: "Рассылка завершена" });
      setBroadcastText('');
    } finally { setIsBroadcasting(false); }
  };

  const premiumOptions = [
    { label: '1 ДЕНЬ', value: '1d' },
    { label: '1 МЕСЯЦ', value: '1m' },
    { label: '3 МЕСЯЦА', value: '3m' },
    { label: '6 МЕСЯЦЕВ', value: '6m' },
    { label: '1 ГОД', value: '1y' },
    { label: '2 ГОДА', value: '2y' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0a0a0c]/95 backdrop-blur-[40px] border-primary/30 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl border outline-none">
        <DialogHeader className="p-8 pb-4 shrink-0 text-left border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2.5 rounded-xl border border-primary/20">
              <ShieldAlert className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-white uppercase italic font-black tracking-tighter text-xl">Nuxus Admin Control</DialogTitle>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/40 mt-0.5">Terminal Access v25.4.2</p>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-8 pt-6 shrink-0">
            <TabsList className="grid w-full bg-white/5 p-1.5 rounded-[1.4rem] grid-cols-4 gap-1 border border-white/5 shadow-inner">
              <TabsTrigger value="analytics" className="rounded-xl text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Аналитика</TabsTrigger>
              <TabsTrigger value="users" className="rounded-xl text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Узлы</TabsTrigger>
              <TabsTrigger value="requests" className="rounded-xl text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Заявки ({topUpRequests?.length || 0})</TabsTrigger>
              <TabsTrigger value="broadcast" className="rounded-xl text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Маяк</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 relative">
            <TabsContent value="analytics" className="h-full m-0 p-8 space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Узлов" value={stats.total} icon={Users} color="text-white" />
                <StatCard label="Premium" value={stats.premium} icon={Star} color="text-accent" />
                <StatCard label="Админы" value={stats.admins} icon={ShieldCheck} color="text-primary" />
                <StatCard label="Баны" value={stats.banned} icon={Ban} color="text-red-500" />
              </div>
            </TabsContent>

            <TabsContent value="users" className="h-full m-0 p-0 flex flex-col animate-in fade-in duration-500">
              <div className="p-6 shrink-0"><Input placeholder="Поиск по базе сигналов..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-6 text-sm" /></div>
              <ScrollArea className="flex-1">
                <div className="px-6 space-y-2 pb-20">
                  {users?.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.usernameLowercase?.includes(userSearch.toLowerCase())).map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/[0.08] transition-all">
                      <div className="flex items-center gap-4 text-left">
                        <UserAvatar userId={u.id} className="h-12 w-12" />
                        <div className="flex flex-col">
                          <span className="font-black text-sm text-white flex items-center gap-2 italic tracking-tight">
                            {formatDisplayName(u.name)}
                            {isGlobalAdmin(u) && <ShieldCheck className="w-4 h-4 text-primary" />}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-black tracking-widest opacity-60">{u.username}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-white/20 hover:text-white"><MoreVertical className="w-5 h-5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 obsidian-glass rounded-2xl p-2 border-white/10 shadow-2xl">
                           <DropdownMenuItem onClick={() => handleAction(u.id, u.isAdmin ? 'remove_admin' : 'make_admin')} className="gap-3 font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl">
                             {u.isAdmin ? <><ShieldX className="w-5 h-5 text-red-400" /> Снять Админа</> : <><ShieldCheck className="w-5 h-5 text-primary" /> Назначить Админа</>}
                           </DropdownMenuItem>
                           
                           <DropdownMenuSub>
                             <DropdownMenuSubTrigger className="gap-3 font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl">
                               <Star className="w-5 h-5 text-accent" /> Выдать Premium
                             </DropdownMenuSubTrigger>
                             <DropdownMenuSubContent className="w-56 obsidian-glass rounded-xl p-2 border-white/20 shadow-2xl bg-black/90">
                               {premiumOptions.map(opt => (
                                 <DropdownMenuItem key={opt.value} onClick={() => handleAction(u.id, 'give_premium', opt.value)} className="text-[10px] font-black uppercase tracking-widest py-3 px-4 rounded-lg text-white hover:bg-primary/20 transition-all border border-transparent hover:border-primary/30 mb-1 last:mb-0">
                                   {opt.label}
                                 </DropdownMenuItem>
                               ))}
                             </DropdownMenuSubContent>
                           </DropdownMenuSub>

                           {isUserPremium(u) && (
                             <DropdownMenuItem onClick={() => handleAction(u.id, 'remove_premium')} className="gap-3 font-black uppercase text-[10px] tracking-widest py-3.5 text-red-400 rounded-xl">
                               <Trash2 className="w-5 h-5" /> Сбросить Премиум
                             </DropdownMenuItem>
                           )}

                           <DropdownMenuSeparator className="bg-white/5 mx-2 my-1" />
                           
                           <DropdownMenuItem onClick={() => handleAction(u.id, u.isBanned ? 'unban' : 'ban')} className={cn("gap-3 font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl", u.isBanned ? "text-green-400" : "text-red-500")}>
                             {u.isBanned ? <><ShieldCheck className="w-5 h-5" /> Разбанить</> : <><Ban className="w-5 h-5" /> Забанить</>}
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="requests" className="h-full m-0 p-0 flex flex-col animate-in fade-in duration-500">
               <ScrollArea className="flex-1">
                  <div className="p-8 space-y-3 pb-24">
                    {topUpRequests && topUpRequests.length > 0 ? topUpRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-[2.2rem] hover:bg-white/[0.08] transition-all shadow-xl">
                         <div className="flex items-center gap-4 text-left min-w-0 flex-1">
                           <UserAvatar userId={req.userId} className="h-14 w-14 shrink-0 shadow-lg" />
                           <div className="flex flex-col min-w-0">
                             <span className="font-black text-white text-base truncate uppercase italic tracking-tight">{req.userName}</span>
                             <span className="text-xl text-primary font-black italic tracking-tighter tabular-nums">{req.amount} NX</span>
                           </div>
                         </div>
                         <div className="flex gap-3 shrink-0 ml-4">
                           <Button size="icon" onClick={() => handleApproveTopUp(req)} className="h-14 w-14 bg-green-500 hover:bg-green-600 rounded-2xl shadow-lg shadow-green-500/20 active:scale-90 transition-transform">
                             <Check className="w-7 h-7 text-white" />
                           </Button>
                           <Button size="icon" onClick={() => handleRejectTopUp(req.id)} variant="destructive" className="h-14 w-14 rounded-2xl shadow-lg shadow-red-500/20 active:scale-90 transition-transform">
                             <X className="w-7 h-7 text-white" />
                           </Button>
                         </div>
                      </div>
                    )) : (
                      <div className="py-32 text-center opacity-20 flex flex-col items-center gap-6">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                          <Wallet className="w-12 h-12" />
                        </div>
                        <p className="text-[12px] font-black uppercase tracking-[0.5em]">Заявок не обнаружено</p>
                      </div>
                    )}
                  </div>
               </ScrollArea>
            </TabsContent>

            <TabsContent value="broadcast" className="h-full m-0 p-8 flex flex-col gap-6 animate-in fade-in duration-500">
               <div className="bg-primary/10 p-8 rounded-[3rem] border border-primary/20 space-y-6 shadow-2xl flex-1 flex flex-col justify-center">
                  <div className="text-center space-y-2 mb-4">
                    <h3 className="text-xl font-black text-white uppercase italic tracking-widest">Квантовый Маяк</h3>
                    <p className="text-[10px] text-primary/60 font-black uppercase tracking-[0.3em]">Трансляция на все узлы Ядра</p>
                  </div>
                  <Textarea 
                    placeholder="Введите системное сообщение для всех участников..." 
                    value={broadcastText} 
                    onChange={e => setBroadcastText(e.target.value)} 
                    className="bg-black/40 border-white/10 min-h-[160px] rounded-3xl resize-none text-base p-6 font-medium tracking-tight" 
                  />
                  <Button onClick={handleBroadcast} disabled={isBroadcasting || !broadcastText.trim()} className="w-full h-16 bg-primary text-white font-black uppercase italic tracking-[0.2em] gap-3 rounded-2xl shadow-2xl shadow-primary/30 active:scale-95 transition-all text-sm">
                    {isBroadcasting ? <Loader2 className="animate-spin w-6 h-6" /> : <><Send className="w-5 h-5 fill-current" /> Активировать Трансляцию</>}
                  </Button>
               </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white/5 p-6 rounded-[2.2rem] border border-white/5 flex flex-col items-center justify-center gap-2 shadow-xl hover:bg-white/[0.08] transition-all group">
      <div className={cn("p-3 rounded-xl bg-black/20 group-hover:scale-110 transition-transform", color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-center">
        <span className="text-2xl font-black italic text-white tabular-nums block tracking-tighter">{value}</span>
        <span className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.3em]">{label}</span>
      </div>
    </div>
  );
}
