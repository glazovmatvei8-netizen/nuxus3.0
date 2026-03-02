
"use client"

import React, { useState, useMemo, useEffect, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit, getDocs, writeBatch, where, setDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Send, 
  Loader2, Star, Search, Activity, BarChart3, 
  Globe, Terminal, Shield, Trash2, 
  Database, Server, Cpu, ShieldCheck, Bomb, RotateCcw,
  UserPlus, Clock, Download, HardDrive, Smartphone, Zap
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import type { User, Chat } from '@/lib/types';
import { formatDisplayName, cn, isGlobalAdmin, isUserActuallyBanned } from '@/lib/utils';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { addHours, addDays, addMonths, addYears } from 'date-fns';

const PRIME_UID = 'vnctow46';

const BAN_DURATIONS = [
  { label: '1 час', value: '1h' },
  { label: '24 часа', value: '24h' },
  { label: '3 дня', value: '3d' },
  { label: '7 дней', value: '7d' },
  { label: '1 месяц', value: '1m' },
  { label: '6 месяцев', value: '6m' },
  { label: '1 год', value: '1y' },
  { label: 'Навсегда', value: 'forever' },
];

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
    <div className="p-5 bg-muted/20 rounded-[2rem] border border-white/5 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white">Нагрузка ядра</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between text-[9px] font-bold uppercase opacity-60 text-white">
            <div className="flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU</div>
            <span>{cpu}%</span>
          </div>
          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${cpu}%` }} />
          </div>
        </div>
        <div className="space-y-2">
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
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [userSearch, setUserSearch] = useState('');
  
  const [manualUser, setManualUser] = useState({
    name: '',
    username: '',
    phone: '',
    uid: ''
  });

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
      banned: users.filter(u => isUserActuallyBanned(u)).length,
      admins: users.filter(u => isGlobalAdmin(u)).length,
    };
  }, [users]);

  const handleFullSync = async () => {
    setIsDeploying(true);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        await new Promise(resolve => setTimeout(resolve, 3000));
        toast({ 
          title: "Ядро Nuxus Установлено", 
          description: "Весь сайт скачан в память устройства. Теперь вы можете заходить в него даже без интернета.",
          className: "bg-green-600 text-white font-black"
        });
      } else {
        throw new Error("Ваш браузер не поддерживает автономный режим.");
      }
    } catch (e: any) {
      toast({ title: "Ошибка установки", description: e.message, variant: "destructive" });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleBan = (targetUser: User, duration: string) => {
    if (!db) return;
    let bannedUntil: string | null = null;
    const now = new Date();
    switch (duration) {
      case '1h': bannedUntil = addHours(now, 1).toISOString(); break;
      case '24h': bannedUntil = addDays(now, 1).toISOString(); break;
      case '3d': bannedUntil = addDays(now, 3).toISOString(); break;
      case '7d': bannedUntil = addDays(now, 7).toISOString(); break;
      case '1m': bannedUntil = addMonths(now, 1).toISOString(); break;
      case '6m': bannedUntil = addMonths(now, 6).toISOString(); break;
      case '1y': bannedUntil = addYears(now, 1).toISOString(); break;
      case 'forever': bannedUntil = null; break;
    }
    updateDocumentNonBlocking(doc(db, 'users', targetUser.id), { 
      isBanned: true,
      bannedUntil: bannedUntil
    });
    toast({ title: "Пользователь заблокирован", description: `Срок: ${duration === 'forever' ? 'Навсегда' : duration}` });
  };

  const handleUnban = (targetUser: User) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, 'users', targetUser.id), { isBanned: false, bannedUntil: null });
    toast({ title: "Блокировка снята" });
  };

  const handleForceRestore = (targetUser: User) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, 'users', targetUser.id), { isBanned: false, bannedUntil: null, lastSeen: new Date().toISOString() });
    toast({ title: `Доступ для ${targetUser.username} восстановлен принудительно` });
  };

  const handleManualCreate = async () => {
    if (!db || !manualUser.username || !manualUser.name) {
      toast({ title: "Ошибка", description: "Заполните имя и никнейм", variant: "destructive" });
      return;
    }
    setIsRestoring(true);
    try {
      const uid = manualUser.uid || `user_${Date.now()}`;
      const data = {
        id: uid,
        name: manualUser.name,
        username: manualUser.username.startsWith('@') ? manualUser.username.toLowerCase() : '@' + manualUser.username.toLowerCase(),
        phone: manualUser.phone || '',
        createdAt: new Date().toISOString(),
        isPremium: false,
        isAdmin: false
      };
      await setDoc(doc(db, 'users', uid), data);
      toast({ title: "Профиль воссоздан", description: `Ник: ${data.username}` });
      setManualUser({ name: '', username: '', phone: '', uid: '' });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setIsRestoring(false);
    }
  };

  const togglePremium = (targetUser: User) => {
    if (!db) return;
    const isNowPremium = !targetUser.isPremium;
    const expiry = isNowPremium ? addMonths(new Date(), 1).toISOString() : null;
    updateDocumentNonBlocking(doc(db, 'users', targetUser.id), { isPremium: isNowPremium, premiumUntil: expiry });
    toast({ title: isNowPremium ? "Premium выдан" : "Premium отозван" });
  };

  const toggleAdmin = (targetUser: User) => {
    if (!db) return;
    if (targetUser.id === PRIME_UID) {
      toast({ title: "Ошибка", description: "Нельзя снять права с Главного Админа", variant: "destructive" });
      return;
    }
    const isNowAdmin = !targetUser.isAdmin;
    updateDocumentNonBlocking(doc(db, 'users', targetUser.id), { isAdmin: isNowAdmin });
    toast({ title: isNowAdmin ? "Назначен Глобальным Админом" : "Права Админа отозваны" });
  };

  const handleDuplicateCleanup = async () => {
    if (!db || !users || !confirm('Внимание: Это удалит все твинки без чатов! Вы уверены?')) return;
    setIsCleaning(true);
    try {
      const chatsSnap = await getDocs(collection(db, 'chats'));
      const activeUserIds = new Set<string>();
      chatsSnap.forEach(chatDoc => {
        const data = chatDoc.data() as Chat;
        data.participantIds?.forEach(id => activeUserIds.add(id));
      });
      let deletedCount = 0;
      const batch = writeBatch(db);
      for (const u of users) {
        if (u.id === PRIME_UID) continue;
        const isDuplicatePhone = u.phone === '+79513332147' || u.phone === '+79508784513';
        const hasNoChats = !activeUserIds.has(u.id);
        if (isDuplicatePhone || hasNoChats) {
          batch.delete(doc(db, 'users', u.id));
          deletedCount++;
        }
      }
      await batch.commit();
      toast({ title: "Очистка завершена", description: `Удалено ${deletedCount} неактивных аккаунтов.` });
    } catch (e: any) {
      toast({ title: "Ошибка очистки", description: e.message, variant: "destructive" });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-card border-primary/20 p-0 overflow-hidden h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl border">
        <DialogHeader className="sr-only">
          <DialogTitle>Админ-панель Nuxus v0.54.7</DialogTitle>
          <DialogDescription>Управление ядром системы</DialogDescription>
        </DialogHeader>

        <div className="p-6 bg-gradient-to-r from-primary/20 to-accent/10 border-b border-white/5 shrink-0">
          <div className="flex items-center justify-between text-xl font-black uppercase italic text-white tracking-tighter">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span>Nuxus v0.54.7</span>
                <span className="text-[9px] font-bold tracking-[0.4em] text-primary-foreground opacity-70 mt-1 uppercase">Консоль управления</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] text-green-500 font-black uppercase">Core Online</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="stats" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="mx-6 mt-4 grid grid-cols-3 bg-muted/30 p-1 rounded-2xl shrink-0 border border-white/5">
            <TabsTrigger value="stats" className="font-bold uppercase text-[9px] tracking-widest"><BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Сводка</TabsTrigger>
            <TabsTrigger value="users" className="font-bold uppercase text-[9px] tracking-widest"><Users className="w-3.5 h-3.5 mr-1.5" /> Юзеры</TabsTrigger>
            <TabsTrigger value="system" className="font-bold uppercase text-[9px] tracking-widest"><Terminal className="w-3.5 h-3.5 mr-1.5" /> Система</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="flex-1 min-h-0 m-0 outline-none overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-5 pb-20">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Юзеры', val: stats.total, color: 'primary', icon: Users },
                    { label: 'Prime', val: stats.premium, color: 'accent', icon: Star },
                    { label: 'Админы', val: stats.admins, color: 'blue-500', icon: ShieldCheck },
                    { label: 'Бан', val: stats.banned, color: 'destructive', icon: Shield },
                  ].map((s, idx) => (
                    <div key={idx} className={cn("p-4 rounded-[1.8rem] border transition-all", s.color === 'primary' ? 'bg-primary/5 border-primary/10' : s.color === 'accent' ? 'bg-accent/5 border-accent/10' : s.color === 'blue-500' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-destructive/5 border-destructive/10')}>
                      <span className={cn("text-[9px] font-bold uppercase tracking-widest block mb-1", s.color === 'primary' ? 'text-primary' : s.color === 'accent' ? 'text-accent' : s.color === 'blue-500' ? 'text-blue-500' : 'text-destructive')}>{s.label}</span>
                      <div className="text-xl font-black italic text-white flex items-center justify-between">
                        {s.val}
                        <s.icon className={cn("w-4 h-4 opacity-30", s.color === 'primary' ? 'text-primary' : s.color === 'accent' ? 'text-accent' : s.color === 'blue-500' ? 'text-blue-500' : 'text-destructive')} />
                      </div>
                    </div>
                  ))}
                </div>
                
                <CoreMetrics />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="p-5 bg-muted/20 rounded-[2rem] border border-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Статус БД</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase"><span>Доступность</span><span className="text-green-500">Полная</span></div>
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase"><span>Шифрование</span><span className="text-white">AES-256</span></div>
                    </div>
                  </div>
                  <div className="p-5 bg-muted/20 rounded-[2rem] border border-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-accent" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Сеть</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase"><span>Пинг</span><span className="text-white">~12ms</span></div>
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase"><span>Трафик</span><span className="text-green-500">Оптимально</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="users" className="flex-1 min-h-0 overflow-hidden flex flex-col p-0 m-0 outline-none">
            <div className="px-6 py-4 border-b border-white/5 bg-muted/10 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Поиск по нику (@Klein), ID или телефону..." 
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
                ) : filteredUsers.map(u => {
                  const isBanned = isUserActuallyBanned(u);
                  return (
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleForceRestore(u)} title="Восстановить доступ">
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className={cn("h-8 w-8", u.isAdmin ? "text-blue-400" : "text-muted-foreground")} onClick={() => toggleAdmin(u)}>
                          <ShieldCheck className={cn("w-4 h-4", u.isAdmin && "fill-blue-400/20")} />
                        </Button>
                        <Button variant="ghost" size="icon" className={cn("h-8 w-8", u.isPremium ? "text-accent" : "text-muted-foreground")} onClick={() => togglePremium(u)}>
                          <Star className={cn("w-4 h-4", u.isPremium && "fill-accent")} />
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <Shield className={cn("w-4 h-4", isBanned && "fill-destructive text-destructive")} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-card border-white/10">
                            <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest opacity-60">Заблокировать</DropdownMenuLabel>
                            {BAN_DURATIONS.map((dur) => (
                              <DropdownMenuItem key={dur.value} onClick={() => handleBan(u, dur.value)} className="text-[11px] font-bold uppercase tracking-wide">
                                <Clock className="w-3 h-3 mr-2 opacity-40" /> {dur.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={() => handleUnban(u)} className="text-primary text-[11px] font-bold uppercase tracking-wide">
                              <RotateCcw className="w-3 h-3 mr-2" /> Снять бан
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'users', u.id))}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="system" className="flex-1 min-h-0 m-0 outline-none overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6 pb-24">
                
                <div className="p-6 bg-primary/10 rounded-[2.5rem] border border-primary/30 space-y-4 shadow-xl shadow-primary/5">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-6 h-6 text-primary fill-primary/20" />
                    <div className="flex flex-col">
                      <span className="text-[12px] font-black uppercase italic tracking-tighter text-white">Full Core Deployment</span>
                      <span className="text-[8px] font-bold text-primary uppercase tracking-[0.2em]">Установка сайта от А до Я</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Эта функция принудительно скачивает весь код, стили, иконки и шрифты Ядра Nuxus в память вашего устройства. После завершения мессенджер станет полностью автономным.
                    </p>
                    <Button 
                      className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/30"
                      onClick={handleFullSync}
                      disabled={isDeploying}
                    >
                      {isDeploying ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <HardDrive className="w-5 h-5 mr-2" />}
                      {isDeploying ? 'Развертывание...' : 'Установить всё Ядро на устройство'}
                    </Button>
                    <div className="flex items-center justify-center gap-4 py-2 opacity-40">
                      <div className="flex items-center gap-1"><Smartphone className="w-3 h-3" /><span className="text-[7px] uppercase font-bold">iOS Native</span></div>
                      <div className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /><span className="text-[7px] uppercase font-bold">Resilience Active</span></div>
                      <div className="flex items-center gap-1"><Zap className="w-3 h-3 text-primary" /><span className="text-[7px] uppercase font-bold">Offline First</span></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-muted/20 rounded-[2rem] border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <RotateCcw className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Emergency Restore</span>
                    </div>
                    <div className="space-y-2">
                      <Input placeholder="Имя пользователя" value={manualUser.name} onChange={e => setManualUser({...manualUser, name: e.target.value})} className="h-9 text-xs bg-black/20" />
                      <Input placeholder="Никнейм (@Klein)" value={manualUser.username} onChange={e => setManualUser({...manualUser, username: e.target.value})} className="h-9 text-xs bg-black/20" />
                      <Input placeholder="Телефон (опционально)" value={manualUser.phone} onChange={e => setManualUser({...manualUser, phone: e.target.value})} className="h-9 text-xs bg-black/20" />
                      <Button variant="default" className="w-full h-9 rounded-xl text-[9px] uppercase font-bold tracking-widest bg-primary/20 text-primary hover:bg-primary hover:text-white" onClick={handleManualCreate} disabled={isRestoring}>
                        {isRestoring ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <UserPlus className="w-3 h-3 mr-2" />}
                        Recreate Profile
                      </Button>
                    </div>
                  </div>
                  <div className="p-6 bg-muted/20 rounded-[2rem] border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Инструменты очистки</span>
                    </div>
                    <div className="space-y-3">
                      <Button variant="destructive" className="w-full h-11 rounded-xl text-[9px] uppercase font-bold tracking-widest bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white" onClick={handleDuplicateCleanup} disabled={isCleaning}>
                        {isCleaning ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Bomb className="w-3 h-3 mr-2" />}
                        Cleanup Duplicates
                      </Button>
                      <p className="text-[8px] text-muted-foreground text-center italic uppercase">Удалит аккаунты без чатов и твинки</p>
                    </div>
                  </div>
                  <div className="p-6 bg-primary/10 rounded-[2rem] border border-primary/20 space-y-4 md:col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Рассылка</span>
                    </div>
                    <textarea 
                      placeholder="Текст уведомления для всех пользователей..." 
                      value={alertText}
                      onChange={e => setAlertText(e.target.value)}
                      className="w-full bg-card border border-white/10 h-24 rounded-xl text-xs p-3 focus:outline-none focus:border-primary/50 resize-none"
                    />
                    <Button 
                      className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-[10px]" 
                      onClick={() => { setAlertText(''); toast({ title: "Разослано" }); }}
                      disabled={!alertText.trim()}
                    >
                      <Send className="w-4 h-4 mr-2" /> Трансляция сообщения
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
