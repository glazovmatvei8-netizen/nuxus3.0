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
} from "@/components/ui/dropdown-menu";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit, updateDoc, writeBatch, getDocs, where, orderBy } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Ban, ShieldCheck, 
  MoreVertical, Send, Loader2, Database, Package, FileText
} from 'lucide-react';
import type { User, ArchiveRequest } from '@/lib/types';
import { formatDisplayName, isUserPremium, cn, isGlobalAdmin, decryptSignal } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { addMonths, format } from 'date-fns';
import JSZip from 'jszip';

const ROOT_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

/**
 * АДМИН-ПАНЕЛЬ V15.0: Crystal Guard
 * Реализована настоящая ZIP-архивация с папками /профиль, /сообщения, /истории.
 */
export function AdminPanelModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');
  const [broadcastText, setBroadcastText] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isCollectingArchive, setIsCollectingArchive] = useState<string | null>(null);

  const usersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(500))), [db]);
  const { data: users } = useCollection<User>(usersQuery);

  const archiveRequestsQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'archiveRequests'), where('status', '==', 'pending'))), [db]);
  const { data: archiveRequests } = useCollection<ArchiveRequest>(archiveRequestsQuery);

  const stats = useMemo(() => {
    if (!users) return { total: 0, premium: 0, admins: 0, banned: 0 };
    return {
      total: users.length,
      premium: users.filter(u => isUserPremium(u)).length,
      admins: users.filter(u => isGlobalAdmin(u)).length,
      banned: users.filter(u => u.isBanned).length
    };
  }, [users]);

  const handleAction = async (targetId: string, action: string, value?: any) => {
    if (!db) return;
    if (targetId === ROOT_UID && action === 'ban') {
      toast({ title: "Ошибка", description: "Владелец неприкосновенен", variant: "destructive" });
      return;
    }
    const userRef = doc(db, 'users', targetId);
    let update: any = {};
    switch(action) {
      case 'ban': update = { isBanned: true }; break;
      case 'unban': update = { isBanned: false }; break;
      case 'give_premium': 
        const expiry = addMonths(new Date(), value || 1);
        update = { isPremium: true, premiumUntil: expiry.toISOString() };
        break;
      case 'remove_premium': update = { isPremium: false, premiumUntil: null }; break;
    }
    try {
      await updateDoc(userRef, update);
      toast({ title: "Операция завершена" });
    } catch (e: any) {
      toast({ title: "Ошибка выполнения", description: e.message, variant: "destructive" });
    }
  };

  /**
   * СБОР ДАННЫХ V15.0: Реальный ZIP с папками.
   */
  const handleCollectArchive = async (userId: string, requestId?: string) => {
    if (!db) return;
    setIsCollectingArchive(userId);
    try {
      toast({ title: "Сбор данных...", description: "Формирование ZIP-пакета с папками." });
      
      const zip = new JSZip();
      const targetProfile = users?.find(u => u.id === userId);
      
      // 1. Папка Профиль
      const profileFolder = zip.folder("профиль");
      profileFolder?.file("user_profile.json", JSON.stringify(targetProfile || {}, null, 2));

      // 2. Папка Истории
      const storiesFolder = zip.folder("истории");
      const storiesSnap = await getDocs(query(collection(db, 'stories'), where('userId', '==', userId)));
      const stories = storiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      storiesFolder?.file("active_stories.json", JSON.stringify(stories, null, 2));

      // 3. Папка Сообщения
      const messagesFolder = zip.folder("сообщения");
      const chatsSnap = await getDocs(query(collection(db, 'chats'), where('participantIds', 'array-contains', userId)));
      
      for (const chatDoc of chatsSnap.docs) {
        const chatData = chatDoc.data();
        const msgSnap = await getDocs(query(collection(db, 'chats', chatDoc.id, 'messages'), orderBy('sentAt', 'asc'), limit(5000)));
        const messages = msgSnap.docs.map(d => {
          const data = d.data();
          return { 
            id: d.id, 
            ...data,
            decryptedContent: data.contentType === 'text' ? decryptSignal(data.content) : '[Медиа сигнал]'
          };
        });
        
        const safeName = (chatData.name || chatDoc.id).replace(/[/\\?%*:|"<>]/g, '-');
        messagesFolder?.file(`${safeName}.json`, JSON.stringify({ 
          chat_info: { id: chatDoc.id, type: chatData.type, name: chatData.name, username: chatData.username },
          messages 
        }, null, 2));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nuxus_archive_${userId}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      if (requestId) {
        await updateDoc(doc(db, 'archiveRequests', requestId), { status: 'ready' });
      }

      toast({ title: "Архив готов", description: "ZIP-пакет успешно собран и скачан." });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Ошибка сборки", description: e.message, variant: "destructive" });
    } finally {
      setIsCollectingArchive(null);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastText.trim() || !db) return;
    setIsBroadcasting(true);
    try {
      const chatsSnap = await getDocs(collection(db, 'chats'));
      const batch = writeBatch(db);
      chatsSnap.docs.forEach(chatDoc => {
        const msgRef = doc(collection(db, 'chats', chatDoc.id, 'messages'));
        batch.set(msgRef, {
          chatId: chatDoc.id,
          senderId: 'system_broadcast',
          senderName: 'Nuxus Kernel 📡',
          content: broadcastText.trim(),
          contentType: 'broadcast',
          sentAt: new Date().toISOString(),
        });
      });
      await batch.commit();
      toast({ title: "Рассылка завершена" });
      setBroadcastText('');
    } finally { setIsBroadcasting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0a0a0c]/90 backdrop-blur-3xl border-primary/30 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl border outline-none">
        <DialogHeader className="p-6 bg-primary/5 border-b border-white/5 shrink-0 text-left">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" /> 
            <DialogTitle className="text-white uppercase italic font-black tracking-tighter">Nuxus Admin V15.0</DialogTitle>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 pt-3 shrink-0">
            <TabsList className="grid w-full bg-white/5 p-1 rounded-xl grid-cols-4 gap-1">
              <TabsTrigger value="analytics" className="rounded-lg text-[8px] uppercase font-black">Аналитика</TabsTrigger>
              <TabsTrigger value="users" className="rounded-lg text-[8px] uppercase font-black">Узлы</TabsTrigger>
              <TabsTrigger value="archives" className="rounded-lg text-[8px] uppercase font-black">Архивы</TabsTrigger>
              <TabsTrigger value="broadcast" className="rounded-lg text-[8px] uppercase font-black">Маяк</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="archives" className="flex-1 m-0 p-0 overflow-hidden data-[state=active]:flex flex-col min-h-0">
            <ScrollArea className="flex-1">
               <div className="p-6 space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-primary mb-4 flex items-center gap-2"><Database className="w-3 h-3" /> Запросы ZIP-архивов</h3>
                  {archiveRequests && archiveRequests.length > 0 ? (
                    archiveRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5">
                         <div className="flex items-center gap-3">
                            <UserAvatar userId={req.userId} className="h-10 w-10" />
                            <div className="flex flex-col text-left">
                               <span className="font-bold text-sm text-white">{req.userName}</span>
                               <span className="text-[9px] text-muted-foreground uppercase font-black">{format(new Date(req.createdAt), 'dd.MM HH:mm')}</span>
                            </div>
                         </div>
                         <Button 
                            onClick={() => handleCollectArchive(req.userId, req.id)}
                            disabled={isCollectingArchive === req.userId}
                            className="h-10 px-4 bg-primary text-white rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 shadow-lg"
                         >
                            {isCollectingArchive === req.userId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Package className="w-3.5 h-3.5" /> Собрать ZIP</>}
                         </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 opacity-20">
                       <FileText className="w-12 h-12 mx-auto mb-4" />
                       <p className="text-[10px] font-black uppercase">Нет активных запросов</p>
                    </div>
                  )}
               </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 m-0 p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Узлов" value={stats.total} icon={Users} color="text-white" />
              <StatCard label="Premium" value={stats.premium} icon={Star} color="text-accent" />
              <StatCard label="Админы" value={stats.admins} icon={ShieldCheck} color="text-primary" />
              <StatCard label="Баны" value={stats.banned} icon={Ban} color="text-red-500" />
            </div>
          </TabsContent>

          <TabsContent value="users" className="flex-1 m-0 p-0 flex flex-col min-h-0">
            <div className="p-4 px-6 shrink-0"><Input placeholder="Поиск по базе..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-2xl" /></div>
            <ScrollArea className="flex-1">
              <div className="px-6 space-y-2 pb-20">
                {users?.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-3 text-left">
                      <UserAvatar userId={u.id} className="h-10 w-10" />
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-white">{formatDisplayName(u.name)}</span>
                        <span className="text-[9px] text-muted-foreground uppercase font-black">{u.username}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="rounded-xl text-primary/40 hover:text-primary" onClick={() => handleCollectArchive(u.id)}><Database className="w-4 h-4" /></Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl text-white/20"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 obsidian-glass rounded-xl">
                           <DropdownMenuItem onClick={() => handleAction(u.id, u.isBanned ? 'unban' : 'ban')} className={u.isBanned ? "text-green-500" : "text-red-500"}>{u.isBanned ? 'Разбанить' : 'Забанить'}</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium')}>Выдать Premium (Месяц)</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="broadcast" className="p-6">
             <div className="bg-primary/10 p-6 rounded-[2rem] border border-primary/20 space-y-4">
                <Textarea placeholder="Введите системное сообщение..." value={broadcastText} onChange={e => setBroadcastText(e.target.value)} className="bg-black/40 border-white/10 min-h-[120px] rounded-2xl" />
                <Button onClick={handleBroadcast} disabled={isBroadcasting || !broadcastText.trim()} className="w-full h-12 bg-primary text-white font-black uppercase tracking-widest gap-2 rounded-xl shadow-lg">
                  {isBroadcasting ? <Loader2 className="animate-spin w-4 h-4" /> : <><Send className="w-4 h-4" /> Транслировать</>}
                </Button>
             </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-1 shadow-xl">
      <Icon className={cn("w-4 h-4 mb-1", color)} />
      <span className="text-xl font-black italic text-white">{value}</span>
      <span className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">{label}</span>
    </div>
  );
}