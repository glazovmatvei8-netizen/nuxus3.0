
"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, doc, limit, getDocs, addDoc, orderBy, writeBatch, increment, where } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Search, Trash2, ShieldCheck, Radio, Send, 
  Loader2, UserX, MoreVertical, Ban, CheckCircle2, Crown, Calendar, Shield, Globe, Activity, Eye, MessageCircle, ArrowLeft, CreditCard, Check, X, ShieldOff
} from 'lucide-react';
import type { User, Chat, Transaction } from '@/lib/types';
import { formatDisplayName, isUserPremium, cn } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { addMonths } from 'date-fns';

const ROOT_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { setCurrentChatId, setActiveView } = useAppState();
  const { toast } = useToast();
  
  const [userSearch, setUserSearch] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  
  // State for drilling down into a user's chats
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  
  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(500))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

  const chatsQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'chats'), limit(1000))), [db]);
  const { data: allChats } = useCollection<Chat>(chatsQuery);

  const requestsQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'topUpRequests'), orderBy('createdAt', 'desc'), limit(50))), [db]);
  const { data: topUpRequests } = useCollection<any>(requestsQuery);

  // Фильтруем список пользователей: исключаем админа и ботов
  const realUsersOnly = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      const isMe = u.id === currentUser?.uid;
      const isBot = u.id.startsWith('bot_') || u.username === '@stickers' || u.name?.includes('Bot');
      const matchesSearch = u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
                           u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
                           u.phone?.includes(userSearch);
      return !isMe && !isBot && matchesSearch;
    }).sort((a, b) => {
      if (a.id === ROOT_UID) return -1;
      if (b.id === ROOT_UID) return 1;
      return 0;
    });
  }, [users, currentUser?.uid, userSearch]);

  const handleAction = async (targetId: string, action: string, value?: any) => {
    if (!db) return;
    if (targetId === ROOT_UID) {
      toast({ title: "Ошибка", description: "Запрещено изменять параметры Владельца", variant: "destructive" });
      return;
    }

    const userRef = doc(db, 'users', targetId);
    let update: any = {};

    switch(action) {
      case 'ban':
        update = { isBanned: true };
        toast({ title: "Узел заблокирован" });
        break;
      case 'unban':
        update = { isBanned: false };
        toast({ title: "Доступ восстановлен" });
        break;
      case 'set_admin':
        update = { isAdmin: true };
        toast({ title: "Права админа выданы" });
        break;
      case 'remove_admin':
        update = { isAdmin: false };
        toast({ title: "Админ разжалован" });
        break;
      case 'give_premium':
        const now = new Date();
        const expiry = addMonths(now, value || 1);
        update = { isPremium: true, premiumUntil: expiry.toISOString() };
        toast({ title: `Premium выдан на ${value} мес.` });
        break;
      case 'remove_premium':
        update = { isPremium: false, premiumUntil: null };
        toast({ title: "Premium статус снят" });
        break;
      case 'approve_topup':
        const txBatch = writeBatch(db);
        txBatch.update(doc(db, 'topUpRequests', targetId), { status: 'approved' });
        txBatch.update(doc(db, 'users', value.userId), { balance: increment(value.amount) });
        const historyRef = doc(collection(db, 'users', value.userId, 'transactions'));
        txBatch.set(historyRef, {
          id: historyRef.id,
          userId: value.userId,
          amount: value.amount,
          type: 'deposit',
          status: 'completed',
          createdAt: new Date().toISOString()
        });
        await txBatch.commit();
        toast({ title: "Пополнение подтверждено" });
        break;
      case 'reject_topup':
        updateDocumentNonBlocking(doc(db, 'topUpRequests', targetId), { status: 'rejected' });
        toast({ title: "Заявка отклонена" });
        break;
    }

    if (!['approve_topup', 'reject_topup'].includes(action)) {
      updateDocumentNonBlocking(userRef, update);
    }
  };

  const handleIntercept = (chatId: string) => {
    setCurrentChatId(chatId);
    setActiveView('chats');
    onOpenChange(false);
    toast({ title: "Вход в узел выполнен", description: "Режим перехвата активен" });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if(!o) setInspectingUser(null); }}>
      <DialogContent className="max-w-md bg-[#0a0a0c] border-primary/30 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-[0_0_50px_rgba(139,92,246,0.3)] border">
        <DialogHeader className="p-6 bg-primary/5 border-b border-white/5 shrink-0">
          <DialogTitle className="flex items-center justify-between text-white uppercase italic font-black tracking-tighter">
            <div className="flex items-center gap-3">
              {inspectingUser ? (
                <button onClick={() => setInspectingUser(null)} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                  <span className="truncate max-w-[150px]">Узел: {inspectingUser.name}</span>
                </button>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5 text-primary animate-pulse" /> 
                  <span>Nuxus Kernel Admin</span>
                </>
              )}
            </div>
            {!inspectingUser && <span className="text-[8px] bg-primary/20 px-2 py-0.5 rounded-full text-primary border border-primary/20">ROOT ACCESS</span>}
          </DialogTitle>
        </DialogHeader>

        {!inspectingUser ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-6 pt-4 shrink-0">
              <TabsList className="grid grid-cols-3 w-full bg-white/5 p-1 rounded-2xl">
                <TabsTrigger value="users" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-1">
                  <Users className="w-3.5 h-3.5" /> Ядро
                </TabsTrigger>
                <TabsTrigger value="requests" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-1">
                  <CreditCard className="w-3.5 h-3.5" /> Заявки
                </TabsTrigger>
                <TabsTrigger value="broadcast" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-1">
                  <Radio className="w-3.5 h-3.5" /> Маяк
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="users" className="flex-1 data-[state=active]:flex flex-col min-h-0 m-0 overflow-hidden outline-none">
              <div className="p-4 px-6 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input 
                    placeholder="Поиск по узлам..." 
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="bg-white/5 border-white/10 h-10 rounded-xl text-sm pl-10"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="px-6 pb-6 space-y-2">
                  {realUsersOnly.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar userId={u.id} className="h-10 w-10 shrink-0" manualAvatarUrl={u.avatarUrl} fallbackName={u.name} />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white truncate">{formatDisplayName(u.name)}</span>
                            {u.isPremium && <Star className="w-2.5 h-2.5 text-accent fill-accent" />}
                            {u.isAdmin && <ShieldCheck className="w-2.5 h-2.5 text-primary" />}
                          </div>
                          <span className="text-[9px] text-muted-foreground/60 truncate uppercase font-bold tracking-widest">{u.username}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setInspectingUser(u)}
                          className="h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-black uppercase text-[8px] tracking-widest px-3"
                        >
                          Вход
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-card border-white/10 rounded-2xl shadow-2xl p-1">
                            {u.isBanned ? (
                              <DropdownMenuItem onClick={() => handleAction(u.id, 'unban')} className="gap-3 py-3 font-bold text-[10px] uppercase text-green-500 rounded-xl">
                                <CheckCircle2 className="w-4 h-4" /> Разблокировать
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleAction(u.id, 'ban')} className="gap-3 py-3 font-bold text-[10px] uppercase text-destructive rounded-xl">
                                <Ban className="w-4 h-4" /> Заблокировать
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-white/5" />
                            
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="gap-3 py-3 font-bold text-[10px] uppercase rounded-xl">
                                <Crown className="w-4 h-4 text-accent" /> Premium статус
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="bg-card border-white/10 rounded-xl">
                                <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 1)} className="text-[10px] font-bold uppercase">На 1 Месяц</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 3)} className="text-[10px] font-bold uppercase">На 3 Месяца</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 12)} className="text-[10px] font-bold uppercase">На 1 Год</DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/5" />
                                <DropdownMenuItem onClick={() => handleAction(u.id, 'remove_premium')} className="text-destructive text-[10px] font-bold uppercase">Снять Premium</DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            <DropdownMenuItem onClick={() => handleAction(u.id, u.isAdmin ? 'remove_admin' : 'set_admin')} className="gap-3 py-3 font-bold text-[10px] uppercase rounded-xl">
                              {u.isAdmin ? <><ShieldOff className="w-4 h-4 text-primary" /> Снять Админку</> : <><ShieldCheck className="w-4 h-4 text-primary" /> Назначить Админом</>}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="requests" className="flex-1 data-[state=active]:flex flex-col min-h-0 m-0 overflow-hidden outline-none">
               <ScrollArea className="flex-1">
                <div className="px-6 py-4 space-y-3">
                  {topUpRequests?.filter((r: any) => r.status === 'pending').map((req: any) => (
                    <div key={req.id} className="p-4 bg-white/5 border border-white/5 rounded-[1.8rem] flex flex-col gap-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <UserAvatar userId={req.userId} className="h-10 w-10" fallbackName={req.userName} />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">{req.userName}</span>
                            <span className="text-[9px] text-muted-foreground font-black">{new Date(req.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="text-right"><span className="text-lg font-black italic text-primary">+{req.amount} NX</span></div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleAction(req.id, 'approve_topup', req)} className="flex-1 bg-green-500 text-white rounded-xl h-10 font-black uppercase text-[9px] tracking-widest gap-2">Принять</Button>
                        <Button variant="ghost" onClick={() => handleAction(req.id, 'reject_topup', req)} className="flex-1 bg-red-500/10 text-red-500 rounded-xl h-10 font-black uppercase text-[9px] tracking-widest gap-2">Отклонить</Button>
                      </div>
                    </div>
                  ))}
                  {topUpRequests?.filter((r: any) => r.status === 'pending').length === 0 && (
                    <div className="text-center py-24 opacity-20">
                      <CreditCard className="w-14 h-14 mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Нет активных заявок</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="broadcast" className="flex-1 data-[state=active]:flex flex-col p-6 gap-4 m-0 overflow-hidden outline-none">
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary px-1">Глобальное вещание</h3>
                <Textarea 
                  placeholder="Введите текст сигнала для всех узлов..." 
                  value={broadcastMessage} 
                  onChange={e => setBroadcastMessage(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-2xl min-h-[180px] text-sm resize-none focus:border-primary/40 transition-colors"
                />
              </div>
              <Button onClick={() => { toast({ title: "Сигнал передан", description: "Массовая рассылка начата" }); setBroadcastMessage(''); }} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">
                <Radio className="w-5 h-5 mr-2" /> Инициировать Сигнал
              </Button>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/5 space-y-1 shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><MessageCircle size={100} /></div>
              <div className="flex items-center gap-4 relative z-10">
                <UserAvatar userId={inspectingUser.id} className="h-14 w-14 border-2 border-primary/20" manualAvatarUrl={inspectingUser.avatarUrl} />
                <div className="flex flex-col">
                  <h3 className="font-black text-lg text-white leading-none mb-1">{formatDisplayName(inspectingUser.name)}</h3>
                  <span className="text-[10px] text-primary uppercase font-bold tracking-[0.2em]">{inspectingUser.username}</span>
                </div>
              </div>
              <p className="text-[8px] text-muted-foreground uppercase font-black pt-3">Активные связи узла ({allChats?.filter(c => c.participantIds.includes(inspectingUser.id)).length}):</p>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-3">
                {allChats?.filter(c => c.participantIds.includes(inspectingUser.id)).map(chat => {
                  let displayName = chat.name;
                  if (chat.type === 'private') {
                    const otherPid = chat.participantIds.find(id => id !== inspectingUser.id);
                    const otherU = users?.find(u => u.id === otherPid);
                    displayName = `Личка: ${formatDisplayName(otherU?.name || 'Узел')}`;
                  }

                  return (
                    <div key={chat.id} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] border border-white/5 hover:border-accent/30 transition-all group shadow-lg">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                          {chat.type === 'private' ? <Shield className="w-5 h-5 text-blue-400" /> : <Users className="w-5 h-5 text-purple-400" />}
                        </div>
                        <div className="flex flex-col min-w-0 text-left">
                          <span className="font-bold text-sm text-white truncate">{displayName}</span>
                          <span className="text-[9px] text-muted-foreground/60 uppercase font-black">{chat.type} • {chat.id.slice(0, 8)}</span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleIntercept(chat.id)}
                        className="h-8 rounded-xl bg-accent/10 text-accent hover:bg-accent hover:text-white font-black uppercase text-[8px] tracking-widest px-4"
                      >
                        Войти
                      </Button>
                    </div>
                  );
                })}
                {allChats?.filter(c => c.participantIds.includes(inspectingUser.id)).length === 0 && (
                  <div className="text-center py-20 opacity-20">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Узел не имеет активных связей</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
