
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, Star, Calendar, Phone, Video, Gift, Zap, Globe, ShieldCheck, Cpu, Sparkles, UserCheck, UserPlus, Ban, Crown, ShieldAlert, ShieldX, ChevronRight, Activity, Loader2
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { doc, query, collection, limit, getDocs, addDoc, where, orderBy, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/app-state';
import { formatDisplayName, isUserPremium, formatLastSeen, cn, isGlobalAdmin, getReputationInfo, triggerHaptic } from '@/lib/utils';
import type { User, ReceivedGift } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { GiftModal } from './gift-modal';

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
  const [isCalling, setIsCalling] = useState(false);

  const currentUserRef = useMemoFirebase(() => (!db || !currentUser) ? null : doc(db, 'users', currentUser.uid), [db, currentUser?.uid]);
  const { data: currentUserProfile } = useDoc<User>(currentUserRef);

  const targetUserRef = useMemoFirebase(() => (!db || !inspectedUserId) ? null : doc(db, 'users', inspectedUserId), [db, inspectedUserId]);
  const { data: targetUser } = useDoc<User>(targetUserRef);

  const isContact = useMemo(() => inspectedUserId && currentUserProfile?.contactIds?.includes(inspectedUserId), [inspectedUserId, currentUserProfile?.contactIds]);

  const handleToggleContact = async () => {
    if (!db || !currentUser || !inspectedUserId) return;
    triggerHaptic();
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        contactIds: isContact ? arrayRemove(inspectedUserId) : arrayUnion(inspectedUserId)
      });
      toast({ title: isContact ? "Удалено" : "Добавлено" });
    } catch (e) { toast({ title: "Сбой" }); }
  };

  const handleStartCall = async (type: 'audio' | 'video' = 'audio') => {
    if (!db || !currentUser || !targetUser) return;
    triggerHaptic();
    setIsCalling(true);
    try {
      const callData = {
        callerId: currentUser.uid,
        receiverId: targetUser.id,
        participantIds: [currentUser.uid, targetUser.id],
        status: 'calling',
        type: type,
        createdAt: new Date().toISOString(),
        chatId: 'direct'
      };
      const docRef = await addDoc(collection(db, 'calls'), callData);
      setActiveCallId(docRef.id);
      setInspectedUserId(null);
    } catch (e) {
      toast({ title: "Сбой линии", variant: "destructive" });
    } finally {
      setIsCalling(false);
    }
  };

  const handleStartChat = async () => {
    if (!db || !currentUser || !targetUser) return;
    triggerHaptic();
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

  const birthdayText = useMemo(() => {
    if (!targetUser?.birthday) return null;
    try {
      return format(parseISO(targetUser.birthday), 'd MMMM', { locale: ru });
    } catch (e) { return null; }
  }, [targetUser?.birthday]);

  const rep = getReputationInfo(targetUser?.reputation);

  if (!inspectedUserId) return null;

  return (
    <>
    <Dialog open={!!inspectedUserId} onOpenChange={(o) => !o && setInspectedUserId(null)}>
      <DialogContent className="max-w-[420px] bg-[#030306]/95 backdrop-blur-[50px] border-white/10 p-0 overflow-hidden h-[90vh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <ScrollArea className="flex-1 w-full h-full">
          <div className="flex flex-col min-h-full pb-32">
            <div className="p-10 pt-16 text-center flex flex-col items-center shrink-0 space-y-0 relative border-b border-white/5 overflow-hidden">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--primary),0.15),transparent_70%)] pointer-events-none" />
               <div className="relative mb-8 mt-4">
                 <div className="absolute -inset-8 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                 <UserAvatar userId={inspectedUserId} className="h-36 w-36 border-[6px] border-[#030306] shadow-2xl relative z-10" manualAvatarUrl={targetUser?.avatarUrl} fallbackName={targetUser?.name} showOnlineStatus />
                 <div className={cn("absolute -bottom-2 -right-2 w-14 h-14 rounded-2xl obsidian-glass border flex items-center justify-center text-2xl z-20 shadow-2xl", rep.color)}>
                   {rep.icon}
                 </div>
               </div>
               <div className="space-y-1 relative z-10">
                 <h2 className="text-3xl font-black italic text-white flex items-center justify-center gap-3 tracking-tighter uppercase leading-none">
                   {formatDisplayName(targetUser?.name, targetUser?.username)}
                   {isUserPremium(targetUser) && <Star className="w-6 h-6 text-primary fill-primary animate-pulse" />}
                 </h2>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 mt-2 italic">{targetUser?.username || '@ID_UNKNOWN'}</p>
                 
                 {birthdayText && (
                   <div className="mt-4 flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-xl border border-white/5 shadow-inner">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/80">День рождения: {birthdayText}</span>
                   </div>
                 )}
               </div>
            </div>
            
            <div className="px-8 mt-10 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => handleStartCall('audio')} disabled={isCalling} className="h-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-green-500/20 text-white font-black uppercase italic tracking-widest gap-3 transition-all">
                  {isCalling ? <Loader2 className="animate-spin" /> : <><Phone className="w-5 h-5 text-green-500" /> Вызов</>}
                </Button>
                <Button onClick={() => handleStartCall('video')} disabled={isCalling} className="h-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-blue-500/20 text-white font-black uppercase italic tracking-widest gap-3 transition-all">
                  <Video className="w-5 h-5 text-blue-500" /> Видео
                </Button>
              </div>

              <div className="flex flex-col gap-4">
                <Button onClick={handleToggleContact} variant={isContact ? "outline" : "default"} className={cn("w-full h-16 rounded-[1.8rem] font-black uppercase italic tracking-widest gap-3 shadow-2xl", isContact ? "border-white/10 bg-white/5 text-white/60" : "bg-primary text-white shadow-primary/30")}>
                  {isContact ? <><UserCheck className="w-6 h-6 text-primary" /> В КОНТАКТАХ</> : <><UserPlus className="w-6 h-6" /> ДОБАВИТЬ</>}
                </Button>
                <div className="flex gap-4">
                  <Button onClick={handleStartChat} className="flex-1 h-16 bg-white/[0.03] border border-white/5 text-white rounded-[1.8rem] font-black uppercase italic tracking-widest gap-3 hover:bg-white/[0.08] transition-all"><MessageCircle className="w-5 h-5 text-primary" /> ЧАТ</Button>
                  <Button onClick={() => setIsGiftModalOpen(true)} variant="outline" className="flex-1 h-16 border-white/10 bg-white/[0.03] text-white rounded-[1.8rem] font-black uppercase italic tracking-widest gap-3 hover:bg-primary/5 transition-all"><Gift className="w-5 h-5 text-primary" /> ПОДАРОК</Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20 px-2 italic">Инфо</h3>
                <div className="bg-white/[0.02] rounded-[2.5rem] border border-white/[0.05] p-6 space-y-4 shadow-inner">
                   <div className="flex items-center justify-between"><span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Статус</span><span className="text-[10px] font-black text-green-500 uppercase tracking-widest">АКТИВЕН</span></div>
                   <div className="flex items-center justify-between"><span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Ядро</span><span className="text-[10px] font-black text-white/60 uppercase tracking-widest italic">Nuxus V146.0</span></div>
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
