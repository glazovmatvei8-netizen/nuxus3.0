
"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit, updateDoc, writeBatch, where, orderBy, increment } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Ban, ShieldCheck, 
  MoreVertical, Check, Activity
} from 'lucide-react';
import type { User, TopUpRequest } from '@/lib/types';
import { formatDisplayName, isUserPremium, cn, isGlobalAdmin } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { addMonths, addYears } from 'date-fns';

const ROOT_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

/**
 * ADMIN PANEL MODAL V54.0.1 (Build Stability Fix)
 */
export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');
  const [requestFilter, setRequestFilter] = useState<'pending' | 'all'>('pending');

  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(1000))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

  const topUpRequestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    if (requestFilter === 'pending') {
      return query(collection(db, 'topUpRequests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    }
    return query(collection(db, 'topUpRequests'), orderBy('createdAt', 'desc'), limit(200));
  }, [db, requestFilter]);
  
  const { data: rawTopUpRequests } = useCollection<TopUpRequest>(topUpRequestsQuery);

  const stats = useMemo(() => {
    if (!users) return { total: 0, premium: 0, admins: 0, banned: 0 };
    return {
      total: users.length || 0,
      premium: users.filter(u => isUserPremium(u)).length,
      admins: users.filter(u => isGlobalAdmin(u)).length,
      banned: users.filter(u => u.isBanned).length
    };
  }, [users]);

  const handleAction = async (targetId: string, action: string, value?: any) => {
    if (!db) return;
    if (targetId === ROOT_UID && (action === 'ban' || action === 'remove_admin')) {
      toast({ title: "Ошибка", description: "Админ неприкосновенен.", variant: "destructive" });
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
        else if (value === '1y') expiry = addYears(new Date(), 1);
        update = { isPremium: true, premiumUntil: expiry.toISOString() };
        break;
      case 'remove_premium': 
        update = { isPremium: false, premiumUntil: null }; 
        break;
    }

    try {
      await updateDoc(userRef, update);
      toast({ title: "Конфигурация узла обновлена" });
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
        id: txRef.id, userId: req.userId, amount: req.amount,
        type: 'deposit', status: 'completed', otherPartyName: 'Система 🛡️',
        createdAt: new Date().toISOString()
      });

      await batch.commit();
      toast({ title: "Заявка одобрена" });
    } catch (e) { toast({ title: "Сбой синхронизации" }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0a0a0c]/98 backdrop-blur-[50px] border-primary/30 p-0 overflow-hidden h-[90vh] flex flex-col rounded-[3rem] shadow-2xl border outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 p-3 rounded-2xl border border-primary/20"><ShieldAlert className="w-8 h-8 text-primary animate-pulse" /></div>
              <DialogTitle className="text-white uppercase italic font-black text-3xl">Админ-панель</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-8 pt-6 shrink-0">
            <TabsList className="grid w-full bg-white/5 p-1.5 rounded-[1.6rem] grid-cols-3 gap-1.5 border border-white/5">
              <TabsTrigger value="analytics" className="rounded-xl text-[10px] font-black uppercase">Сводка</TabsTrigger>
              <TabsTrigger value="users" className="rounded-xl text-[10px] font-black uppercase">Узлы</TabsTrigger>
              <TabsTrigger value="requests" className="rounded-xl text-[10px] font-black uppercase">Заявки</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 relative mt-4 overflow-hidden">
            <TabsContent value="analytics" className="h-full m-0 p-8 space-y-8 overflow-y-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Всего узлов" value={stats.total} icon={Users} color="text-white" />
                <StatCard label="Elite-узлы" value={stats.premium} icon={Star} color="text-accent" />
                <StatCard label="Админы" value={stats.admins} icon={ShieldCheck} color="text-primary" />
                <StatCard label="Баны" value={stats.banned} icon={Ban} color="text-red-500" />
              </div>
            </TabsContent>

            <TabsContent value="users" className="h-full m-0 flex flex-col overflow-hidden">
              <div className="px-8 pb-4"><Input placeholder="Поиск в базе..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="bg-white/5 h-12 rounded-xl" /></div>
              <ScrollArea className="flex-1"><div className="px-8 space-y-2 pb-20">{users?.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <UserAvatar userId={u.id} className="h-10 w-10" />
                    <div className="flex flex-col text-left"><span className="font-bold text-white text-sm">{u.name}</span><span className="text-[10px] text-primary/60">{u.username}</span></div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0a0a0c] border-white/10 rounded-2xl p-2 w-56">
                      <DropdownMenuItem onClick={() => handleAction(u.id, u.isAdmin ? 'remove_admin' : 'make_admin')}>{u.isAdmin ? 'Снять админа' : 'Дать админа'}</DropdownMenuItem>
                      <DropdownMenuSub><DropdownMenuSubTrigger>Выдать Elite</DropdownMenuSubTrigger><DropdownMenuSubContent className="bg-[#0a0a0c] p-2">
                        <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', '1m')}>1 месяц</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', '1y')}>1 год</DropdownMenuItem>
                      </DropdownMenuSubContent></DropdownMenuSub>
                      <DropdownMenuItem onClick={() => handleAction(u.id, u.isBanned ? 'unban' : 'ban')} className="text-red-500">{u.isBanned ? 'Разбанить' : 'Забанить'}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}</div></ScrollArea>
            </TabsContent>

            <TabsContent value="requests" className="h-full m-0 flex flex-col overflow-hidden">
               <ScrollArea className="flex-1"><div className="p-8 space-y-4 pb-20">
                 {rawTopUpRequests?.map(req => (
                   <div key={req.id} className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-[2rem]">
                      <div className="flex items-center gap-4 text-left">
                        <UserAvatar userId={req.userId} className="h-12 w-12" />
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-sm">{req.userName}</span>
                          <span className="text-primary font-black italic">{req.amount} NX</span>
                        </div>
                      </div>
                      {req.status === 'pending' ? (
                        <div className="flex gap-2"><Button onClick={() => handleApproveTopUp(req)} className="bg-green-500 h-10 px-4 rounded-xl"><Check className="w-4 h-4" /></Button></div>
                      ) : <span className="text-[10px] font-black uppercase opacity-40 italic">{req.status}</span>}
                   </div>
                 ))}
               </div></ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center gap-2">
      <Icon className={cn("w-6 h-6", color)} />
      <span className="text-2xl font-black text-white italic">{value}</span>
      <span className="text-[8px] font-black uppercase text-muted-foreground/40">{label}</span>
    </div>
  );
}
