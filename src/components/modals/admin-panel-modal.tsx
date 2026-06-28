
"use client"

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
} from "@/components/ui/dropdown-menu";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, limit, updateDoc, writeBatch, increment, getDocs, setDoc, deleteDoc, where } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { 
  ShieldAlert, Users, Star, Ban, CheckCircle2, ShieldCheck, Radio, 
  MoreVertical, ShieldOff, Activity, Wallet, Check, Trash2, X, Globe, Fingerprint, Send, Zap, Loader2, AlertTriangle, Play, Square, Flame, Radiation, Database, Download, FileText, Package
} from 'lucide-react';
import type { User, TopUpRequest, Chat, ArchiveRequest, Message, Story } from '@/lib/types';
import { formatDisplayName, isUserPremium, cn, isGlobalAdmin } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { addMonths, subDays, isSameDay, format } from 'date-fns';
import { ru } from 'date-fns/locale';

const ROOT_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

/**
 * АДМИН-ПАНЕЛЬ V13.5 «Crystal Vault»
 * Теперь собирает архив в структурированный "пакет" данных.
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
      case 'make_admin': update = { isAdmin: true }; break;
      case 'remove_admin': update = { isAdmin: false }; break;
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

  const handleCollectArchive = async (userId: string, requestId?: string) => {
    if (!db) return;
    setIsCollectingArchive(userId);
    try {
      toast({ title: "Сбор данных...", description: "Создание пакета Crystal Vault." });
      
      const archive: any = {
        metadata: {
          generatedAt: new Date().toISOString(),
          version: "13.5",
          ownerId: userId
        },
        folders: {
          profile: {},
          messages: {},
          stories: {},
          wallet: {}
        }
      };

      const targetProfile = users?.find(u => u.id === userId);
      archive.folders.profile["user_profile.json"] = targetProfile;

      // 1. Stories
      const storiesSnap = await getDocs(query(collection(db, 'stories'), where('userId', '==', userId)));
      archive.folders.stories["active_stories.json"] = storiesSnap.docs.map(d => d.data());

      // 2. Chats & Messages
      const chatsSnap = await getDocs(query(collection(db, 'chats'), where('participantIds', 'array-contains', userId)));
      for (const chatDoc of chatsSnap.docs) {
        const chatData = chatDoc.data();
        const chatName = chatData.name || chatData.username || chatDoc.id;
        archive.folders.messages[`chat_${chatDoc.id}.json`] = {
          info: chatData,
          signals: []
        };
        const msgSnap = await getDocs(query(collection(db, 'chats', chatDoc.id, 'messages'), limit(100)));
        archive.folders.messages[`chat_${chatDoc.id}.json`].signals = msgSnap.docs.map(d => d.data());
      }

      // Generate File (Structured Package)
      const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nuxus_archive_${userId}_package.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      if (requestId) {
        await updateDoc(doc(db, 'archiveRequests', requestId), { status: 'ready' });
      }

      toast({ title: "Архив собран", description: "Структурированный пакет сохранен." });
    } catch (e) {
      toast({ title: "Ошибка сбора", variant: "destructive" });
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
        <DialogHeader className="p-4 md:p-6 bg-primary/5 border-b border-white/5 shrink-0 relative text-left">
          <div className="flex items-center justify-between w-full pr-8">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary animate-pulse" /> 
              <DialogTitle className="text-white uppercase italic font-black tracking-tighter text-xs md:text-base select-none">
                Nuxus Admin V13.5
              </DialogTitle>
            </div>
            {archiveRequests && archiveRequests.length > 0 && (
              <div className="flex items-center gap-1.5 bg-accent/20 px-3 py-1 rounded-full border border-accent/20 animate-pulse">
                <Package className="w-2.5 h-2.5 text-accent" />
                <span className="text-[8px] font-black text-accent uppercase tracking-widest">Архивы: {archiveRequests.length}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 md:px-6 pt-3 shrink-0">
            <TabsList className="grid w-full bg-white/5 p-1 rounded-xl grid-cols-4 gap-1">
              <TabsTrigger value="analytics" className="rounded-lg text-[8px] uppercase font-black">Аналитика</TabsTrigger>
              <TabsTrigger value="users" className="rounded-lg text-[8px] uppercase font-black">Узлы</TabsTrigger>
              <TabsTrigger value="archives" className="rounded-lg text-[8px] uppercase font-black">Архивы</TabsTrigger>
              <TabsTrigger value="broadcast" className="rounded-lg text-[8px] uppercase font-black">Маяк</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="archives" className="flex-1 m-0 p-0 overflow-hidden outline-none data-[state=active]:flex flex-col min-h-0">
            <ScrollArea className="flex-1">
               <div className="p-6 space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-primary mb-4 flex items-center gap-2">
                    <Database className="w-3 h-3" /> Запросы на экспорт (Crystal Vault)
                  </h3>
                  {archiveRequests && archiveRequests.length > 0 ? (
                    archiveRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] border border-white/5">
                         <div className="flex items-center gap-3">
                            <UserAvatar userId={req.userId} className="h-10 w-10" />
                            <div className="flex flex-col text-left">
                               <span className="font-bold text-sm text-white">{req.userName}</span>
                               <span className="text-[9px] text-muted-foreground uppercase font-black">{format(new Date(req.createdAt), 'dd.MM, HH:mm')}</span>
                            </div>
                         </div>
                         <Button 
                            onClick={() => handleCollectArchive(req.userId, req.id)}
                            disabled={isCollectingArchive === req.userId}
                            className="h-10 px-4 bg-primary text-white rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 shadow-lg"
                         >
                            {isCollectingArchive === req.userId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Package className="w-3.5 h-3.5" /> Собрать пакет</>}
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

          <TabsContent value="analytics" className="flex-1 m-0 p-0 overflow-hidden outline-none data-[state=active]:flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="px-4 md:px-6 py-4 space-y-6 pb-20 text-left">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Всего аккаунтов" value={stats.total} icon={Users} color="text-white" />
                  <StatCard label="Premium" value={stats.premium} icon={Star} color="text-accent" />
                  <StatCard label="Админы" value={stats.admins} icon={ShieldCheck} color="text-primary" />
                  <StatCard label="Баны" value={stats.banned} icon={Ban} color="text-red-500" />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="users" className="flex-1 m-0 p-0 overflow-hidden outline-none data-[state=active]:flex flex-col min-h-0">
            <div className="p-4 px-6 shrink-0">
              <Input placeholder="Поиск по базе..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-2xl pl-4" />
            </div>
            <ScrollArea className="flex-1">
              <div className="px-6 space-y-2 pb-20">
                {users?.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.username?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-[1.8rem] border border-white/5 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-3 min-w-0 text-left">
                      <UserAvatar userId={u.id} className="h-10 w-10" fallbackName={u.name} />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs flex items-center gap-1 truncate text-white">
                          {formatDisplayName(u.name)} 
                          {isUserPremium(u) && <Star className="w-3 h-3 text-accent fill-accent" />}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase font-black truncate">{u.username}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl text-primary/40 hover:text-primary"
                        onClick={() => handleCollectArchive(u.id)}
                      >
                         <Database className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="w-5 h-5"/></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-card border-white/10 rounded-2xl p-1">
                          <DropdownMenuItem onClick={() => handleAction(u.id, u.isBanned ? 'unban' : 'ban')} className={cn("gap-3 font-bold uppercase text-[10px] py-3 rounded-xl", u.isBanned ? "text-green-500" : "text-destructive")}>
                            {u.isBanned ? <CheckCircle2 className="w-4 h-4"/> : <Ban className="w-4 h-4"/>} {u.isBanned ? 'Разблокировать' : 'Заблокировать'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem onClick={() => handleAction(u.id, 'give_premium', 1)} className="text-[10px] font-bold uppercase py-3 rounded-xl gap-3"><Star className="w-4 h-4 text-accent" /> Выдать Premium</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="broadcast" className="flex-1 m-0 p-6 overflow-hidden data-[state=active]:flex flex-col min-h-0">
             <div className="space-y-6 text-left">
                <div className="bg-primary/10 p-6 rounded-[2rem] border border-primary/20 space-y-4">
                  <Textarea 
                    placeholder="Введите системное сообщение..." 
                    value={broadcastText}
                    onChange={e => setBroadcastText(e.target.value)}
                    className="bg-black/40 border-white/10 min-h-[120px] rounded-2xl resize-none text-sm"
                  />
                  <Button 
                    onClick={handleBroadcast}
                    disabled={isBroadcasting || !broadcastText.trim()}
                    className="w-full h-12 bg-primary text-white font-black uppercase tracking-widest gap-2 rounded-xl shadow-lg"
                  >
                    {isBroadcasting ? <Loader2 className="animate-spin w-4 h-4" /> : <><Send className="w-4 h-4" /> Транслировать Сигнал</>}
                  </Button>
                </div>
             </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-[1.8rem] border border-white/5 flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-all shadow-xl">
      <Icon className={cn("w-4 h-4 mb-1", color)} />
      <span className="text-lg font-black italic text-white tracking-tight">{value}</span>
      <span className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest text-center leading-none">{label}</span>
    </div>
  );
}
