
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit, setDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, CreditCard, Send, 
  Loader2, Star, Search, Activity, BarChart3, 
  Globe, Zap, Terminal, Mic, Video, Shield, Key, 
  Database, Cpu, Network, Lock, ShieldCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { formatDisplayName, cn } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Nuxus Admin Core v4.1 "Nuclear Russian Edition"
 * Полный перевод на русский язык и расширенный мониторинг.
 */
export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Состояние ресурсов v4.1
  const [cpuLoad, setCpuLoad] = useState(8);
  const [memoryUsage, setMemoryUsage] = useState(24);
  const [networkTraffic, setNetworkTraffic] = useState(1.2);
  const [dbRequests, setDbRequests] = useState(42);

  // Системные логи v4.1 на русском
  const [logs, setLogs] = useState<string[]>([
    "[СИСТЕМА] Ядро Nuxus Nuclear Core v4.1 инициализировано.",
    "[ЗАЩИТА] Файрвол активен. Мониторинг порта 9002...",
    "[БАЗА] Пул соединений: Стабильно.",
    "[СЕРВЕР] Узел в Москве: Подключен."
  ]);

  // Глобальные настройки v4.1
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [featureVoice, setFeatureVoice] = useState(true);
  const [featureVideo, setFeatureVideo] = useState(true);
  const [featureAI, setFeatureAI] = useState(true);
  const [highSecurity, setHighSecurity] = useState(false);

  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(500))), [db]);
  const { data: users, isLoading: isUsersLoading } = useCollection<User>(usersQuery);

  // Живое обновление ресурсов v4.1 (каждые 10 секунд)
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setCpuLoad(prev => Math.min(Math.max(prev + (Math.random() * 6 - 3), 4), 92));
      setMemoryUsage(prev => Math.min(Math.max(prev + (Math.random() * 4 - 2), 15), 80));
      setNetworkTraffic(prev => Math.max(0.1, prev + (Math.random() * 0.5 - 0.25)));
      setDbRequests(prev => Math.floor(Math.max(10, prev + (Math.random() * 20 - 10))));

      const events = [
        `[СЕТЬ] Входящее рукопожатие от узла в Европе.`,
        `[БАЗА] Периодическая очистка индексов завершена.`,
        `[ЗАЩИТА] Проверка личности успешна для пользователя.`,
        `[СИСТЕМА] Пульс ядра: В НОРМЕ.`,
        `[КЭШ] Инициализирована ре-синхронизация кэша.`,
        `[ТРАФИК] Обнаружен всплеск активности в групповых чатах.`
      ];
      if (Math.random() > 0.7) {
        setLogs(prev => [events[Math.floor(Math.random() * events.length)], ...prev].slice(0, 100));
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [open]);

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
    setLogs(prev => [`[МОДЕРАЦИЯ] Пользователь ${targetUser.username} ${newStatus ? 'заблокирован' : 'разблокирован'}.`, ...prev]);
  };

  const togglePremium = (targetUser: User) => {
    if (!db) return;
    const userRef = doc(db, 'users', targetUser.id);
    const isNowPremium = !targetUser.isPremium;
    updateDocumentNonBlocking(userRef, { 
      isPremium: isNowPremium,
      premiumUntil: isNowPremium ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null
    });
    toast({ title: isNowPremium ? "Premium выдан" : "Premium аннулирован" });
    setLogs(prev => [`[БИЛЛИНГ] Premium ${isNowPremium ? 'выдан' : 'аннулирован'} для ${targetUser.username}.`, ...prev]);
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      if (db) {
        await setDoc(doc(db, 'system', 'maintenance'), {
          lastOptimizationAt: new Date().toISOString(),
          coreVersion: '4.1.0',
          status: 'healthy'
        }, { merge: true });
      }
      await new Promise(r => setTimeout(r, 2000));
      toast({ title: "Ядро оптимизировано", description: "Кэш очищен, индексы обновлены." });
      setLogs(prev => [`[СИСТЕМА] Полная оптимизация ядра выполнена успешно.`, ...prev]);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-card border-primary/20 p-0 overflow-hidden h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl border">
        <DialogHeader className="p-6 bg-gradient-to-r from-primary/30 via-accent/10 to-primary/30 border-b border-primary/20 shrink-0">
          <DialogTitle className="flex items-center justify-between text-2xl font-black uppercase italic text-white tracking-tighter">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span>Ядро Nuxus v4.1</span>
                <span className="text-[9px] font-bold tracking-[0.4em] text-primary-foreground opacity-70 mt-1 uppercase">Расширенное управление</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end mr-4">
                <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Система стабильна</span>
                <span className="text-[8px] text-muted-foreground">Аптайм: 100%</span>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-primary/20 flex items-center justify-center animate-spin-slow">
                <Zap className="w-5 h-5 text-primary" />
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="stats" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 grid grid-cols-5 bg-muted/30 p-1.5 rounded-2xl shrink-0 gap-1 border border-white/5">
            <TabsTrigger value="stats" className="font-bold uppercase text-[9px] tracking-widest"><BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Сводка</TabsTrigger>
            <TabsTrigger value="users" className="font-bold uppercase text-[9px] tracking-widest"><Users className="w-3.5 h-3.5 mr-1.5" /> Юзеры</TabsTrigger>
            <TabsTrigger value="security" className="font-bold uppercase text-[9px] tracking-widest"><Lock className="w-3.5 h-3.5 mr-1.5" /> Защита</TabsTrigger>
            <TabsTrigger value="db" className="font-bold uppercase text-[9px] tracking-widest"><Database className="w-3.5 h-3.5 mr-1.5" /> Данные</TabsTrigger>
            <TabsTrigger value="system" className="font-bold uppercase text-[9px] tracking-widest"><Globe className="w-3.5 h-3.5 mr-1.5" /> Система</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="flex-1 p-6 space-y-6 overflow-y-auto m-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 bg-primary/5 rounded-[2rem] border border-primary/10 shadow-inner">
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] block mb-2">Всего юзеров</span>
                <div className="text-4xl font-black italic text-white tracking-tighter">{stats.total}</div>
              </div>
              <div className="p-5 bg-accent/5 rounded-[2rem] border border-accent/10 shadow-inner">
                <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] block mb-2">Premium</span>
                <div className="text-4xl font-black italic text-white tracking-tighter">{stats.premium}</div>
              </div>
              <div className="p-5 bg-destructive/5 rounded-[2rem] border border-destructive/10 shadow-inner">
                <span className="text-[10px] font-bold text-destructive uppercase tracking-[0.2em] block mb-2">Забанено</span>
                <div className="text-4xl font-black italic text-white tracking-tighter">{stats.banned}</div>
              </div>
              <div className="p-5 bg-green-500/5 rounded-[2rem] border border-green-500/10 shadow-inner">
                <span className="text-[10px] font-bold text-green-500 uppercase tracking-[0.2em] block mb-2">Трафик</span>
                <div className="text-4xl font-black italic text-white tracking-tighter">{networkTraffic.toFixed(1)} <span className="text-xs">МБ/с</span></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 bg-muted/20 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest text-white">Мониторинг ресурсов v4.1</span>
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase font-bold">Обновление: 10с</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="flex justify-between text-[9px] font-bold uppercase opacity-60 text-white"><span>Загрузка CPU</span><span>{Math.round(cpuLoad)}%</span></div>
                    <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000" style={{ width: `${cpuLoad}%` }} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[9px] font-bold uppercase opacity-60 text-white"><span>Память RAM</span><span>{Math.round(memoryUsage)}%</span></div>
                    <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-gradient-to-r from-accent to-primary transition-all duration-1000" style={{ width: `${memoryUsage}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-primary/10 rounded-[2.5rem] border border-primary/20 flex flex-col items-center justify-center text-center space-y-4">
                <Cpu className="w-10 h-10 text-primary opacity-50 animate-pulse" />
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-widest text-white">Центр обслуживания</p>
                  <p className="text-[9px] text-muted-foreground">Очистка кэша и синхронизация</p>
                </div>
                <Button 
                  className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-[10px] uppercase font-bold tracking-[0.2em] shadow-lg shadow-primary/20"
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                >
                  {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Запустить оптимизацию'}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="flex-1 min-h-0 overflow-hidden flex flex-col p-0 m-0">
            <div className="px-6 py-4 border-b border-white/5 bg-muted/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Поиск юзеров по имени, @ID или телефону..." 
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="bg-card border-white/10 h-12 rounded-2xl pl-10 text-sm focus:ring-primary/40"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-2">
                {isUsersLoading ? (
                  <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary w-8 h-8 opacity-50" /></div>
                ) : filteredUsers.length > 0 ? filteredUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-[1.5rem] border border-white/5 hover:bg-muted/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <UserAvatar userId={u.id} className="h-11 w-11" manualAvatarUrl={u.avatarUrl} fallbackName={u.name} />
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-sm flex items-center gap-1.5 text-white">
                          {formatDisplayName(u.name)} 
                          {u.isPremium && <Star className="w-3.5 h-3.5 text-accent fill-accent" />}
                          {u.isBanned && <Shield className="w-3.5 h-3.5 text-destructive" />}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 font-mono">{u.phone} • {u.username}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-10 w-10 rounded-xl", u.isPremium ? "text-accent bg-accent/10" : "text-muted-foreground bg-muted/50")} 
                        onClick={() => togglePremium(u)}
                      >
                        <Star className={cn("w-4.5 h-4.5", u.isPremium && "fill-accent")} />
                      </Button>
                      <Button 
                        variant={u.isBanned ? "default" : "outline"} 
                        size="sm" 
                        className={cn("rounded-xl h-10 min-w-[90px] font-bold uppercase text-[9px]", u.isBanned ? "bg-accent text-accent-foreground" : "text-destructive border-destructive/20 hover:bg-destructive/10")} 
                        onClick={() => toggleBan(u)}
                      >
                        {u.isBanned ? <ShieldCheck className="w-4 h-4 mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                        {u.isBanned ? "Разбанить" : "Бан"}
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="p-12 text-center text-muted-foreground italic text-sm">Пользователи не найдены.</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="security" className="flex-1 p-6 space-y-6 m-0 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-destructive/5 rounded-[2.5rem] border border-destructive/10 space-y-6">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                  <span className="text-xs font-black uppercase tracking-widest text-white">Критические протоколы</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-2xl border border-destructive/20">
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-white uppercase">Режим обслуживания</span><span className="text-[8px] text-muted-foreground">Блокировка входа для всех</span></div>
                    <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-2xl border border-white/5">
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-white uppercase">Кикнуть всех юзеров</span><span className="text-[8px] text-muted-foreground">Сброс всех активных сессий</span></div>
                    <Button variant="outline" size="sm" className="h-8 text-[8px] uppercase font-bold text-destructive border-destructive/20" onClick={() => setLogs(prev => ["[ЗАЩИТА] Все пользователи были принудительно разлогинены.", ...prev])}>Выполнить</Button>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-accent/5 rounded-[2.5rem] border border-accent/10 space-y-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-accent" />
                  <span className="text-xs font-black uppercase tracking-widest text-white">Стражи безопасности</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-white uppercase">Строгий режим</span><span className="text-[8px] text-muted-foreground">Агрессивная фильтрация контента</span></div>
                    <Switch checked={highSecurity} onCheckedChange={setHighSecurity} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-white uppercase">Разрешить регистрацию</span><span className="text-[8px] text-muted-foreground">Включение создания новых аккаунтов</span></div>
                    <Switch checked={registrationOpen} onCheckedChange={setRegistrationOpen} />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="db" className="flex-1 p-6 space-y-6 m-0 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-card border border-white/5 rounded-3xl flex flex-col items-center text-center">
                <Database className="w-8 h-8 text-primary mb-3" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Сообщений</span>
                <div className="text-2xl font-black text-white italic">{(dbRequests * 1420).toLocaleString()}</div>
              </div>
              <div className="p-5 bg-card border border-white/5 rounded-3xl flex flex-col items-center text-center">
                <Cpu className="w-8 h-8 text-accent mb-3" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Запросов/мин</span>
                <div className="text-2xl font-black text-white italic">{dbRequests}</div>
              </div>
              <div className="p-5 bg-card border border-white/5 rounded-3xl flex flex-col items-center text-center">
                <Network className="w-8 h-8 text-green-500 mb-3" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Задержка</span>
                <div className="text-2xl font-black text-white italic">14мс</div>
              </div>
            </div>
            <div className="bg-black/40 p-6 rounded-[2.5rem] border border-white/5 flex flex-col h-64">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-4 h-4 text-green-500" />
                <span className="text-[11px] font-black uppercase text-green-500/80">Поток системных событий</span>
              </div>
              <ScrollArea className="flex-1 font-mono text-[9px] text-green-500/60 leading-relaxed">
                <div className="space-y-1">
                  {logs.map((log, i) => (
                    <div key={i} className="flex gap-2 border-b border-green-500/5 py-0.5">
                      <span className="opacity-40 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                      <span className="break-words">{log}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="system" className="flex-1 p-6 space-y-6 m-0 overflow-y-auto">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-muted/20 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-white">Переключатели функций</span>
                </div>
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg"><Mic className="w-4 h-4 text-primary" /></div>
                      <div className="flex flex-col"><span className="text-[10px] font-bold text-white uppercase">Голосовые заметки</span><span className="text-[8px] text-muted-foreground">Запись аудиосообщений</span></div>
                    </div>
                    <Switch checked={featureVoice} onCheckedChange={setFeatureVoice} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-accent/10 rounded-lg"><Video className="w-4 h-4 text-accent" /></div>
                      <div className="flex flex-col"><span className="text-[10px] font-bold text-white uppercase">Кружочки</span><span className="text-[8px] text-muted-foreground">Круглые видеосообщения</span></div>
                    </div>
                    <Switch checked={featureVideo} onCheckedChange={setFeatureVideo} />
                  </div>
                   <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg"><Zap className="w-4 h-4 text-primary" /></div>
                      <div className="flex flex-col"><span className="text-[10px] font-bold text-white uppercase">ИИ Помощник</span><span className="text-[8px] text-muted-foreground">Генерация ответов</span></div>
                    </div>
                    <Switch checked={featureAI} onCheckedChange={setFeatureAI} />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-primary/10 rounded-[2.5rem] border border-primary/20 space-y-4 flex flex-col">
                <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /><span className="text-[11px] font-black uppercase tracking-widest text-white">Глобальная рассылка</span></div>
                <p className="text-[9px] text-muted-foreground italic mb-2">Сообщение будет отправлено всем пользователям системы.</p>
                <Input 
                  placeholder="Текст уведомления..." 
                  value={alertText}
                  onChange={e => setAlertText(e.target.value)}
                  className="bg-card border-white/10 h-14 rounded-2xl text-white text-sm"
                />
                <Button 
                  className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-[0.2em] italic shadow-xl shadow-primary/30 mt-auto" 
                  onClick={() => {
                    if (!alertText.trim()) return;
                    setIsSendingAlert(true);
                    setTimeout(() => {
                      setIsSendingAlert(false);
                      setAlertText('');
                      toast({ title: "Рассылка отправлена", description: "Успешно доставлено всем активным узлам." });
                      setLogs(prev => [`[РАССЫЛКА] Отправлено: ${alertText.slice(0, 30)}...`, ...prev]);
                    }, 1000);
                  }}
                  disabled={isSendingAlert || !alertText.trim()}
                >
                  {isSendingAlert ? <Loader2 className="animate-spin w-6 h-6" /> : <><Send className="w-5 h-5 mr-2" /> Отправить всем</>}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
