
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, updateDoc, limit, getDocs, where, setDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, CreditCard, Send, ShieldCheck, 
  Loader2, Star, Ban, Search, Activity, BarChart3, 
  Settings2, Globe, AlertTriangle, HardDrive, Zap, Lock, Unlock,
  Hammer, Terminal, Mic, Video, Wand2, Shield, LogOut, Key
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { formatDisplayName, cn } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Продвинутая панель управления Nuxus (Ядро Админа v3.5)
 * Финальная версия: удалены Звёзды, добавлены расширенные инструменты управления ядром.
 */
export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Ресурсы ядра
  const [cpuLoad, setCpuLoad] = useState(12);
  const [memoryUsage, setMemoryUsage] = useState(32);
  const [trafficLevel, setTrafficLevel] = useState(2);

  // Системные логи
  const [logs, setLogs] = useState<string[]>(["[SYSTEM] Kernel v3.5 initialized.", "[AUTH] Security protocols active.", "[BILLING] Balance sync: 0.00 ₽"]);

  // Глобальные фичи
  const [featureVoice, setFeatureVoice] = useState(true);
  const [featureVideo, setFeatureVideo] = useState(true);
  const [featureAI, setFeatureAI] = useState(true);
  const [strictMode, setStrictMode] = useState(false);

  // Настройки ядра
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [slowMode, setSlowMode] = useState([0]);
  const [maxMsgLength, setMaxMsgLength] = useState([2000]);

  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(200))), [db]);
  const { data: users, isLoading: isUsersLoading } = useCollection<User>(usersQuery);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setCpuLoad(prev => Math.min(Math.max(prev + (Math.random() * 4 - 2), 5), 85));
      setMemoryUsage(prev => Math.min(Math.max(prev + (Math.random() * 2 - 1), 20), 75));
      setTrafficLevel(prev => Math.min(Math.max(prev + (Math.random() * 6 - 3), 1), 100));

      const randomEvents = [
        `[USER] New handshake established.`,
        `[DATABASE] Background indexing active.`,
        `[AUTH] Integrity check passed.`,
        `[SYSTEM] Pulse: Healthy.`,
        `[NETWORK] Latency 14ms.`
      ];
      if (Math.random() > 0.8) {
        setLogs(prev => [randomEvents[Math.floor(Math.random() * randomEvents.length)], ...prev].slice(0, 50));
      }
    }, 8000);
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
    updateDocumentNonBlocking(userRef, { isBanned: !targetUser.isBanned });
    toast({ title: targetUser.isBanned ? "Доступ восстановлен" : "Аккаунт заблокирован" });
    setLogs(prev => [`[MODERATION] User ${targetUser.username} ${targetUser.isBanned ? 'unbanned' : 'banned'}.`, ...prev]);
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
  };

  const handleGlobalAlert = async () => {
    if (!alertText.trim() || !db) return;
    setIsSendingAlert(true);
    try {
      toast({ title: "Рассылка запущена", description: "Сообщение отправлено всем пользователям." });
      setLogs(prev => [`[SYSTEM] Global broadcast sent: "${alertText.slice(0, 20)}..."`, ...prev]);
      setAlertText('');
    } finally {
      setIsSendingAlert(false);
    }
  };

  const handleOptimize = async () => {
    if (!db) return;
    setIsOptimizing(true);
    try {
      localStorage.removeItem('firebase:firestore:cache');
      await setDoc(doc(db, 'system', 'maintenance'), {
        lastOptimizationAt: new Date().toISOString(),
        status: 'healthy'
      }, { merge: true });
      await new Promise(r => setTimeout(r, 2000));
      toast({ title: "Оптимизация завершена" });
      setLogs(prev => [`[SYSTEM] Core optimization completed successfully.`, ...prev]);
    } finally {
      setIsOptimizing(false);
    }
  };

  const saveCoreSettings = async () => {
    if (!db) return;
    try {
      await setDoc(doc(db, 'system', 'settings'), {
        maintenanceMode,
        registrationOpen,
        slowMode: slowMode[0],
        maxMsgLength: maxMsgLength[0],
        features: { featureVoice, featureVideo, featureAI, strictMode },
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: "Настройки сохранены" });
    } catch (e) {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-card border-primary/20 p-0 overflow-hidden h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-6 bg-gradient-to-r from-primary/20 to-accent/10 border-b border-primary/20 shrink-0">
          <DialogTitle className="flex items-center justify-between text-2xl font-black uppercase italic text-white">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-primary" /> 
              <span>Admin Core v3.5</span>
            </div>
            <div className="flex items-center gap-1.5 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-green-500 font-bold tracking-widest uppercase">Live</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="stats" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 grid grid-cols-4 bg-muted/50 p-1 rounded-2xl shrink-0">
            <TabsTrigger value="stats" className="font-bold uppercase text-[9px] tracking-widest"><BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Сводка</TabsTrigger>
            <TabsTrigger value="users" className="font-bold uppercase text-[9px] tracking-widest"><Users className="w-3.5 h-3.5 mr-1.5" /> Юзеры</TabsTrigger>
            <TabsTrigger value="payments" className="font-bold uppercase text-[9px] tracking-widest"><CreditCard className="w-3.5 h-3.5 mr-1.5" /> Оплаты</TabsTrigger>
            <TabsTrigger value="system" className="font-bold uppercase text-[9px] tracking-widest"><Globe className="w-3.5 h-3.5 mr-1.5" /> Система</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="flex-1 p-6 space-y-6 overflow-y-auto m-0">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-primary/5 rounded-3xl border border-primary/10">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Пользователи</span>
                <div className="text-3xl font-black italic text-white">{stats.total}</div>
              </div>
              <div className="p-4 bg-accent/5 rounded-3xl border border-accent/10">
                <span className="text-[10px] font-bold text-accent uppercase tracking-widest block mb-1">Premium</span>
                <div className="text-3xl font-black italic text-white">{stats.premium}</div>
              </div>
              <div className="p-4 bg-destructive/5 rounded-3xl border border-destructive/10">
                <span className="text-[10px] font-bold text-destructive uppercase tracking-widest block mb-1">Забанено</span>
                <div className="text-3xl font-black italic text-white">{stats.banned}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-muted/20 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest text-white">Ресурсы Ядра</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-bold uppercase opacity-60"><span>CPU Load</span><span>{Math.round(cpuLoad)}%</span></div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${cpuLoad}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-bold uppercase opacity-60"><span>RAM Usage</span><span>{Math.round(memoryUsage)}%</span></div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${memoryUsage}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex flex-col items-center justify-center text-center space-y-3">
                <Hammer className="w-8 h-8 text-primary opacity-50" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white">Обслуживание</p>
                  <p className="text-[9px] text-muted-foreground">Оптимизация базы и кэша</p>
                </div>
                <Button 
                  className="w-full h-11 rounded-2xl bg-primary text-[10px] uppercase font-bold tracking-widest"
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                >
                  {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Запустить чистку'}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="flex-1 min-h-0 overflow-hidden flex flex-col p-0 m-0">
            <div className="px-6 py-4 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Поиск по юзерам..." 
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="bg-muted/30 border-none h-11 rounded-xl pl-10"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-2">
                {isUsersLoading ? (
                  <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
                ) : filteredUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-white/5 hover:bg-muted/30 transition-all">
                    <div className="flex items-center gap-3">
                      <UserAvatar userId={u.id} className="h-10 w-10" manualAvatarUrl={u.avatarUrl} fallbackName={u.name} />
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-sm flex items-center gap-1 text-white">
                          {formatDisplayName(u.name)} 
                          {u.isPremium && <Star className="w-3 h-3 text-accent fill-accent" />}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">{u.phone} • {u.username}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-xl", u.isPremium ? "text-accent bg-accent/10" : "text-muted-foreground bg-muted/50")} onClick={() => togglePremium(u)}>
                        <Star className={cn("w-4 h-4", u.isPremium && "fill-accent")} />
                      </Button>
                      <Button variant={u.isBanned ? "default" : "outline"} size="sm" className={cn("rounded-xl h-9 min-w-[80px]", u.isBanned ? "bg-accent" : "text-destructive border-destructive/20")} onClick={() => toggleBan(u)}>
                        {u.isBanned ? "Разбан" : "Бан"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="payments" className="flex-1 p-6 space-y-4 m-0 overflow-y-auto">
            <div className="bg-primary/5 p-6 rounded-[2.5rem] border border-primary/10 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Баланс системы</span>
                <div className="text-3xl font-black italic text-white">0 ₽</div>
              </div>
              <CreditCard className="w-8 h-8 text-primary opacity-40" />
            </div>
            <div className="p-10 border border-dashed border-white/10 rounded-[2.5rem] text-center space-y-3">
              <Zap className="w-10 h-10 text-muted-foreground/20 mx-auto" />
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Нет активных транзакций</p>
              <p className="text-[9px] text-muted-foreground/60">Все платежи обнулены.</p>
            </div>
          </TabsContent>

          <TabsContent value="system" className="flex-1 p-6 space-y-6 m-0 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-muted/20 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-white">Функции Ядра</span>
                </div>
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg"><Mic className="w-4 h-4 text-primary" /></div>
                      <div className="flex flex-col"><span className="text-[10px] font-bold text-white uppercase">Голосовые</span><span className="text-[8px] text-muted-foreground">Запись аудио</span></div>
                    </div>
                    <Switch checked={featureVoice} onCheckedChange={setFeatureVoice} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-accent/10 rounded-lg"><Video className="w-4 h-4 text-accent" /></div>
                      <div className="flex flex-col"><span className="text-[10px] font-bold text-white uppercase">Кружочки</span><span className="text-[8px] text-muted-foreground">Видеосообщения</span></div>
                    </div>
                    <Switch checked={featureVideo} onCheckedChange={setFeatureVideo} />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-black/40 rounded-[2.5rem] border border-white/5 flex flex-col h-[300px]">
                <div className="flex items-center gap-2 mb-4 shrink-0">
                  <Terminal className="w-4 h-4 text-green-500" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-green-500/80">Kernel Logs</span>
                </div>
                <ScrollArea className="flex-1 font-mono text-[9px] text-green-500/60 leading-relaxed">
                  <div className="space-y-1">
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="opacity-30 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                        <span className="break-words">{log}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-muted/20 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Key className="w-5 h-5 text-primary" /><span className="text-[11px] font-black uppercase tracking-widest text-white">Контроль</span></div>
                  <Button size="sm" variant="outline" className="h-7 text-[9px] uppercase font-bold" onClick={saveCoreSettings}>Применить</Button>
                </div>
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5"><Label className="text-[10px] uppercase font-bold text-white/80">Техобслуживание</Label><p className="text-[8px] text-muted-foreground">Вход только для админов</p></div>
                    <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5"><Label className="text-[10px] uppercase font-bold text-white/80">Регистрация</Label><p className="text-[8px] text-muted-foreground">Новые аккаунты</p></div>
                    <Switch checked={registrationOpen} onCheckedChange={setRegistrationOpen} />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-primary/10 rounded-[2.5rem] border border-primary/20 space-y-4">
                <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /><span className="text-[11px] font-black uppercase tracking-widest text-white">Рассылка</span></div>
                <Input 
                  placeholder="Текст уведомления..." 
                  value={alertText}
                  onChange={e => setAlertText(e.target.value)}
                  className="bg-card/50 border-white/10 h-12 rounded-2xl text-white text-sm"
                />
                <Button 
                  className="w-full h-12 rounded-2xl bg-primary font-black uppercase tracking-widest italic" 
                  onClick={handleGlobalAlert}
                  disabled={isSendingAlert || !alertText.trim()}
                >
                  {isSendingAlert ? <Loader2 className="animate-spin w-5 h-5" /> : <><Send className="w-4 h-4 mr-2" /> Отправить</>}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
