
"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, Star, Calendar, Phone, Video, Gift, Zap, Globe, ShieldCheck, Cpu, Sparkles, UserCheck, UserPlus
} from 'lucide-react';
import { useFirestore, useUser, useDoc, useCollection } from '@/firebase/provider';
import { doc, query, collection, limit, getDocs, addDoc, where, orderBy, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { formatDisplayName, isUserPremium, formatLastSeen, decryptSignal, cn, isGlobalAdmin } from '@/lib/utils';
import type { User, ReceivedGift } from '@/lib/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { GiftModal } from './gift-modal';
import versions from '@/app/versions.json';

const ADMIN_ID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';
const ORIGIN_DATE = '2024-01-01T00:00:00Z'; 

/**
 * USER PROFILE MODAL V9.1.0 «ACCESSIBILITY SYNC»
 * FIXED: Proper DialogTitle and description placement.
 */
export function UserProfileModal() {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { inspectedUserId, setInspectedUserId, setCurrentChatId, setActiveView, setActiveCallId } = useAppState();
  const { toast } = useToast();

  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);

  const currentUserRef = useMemo(() => (!db || !currentUser) ? null : doc(db, 'users', currentUser.uid), [db, currentUser?.uid]);
  const { data: currentUserProfile } = useDoc<User>(currentUserRef);

  const targetUserRef = useMemo(() => (!db || !inspectedUserId) ? null : doc(db, 'users', inspectedUserId), [db, inspectedUserId]);
  const { data: targetUser } = useDoc<User>(targetUserRef);

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
      toast({ title: isContact ? "Узел удален из контактов" : "Узел добавлен в контакты" });
    } catch (e) {
      toast({ title: "Ошибка синхронизации", variant: "destructive" });
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
      toast({ title: "Диалог открыт" });
    } catch (e: any) {
      toast({ title: "Ошибка открытия чата", variant: "destructive" });
    }
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!db || !currentUser || !targetUser) return;
    try {
      const callRef = await addDoc(collection(db, 'calls'), {
        callerId: currentUser.uid,
        receiverId: targetUser.id,
        participantIds: [currentUser.uid, targetUser.id], 
        chatId: 'global_profile',
        type,
        status: 'calling',
        createdAt: new Date().toISOString()
      });
      setActiveCallId(callRef.id);
      setInspectedUserId(null);
    } catch (e) {
      toast({ title: "Ошибка вызова", variant: "destructive" });
    }
  };

  const copyId = async () => {
    if (!inspectedUserId) return;
    try {
      await navigator.clipboard.writeText(inspectedUserId);
      toast({ title: "ID скопирован" });
    } catch (err) { toast({ title: "Ошибка", variant: "destructive" }); }
  };

  const registrationDate = useMemo(() => {
    if (!inspectedUserId) return '';
    const rawDate = inspectedUserId === ADMIN_ID ? ORIGIN_DATE : (targetUser?.createdAt);
    if (!rawDate) return '...';
    try { return format(new Date(rawDate), 'dd.MM.yyyy', { locale: ru }); } catch (e) { return '...'; }
  }, [targetUser?.createdAt, inspectedUserId]);

  if (!inspectedUserId) return null;

  const hasActivePremium = isUserPremium(targetUser);

  return (
    <>
    <Dialog open={!!inspectedUserId} onOpenChange={(o) => !o && setInspectedUserId(null)}>
      <DialogContent className="max-w-[420px] bg-[#030306]/95 backdrop-blur-[50px] border-white/10 p-0 overflow-hidden h-[90vh] flex flex-col rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] outline-none">
        <DialogHeader className="p-8 text-center flex flex-col items-center shrink-0 space-y-0 relative border-b border-white/5 bg-gradient-to-b from-primary/10 to-transparent">
          <DialogTitle className="sr-only">Профиль: {formatDisplayName(targetUser?.name, targetUser?.username)}</DialogTitle>
          <DialogDescription className="sr-only">Профиль узла Ядра Nuxus</DialogDescription>
          
          <div className="relative mb-6">
            <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full animate-pulse" />
            <UserAvatar 
              userId={inspectedUserId} 
              className="h-32 w-32 border-[6px] border-[#030306] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10" 
              manualAvatarUrl={targetUser?.avatarUrl}
              fallbackName={targetUser?.name}
              showOnlineStatus
            />
            <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/10 blur-[60px] -z-0 rounded-full" />
          </div>

          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl font-black text-white italic tracking-tighter leading-tight">
                {formatDisplayName(targetUser?.name, targetUser?.username)}
              </h2>
              {(targetUser?.statusEmoji || (inspectedUserId === ADMIN_ID)) && (
                 <span className="text-2xl drop-shadow-[0_0_100px_rgba(255,255,255,0.3)]">
                   {targetUser?.statusEmoji || '👑'}
                 </span>
              )}
            </div>
            <p className="text-[11px] text-primary/60 font-black uppercase tracking-[0.4em] mt-1 opacity-70 italic">{targetUser?.username}</p>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 w-full h-full">
          <div className="flex flex-col min-h-full pb-24">
            <div className="mt-6 px-8 text-center">
              {targetUser?.statusText && (
                <div className="mt-4 px-6 py-2.5 bg-primary/10 rounded-2xl border border-primary/20 inline-flex items-center gap-3 max-w-full shadow-lg animate-in fade-in slide-in-from-top-2">
                  <Sparkles className="w-4 h-4 text-accent shrink-0 animate-pulse" />
                  <p className="text-[11px] text-white font-black uppercase tracking-[0.2em] truncate">{targetUser.statusText}</p>
                </div>
              )}

              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-4 opacity-40">
                {formatLastSeen(
                  targetUser?.lastSeen, 
                  targetUser?.settings?.privacy?.lastSeenVisibility, 
                  false, 
                  'в сети', 
                  targetUser?.settings?.privacy?.lastSeenWhitelist || [], 
                  currentUser?.uid
                )}
              </p>
            </div>

            <div className="px-6 mt-10 space-y-6">
              <Button 
                onClick={handleToggleContact}
                variant={isContact ? "outline" : "default"}
                className={cn("w-full h-14 rounded-2xl font-black uppercase italic tracking-widest gap-2 shadow-xl", isContact ? "border-white/10 bg-white/5" : "bg-primary text-white")}
              >
                {isContact ? <><UserCheck className="w-5 h-5 text-primary" /> В контактах</> : <><UserPlus className="w-5 h-5" /> Добавить в контакты</>}
              </Button>

              <div className="flex gap-3">
                <Button onClick={handleStartChat} className="flex-1 h-14 obsidian-glass border-white/5 text-white rounded-2xl font-black uppercase italic tracking-widest gap-2 shadow-xl hover:bg-primary/10 hover:border-primary/40 transition-all">
                  <MessageCircle className="w-5 h-5 text-primary" /> Сообщение
                </Button>
                <Button onClick={() => setIsGiftModalOpen(true)} variant="outline" className="flex-1 h-14 border-white/10 bg-white/[0.03] text-white rounded-2xl font-black uppercase italic tracking-widest gap-2">
                  <Gift className="w-5 h-5 text-primary" /> Подарок
                </Button>
              </div>

              {gifts && gifts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5" /> Артефакты
                    </h3>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {gifts.map(gift => (
                      <div key={gift.id} className="aspect-square bg-white/[0.03] rounded-2xl border border-white/5 flex flex-col items-center justify-center hover:bg-white/10 transition-all shadow-lg">
                        <div className="text-3xl drop-shadow-2xl">{gift.giftIcon}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {targetUser?.bio && (
                <div className="space-y-2">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">Спецификация</h3>
                  <div className="bg-white/[0.02] p-5 rounded-[2rem] border border-white/[0.05]">
                    <p className="text-[13px] text-white/90 leading-relaxed font-medium">{targetUser.bio}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">Данные узла</h3>
                <div className="bg-white/[0.02] rounded-[2rem] border border-white/[0.05] overflow-hidden divide-y divide-white/[0.02] shadow-xl">
                  <InfoRow icon={Calendar} label="Регистрация" value={registrationDate} />
                  <InfoRow icon={ShieldCheck} label="Целостность" value={hasActivePremium ? "Elite Node" : "Standard"} color={hasActivePremium ? "text-accent" : "text-white/30"} />
                  <InfoRow icon={Cpu} label="Протокол" value={`QES ${versions.qesVersion}`} />
                  {targetUser?.isAdmin && <InfoRow icon={ShieldCheck} label="Роль" value="Administrator" color="text-primary" />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-4">
                <Button variant="ghost" onClick={() => startCall('audio')} className="h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-primary/10 hover:text-primary transition-all"><Phone className="w-4 h-4" /> Аудио</Button>
                <Button variant="ghost" onClick={() => startCall('video')} className="h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-primary/10 hover:text-primary transition-all"><Video className="w-4 h-4" /> Видео</Button>
              </div>
              <button className="w-full text-[8px] font-black uppercase tracking-[0.5em] text-white/10 hover:text-white/40 h-10" onClick={copyId}>UID: {inspectedUserId}</button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    <GiftModal open={isGiftModalOpen} onOpenChange={setIsGiftModalOpen} targetUser={targetUser || null} />
    </>
  );
}

function InfoRow({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex items-center justify-between p-4 px-6 hover:bg-white/[0.01] transition-colors">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-primary/40" />
        <span className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-[11px] font-black italic ${color || 'text-white/90'}`}>{value}</span>
    </div>
  );
}
