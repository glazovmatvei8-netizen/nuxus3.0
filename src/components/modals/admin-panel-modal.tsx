"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit, updateDoc, writeBatch, where, orderBy, increment } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { ShieldAlert, Users, Star, Ban, Check, Activity, Wallet, Clock } from 'lucide-react';
import type { User, TopUpRequest } from '@/lib/types';
import { formatDisplayName, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('requests');

  const topUpRequestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'topUpRequests'), orderBy('createdAt', 'desc'), limit(100));
  }, [db]);
  const { data: requests } = useCollection<TopUpRequest>(topUpRequestsQuery);

  const handleApprove = async (req: TopUpRequest) => {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', req.userId);
      const reqRef = doc(db, 'topUpRequests', req.id);
      batch.update(userRef, { balance: increment(req.amount) });
      batch.update(reqRef, { status: 'approved' });
      await batch.commit();
      toast({ title: "Одобрено" });
    } catch (e) { toast({ title: "Ошибка", variant: "destructive" }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0a0a0c] border-white/10 rounded-[3rem] p-0 overflow-hidden h-[85vh] flex flex-col shadow-2xl">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 bg-primary/5">
          <DialogTitle className="text-3xl font-black uppercase italic text-white flex items-center gap-4">
            <ShieldAlert className="w-8 h-8 text-primary" /> АДМИН-ЦЕНТР
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-8 mt-6">
            <TabsList className="grid grid-cols-3 bg-white/5 p-1 rounded-2xl border border-white/5">
              <TabsTrigger value="requests" className="text-[10px] font-black uppercase">Заявки</TabsTrigger>
              <TabsTrigger value="users" className="text-[10px] font-black uppercase">Узлы</TabsTrigger>
              <TabsTrigger value="stats" className="text-[10px] font-black uppercase">Система</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <TabsContent value="requests" className="m-0 p-8 space-y-4">
               {requests?.map(req => (
                 <div key={req.id} className="bg-white/5 p-6 rounded-[2rem] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <UserAvatar userId={req.userId} className="h-12 w-12" />
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-white uppercase">{req.userName}</span>
                          <span className="text-primary font-black italic">{req.amount} NX</span>
                          <span className="text-[8px] text-muted-foreground uppercase font-black">{format(new Date(req.createdAt), 'dd MMM HH:mm', { locale: ru })}</span>
                       </div>
                    </div>
                    {req.status === 'pending' ? (
                      <Button onClick={() => handleApprove(req)} className="bg-green-500 h-10 px-6 rounded-xl font-black uppercase text-[10px]">Принять</Button>
                    ) : (
                      <span className="text-[10px] font-black uppercase opacity-20">{req.status}</span>
                    )}
                 </div>
               ))}
               {requests?.length === 0 && <p className="text-center opacity-20 uppercase font-black py-20">Заявок нет</p>}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
