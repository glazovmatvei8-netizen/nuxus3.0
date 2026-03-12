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
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, doc, limit, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Search, Trash2, ShieldCheck, Radio, Send, 
  Loader2, UserX, MoreVertical, Ban, CheckCircle2, Crown, Calendar, Shield, Globe, Activity, Eye, MessageCircle, ArrowLeft
} from 'lucide-react';
import type { User, Chat } from '@/lib/types';
import { formatDisplayName, isUserPremium, cn } from '@/lib/utils';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
  const [chatSearch, setChatSearch] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  
  // Состояние для проверки чатов конкретного пользователя
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  
  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(500))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

  const chatsQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'chats'), limit(200))), [db]);
  const { data: allChats } = useCollection<Chat>(chatsQuery);

  const stats = useMemo(() => {
    if (!users) return { total: 0, banned: 0, premium: 0, admins: 0 };
    return {
      total: users.length,
      banned: users.filter(u => u.isBanned).length,
      premium: users.filter(u => isUserPremium(u)).length,
      admins: users.filter(u => u.isAdmin || u.id === ROOT_UID).length
    };
  }, [users]);

  const filteredUsers = (users || []).filter(u => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.phone?.includes(userSearch)
  ).sort((a, b) => {
    if (a.id === ROOT_UID) return -1;
    if (b.id === ROOT_UID) return 1;
    return 0;
  });

  const filteredChats = (allChats || []).filter(c => 
    c.name?.toLowerCase().includes(chatSearch.toLowerCase()) || 
    c.username?.toLowerCase().includes(chatSearch.toLowerCase())
  ).sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  // Чаты конкретного пользователя для режима "Проверить чаты"
  const inspectingUserChats = useMemo(() => {
    if (!inspectingUser || !allChats) return [];
    return allChats.filter(c => c.participantIds.includes(inspectingUser.id));
  }, [inspectingUser, allChats]);

  const handleAction = async (targetId: string, action: string, value?: any) => {
    if (!db) return;
    if (targetId === ROOT_UID) {
      toast({ title: "Ошибка", description: "Запрещено изменять настройки Владельца Ядра", variant: "destructive" });
      return;
    }

    const userRef = doc(db, 'users', targetId);
    let update: any = {};

    switch(action) {
      case 'ban':
        update = { isBanned: true, bannedUntil: null };
        toast({ title: "Пользователь забанен" });
        break;
      case 'unban':
        update = { isBanned: false, bannedUntil: null };
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
      case 'remove_premium':
        update = { isPremium: false, premiumUntil: null };
        toast({ title: "Premium отозван" });
        break;
      case 'give_premium':
        const now = new Date();
        const expiry = addMonths(now, value || 1);
        update = { isPremium: true, premiumUntil: expiry.toISOString() };
        toast({ title: `Premium выдан на ${value} мес.` });
        break;
    }

    updateDocumentNonBlocking(userRef, update);
  };

  const handleIntercept = (chatId: string) => {
    setCurrentChatId(chatId);
    setActiveView('chats');
    onOpenChange(false);
    toast({ title: "Вход в узел выполнен", description: "Режим перехвата активирован" });
  };

  const handleGlobalBroadcast = async () => {
    if (!broadcastMessage.trim() || !db || !currentUser) return;
    
    setIsBroadcasting(true);
    try {
      const chatsSnap = await getDocs(query(collection(db, 'chats'), limit(50)));
      const promises = chatsSnap.docs.map(chatDoc => {
        const msgCol = collection(db, 'chats', chatDoc.id, 'messages');
        return addDoc(msgCol, {
          chatId: chatDoc.id,
          senderId: 'system',
          senderName: 'NUXUS PRIME',
          content: broadcastMessage.trim(),
          contentType: 'service',
          sentAt: new Date().toISOString(),
        });
      });
      await Promise.all(promises);
      toast({ title: "Рассылка завершена", description: `Отправлено в ${promises.length} чатов.` });
      setBroadcastMessage('');
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setIsBroadcasting(false);
    }
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
                  <span>Назад</span>
                </button>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5 text-primary animate-pulse" /> 
                  <span>Nuxus Admin v0.65.8</span>
                </>
              )}
            </div>
            <span className="text-[8px] bg-primary/20 px-2 py-0.5 rounded-full text-primary border border-primary/20">ROOT ACCESS</span>
          </DialogTitle>
        </DialogHeader>

        {inspectingUser ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/5 space-y-3 shrink-0">
              <div className="flex items-center gap-4">
                <UserAvatar userId={inspectingUser.id} className="h-14 w-14" manualAvatarUrl={inspectingUser.avatarUrl} />
                <div className="flex flex-col">
                  <h3 className="font-black text-lg text-white leading-none mb-1">{formatDisplayName(inspectingUser.name)}</h3>
                  <span className="text-[10px] text-primary uppercase font-bold tracking-[0.2em]">{inspectingUser.username}</span>
                </div>
              </div>
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Перехват сигналов узла: {inspectingUserChats.length} каналов</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-3">
                {inspectingUserChats.length > 0 ? (
                  inspectingUserChats.map(chat => (
                    <div key={chat.id} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] border border-white/5 hover:border-accent/30 transition-all group">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative">
                          <UserAvatar userId={null} className="h-10 w-10" manualAvatarUrl={chat.avatarUrl} fallbackName={chat.name} />
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0a0c] flex items-center justify-center",
                            chat.type === 'private' ? "bg-blue-500" : "bg-purple-500"
                          )}>
                            {chat.type === 'private' ? <Shield className="w-2 h-2 text-white" /> : <Users className="w-2 h-2 text-white" />}
                          </div>
                        </div>
                        <div className="flex flex-col min-w-0 text-left">
                          <span className="font-bold text-sm text-white truncate">{chat.name || 'Приватный узел'}</span>
                          <span className="text-[9px] text-muted-foreground/60 uppercase font-black">{chat.type}</span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleIntercept(chat.id)}
                        className="h-8 rounded-xl bg-accent/10 text-accent hover:bg-accent hover:text-white font-black uppercase text-[8px] tracking-widest px-4"
                      >
                        Вход
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 opacity-20">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Узел не имеет активных сигналов</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-6 pt-4 shrink-0">
              <TabsList className="grid grid-cols-3 w-full bg-white/5 p-1 rounded-2xl">
                <TabsTrigger value="users" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-1">
                  <Users className="w-3 h-3" /> Ядро
                </TabsTrigger>
                <TabsTrigger value="signals" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-1">
                  <Eye className="w-3 h-3" /> Сигналы
                </TabsTrigger>
                <TabsTrigger value="broadcast" className="rounded-xl text-[9px] uppercase font-black tracking-widest gap-1">
                  <Radio className="w-3 h-3" /> Маяк
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="users" className="flex-1 data-[state=active]:flex flex-col min-h-0 m-0 overflow-hidden outline-none">
              <div className="grid grid-cols-4 gap-2 px-6 pt-4 shrink-0">
                <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                  <p className="text-[7px] text-muted-foreground uppercase font-black">Всего</p>
                  <p className="text-sm font-black text-white">{stats.total}</p>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                  <p className="text-[7px] text-destructive uppercase font-black">Бан</p>
                  <p className="text-sm font-black text-destructive">{stats.banned}</p>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                  <p className="text-[7px] text-accent uppercase font-black">Прем</p>
                  <p className="text-sm font-black text-accent">{stats.premium}</p>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                  <p className="text-[7px] text-primary uppercase font-black">Админ</p>
                  <p className="text-sm font-black text-primary">{stats.admins}</p>
                </div>
              </div>

              <div className="p-4 px-6 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input 
                    placeholder="Поиск по базе..." 
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="bg-white/5 border-white/10 h-10 rounded-xl text-sm pl-10"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="px-6 pb-6 space-y-2">
                  {filteredUsers.map(u => {
                    const isRoot = u.id === ROOT_UID;
                    return (
                      <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar userId={u.id} className="h-10 w-10 shrink-0" manualAvatarUrl={u.avatarUrl} fallbackName={u.name} />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-white truncate">{formatDisplayName(u.name)}</span>
                              {u.isPremium && <Star className="w-2.5 h-2.5 text-accent fill-accent" />}
                              {u.isAdmin && <ShieldCheck className="w-2.5 h-2.5 text-primary" />}
                              {u.isBanned && <UserX className="w-2.5 h-2.5 text-destructive" />}
                              {isRoot && <Shield className="w-2.5 h-2.5 text-blue-400 animate-pulse" />}
                            </div>
                            
                            <div className="flex flex-col gap-1.5 mt-1">
                              <span className="text-[9px] text-muted-foreground/60 truncate uppercase font-bold tracking-widest">{u.username}</span>
                              
                              <div className="flex items-center gap-2">
                                {u.lastIp ? (
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black text-cyan-400 uppercase tracking-tighter">
                                    <Globe className="w-3 h-3 animate-pulse" /> IP: {u.lastIp}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-black text-white/20 uppercase tracking-tighter">
                                    <Activity className="w-3 h-3 opacity-20" /> SYNCING...
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-card border-white/10 rounded-2xl">
                            <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground/60">Управление узлом</DropdownMenuLabel>
                            
                            <DropdownMenuItem onClick={() => setInspectingUser(u)} className="gap-2 font-bold text-primary">
                              <Eye className="w-4 h-4" /> Проверить чаты
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-white/5" />

                            {u.isBanned ? (
                              <DropdownMenuItem onClick={() => handleAction(u.id, 'unban')} className="gap-2 text-green-500 font-bold" disabled={isRoot}>
                                <CheckCircle2 className="w-4 h-4" /> Разбанить
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleAction(u.id, 'ban')} className="gap-2 text-destructive font-bold" disabled={isRoot}>
                                <Ban className="w-4 h-4" /> Забанить
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator className="bg-white/5" />

                            {u.isAdmin ? (
                              <DropdownMenuItem onClick={() => handleAction(u.id, 'remove_admin')} className="gap-2 font-bold" disabled={isRoot}>
                                <Shield className="w-4 h-4" /> Снять админку
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleAction(u.id, 'set_admin')} className="gap-2 font-bold text-primary" disabled={isRoot}>
                                <Crown className="w-4 h-4" /> Назначить админом
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator className="bg-white/5" />

                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="gap-2 font-bold text-accent">
                                <Star className="w-4 h-4" /> Подарить Premium
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="bg-card border-white/10">
                                <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 1)} className="gap-2">
                                  <Calendar className="w-4 h-4" /> 1 месяц
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 6)} className="gap-2">
                                  <Calendar className="w-4 h-4" /> 6 месяцев
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 12)} className="gap-2">
                                  <Star className="w-4 h-4" /> 1 год
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 24)} className="gap-2 text-primary font-black">
                                  <Crown className="w-4 h-4" /> 2 года
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            {u.isPremium && (
                              <DropdownMenuItem onClick={() => handleAction(u.id, 'remove_premium')} className="gap-2 text-muted-foreground" disabled={isRoot}>
                                <Trash2 className="w-4 h-4" /> Снять Premium
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={() => confirm(`Удалить ${u.name}?`) && deleteDocumentNonBlocking(doc(db, 'users', u.id))} className="text-destructive gap-2" disabled={isRoot}>
                              <Trash2 className="w-4 h-4" /> Удалить из базы
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="signals" className="flex-1 data-[state=active]:flex flex-col min-h-0 m-0 overflow-hidden outline-none">
              <div className="p-4 px-6 shrink-0 space-y-4">
                <div className="bg-accent/5 border border-accent/20 p-3 rounded-2xl flex items-center gap-3">
                  <Eye className="w-5 h-5 text-accent animate-pulse" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-white">Перехват Сигналов</span>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase">Доступ ко всем узлам переписки</span>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input 
                    placeholder="Поиск чатов..." 
                    value={chatSearch}
                    onChange={e => setChatSearch(e.target.value)}
                    className="bg-white/5 border-white/10 h-10 rounded-xl text-sm pl-10"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="px-6 pb-6 space-y-2">
                  {filteredChats.map(chat => (
                    <div key={chat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-accent/30 transition-all group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <UserAvatar userId={null} className="h-10 w-10 shrink-0" manualAvatarUrl={chat.avatarUrl} fallbackName={chat.name} />
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0a0c] flex items-center justify-center",
                            chat.type === 'private' ? "bg-blue-500" : "bg-purple-500"
                          )}>
                            {chat.type === 'private' ? <Shield className="w-2 h-2 text-white" /> : <Users className="w-2 h-2 text-white" />}
                          </div>
                        </div>
                        <div className="flex flex-col min-w-0 text-left">
                          <span className="font-bold text-sm text-white truncate">{chat.name || 'Приватный узел'}</span>
                          <span className="text-[9px] text-muted-foreground/60 uppercase font-black tracking-tighter">{chat.username || chat.id.slice(0, 8)}</span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleIntercept(chat.id)}
                        className="h-8 rounded-xl bg-accent/10 text-accent hover:bg-accent hover:text-white font-black uppercase text-[8px] tracking-widest px-3"
                      >
                        Вход
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="broadcast" className="flex-1 data-[state=active]:flex flex-col p-6 gap-4 m-0 overflow-hidden outline-none">
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-3xl space-y-2 shrink-0">
                <div className="flex items-center gap-2 text-primary">
                  <Radio className="w-4 h-4 animate-pulse" />
                  <h3 className="text-[10px] font-black uppercase">Global Broadcast</h3>
                </div>
                <p className="text-[8px] text-muted-foreground uppercase font-bold">Рассылка во все узлы Ядра.</p>
              </div>
              <Textarea 
                placeholder="Текст сообщения..." 
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                className="bg-white/5 border-white/10 rounded-2xl min-h-[150px] text-sm resize-none flex-1"
              />
              <Button 
                onClick={handleGlobalBroadcast}
                disabled={isBroadcasting || !broadcastMessage.trim()}
                className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 shrink-0"
              >
                {isBroadcasting ? <Loader2 className="animate-spin" /> : <>Инициировать Сигнал <Send className="w-4 h-4 ml-2" /></>}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
