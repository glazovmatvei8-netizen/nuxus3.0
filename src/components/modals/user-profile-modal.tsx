
"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, Star, Calendar, Phone, Video, Gift, Zap, Globe, ShieldCheck, Cpu, Sparkles, UserCheck, UserPlus, Ban, Crown, ShieldAlert, ShieldX
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, query, collection, limit, getDocs, addDoc, where, orderBy, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/app-state';
import { formatDisplayName, isUserPremium, formatLastSeen, cn, isGlobalAdmin } from '@/lib/utils';
import type { User, ReceivedGift } from '@/lib/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { GiftModal } from './gift-modal';
import versions from '@/app/versions.json';

const ADMIN_ID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';
const ORIGIN_DATE = '2024-01-01T00:00:00Z'; 

export function UserProfileModal() {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { inspectedUserId, setInspectedUserId, setCurrentChatId, setActiveView, setActiveCallId } = useAppState();
  const { toast } = useToast();

  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isAdminProcessing, setIsAdminProcessing] = useState(false);

  const currentUserRef = useMemo(() => (!db || !currentUser) ? null : doc(db, 'users', currentUser.uid), [db, currentUser?.uid]);
  const { data: currentUserProfile } = useDoc<User>(currentUserRef);

  const targetUserRef = useMemo(() => (!db || !inspectedUserId) ? null : doc(db, 'users', inspectedUserId), [db, inspectedUserId]);
  const { data: targetUser } = useDoc<User>(targetUserRef);

  const isViewerAdmin = useMemo(() => isGlobalAdmin(currentUserProfile), [currentUserProfile]);

  const giftsQuery = useMemo(() => {
    if (!db || !inspectedUserId) return null;
    return query(collection(db, 'users', inspectedUserId, 'receivedGifts'), limit(20));
  }, [db, inspectedUserId]);
  const { data: gifts } = useCollection<ReceivedGift>(giftsQuery);

  const isContact = useMemo(() => {
    return inspectedUserId && currentUserProfile?.contactIds?.includes(inspectedUserId);
  }, [inspectedUserId, currentUserProfile?.contactIds]);

  const handleToggleContact = async () => {
    if (!db || !currentUser || !inspectedUserId) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        contactIds: isContact ? arrayRemove(inspectedUserId) : arrayUnion(inspectedUserId)
      });
      toast({ title: isContact ? "Аккаунт удален из контактов" : "Аккаунт добавлен в контакты" });
    } catch (e) {
      toast({ title: "Ошибка синхронизации", variant: "destructive" });
    }
  };

  const handleAdminAction = async (data: Partial<User>, label: string) => {
    if (!db || !inspectedUserId) return;
    setIsAdminProcessing(true);
    try {
      await updateDoc(doc(db, 'users', inspectedUserId), data);
      toast({ title: label });
    } catch (e) {
      toast({ title: "Сбой прав доступа", variant: "destructive" });
    } finally {
      setIsAdminProcessing(false);
    }
  };

  const handleStartChat = async () => {
    if (!db || !currentUser || !targetUser) return;
    try {
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
             [currentUser.uid]: { name: currentUser.displayName || 'User', username: '?', avatarUrl: null },
             [targetUser.id]: { name: targetUser.name, username: targetUser.username, avatarUrl: targetUser.avatarUrl }
          }
        });
        setCurrentChatId(newChat.id);
      }
      
      setInspectedUserId(null);
      setActiveView('chats');
    } catch (e: any) {
      toast({ title: "Ошибка открытия чата", variant: "destructive" });
    }
  };

  const registrationDate = useMemo(() => {
    if (!inspectedUserId) return '';
    const rawDate = inspectedUserId === ADMIN_ID ? ORIGIN_DATE : (targetUser?.createdAt);
    if (!rawDate) return '...';
    try { return format(new Date(rawDate), 'dd.MM.yyyy', { locale: ru }); } catch (e) { return '...'; }
  }, [targetUser?.createdAt, inspectedUserId]);

  if (!inspectedUserId) return null;

  return (
    <>
    <Dialog open={!!inspectedUserId} onOpenChange={(o) => !o && setInspectedUserId(null)}>
      <DialogContent className="max-w-[420px] bg-[#030306]/95 backdrop-blur-[50px] border-white/10 p-0 overflow-hidden h-[90vh] flex flex-col rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] outline-none">
        <DialogHeader className="p-8 text-center flex flex-col items-center shrink-0 space-y-0 relative border-b border-white/5 bg-gradient-to-b from-primary/10 to-transparent">
          <DialogTitle className="text-2xl font-black italic text-white flex items-center justify-center gap-3 tracking-tighter">
            {formatDisplayName(targetUser?.name, targetUser?.username)}
            {isUserPremium(targetUser) && <Star className="w-5 h-5 text-primary fill-primary" />}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 mt-1 opacity-70 italic">
            Профиль аккаунта
          </DialogDescription>
          
          <div className="relative mb-6 mt-6">
            <UserAvatar 
              userId={inspectedUserId} 
              className="h-32 w-32 border-[6px] border-[#030306] shadow-xl relative z-10" 
              manualAvatarUrl={targetUser?.avatarUrl}
              fallbackName={targetUser?.name}
              showOnlineStatus
            />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 w-full h-full">
          <div className="flex flex-col min-h-full pb-24">
            <div className="mt-6 px-8 text-center">
              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-4 opacity-40">
                {formatLastSeen(targetUser?.lastSeen, targetUser?.settings?.privacy?.lastSeenVisibility)}
              </p>
            </div>

            <div className="px-6 mt-10 space-y-6">
              {isViewerAdmin && inspectedUserId !== currentUser?.uid && (
                <div className="space-y-3 p-6 bg-red-500/5 rounded-[2.2rem] border border-red-500/20">
                  <h3 className="text-[10px] font-black uppercase text-red-500 tracking-widest flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-4 h-4" /> Администрирование
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => handleAdminAction({ isPremium: !targetUser?.isPremium }, "Premium статус изменен")} variant="ghost" className="h-11 rounded-xl bg-white/5 text-[9px] font-black uppercase">
                      {targetUser?.isPremium ? 'REVOKE PREM' : 'GIVE PREM'}
                    </Button>
                    <Button onClick={() => handleAdminAction({ isAdmin: !targetUser?.isAdmin }, "Права админа изменены")} variant="ghost" className="h-11 rounded-xl bg-white/5 text-[9px] font-black uppercase">
                      {targetUser?.isAdmin ? 'REVOKE ADMIN' : 'GIVE ADMIN'}
                    </Button>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleToggleContact}
                variant={isContact ? "outline" : "default"}
                className={cn("w-full h-14 rounded-2xl font-black uppercase italic tracking-widest gap-2 shadow-xl", isContact ? "border-white/10 bg-white/5" : "bg-primary text-white")}
              >
                {isContact ? <><UserCheck className="w-5 h-5 text-primary" /> В контактах</> : <><UserPlus className="w-5 h-5" /> Добавить в контакты</>}
              </Button>

              <div className="flex gap-3">
                <Button onClick={handleStartChat} className="flex-1 h-14 bg-white/[0.03] border border-white/5 text-white rounded-2xl font-black uppercase italic tracking-widest gap-2 shadow-xl">
                  <MessageCircle className="w-5 h-5 text-primary" /> Сообщение
                </Button>
                <Button onClick={() => setIsGiftModalOpen(true)} variant="outline" className="flex-1 h-14 border-white/10 bg-white/[0.03] text-white rounded-2xl font-black uppercase italic tracking-widest gap-2">
                  <Gift className="w-5 h-5 text-primary" /> Подарок
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">Данные аккаунта</h3>
                <div className="bg-white/[0.02] rounded-[2rem] border border-white/[0.05] overflow-hidden divide-y divide-white/[0.02]">
                  <div className="flex items-center justify-between p-4 px-6">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Регистрация</span>
                    <span className="text-[11px] font-black text-white/90">{registrationDate}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 px-6">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Версия</span>
                    <span className="text-[11px] font-black text-white/90">V{versions.latestVersion}</span>
                  </div>
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
