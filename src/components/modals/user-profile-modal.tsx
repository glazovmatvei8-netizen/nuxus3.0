
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, Star, Calendar, Phone, Video, Gift, Zap, Globe, ShieldCheck, Cpu, Sparkles, UserCheck, UserPlus, Ban, Crown, ShieldAlert, ShieldX, ChevronRight, Activity
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { doc, query, collection, limit, getDocs, addDoc, where, orderBy, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/app-state';
import { formatDisplayName, isUserPremium, formatLastSeen, cn, isGlobalAdmin, getReputationInfo } from '@/lib/utils';
import type { User, ReceivedGift } from '@/lib/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { GiftModal } from './gift-modal';
import versions from '@/app/versions.json';

/**
 * USER PROFILE MODAL V102.0 «ORDER PROTOCOL»
 * Добавлен запрет на создание дублей личных чатов.
 */
export function UserProfileModal() {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { inspectedUserId, setInspectedUserId, setCurrentChatId, setActiveView, setActiveCallId } = useAppState();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isAdminProcessing, setIsAdminProcessing] = useState(false);

  const currentUserRef = useMemoFirebase(() => (!db || !currentUser) ? null : doc(db, 'users', currentUser.uid), [db, currentUser?.uid]);
  const { data: currentUserProfile } = useDoc<User>(currentUserRef);

  const targetUserRef = useMemoFirebase(() => (!db || !inspectedUserId) ? null : doc(db, 'users', inspectedUserId), [db, inspectedUserId]);
  const { data: targetUser } = useDoc<User>(targetUserRef);

  const giftsQuery = useMemoFirebase(() => {
    if (!db || !inspectedUserId) return null;
    return query(collection(db, 'users', inspectedUserId, 'receivedGifts'), limit(20));
  }, [db, inspectedUserId]);
  const { data: gifts } = useCollection<ReceivedGift>(giftsQuery);

  const isContact = useMemo(() => inspectedUserId && currentUserProfile?.contactIds?.includes(inspectedUserId), [inspectedUserId, currentUserProfile?.contactIds]);

  const handleToggleContact = async () => {
    if (!db || !currentUser || !inspectedUserId) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        contactIds: isContact ? arrayRemove(inspectedUserId) : arrayUnion(inspectedUserId)
      });
      toast({ title: isContact ? "Удалено" : "Добавлено" });
    } catch (e) { toast({ title: "Сбой" }); }
  };

  const handleAdminAction = async (data: Partial<User>, label: string) => {
    if (!db || !inspectedUserId) return;
    setIsAdminProcessing(true);
    try {
      await updateDoc(doc(db, 'users', inspectedUserId), data);
      toast({ title: label });
    } catch (e) { toast({ title: "Сбой прав" }); } finally { setIsAdminProcessing(false); }
  };

  const handleStartChat = async () => {
    if (!db || !currentUser || !targetUser) return;
    try {
      // ПРОВЕРКА НА СУЩЕСТВУЮЩИЙ ЧАТ
      const q = query(
        collection(db, 'chats'), 
        where('type', '==', 'private'), 
        where('participantIds', 'array-contains', currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find(d => {
        const pIds = d.data().participantIds;
        return pIds.includes(targetUser.id) && pIds.length === 2;
      });

      if (existing) {
        setCurrentChatId(existing.id);
      } else {
        const newChat = await addDoc(collection(db, 'chats'), {
          type: 'private', 
          participantIds: [currentUser.uid, targetUser.id], 
          ownerId: currentUser.uid,
          createdAt: new Date().toISOString(), 
          name: targetUser.name, 
          username: targetUser.username,
          avatarUrl: targetUser.avatarUrl || null,
          metadata: {
             [currentUser.uid]: { name: currentUser.displayName || 'User' },
             [targetUser.id]: { name: targetUser.name, username: targetUser.username, avatarUrl: targetUser.avatarUrl }
          }
        });
        setCurrentChatId(newChat.id);
      }
      setInspectedUserId(null); 
      setActiveView('chats');
    } catch (e) { toast({ title: "Ошибка" }); }
  };

  const registrationDate = useMemo(() => {
    if (!mounted || !inspectedUserId) return '...';
    if (!targetUser?.createdAt) return '...';
    try { return format(new Date(targetUser.createdAt), 'dd.MM.yyyy', { locale: ru }); } catch (e) { return '...'; }
  }, [targetUser?.createdAt, inspectedUserId, mounted]);

  const rep = getReputationInfo(targetUser?.reputation);

  if (!inspectedUserId) return null;

  return (
    <>
    <Dialog open={!!inspectedUserId} onOpenChange={(o) => !o && setInspectedUserId(null)}>
      <DialogContent className="max-w-[420px] bg-[#030306]/95 backdrop-blur-[50px] border-white/10 p-0 overflow-hidden h-[90vh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="sr-only"><DialogTitle>Профиль {targetUser?.name}</DialogTitle></DialogHeader>
        <ScrollArea className="flex-1 w-full h-full">
          <div className="flex flex-col min-h-full pb-32">
            <div className="p-10 pt-16 text-center flex flex-col items-center shrink-0 space-y-0 relative border-b border-white/5 overflow-hidden">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--primary),0.15),transparent_70%)] pointer-events-none" />
               <div className="relative mb-8 mt-4 group">
                 <div className="absolute -inset-8 bg-primary/20 blur-3xl rounded-full animate-pulse transition-all duration-1000" />
                 <UserAvatar userId={inspectedUserId} className="h-36 w-36 border-[6px] border-[#030306] shadow-2xl relative z-10" manualAvatarUrl={targetUser?.avatarUrl} fallbackName={targetUser?.name} showOnlineStatus />
                 <div className={cn("absolute -bottom-2 -right-2 w-14 h-14 rounded-2xl obsidian-glass border flex items-center justify-center text-2xl z-20 shadow-2xl transition-all duration-700", rep.color, rep.shadow)}>
                   {rep.icon}
                   <span className="absolute -top-1 -right-1 text-[10px] font-black bg-black px-1.5 rounded-md text-white shadow-lg">{rep.level}</span>
                 </div>
               </div>
               <div className="space-y-1 relative z-10">
                 <h2 className="text-3xl font-black italic text-white flex items-center justify-center gap-3 tracking-tighter uppercase leading-none">
                   {formatDisplayName(targetUser?.name, targetUser?.username)}
                   {isUserPremium(targetUser) && <Star className="w-6 h-6 text-primary fill-primary animate-pulse" />}
                 </h2>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 mt-2 italic opacity-70">УЗЕЛ ИДЕНТИФИЦИРОВАН</p>
               </div>
            </div>
            <div className="mt-6 px-8 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-4 opacity-40">{mounted ? formatLastSeen(targetUser?.lastSeen, targetUser?.settings?.privacy?.lastSeenVisibility) : '...'}</p>
            </div>
            <div className="px-6 mt-10 space-y-8">
              <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-5 shadow-inner">
                 <div className="flex items-center justify-between">
                    <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Уровень доверия</span><span className="text-[7px] text-white/10 font-bold uppercase tracking-widest">Aegis Protection Link</span></div>
                    <span className={cn("text-sm font-black uppercase italic", rep.color)}>Level {rep.level}</span>
                 </div>
                 <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden p-[1.5px] border border-white/5">
                    <div className={cn("h-full rounded-full transition-all duration-1500 ease-out shadow-[0_0_15px_rgba(var(--primary),0.5)]", rep.color.replace('text-', 'bg-'))} style={{ width: `${Math.min(100, ((targetUser?.reputation || 0) % 10) * 10)}%` }} />
                 </div>
              </div>
              {isGlobalAdmin(currentUserProfile) && inspectedUserId !== currentUser?.uid && (
                <div className="space-y-4 p-8 bg-red-500/5 rounded-[2.8rem] border border-red-500/20 relative overflow-hidden group">
                  <h3 className="text-[11px] font-black uppercase text-red-500 tracking-widest flex items-center gap-2 mb-4 relative z-10 italic"><ShieldAlert className="w-5 h-5 animate-pulse" /> CONTROL TERMINAL</h3>
                  <div className="grid grid-cols-2 gap-3 relative z-10">
                    <Button onClick={() => handleAdminAction({ isPremium: !targetUser?.isPremium }, "Elite Status Updated")} variant="ghost" className="h-14 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-[10px] font-black uppercase italic">{targetUser?.isPremium ? 'REVOKE PREM' : 'GIVE PREM'}</Button>
                    <Button onClick={() => handleAdminAction({ isAdmin: !targetUser?.isAdmin }, "Admin Access Updated")} variant="ghost" className="h-14 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-[10px] font-black uppercase italic">{targetUser?.isAdmin ? 'REVOKE ADMIN' : 'GIVE ADMIN'}</Button>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <Button onClick={handleToggleContact} variant={isContact ? "outline" : "default"} className={cn("w-full h-16 rounded-[1.8rem] font-black uppercase italic tracking-widest gap-3 shadow-2xl transition-all active:scale-95", isContact ? "border-white/10 bg-white/5 text-white/60" : "bg-primary text-white shadow-primary/30")}>
                  {isContact ? <><UserCheck className="w-6 h-6 text-primary" /> В КОНТАКТАХ</> : <><UserPlus className="w-6 h-6" /> ДОБАВИТЬ В КОНТАКТЫ</>}
                </Button>
                <div className="flex gap-4">
                  <Button onClick={handleStartChat} className="flex-1 h-16 bg-white/[0.03] border border-white/5 text-white rounded-[1.8rem] font-black uppercase italic tracking-widest gap-3 shadow-xl hover:bg-white/[0.08] transition-all"><MessageCircle className="w-5 h-5 text-primary" /> ЧАТ</Button>
                  <Button onClick={() => setIsGiftModalOpen(true)} variant="outline" className="flex-1 h-16 border-white/10 bg-white/[0.03] text-white rounded-[1.8rem] font-black uppercase italic tracking-widest gap-3 hover:bg-primary/5 transition-all"><Gift className="w-5 h-5 text-primary" /> ПОДАРОК</Button>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20 px-2 italic">Метаданные</h3>
                <div className="bg-white/[0.02] rounded-[2.5rem] border border-white/[0.05] overflow-hidden divide-y divide-white/[0.03] shadow-inner">
                  <div className="flex items-center justify-between p-5 px-8 hover:bg-white/[0.02] transition-colors"><span className="text-[10px] text-white/30 uppercase font-black tracking-widest italic">Регистрация</span><span className="text-[12px] font-black text-white/90 italic">{registrationDate}</span></div>
                  <div className="flex items-center justify-between p-5 px-8 hover:bg-white/[0.02] transition-colors"><span className="text-[10px] text-white/30 uppercase font-black tracking-widest italic">Node Status</span><span className="text-[10px] font-black text-green-500 uppercase tracking-widest italic">SYNCHRONIZED</span></div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    <GiftModal open={isGiftModalOpen} onOpenChange={setIsGiftModalOpen} targetUser={targetUser || null} />
    </>
  );
}
