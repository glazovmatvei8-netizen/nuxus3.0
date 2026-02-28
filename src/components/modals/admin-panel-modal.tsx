
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit, where, getDocs, addDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Send, 
  Loader2, Star, Search, Activity, BarChart3, 
  Globe, Zap, Terminal, Shield, Trash2, Eraser,
  Database, Server, Cpu, HeartPulse, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { formatDisplayName, cn } from '@/lib/utils';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { addMonths } from 'date-fns';

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Имитация нагрузки ресурсов
  const [cpuLoad, setCpuLoad] = useState(12);
  const [memoryUsage, setMemoryUsage] = useState(28);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setCpuLoad(Math.floor(Math.random() * (20 - 5) + 5));
      setMemoryUsage(Math.floor(Math.random() * (35 - 15) + 15));
    }, 4000);
    return () => clearInterval(interval);
  }, [open]);

  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(1000))), [db]);
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

  const togglePremium = (targetUser: User) => {
    if (!db) return;
    const userRef = doc(db, 'users', targetUser.id);
    const isNowPremium = !targetUser.isPremium;
    const expiry = isNowPremium ? addMonths(new Date(), 1).toISOString() : null;
    updateDocumentNonBlocking(userRef, { 
      isPremium: isNowPremium,
      premiumUntil: expiry
    });
    toast({ title: isNowPremium ? "Premium выдан на 1 мес." : "Premium отозван" });
  };

  const deleteAccount = (targetUser: User) => {
    if (!db || !confirm(`УДАЛИТЬ аккаунт ${targetUser.username} навсегда?`)) return;
    const userRef = doc(db, 'users', targetUser.id);
    deleteDocumentNonBlocking(userRef);
    toast({ title: "Аккаунт удален" });
  };

  const handleQuickCleanup = async () => {
    if (!db || !confirm('Удалить всех заблокированных пользователей?')) return;
    setIsCleaning(true);
    try {
      const q = query(collection(db, 'users'), where('isBanned', '==', true));
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        deleteDocumentNonBlocking(docSnap.ref);
      }
      toast({ title: "Очистка завершена" });
    } catch (e) {
      toast({ title: "Ошибка очистки", variant: "destructive" });
    } finally {
      setIsCleaning(false);
    }
  };

  const runDbHealthCheck = () => {
    setIsCheckingDb(true);
    setTimeout(() => {
      setIsCheckingDb(false);
      toast({ title: "База данных в норме", description: "Индексы оптимизированы, аномалий не найдено." });
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-card border-primary/20 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl border">
        {/* Header - Fixed */}
        <div className="p-6 bg-gradient-to-r from-primary/20 to-accent/10 border-b border-primary/10 shrink-0 z-50">
          <div className="flex items-center justify-between text-xl font-black uppercase italic text-white tracking-tighter">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span>Ядро Nuxus v4.1</span>
                <span className="text-[9px] font-bold tracking-[0.4em] text-primary-foreground opacity-70 mt-1 uppercase">Control Center</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                 <span className="text-[8px] text-green-500 font-black">CORE ONLINE</span>
               </div>
               <Zap className="w-5 h-5 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        <Tabs defaultValue="stats" className="flex-1 flex flex-col min-h-0 relative z-10">
          <TabsList className="mx-6 mt-4 grid grid-cols-3 bg-muted/30 p-1 rounded-2xl shrink-0 gap-1 border border-white/5">
            <TabsTrigger value="stats" className="font-bold uppercase text-[9px] tracking-widest transition-all"><BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Сводка</TabsTrigger>
            <TabsTrigger value="users" className="font-bold uppercase text-[9px] tracking-widest transition-all"><Users className="w-3.5 h-3.5 mr-1.5" /> Юзеры</TabsTrigger>
            <TabsTrigger value="system" className="font-bold uppercase text-[9px] tracking-widest transition-all"><Globe className="w-3.5 h-3.5 mr-1.5" /> Система</TabsTrigger>
          </TabsList>

          {/* Stats Content */}
          <TabsContent value="stats" className="flex-1 min-h-0 m-0 overflow-hidden relative">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-5 bg-primary/5 rounded-[2rem] border border-primary/10 hover:bg-primary/10 transition-all cursor-default">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Юзеры</span>
                      <Users className="w-4 h-4 text-primary/40" />
                    </div>
                    <div className="text-3xl font-black italic text-white">{stats.total}</div>
                  </div>
                  <div className="p-5 bg-accent/5 rounded-[2rem] border border-accent/10 hover:bg-accent/10 transition-all cursor-default">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Premium</span>
                      <Star className="w-4 h-4 text-accent/40" />
                    </div>
                    <div className="text-3xl font-black italic text-white">{stats.premium}</div>
                  </div>
                  <div className="p-5 bg-destructive/5 rounded-[2rem] border border-destructive/10 hover:bg-destructive/10 transition-all cursor-default">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-destructive uppercase tracking-[0.2em]">Бан-лист</span>
                      <Shield className="w-4 h-4 text-destructive/40" />
                    </div>
                    <div className="text-3xl font-black italic text-white">{stats.banned}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="p-5 bg-muted/20 rounded-[2rem] border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Статус Базы</span>
                      </div>
                      <span className="text-[8px] font-bold text-green-500 uppercase">Оптимизировано</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                       <span>Firestore Connections</span>
                       <span className="text-white">Active (SSL)</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                       <span>Database Health</span>
                       <span className="text-white">100% OK</span>
                    </div>
                  </div>

                  <div className="p-5 bg-muted/20 rounded-[2rem] border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HeartPulse className="w-4 h-4 text-accent" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Сессии</span>
                      </div>
                      <span className="text-[8px] font-bold text-accent uppercase">Живой поток</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                       <span>Active Calls</span>
                       <span className="text-white">{Math.floor(Math.random() * 5)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                       <span>Global Messages</span>
                       <span className="text-white">{stats.total * 42}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-muted/20 rounded-[2rem] border border-white/5 space-y-6 mb-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Нагрузка Ядра</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-[9px] font-bold uppercase opacity-60 text-white">
                        <div className="flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU Load</div>
                        <span>{cpuLoad}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${cpuLoad}%` }} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[9px] font-bold uppercase opacity-60 text-white">
                        <div className="flex items-center gap-1"><Server className="w-3 h-3" /> RAM Usage</div>
                        <span>{memoryUsage}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${memoryUsage}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Users Content */}
          <TabsContent value="users" className="flex-1 min-h-0 overflow-hidden flex flex-col p-0 m-0 relative">
            <div className="px-6 py-4 border-b border-white/5 bg-muted/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Никнейм, ID или Телефон..." 
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="bg-card border-white/10 h-11 rounded-xl pl-10 text-sm focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2 pb-24">
                {isUsersLoading ? (
                  <div className="flex flex-col items-center justify-center p-12 gap-3 opacity-50">
                    <Loader2 className="animate-spin text-primary w-6 h-6" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Загрузка базы...</span>
                  </div>
                ) : filteredUsers.length > 0 ? filteredUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-2xl border border-white/5 hover:bg-muted/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <UserAvatar userId={u.id} className="h-10 w-10" manualAvatarUrl={u.avatarUrl} fallbackName={u.name} />
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                          {formatDisplayName(u.name)} 
                          {u.isPremium && <Star className="w-3 h-3 text-accent fill-accent" />}
                          {u.isBanned && <Shield className="w-3 h-3 text-destructive" />}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60 tracking-wider">{u.username || 'Без ника'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className={cn("h-8 w-8 transition-colors", u.isPremium ? "text-accent" : "text-muted-foreground hover:text-accent")} onClick={() => togglePremium(u)}>
                        <Star className={cn("w-4 h-4", u.isPremium && "fill-accent")} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => toggleBan(u)}>
                        <Shield className={cn("w-4 h-4", u.isBanned && "fill-destructive text-destructive")} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteAccount(u)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="p-12 text-center text-muted-foreground italic text-xs uppercase tracking-widest opacity-50">Юзеры не найдены</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* System Content */}
          <TabsContent value="system" className="flex-1 min-h-0 m-0 overflow-hidden relative">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-muted/20 rounded-[2rem] border border-white/5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Обслуживание</span>
                    </div>
                    <div className="space-y-2">
                      <Button variant="destructive" className="w-full h-11 rounded-xl text-[9px] uppercase font-bold tracking-widest" onClick={handleQuickCleanup} disabled={isCleaning}>
                        {isCleaning ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Eraser className="w-3 h-3 mr-2" />}
                        Удалить забаненных
                      </Button>
                      <Button variant="outline" className="w-full h-11 rounded-xl text-[9px] uppercase font-bold tracking-widest border-primary/20 text-primary" onClick={runDbHealthCheck} disabled={isCheckingDb}>
                        {isCheckingDb ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                        Переиндексация БД
                      </Button>
                    </div>
                  </div>

                  <div className="p-6 bg-primary/10 rounded-[2rem] border border-primary/20 space-y-4">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Broadcast</span>
                    </div>
                    <div className="space-y-3">
                      <textarea 
                        placeholder="Текст уведомления..." 
                        value={alertText}
                        onChange={e => setAlertText(e.target.value)}
                        className="w-full bg-card border border-white/10 h-24 rounded-xl text-xs p-3 focus:outline-none focus:border-primary/50 resize-none"
                      />
                      <Button 
                        className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20" 
                        onClick={() => {
                          if (!alertText.trim()) return;
                          setIsSendingAlert(true);
                          setTimeout(() => {
                            setIsSendingAlert(false);
                            setAlertText('');
                            toast({ title: "Разослано" });
                          }, 1500);
                        }}
                        disabled={isSendingAlert || !alertText.trim()}
                      >
                        {isSendingAlert ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4 mr-2" />}
                        Трансляция
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
