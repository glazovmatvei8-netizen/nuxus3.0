
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, doc, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { ShieldAlert, Users, Star, Search, Trash2, ShieldCheck, Radio, Send, Loader2 } from 'lucide-react';
import type { User, Chat } from '@/lib/types';
import { formatDisplayName } from '@/lib/utils';
import { deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

/**
 * Административная консоль Nuxus Prime v0.33.0.
 * Включает управление пользователями и Глобальную Рассылку.
 */
export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  
  const [userSearch, setUserSearch] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  
  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(100))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

  const filteredUsers = (users || []).filter(u => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.phone?.includes(userSearch)
  );

  const handleGlobalBroadcast = async () => {
    if (!broadcastMessage.trim() || !db || !currentUser) return;
    
    setIsBroadcasting(true);
    try {
      // Получаем все чаты (лимитировано для безопасности)
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
      
      toast({ 
        title: "Рассылка завершена", 
        description: `Сообщение отправлено в ${promises.length} узлов Ядра.` 
      });
      setBroadcastMessage('');
      setActiveTab('users');
    } catch (e: any) {
      toast({ title: "Ошибка рассылки", description: e.message, variant: "destructive" });
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c] border-primary/30 p-0 overflow-hidden h-[75vh] flex flex-col rounded-[2.5rem] shadow-[0_0_50px_rgba(139,92,246,0.3)] border">
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
                <Users className="w-3.5 h-3.5" /> Пользователи
              </TabsTrigger>
              <TabsTrigger value="broadcast" className="rounded-xl text-[10px] uppercase font-black tracking-widest gap-2">
                <Radio className="w-3.5 h-3.5" /> Рассылка
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="flex-1 flex flex-col min-h-0 m-0">
            <div className="p-4 px-6 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <Input 
                  placeholder="Поиск в Ядре..." 
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="bg-white/5 border-white/10 h-11 rounded-xl text-sm pl-10 focus:ring-primary/30"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-6 pb-6 space-y-2">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar userId={u.id} className="h-10 w-10 shrink-0" manualAvatarUrl={u.avatarUrl} fallbackName={u.name} />
                        <div className="flex flex-col text-left min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-xs text-white truncate">
                              {formatDisplayName(u.name)}
                            </span>
                            {u.isPremium && <Star className="w-2.5 h-2.5 text-accent fill-accent shrink-0" />}
                            {u.isAdmin && <ShieldCheck className="w-2.5 h-2.5 text-primary shrink-0" />}
                          </div>
                          <span className="text-[9px] text-muted-foreground/60 truncate uppercase tracking-tighter">{u.username}</span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => {
                          if (confirm(`Удалить пользователя ${u.name} навсегда?`)) {
                            deleteDocumentNonBlocking(doc(db, 'users', u.id));
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 opacity-20 uppercase text-[10px] font-black tracking-widest italic">
                    Поиск не дал результатов
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="broadcast" className="flex-1 p-6 flex flex-col gap-6 m-0">
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Radio className="w-4 h-4 animate-pulse" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Global Prime Signal</h3>
              </div>
              <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-bold tracking-wider">
                Ваше сообщение будет мгновенно доставлено во все чаты системы как сервисное уведомление от Nuxus Prime.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Текст рассылки</label>
              <Textarea 
                placeholder="Введите системное сообщение..." 
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                className="bg-white/5 border-white/10 rounded-2xl min-h-[150px] text-sm resize-none focus:ring-primary/20"
              />
            </div>

            <Button 
              onClick={handleGlobalBroadcast}
              disabled={isBroadcasting || !broadcastMessage.trim()}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase italic tracking-[0.2em] shadow-[0_10px_30px_rgba(139,92,246,0.3)] transition-all active:scale-95 disabled:opacity-50"
            >
              {isBroadcasting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Инициировать Сигнал <Send className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </TabsContent>
        </Tabs>
        
        <div className="p-4 bg-black/40 border-t border-white/5 shrink-0">
          <p className="text-[8px] text-center text-muted-foreground/30 uppercase font-black tracking-[0.3em]">
            Nuxus Global Kernel Interface • Quantum Persistence
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
