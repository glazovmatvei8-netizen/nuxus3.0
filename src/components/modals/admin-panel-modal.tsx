
"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, updateDoc, limit, getDocs, where } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, CreditCard, Send, ShieldCheck, 
  Loader2, Star, Ban, Search, Activity, BarChart3, 
  Settings2, Globe, AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { formatDisplayName, cn } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Загрузка пользователей
  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(200))), [db]);
  const { data: users, isLoading: isUsersLoading } = useCollection<User>(usersQuery);

  // Фильтрация пользователей для поиска
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

  // Статистика
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
      // Имитация рассылки через системный чат Nuxus
      toast({ 
        title: "Рассылка запущена", 
        description: `Сообщение будет отправлено ${users?.length || 0} пользователям.` 
      });
      setAlertText('');
    } catch (e) {
      toast({ title: "Ошибка рассылки", variant: "destructive" });
    } finally {
      setIsSendingAlert(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card border-primary/20 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl shadow-primary/20">
        <DialogHeader className="p-6 bg-gradient-to-r from-primary/20 to-accent/10 border-b border-primary/20 shrink-0">
          <DialogTitle className="flex items-center justify-between text-2xl font-black uppercase tracking-tighter italic">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-primary" /> 
              <span>Ядро Управления Nuxus</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-green-500 font-bold tracking-widest uppercase">System Online</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="stats" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 grid grid-cols-4 bg-muted/50 p-1 rounded-2xl shrink-0">
            <TabsTrigger value="stats" className="font-bold uppercase text-[9px] tracking-widest"><BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Сводка</TabsTrigger>
            <TabsTrigger value="users" className="font-bold uppercase text-[9px] tracking-widest"><Users className="w-3.5 h-3.5 mr-1.5" /> Пользователи</TabsTrigger>
            <TabsTrigger value="payments" className="font-bold uppercase text-[9px] tracking-widest"><CreditCard className="w-3.5 h-3.5 mr-1.5" /> Финансы</TabsTrigger>
            <TabsTrigger value="system" className="font-bold uppercase text-[9px] tracking-widest"><Globe className="w-3.5 h-3.5 mr-1.5" /> Рассылка</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="flex-1 p-6 space-y-6 overflow-y-auto m-0">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-primary/5 rounded-3xl border border-primary/10 space-y-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Всего юзеров</span>
                <div className="text-3xl font-black italic">{stats.total}</div>
              </div>
              <div className="p-4 bg-accent/5 rounded-3xl border border-accent/10 space-y-1">
                <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Premium</span>
                <div className="text-3xl font-black italic">{stats.premium}</div>
              </div>
              <div className="p-4 bg-destructive/5 rounded-3xl border border-destructive/10 space-y-1">
                <span className="text-[10px] font-bold text-destructive uppercase tracking-widest">В бане</span>
                <div className="text-3xl font-black italic">{stats.banned}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-muted/20 rounded-[2rem] border border-white/5 space-y-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Активность ядра</span>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold uppercase opacity-60"><span>CPU Load</span><span>12%</span></div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-primary w-[12%]" /></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold uppercase opacity-60"><span>Memory</span><span>45%</span></div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-accent w-[45%]" /></div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-muted/20 rounded-[2rem] border border-white/5 flex flex-col justify-center items-center text-center space-y-2">
                <Settings2 className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Настройки ядра будут расширены в след. версии</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="flex-1 min-h-0 overflow-hidden p-0 m-0 flex flex-col">
            <div className="px-6 py-4 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Найти по нику, номеру или имени..." 
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
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-white/5 group hover:bg-muted/30 transition-all">
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
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn("h-9 w-9 rounded-xl", u.isPremium ? "text-accent bg-accent/10" : "text-muted-foreground bg-muted/50")}
                          onClick={() => togglePremium(u)}
                        >
                          <Star className={cn("w-4 h-4", u.isPremium && "fill-accent")} />
                        </Button>
                        <Button 
                          variant={u.isBanned ? "default" : "outline"} 
                          size="sm" 
                          className={cn("rounded-xl h-9 min-w-[100px]", u.isBanned ? "bg-accent text-accent-foreground" : "text-destructive border-destructive/20 hover:bg-destructive/10")}
                          onClick={() => toggleBan(u)}
                        >
                          {u.isBanned ? <ShieldCheck className="w-4 h-4 mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
                          {u.isBanned ? "Разбан" : "Бан"}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-12 text-muted-foreground italic">Пользователи не найдены</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="payments" className="p-6 m-0 flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Баланс системы</span>
                  <div className="text-3xl font-black italic">42,500 ₽</div>
                </div>
                <div className="bg-primary/20 p-3 rounded-2xl"><CreditCard className="w-6 h-6 text-primary" /></div>
              </div>
              
              <div className="bg-muted/20 p-8 rounded-[2rem] border border-dashed border-white/10 text-center space-y-4">
                <AlertTriangle className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <div className="space-y-1">
                   <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Логи транзакций</p>
                   <p className="text-[10px] text-muted-foreground/60">Все запросы оплаты отображаются в чате «Nuxus Bot»</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="system" className="p-6 space-y-6 m-0 flex-1 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center gap-2 ml-1">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Глобальная рассылка</h3>
              </div>
              <div className="bg-muted/20 p-6 rounded-[2rem] border border-white/5 space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ваше сообщение будет отправлено каждому пользователю мессенджера через системный канал Nuxus.
                </p>
                <div className="space-y-4">
                  <Input 
                    placeholder="Напишите текст уведомления..." 
                    value={alertText}
                    onChange={e => setAlertText(e.target.value)}
                    className="bg-card border-white/10 h-14 rounded-2xl"
                  />
                  <Button 
                    className="w-full h-14 rounded-2xl bg-primary shadow-lg shadow-primary/20 font-black uppercase tracking-widest italic" 
                    onClick={handleGlobalAlert}
                    disabled={isSendingAlert || !alertText.trim()}
                  >
                    {isSendingAlert ? <Loader2 className="animate-spin w-5 h-5" /> : <><Send className="w-5 h-5 mr-2" /> Запустить рассылку</>}
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-5 bg-destructive/10 rounded-2xl border border-destructive/20 flex items-center gap-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <div className="flex-1">
                <div className="text-[10px] font-black uppercase text-destructive tracking-widest">Зона риска</div>
                <p className="text-[10px] text-muted-foreground">Действия в этом разделе могут повлиять на всех пользователей системы одновременно.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
