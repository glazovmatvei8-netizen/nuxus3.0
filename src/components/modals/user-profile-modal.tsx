"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, Star, Copy, Shield, Calendar, Info, Phone, Video, Gift, Sparkles, ChevronRight, Smile, Type
} from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, query, collection, where, limit, getDocs, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { formatDisplayName, isUserPremium, formatLastSeen, cn } from '@/lib/utils';
import type { User, ReceivedGift } from '@/lib/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { GiftModal } from './gift-modal';

/**
 * UserProfileModal V6.0
 * ОПТИМИЗИРОВАНО: Абсолютный скролл всего окна.
 */
export function UserProfileModal() {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { inspectedUserId, setInspectedUserId, setCurrentChatId, setActiveView, setActiveCallId } = useAppState();
  const { toast } = useToast();

  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);

  const targetUserRef = useMemoFirebase(() => (!db || !inspectedUserId) ? null : doc(db, 'users', inspectedUserId), [db, inspectedUserId]);
  const { data: targetUser } = useDoc<User>(targetUserRef);

  const giftsQuery = useMemoFirebase(() => {
    if (!db || !inspectedUserId) return null;
    return query(collection(db, 'users', inspectedUserId, 'receivedGifts'), limit(20));
  }, [db, inspectedUserId]);
  const { data: gifts } = useCollection<ReceivedGift>(giftsQuery);

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
          avatarUrl: targetUser.avatarUrl || null
        });
        setCurrentChatId(newChat.id);
      }
      
      setInspectedUserId(null);
      setActiveView('chats');
      toast({ title: "Диалог открыт" });
    } catch (e: any) {
      toast({ title: "Ошибка открытия чата", description: e.message, variant: "destructive" });
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
    } catch (err) {
      toast({ title: "Ошибка копирования", variant: "destructive" });
    }
  };

  if (!inspectedUserId) return null;

  const registrationDate = targetUser?.createdAt ? format(new Date(targetUser.createdAt), 'dd.MM.yyyy', { locale: ru }) : '...';
  const hasActivePremium = isUserPremium(targetUser);

  return (
    <>
    <Dialog open={!!inspectedUserId} onOpenChange={(o) => !o && setInspectedUserId(null)}>
      <DialogContent className="max-w-[400px] bg-[#0a0a0c] border-white/10 p-0 overflow-hidden h-[85vh] md:h-[80vh] flex flex-col rounded-[2.8rem] shadow-2xl outline-none">
        <DialogHeader className="sr-only">
          <DialogTitle>{formatDisplayName(targetUser?.name)}</DialogTitle>
          <DialogDescription>Профиль узла Ядра Nuxus</DialogDescription>
        </DialogHeader>

        {/* Global Scroll for Absolute Movement V6.0 */}
        <ScrollArea className="flex-1 w-full h-full">
          <div className="flex flex-col min-h-full pb-20">
            {/* Header / Avatar Section */}
            <div className="relative h-40 bg-gradient-to-b from-primary/30 to-transparent shrink-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
              <div className="relative mt-20">
                <UserAvatar 
                  userId={inspectedUserId} 
                  className="h-32 w-32 border-4 border-[#0a0a0c] shadow-2xl relative z-10" 
                  manualAvatarUrl={targetUser?.avatarUrl}
                  fallbackName={targetUser?.name}
                  showOnlineStatus
                />
                <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full -z-10 animate-pulse" />
              </div>
            </div>

            {/* User Info Section */}
            <div className="mt-16 px-8 text-center shrink-0">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl font-black text-white italic tracking-tighter">
                  {formatDisplayName(targetUser?.name)}
                </h2>
                {hasActivePremium && <Star className="w-5 h-5 text-accent fill-accent animate-pulse" />}
                {targetUser?.statusEmoji && <span className="text-2xl">{targetUser.statusEmoji}</span>}
              </div>
              <p className="text-[11px] text-primary font-black uppercase tracking-[0.4em] mt-2 opacity-80">{targetUser?.username}</p>
              
              {targetUser?.statusText && (
                <div className="mt-4 px-6 py-2 bg-white/5 rounded-full border border-white/5 inline-flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-accent" />
                  <p className="text-[11px] text-white/80 font-bold uppercase tracking-widest">{targetUser.statusText}</p>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-3 opacity-40">
                {formatLastSeen(targetUser?.lastSeen, targetUser?.settings?.privacy?.lastSeenVisibility)}
              </p>
            </div>

            {/* Buttons and Content Section */}
            <div className="px-8 pt-10 space-y-8">
              <div className="flex gap-3">
                <Button onClick={handleStartChat} className="flex-1 h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest gap-2 shadow-xl shadow-primary/30 transition-transform active:scale-95 group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <MessageCircle className="w-5 h-5" /> Написать
                </Button>
                <Button onClick={() => setIsGiftModalOpen(true)} variant="outline" className="flex-1 h-14 border-white/10 bg-white/5 text-white rounded-2xl font-black uppercase italic tracking-widest gap-2 hover:bg-white/10 transition-all">
                  <Gift className="w-5 h-5 text-primary" /> Подарок
                </Button>
              </div>

              {gifts && gifts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5" /> Коллекция артефактов
                    </h3>
                    <span className="text-[10px] font-black text-white/20">{gifts.length} / 50</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {gifts.map(gift => (
                      <div key={gift.id} className="aspect-square bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center hover:bg-white/10 transition-all cursor-help group relative shadow-lg">
                        <div className="text-3xl group-hover:scale-125 transition-transform duration-500 drop-shadow-2xl">{gift.giftIcon}</div>
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {targetUser?.bio && (
                <div className="space-y-2">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Neural Bio</h3>
                  <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                    <p className="text-sm text-white/80 leading-relaxed font-medium">{targetUser.bio}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Node Specification</h3>
                <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden divide-y divide-white/[0.03]">
                  <InfoRow icon={Calendar} label="Регистрация" value={registrationDate} />
                  <InfoRow 
                    icon={Shield} 
                    label="Статус" 
                    value={hasActivePremium ? "Elite Node" : "Standard"} 
                    color={hasActivePremium ? "text-accent" : "text-white/40"} 
                  />
                  {targetUser?.countryCode && <InfoRow icon={Info} label="Сектор" value={targetUser.countryCode.toUpperCase()} />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => startCall('audio')}
                  className="h-14 rounded-2xl border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <Phone className="w-4 h-4" /> Голос
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => startCall('video')}
                  className="h-14 rounded-2xl border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <Video className="w-4 h-4" /> Видео
                </Button>
              </div>
              
              <Button variant="ghost" className="w-full text-[8px] font-black uppercase tracking-[0.5em] text-white/10 hover:text-white/40 h-10 transition-colors" onClick={copyId}>
                ID: {inspectedUserId}
              </Button>
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
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-primary/40" />
        <span className="text-[11px] text-muted-foreground font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-[11px] font-black italic ${color || 'text-white'}`}>{value}</span>
    </div>
  );
}
