
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

  const topUpRequestsQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'topUpRequests'), where('status', '==', 'pending'))), [db]);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0a0a0c]/90 backdrop-blur-3xl border-primary/30 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl border outline-none">
        <DialogHeader className="p-6 bg-primary/5 border-b border-white/5 shrink-0 text-left">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" /> 
            <DialogTitle className="text-white uppercase italic font-black tracking-tighter">Nuxus Admin Control</DialogTitle>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 pt-3 shrink-0">
            <TabsList className="grid w-full bg-white/5 p-1 rounded-xl grid-cols-4 gap-1">
              <TabsTrigger value="analytics" className="rounded-lg text-[8px] uppercase font-black">Аналитика</TabsTrigger>
              <TabsTrigger value="users" className="rounded-lg text-[8px] uppercase font-black">Узлы</TabsTrigger>
              <TabsTrigger value="requests" className="rounded-lg text-[8px] uppercase font-black">Заявки ({topUpRequests?.length || 0})</TabsTrigger>
              <TabsTrigger value="broadcast" className="rounded-lg text-[8px] uppercase font-black">Маяк</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analytics" className="flex-1 m-0 p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Узлов" value={stats.total} icon={Users} color="text-white" />
              <StatCard label="Premium" value={stats.premium} icon={Star} color="text-accent" />
              <StatCard label="Админы" value={stats.admins} icon={ShieldCheck} color="text-primary" />
              <StatCard label="Баны" value={stats.banned} icon={Ban} color="text-red-500" />
            </div>
          </TabsContent>

          <TabsContent value="users" className="flex-1 m-0 p-0 flex flex-col min-h-0">
            <div className="p-4 px-6 shrink-0"><Input placeholder="Поиск по базе..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-2xl" /></div>
            <ScrollArea className="flex-1">
              <div className="px-6 space-y-2 pb-20">
                {users?.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.username?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-3 text-left">
                      <UserAvatar userId={u.id} className="h-10 w-10" />
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-white flex items-center gap-1">
                          {formatDisplayName(u.name)}
                          {isGlobalAdmin(u) && <ShieldCheck className="w-3 h-3 text-primary" />}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase font-black">{u.username}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl text-white/20"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 obsidian-glass rounded-2xl p-2 border-white/10 shadow-2xl">
                         <DropdownMenuItem onClick={() => handleAction(u.id, u.isAdmin ? 'remove_admin' : 'make_admin')} className="gap-3 font-black uppercase text-[9px] tracking-widest py-3 rounded-xl">
                           {u.isAdmin ? <><ShieldX className="w-4 h-4 text-red-400" /> Снять Админа</> : <><ShieldCheck className="w-4 h-4 text-primary" /> Назначить Админа</>}
                         </DropdownMenuItem>
                         
                         <DropdownMenuSub>
                           <DropdownMenuSubTrigger className="gap-3 font-black uppercase text-[9px] tracking-widest py-3 rounded-xl">
                             <Star className="w-4 h-4 text-accent" /> Выдать Premium
                           </DropdownMenuSubTrigger>
                           <DropdownMenuSubContent className="w-48 obsidian-glass rounded-xl p-1 border-white/10">
                             {['1d', '1m', '3m', '6m', '1y', '2y'].map(v => (
                               <DropdownMenuItem key={v} onClick={() => handleAction(u.id, 'give_premium', v)} className="text-[9px] font-black uppercase py-2">{v.toUpperCase()}</DropdownMenuItem>
                             ))}
                           </DropdownMenuSubContent>
                         </DropdownMenuSub>

                         {isUserPremium(u) && (
                           <DropdownMenuItem onClick={() => handleAction(u.id, 'remove_premium')} className="gap-3 font-black uppercase text-[9px] tracking-widest py-3 text-red-400 rounded-xl">
                             <Trash2 className="w-4 h-4" /> Сбросить Премиум
                           </DropdownMenuItem>
                         )}

                         <DropdownMenuSeparator className="bg-white/5 mx-2 my-1" />
                         
                         <DropdownMenuItem onClick={() => handleAction(u.id, u.isBanned ? 'unban' : 'ban')} className={cn("gap-3 font-black uppercase text-[9px] tracking-widest py-3 rounded-xl", u.isBanned ? "text-green-400" : "text-red-500")}>
                           {u.isBanned ? <><ShieldCheck className="w-4 h-4" /> Разбанить</> : <><Ban className="w-4 h-4" /> Забанить</>}
                         </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="requests" className="flex-1 m-0 p-0 flex flex-col min-h-0">
             <ScrollArea className="flex-1">
                <div className="p-6 space-y-3">
                  {topUpRequests && topUpRequests.length > 0 ? topUpRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-3xl">
                       <div className="flex items-center gap-3">
                         <UserAvatar userId={req.userId} className="h-10 w-10" />
                         <div className="flex flex-col text-left">
                           <span className="font-bold text-white text-sm">{req.userName}</span>
                           <span className="text-[14px] text-primary font-black italic">{req.amount} NX</span>
                         </div>
                       </div>
                       <div className="flex gap-2">
                         <Button size="icon" onClick={() => handleApproveTopUp(req)} className="h-10 w-10 bg-green-500 hover:bg-green-600 rounded-xl"><Check className="w-5 h-5 text-white" /></Button>
                         <Button size="icon" onClick={() => handleRejectTopUp(req.id)} variant="destructive" className="h-10 w-10 rounded-xl"><X className="w-5 h-5" /></Button>
                       </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center opacity-20">
                      <Wallet className="w-12 h-12 mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase">Заявок нет</p>
                    </div>
                  )}
                </div>
             </ScrollArea>
          </TabsContent>

          <TabsContent value="broadcast" className="p-6">
             <div className="bg-primary/10 p-6 rounded-[2rem] border border-primary/20 space-y-4">
                <Textarea placeholder="Введите системное сообщение..." value={broadcastText} onChange={e => setBroadcastText(e.target.value)} className="bg-black/40 border-white/10 min-h-[120px] rounded-2xl resize-none" />
                <Button onClick={handleBroadcast} disabled={isBroadcasting || !broadcastText.trim()} className="w-full h-12 bg-primary text-white font-black uppercase tracking-widest gap-2 rounded-xl shadow-lg">{isBroadcasting ? <Loader2 className="animate-spin w-4 h-4" /> : <><Send className="w-4 h-4" /> Транслировать</>}</Button>
             </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-1 shadow-xl">
      <Icon className={cn("w-4 h-4 mb-1", color)} />
      <span className="text-xl font-black italic text-white tabular-nums">{value}</span>
      <span className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">{label}</span>
    </div>
  );
}
