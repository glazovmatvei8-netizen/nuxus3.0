
"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, doc, limit, getDocs, addDoc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { ShieldAlert, Users, Star, Search, Trash2, ShieldCheck, Radio, Send, Loader2, UserX } from 'lucide-react';
import type { User } from '@/lib/types';
import { formatDisplayName, isUserPremium } from '@/lib/utils';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  
  const [userSearch, setUserSearch] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  
  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(500))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

  const stats = useMemo(() => {
    if (!users) return { total: 0, banned: 0, premium: 0, admins: 0 };
    return {
      total: users.length,
      banned: users.filter(u => u.isBanned).length,
      premium: users.filter(u => isUserPremium(u)).length,
      admins: users.filter(u => u.isAdmin || u.id === 'GCvLucN8CjNcdaxPO2vmpZ84hNl1').length
    };
  }, [users]);

  const filteredUsers = (users || []).filter(u => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.phone?.includes(userSearch)
  );

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c] border-primary/30 p-0 overflow-hidden h-[80vh] flex flex-col rounded-[2.5rem] shadow-[0_0_50px_rgba(139,92,246,0.3)] border">
        <DialogHeader className="p-6 bg-primary/5 border-b border-white/5 shrink-0">
          <DialogTitle className="flex items-center justify-between text-white uppercase italic font-black tracking-tighter">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-primary animate-pulse" /> 
              <span>Nuxus Admin v0.33.0</span>
            </div>
            <span className="text-[8px] bg-primary/20 px-2 py-0.5 rounded-full text-primary border border-primary/20">ROOT ACCESS</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4">
            <TabsList className="grid grid-cols-2 w-full bg-white/5 p-1 rounded-2xl">
              <TabsTrigger value="users" className="rounded-xl text-[10px] uppercase font-black tracking-widest gap-2">
                <Users className="w-3.5 h-3.5" /> Ядро
              </TabsTrigger>
              <TabsTrigger value="broadcast" className="rounded-xl text-[10px] uppercase font-black tracking-widest gap-2">
                <Radio className="w-3.5 h-3.5" /> Сигнал
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="flex-1 flex flex-col min-h-0 m-0">
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
                  placeholder="Поиск..." 
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="bg-white/5 border-white/10 h-10 rounded-xl text-sm pl-10"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-6 pb-6 space-y-2">
                {filteredUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar userId={u.id} className="h-9 w-9 shrink-0" manualAvatarUrl={u.avatarUrl} fallbackName={u.name} />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white truncate">{formatDisplayName(u.name)}</span>
                          {u.isPremium && <Star className="w-2.5 h-2.5 text-accent fill-accent" />}
                          {u.isAdmin && <ShieldCheck className="w-2.5 h-2.5 text-primary" />}
                          {u.isBanned && <UserX className="w-2.5 h-2.5 text-destructive" />}
                        </div>
                        <span className="text-[8px] text-muted-foreground/60 truncate uppercase">{u.username}</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" 
                      onClick={() => confirm(`Удалить ${u.name}?`) && deleteDocumentNonBlocking(doc(db, 'users', u.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="broadcast" className="flex-1 p-6 flex flex-col gap-4 m-0">
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-3xl space-y-2">
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
              className="bg-white/5 border-white/10 rounded-2xl min-h-[150px] text-sm resize-none"
            />
            <Button 
              onClick={handleGlobalBroadcast}
              disabled={isBroadcasting || !broadcastMessage.trim()}
              className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
            >
              {isBroadcasting ? <Loader2 className="animate-spin" /> : <>Инициировать Сигнал <Send className="w-4 h-4 ml-2" /></>}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
