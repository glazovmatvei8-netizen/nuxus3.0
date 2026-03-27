
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
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inspectedUserId);
        toast({ title: "ID скопирован" });
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch (err) {
      toast({ 
        title: "Ошибка копирования", 
        description: "Используйте HTTPS соединение.", 
        variant: "destructive" 
      });
    }
  };

  if (!inspectedUserId) return null;

  const registrationDate = targetUser?.createdAt ? format(new Date(targetUser.createdAt), 'dd.MM.yyyy', { locale: ru }) : '...';

  return (
    <>
    <Dialog open={!!inspectedUserId} onOpenChange={(o) => !o && setInspectedUserId(null)}>
      <DialogContent className="max-w-[360px] bg-[#0a0a0c] border-white/10 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{formatDisplayName(targetUser?.name)}</DialogTitle>
          <DialogDescription>Account details and collection</DialogDescription>
        </DialogHeader>

        <div className="absolute inset-0 nuxus-core-glow opacity-20 pointer-events-none" />
        
        <div className="relative h-32 bg-gradient-to-b from-primary/20 to-transparent shrink-0">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <UserAvatar 
              userId={inspectedUserId} 
              className="h-24 w-24 border-4 border-[#0a0a0c] shadow-2xl" 
              manualAvatarUrl={targetUser?.avatarUrl}
              fallbackName={targetUser?.name}
              showOnlineStatus
            />
          </div>
        </div>

        <div className="mt-14 px-6 text-center shrink-0">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-xl font-black text-white italic">
              {formatDisplayName(targetUser?.name)}
            </h2>
            {isUserPremium(targetUser) && <Star className="w-4 h-4 text-accent fill-accent" />}
            {targetUser?.statusEmoji && <span className="text-xl animate-pulse">{targetUser.statusEmoji}</span>}
          </div>
          <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em] mt-1">{targetUser?.username}</p>
          
          {targetUser?.statusText && (
            <p className="text-[11px] text-white/60 font-bold uppercase tracking-widest mt-2 px-4 bg-white/5 py-1.5 rounded-full border border-white/5 inline-block mx-auto">
              {targetUser.statusText}
            </p>
          )}

          <p className="text-[9px] text-muted-foreground uppercase font-bold mt-2 opacity-60">
            {formatLastSeen(targetUser?.lastSeen, targetUser?.settings?.privacy?.lastSeenVisibility)}
          </p>
        </div>

        <ScrollArea className="flex-1 px-6 pt-6">
          <div className="space-y-6 pb-10">
            <div className="flex gap-2">
              <Button onClick={handleStartChat} className="flex-1 h-12 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest gap-2 shadow-xl shadow-primary/20 text-[10px]">
                <MessageCircle className="w-4 h-4" /> Написать
              </Button>
              <Button onClick={() => setIsGiftModalOpen(true)} variant="outline" className="flex-1 h-12 border-white/10 bg-white/5 text-white rounded-2xl font-black uppercase italic tracking-widest gap-2 text-[10px]">
                <Gift className="w-4 h-4 text-primary" /> Подарок
              </Button>
            </div>

            {gifts && gifts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> Коллекция подарков
                  </h3>
                  <span className="text-[9px] font-black text-muted-foreground/40">{gifts.length}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {gifts.map(gift => (
                    <div key={gift.id} className="bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center p-3 hover:bg-white/10 transition-all cursor-help group relative shadow-lg">
                      <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">{gift.giftIcon}</div>
                      <span className="text-[8px] font-black text-primary uppercase tracking-tighter">{gift.price} NX</span>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 border border-white/10 rounded-lg text-[8px] font-black uppercase text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-2xl">
                        {gift.giftName} от: {gift.senderName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {targetUser?.bio && (
              <div className="space-y-1.5">
                <h3 className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Био</h3>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <p className="text-xs text-white/80 leading-relaxed">{targetUser.bio}</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <h3 className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Инфо</h3>
              <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/[0.03]">
                <InfoRow icon={Calendar} label="Регистрация" value={registrationDate} />
                <InfoRow icon={Shield} label="Статус" value={targetUser?.isPremium ? "Premium" : "Base"} color={targetUser?.isPremium ? "text-accent" : ""} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => startCall('audio')}
                className="h-11 rounded-2xl border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest gap-2 hover:bg-primary/10 hover:text-primary transition-all"
              >
                <Phone className="w-3.5 h-3.5" /> Звонок
              </Button>
              <Button 
                variant="outline" 
                onClick={() => startCall('video')}
                className="h-11 rounded-2xl border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest gap-2 hover:bg-primary/10 hover:text-primary transition-all"
              >
                <Video className="w-3.5 h-3.5" /> Видео
              </Button>
            </div>
            
            <Button variant="ghost" className="w-full text-[8px] font-black uppercase tracking-[0.2em] text-white/20 h-8" onClick={copyId}>
              Copy Profile ID: {inspectedUserId.slice(0, 8)}...
            </Button>
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
    <div className="flex items-center justify-between p-3">
      <div className="flex items-center gap-2.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground/40" />
        <span className="text-[10px] text-muted-foreground font-medium uppercase">{label}</span>
      </div>
      <span className={`text-[10px] font-bold ${color || 'text-white'}`}>{value}</span>
    </div>
  );
}
