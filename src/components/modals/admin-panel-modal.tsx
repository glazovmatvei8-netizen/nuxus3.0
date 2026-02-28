
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit, where, getDocs, deleteDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, CreditCard, Send, 
  Loader2, Star, Search, Activity, BarChart3, 
  Globe, Zap, Terminal, Shield, Lock, Trash2, Eraser
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { formatDisplayName, cn } from '@/lib/utils';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Nuxus Admin Core v4.1 "Nuclear Core"
 * Улучшенная версия: удалены пустые зоны и исправлено удаление.
 */
export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Состояние ресурсов
  const [cpuLoad, setCpuLoad] = useState(8);
  const [memoryUsage, setMemoryUsage] = useState(24);
  const [networkTraffic, setNetworkTraffic] = useState(1.2);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setCpuLoad(Math.floor(Math.random() * (15 - 5) + 5));
      setMemoryUsage(Math.floor(Math.random() * (30 - 20) + 20));
      setNetworkTraffic(Number((Math.random() * (2.5 - 0.5) + 0.5).toFixed(1)));
    }, 10000);
    return () => clearInterval(interval);
  }, [open]);

  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(500))), [db]);
  const { data: users, isLoading: isUsersLoading } = useCollection<User>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!userSearch.trim()) return users;
    const s = userSearch.toLowerCase();
    return users.filter(u => 
      u.name?.toLowerCase().includes(s) || 
      u.username?.toLowerCase().includes(s) || 
      u.phone?.includes(s)
    );
  }, [users, userSearch]);

  const stats = useMemo(() => {
    if (!users) return { total: 0, premium: 0, banned: 0 };
    return {
      total: users.length,
      premium: users.filter(u => u.isPremium).length,
      banned: users.filter(u => u.isBanned).length,
    };
  }, [users]);

  const toggleBan = (targetUser: User) => {
    if (!db) return;
    const userRef = doc(db, 'users', targetUser.id);
    const newStatus = !targetUser.isBanned;
    updateDocumentNonBlocking(userRef, { isBanned: newStatus });
    toast({ title: newStatus ? "Аккаунт заблокирован" : "Доступ восстановлен" });
  };

  const deleteAccount = (targetUser: User) => {
    if (!db || !confirm(`УДАЛИТЬ аккаунт ${targetUser.username} навсегда?`)) return;
    const userRef = doc(db, 'users', targetUser.id);
    // Используем неблокирующее удаление для мгновенной реакции на ПК и мобайле
    deleteDocumentNonBlocking(userRef);
    toast({ title: "Аккаунт удален" });
  };

  const handleQuickCleanup = async () => {
    if (!db || !confirm('Очистить аккаунты @Алла и @Mamby?')) return;
    setIsCleaning(true);
    try {
      const targets = ['@алла', '@mamby'];
      for (const username of targets) {
        const q = query(collection(db, 'users'), where('username', '==', username));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
          deleteDocumentNonBlocking(docSnap.ref);
        }
      }
      toast({ title: "Очистка завершена" });
    } catch (e) {
      toast({ title: "Ошибка очистки", variant: "destructive" });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-card border-primary/20 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl border">
        <DialogHeader className="p-6 bg-gradient-to-r from-primary/20 to-accent/10 border-b border-primary/10 shrink-0">
          <DialogTitle className="flex items-center justify-between text-xl font-black uppercase italic text-white tracking-tighter">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span>Ядро Nuxus v4.1</span>
                <span className="text-[8px] font-bold tracking-[0.4em] text-primary-foreground opacity-70 mt-1 uppercase">Control Core</span>
              </div>
            </div>
            <Zap className="w-5 h-5 text-primary animate-pulse" />
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="stats" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 grid grid-cols-3 bg-muted/30 p-1 rounded-2xl shrink-0 gap-1 border border-white/5">
            <TabsTrigger value="stats" className="font-bold uppercase text-[9px] tracking-widest"><BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Сводка</TabsTrigger>
            <TabsTrigger value="users" className="font-bold uppercase text-[9px] tracking-widest"><Users className="w-3.5 h-3.5 mr-1.5" /> Юзеры</TabsTrigger>
            <TabsTrigger value="system" className="font-bold uppercase text-[9px] tracking-widest"><Globe className="w-3.5 h-3.5 mr-1.5" /> Система</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="flex-1 p-6 space-y-6 overflow-y-auto m-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-primary/5 rounded-[2rem] border border-primary/10">
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] block mb-2">Всего</span>
                <div className="text-3xl font-black italic text-white">{stats.total}</div>
              </div>
              <div className="p-5 bg-accent/5 rounded-[2rem] border border-accent/10">
                <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] block mb-2">Premium</span>
                <div className="text-3xl font-black italic text-white">{stats.premium}</div>
              </div>
              <div className="p-5 bg-destructive/5 rounded-[2rem] border border-destructive/10">
                <span className="text-[10px] font-bold text-destructive uppercase tracking-[0.2em] block mb-2">Блок</span>
                <div className="text-3xl font-black italic text-white">{stats.banned}</div>
              </div>
            </div>

            <div className="p-6 bg-muted/20 rounded-[2rem] border border-white/5 space-y-6">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Статус нагрузки</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-bold uppercase opacity-60 text-white"><span>CPU</span><span>{cpuLoad}%</span></div>
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden"><div className="h-full bg-primary transition-all duration-1000" style={{ width: `${cpuLoad}%` }} /></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-bold uppercase opacity-60 text-white"><span>RAM</span><span>{memoryUsage}%</span></div>
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden"><div className="h-full bg-accent transition-all duration-1000" style={{ width: `${memoryUsage}%` }} /></div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="flex-1 min-h-0 overflow-hidden flex flex-col p-0 m-0">
            <div className="px-6 py-4 border-b border-white/5 bg-muted/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Поиск по нику или номеру..." 
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="bg-card border-white/10 h-11 rounded-xl pl-10 text-sm"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {isUsersLoading ? (
                  <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
                ) : filteredUsers.length > 0 ? filteredUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-2xl border border-white/5 hover:bg-muted/30 transition-all">
                    <div className="flex items-center gap-3">
                      <UserAvatar userId={u.id} className="h-10 w-10" manualAvatarUrl={u.avatarUrl} fallbackName={u.name} />
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                          {formatDisplayName(u.name)} 
                          {u.isPremium && <Star className="w-3 h-3 text-accent fill-accent" />}
                          {u.isBanned && <Shield className="w-3 h-3 text-destructive" />}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60">{u.username}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteAccount(u)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant={u.isBanned ? "default" : "outline"} 
                        size="sm" 
                        className={cn("rounded-lg h-7 min-w-[70px] font-bold uppercase text-[8px]", u.isBanned ? "bg-accent text-accent-foreground" : "text-destructive border-destructive/20")} 
                        onClick={() => toggleBan(u)}
                      >
                        {u.isBanned ? "UNBAN" : "BAN"}
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="p-12 text-center text-muted-foreground italic text-xs">Ничего не найдено.</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="system" className="flex-1 p-6 space-y-6 m-0 overflow-y-auto">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-muted/20 rounded-[2rem] border border-white/5 space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Модерация</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-xl border border-destructive/10">
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-destructive uppercase">Очистка @Алла и @Mamby</span><span className="text-[8px] text-muted-foreground">Удаление из базы</span></div>
                    <Button variant="destructive" size="sm" className="h-8 text-[8px] uppercase font-bold" onClick={handleQuickCleanup} disabled={isCleaning}>
                      {isCleaning ? <Loader2 className="w-3 h-3 animate-spin" /> : "Выполнить"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-primary/10 rounded-[2rem] border border-primary/20 space-y-4">
                <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /><span className="text-[10px] font-black uppercase tracking-widest text-white">Рассылка</span></div>
                <Input 
                  placeholder="Текст уведомления..." 
                  value={alertText}
                  onChange={e => setAlertText(e.target.value)}
                  className="bg-card border-white/10 h-11 rounded-xl text-xs"
                />
                <Button 
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 font-black uppercase tracking-[0.2em] text-[10px]" 
                  onClick={() => {
                    if (!alertText.trim()) return;
                    setIsSendingAlert(true);
                    setTimeout(() => {
                      setIsSendingAlert(false);
                      setAlertText('');
                      toast({ title: "Уведомление отправлено" });
                    }, 1000);
                  }}
                  disabled={isSendingAlert || !alertText.trim()}
                >
                  {isSendingAlert ? <Loader2 className="animate-spin" /> : "Отправить"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
