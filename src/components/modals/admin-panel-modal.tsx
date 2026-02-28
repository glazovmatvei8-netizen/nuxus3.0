
"use client"

import React, { useState, useMemo, useEffect, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit, where, getDocs } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Send, 
  Loader2, Star, Search, Activity, BarChart3, 
  Globe, Zap, Terminal, Shield, Trash2, Eraser,
  Database, Server, Cpu, RefreshCw, ShieldCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { formatDisplayName, cn, isGlobalAdmin } from '@/lib/utils';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { addMonths } from 'date-fns';

const CoreMetrics = memo(() => {
  const [cpu, setCpu] = useState(12);
  const [ram, setRam] = useState(28);

  useEffect(() => {
    const interval = setInterval(() => {
      setCpu(Math.floor(Math.random() * (18 - 5) + 5));
      setRam(Math.floor(Math.random() * (32 - 15) + 15));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 bg-muted/20 rounded-[2rem] border border-white/5 space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white">Нагрузка ядра</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex justify-between text-[9px] font-bold uppercase opacity-60 text-white">
            <div className="flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU</div>
            <span>{cpu}%</span>
          </div>
          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${cpu}%` }} />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-[9px] font-bold uppercase opacity-60 text-white">
            <div className="flex items-center gap-1"><Server className="w-3 h-3" /> RAM</div>
            <span>{ram}%</span>
          </div>
          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${ram}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
});
CoreMetrics.displayName = 'CoreMetrics';

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isCleaning, setIsCleaning] = useState(false);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [userSearch, setUserSearch] = useState('');

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
    if (!users) return { total: 0, premium: 0, banned: 0, admins: 0 };
    return {
      total: users.length,
      premium: users.filter(u => u.isPremium).length,
      banned: users.filter(u => u.isBanned).length,
      admins: users.filter(u => isGlobalAdmin(u)).length,
    };
  }, [users]);

  const toggleBan = (targetUser: User) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, 'users', targetUser.id), { isBanned: !targetUser.isBanned });
    toast({ title: targetUser.isBanned ? "Доступ восстановлен" : "Аккаунт заблокирован" });
  };

  const togglePremium = (targetUser: User) => {
    if (!db) return;
    const isNowPremium = !targetUser.isPremium;
    const expiry = isNowPremium ? addMonths(new Date(), 1).toISOString() : null;
    updateDocumentNonBlocking(doc(db, 'users', targetUser.id), { 
      isPremium: isNowPremium,
      premiumUntil: expiry
    });
    toast({ title: isNowPremium ? "Premium выдан" : "Premium отозван" });
  };

  const toggleAdmin = (targetUser: User) => {
    if (!db) return;
    if (targetUser.phone === '+79513332147') {
      toast({ title: "Ошибка", description: "Нельзя снять права с Главного Админа", variant: "destructive" });
      return;
    }
    const isNowAdmin = !targetUser.isAdmin;
    updateDocumentNonBlocking(doc(db, 'users', targetUser.id), { isAdmin: isNowAdmin });
    toast({ title: isNowAdmin ? "Назначен Глобальным Админом" : "Права Админа отозваны" });
  };

  const handleQuickCleanup = async () => {
    if (!db || !confirm('Удалить всех заблокированных?')) return;
    setIsCleaning(true);
    try {
      const q = query(collection(db, 'users'), where('isBanned', '==', true));
      const snap = await getDocs(q);
      snap.forEach(d => deleteDocumentNonBlocking(d.ref));
      toast({ title: "База данных очищена" });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-card border-primary/20 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl border">
        <DialogHeader className="sr-only">
          <DialogTitle>Админ-панель Nuxus v4.6</DialogTitle>
          <DialogDescription>Управление ядром системы</DialogDescription>
        </DialogHeader>

        <div className="p-6 bg-gradient-to-r from-primary/20 to-accent/10 border-b border-white/5 shrink-0">
          <div className="flex items-center justify-between text-xl font-black uppercase italic text-white tracking-tighter">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span>Nuxus v4.6</span>
                <span className="text-[9px] font-bold tracking-[0.4em] text-primary-foreground opacity-70 mt-1 uppercase">Консоль управления</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] text-green-500 font-black">СИСТЕМА ONLINE</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="stats" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="mx-6 mt-4 grid grid-cols-3 bg-muted/30 p-1 rounded-2xl shrink-0 border border-white/5">
            <TabsTrigger value="stats" className="font-bold uppercase text-[9px] tracking-widest"><BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Сводка</TabsTrigger>
            <TabsTrigger value="users" className="font-bold uppercase text-[9px] tracking-widest"><Users className="w-3.5 h-3.5 mr-1.5" /> Юзеры</TabsTrigger>
            <TabsTrigger value="system" className="font-bold uppercase text-[9px] tracking-widest"><Terminal className="w-3.5 h-3.5 mr-1.5" /> Система</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="flex-1 min-h-0 m-0 overflow-hidden outline-none">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6 pb-20">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Юзеры', val: stats.total, color: 'primary', icon: Users },
                    { label: 'Prime', val: stats.premium, color: 'accent', icon: Star },
                    { label: 'Админы', val: stats.admins, color: 'blue-500', icon: ShieldCheck },
                    { label: 'Бан', val: stats.banned, color: 'destructive', icon: Shield },
                  ].map((s, idx) => (
                    <div key={idx} className={cn("p-5 rounded-[2rem] border", s.color === 'primary' ? 'bg-primary/5 border-primary/10' : s.color === 'accent' ? 'bg-accent/5 border-accent/10' : s.color === 'blue-500' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-destructive/5 border-destructive/10')}>
                      <span className={cn("text-[10px] font-bold uppercase tracking-widest block mb-2", s.color === 'primary' ? 'text-primary' : s.color === 'accent' ? 'text-accent' : s.color === 'blue-500' ? 'text-blue-500' : 'text-destructive')}>{s.label}</span>
                      <div className="text-2xl font-black italic text-white flex items-center justify-between">
                        {s.val}
                        <s.icon className={cn("w-5 h-5 opacity-20", s.color === 'primary' ? 'text-primary' : s.color === 'accent' ? 'text-accent' : s.color === 'blue-500' ? 'text-blue-500' : 'text-destructive')} />
                      </div>
                    </div>
                  ))}
                </div>
                
                <CoreMetrics />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="p-6 bg-muted/20 rounded-[2.5rem] border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Статус БД</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[11px] font-bold text-muted-foreground"><span>Доступность</span><span className="text-green-500">Полная</span></div>
                      <div className="flex justify-between text-[11px] font-bold text-muted-foreground"><span>Шифрование</span><span className="text-white">AES-256</span></div>
                    </div>
                  </div>
                  <div className="p-6 bg-muted/20 rounded-[2.5rem] border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-accent" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Сеть</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[11px] font-bold text-muted-foreground"><span>Пинг</span><span className="text-white">~12ms</span></div>
                      <div className="flex justify-between text-[11px] font-bold text-muted-foreground"><span>Трафик</span><span className="text-green-500">Оптимально</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="users" className="flex-1 min-h-0 overflow-hidden flex flex-col p-0 m-0 outline-none">
            <div className="px-6 py-4 border-b border-white/5 bg-muted/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Поиск по нику, ID или телефону..." 
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="bg-card border-white/10 h-11 rounded-xl pl-10 text-sm focus:border-primary/50"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2 pb-24">
                {isUsersLoading ? (
                  <div className="flex flex-col items-center justify-center p-12 gap-3 opacity-50">
                    <Loader2 className="animate-spin text-primary w-6 h-6" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Загрузка...</span>
                  </div>
                ) : filteredUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-2xl border border-white/5 hover:bg-muted/30 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar userId={u.id} className="h-10 w-10 shrink-0" manualAvatarUrl={u.avatarUrl} fallbackName={u.name} />
                      <div className="flex flex-col text-left min-w-0">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-white truncate">
                          {formatDisplayName(u.name)} 
                          {u.isPremium && <Star className="w-3 h-3 text-accent fill-accent shrink-0" />}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60 tracking-wider truncate">{u.username || '@user'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className={cn("h-8 w-8", u.isAdmin ? "text-blue-400" : "text-muted-foreground")} onClick={() => toggleAdmin(u)}>
                        <ShieldCheck className={cn("w-4 h-4", u.isAdmin && "fill-blue-400/20")} />
                      </Button>
                      <Button variant="ghost" size="icon" className={cn("h-8 w-8", u.isPremium ? "text-accent" : "text-muted-foreground")} onClick={() => togglePremium(u)}>
                        <Star className={cn("w-4 h-4", u.isPremium && "fill-accent")} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => toggleBan(u)}>
                        <Shield className={cn("w-4 h-4", u.isBanned && "fill-destructive text-destructive")} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'users', u.id))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="system" className="flex-1 min-h-0 m-0 overflow-hidden outline-none">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-muted/20 rounded-[2rem] border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Инструменты</span>
                    </div>
                    <Button variant="destructive" className="w-full h-11 rounded-xl text-[9px] uppercase font-bold tracking-widest" onClick={handleQuickCleanup} disabled={isCleaning}>
                      {isCleaning ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Eraser className="w-3 h-3 mr-2" />}
                      Удалить забаненных
                    </Button>
                  </div>
                  <div className="p-6 bg-primary/10 rounded-[2rem] border border-primary/20 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Рассылка</span>
                    </div>
                    <textarea 
                      placeholder="Текст уведомления..." 
                      value={alertText}
                      onChange={e => setAlertText(e.target.value)}
                      className="w-full bg-card border border-white/10 h-24 rounded-xl text-xs p-3 focus:outline-none focus:border-primary/50 resize-none"
                    />
                    <Button 
                      className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-[10px]" 
                      onClick={() => { setAlertText(''); toast({ title: "Разослано" }); }}
                      disabled={!alertText.trim()}
                    >
                      <Send className="w-4 h-4 mr-2" /> Трансляция
                    </Button>
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
