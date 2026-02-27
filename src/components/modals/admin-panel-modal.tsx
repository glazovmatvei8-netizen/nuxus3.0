
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, updateDoc, limit, getDocs } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { ShieldAlert, Users, CreditCard, Send, ShieldCheck, Loader2, Star, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, Message } from '@/lib/types';
import { formatDisplayName, cn } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [alertText, setAlertText] = useState('');

  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(100))), [db]);
  const { data: users, isLoading: isUsersLoading } = useCollection<User>(usersQuery);

  const toggleBan = (targetUser: User) => {
    if (!db) return;
    const userRef = doc(db, 'users', targetUser.id);
    updateDocumentNonBlocking(userRef, { isBanned: !targetUser.isBanned });
    toast({ title: targetUser.isBanned ? "Юзер разбанен" : "Юзер забанен" });
  };

  const handleGlobalAlert = async () => {
    if (!alertText.trim() || !db) return;
    setIsSendingAlert(true);
    try {
      // Имитация рассылки
      toast({ title: "Рассылка отправлена (имитация)", description: "Функция будет доступна в следующем ядре." });
      setAlertText('');
    } catch (e) {
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setIsSendingAlert(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-primary/20 p-0 overflow-hidden h-[80vh] flex flex-col rounded-[2.5rem] shadow-2xl shadow-primary/20">
        <DialogHeader className="p-6 bg-primary/10 border-b border-primary/20 shrink-0">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter italic">
            <ShieldAlert className="w-8 h-8 text-primary" /> Ядро Админа Nuxus
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="users" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 grid grid-cols-3 bg-muted/50 p-1 rounded-2xl shrink-0">
            <TabsTrigger value="users" className="font-bold uppercase text-[10px] tracking-widest"><Users className="w-3 h-3 mr-2" /> Юзеры</TabsTrigger>
            <TabsTrigger value="payments" className="font-bold uppercase text-[10px] tracking-widest"><CreditCard className="w-3 h-3 mr-2" /> Оплаты</TabsTrigger>
            <TabsTrigger value="system" className="font-bold uppercase text-[10px] tracking-widest"><ShieldCheck className="w-3 h-3 mr-2" /> Система</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="flex-1 min-h-0 overflow-hidden p-0 m-0">
            <ScrollArea className="h-full px-6 py-4">
              <div className="space-y-3">
                {isUsersLoading ? (
                  <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
                ) : (
                  users?.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-white/5 group hover:bg-muted/40 transition-all">
                      <div className="flex items-center gap-3">
                        <UserAvatar userId={u.id} className="h-10 w-10" manualAvatarUrl={u.avatarUrl} fallbackName={u.name} />
                        <div className="flex flex-col">
                          <span className="font-bold text-sm flex items-center gap-1">
                            {formatDisplayName(u.name)} 
                            {u.isPremium && <Star className="w-3 h-3 text-accent fill-accent" />}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">{u.phone} • {u.username}</span>
                        </div>
                      </div>
                      <Button 
                        variant={u.isBanned ? "default" : "outline"} 
                        size="sm" 
                        className={cn("rounded-xl h-9", u.isBanned ? "bg-accent text-accent-foreground" : "text-destructive border-destructive/20 hover:bg-destructive/10")}
                        onClick={() => toggleBan(u)}
                      >
                        {u.isBanned ? <ShieldCheck className="w-4 h-4 mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
                        {u.isBanned ? "Разбанить" : "Забанить"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="payments" className="p-6">
            <div className="bg-muted/20 p-8 rounded-3xl border border-dashed border-white/10 text-center space-y-4">
              <CreditCard className="w-12 h-12 text-primary mx-auto opacity-30" />
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Ожидающие оплаты отображаются в чате Nuxus Bot</p>
            </div>
          </TabsContent>

          <TabsContent value="system" className="p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary ml-1">Глобальная рассылка</h3>
              <div className="flex gap-2">
                <Input 
                  placeholder="Текст для всех юзеров..." 
                  value={alertText}
                  onChange={e => setAlertText(e.target.value)}
                  className="bg-muted border-none h-14 rounded-2xl"
                />
                <Button size="icon" className="h-14 w-14 rounded-2xl bg-primary shadow-lg shadow-primary/20" onClick={handleGlobalAlert}>
                  {isSendingAlert ? <Loader2 className="animate-spin" /> : <Send className="w-6 h-6" />}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
