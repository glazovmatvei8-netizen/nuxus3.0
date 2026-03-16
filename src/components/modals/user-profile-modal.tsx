
"use client"

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, Star, Copy, Shield, Calendar, Info, Phone, Video
} from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, query, collection, where, limit, getDocs, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { formatDisplayName, isUserPremium, formatLastSeen } from '@/lib/utils';
import type { User } from '@/lib/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function UserProfileModal() {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { inspectedUserId, setInspectedUserId, setCurrentChatId, setActiveView, setActiveCallId } = useAppState();
  const { toast } = useToast();

  const targetUserRef = useMemoFirebase(() => (!db || !inspectedUserId) ? null : doc(db, 'users', inspectedUserId), [db, inspectedUserId]);
  const { data: targetUser } = useDoc<User>(targetUserRef);

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
      console.warn("Nuxus Clipboard: Access denied or restricted");
      toast({ 
        title: "Ошибка копирования", 
        description: "Ваш браузер ограничил доступ к буферу обмена. Попробуйте использовать HTTPS.", 
        variant: "destructive" 
      });
    }
  };

  if (!inspectedUserId) return null;

  const registrationDate = targetUser?.createdAt ? format(new Date(targetUser.createdAt), 'dd.MM.yyyy', { locale: ru }) : '...';

  return (
    <Dialog open={!!inspectedUserId} onOpenChange={(o) => !o && setInspectedUserId(null)}>
      <DialogContent className="max-w-[340px] bg-[#0a0a0c] border-white/10 p-0 overflow-hidden h-auto rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{formatDisplayName(targetUser?.name)}</DialogTitle>
          <DialogDescription>Node information details</DialogDescription>
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
          <h2 className="text-xl font-black text-white flex items-center justify-center gap-2">
            {formatDisplayName(targetUser?.name)}
            {isUserPremium(targetUser) && <Star className="w-4 h-4 text-accent fill-accent" />}
          </h2>
          <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em] mt-1">{targetUser?.username}</p>
          <p className="text-[9px] text-muted-foreground uppercase font-bold mt-1.5 opacity-60">
            {formatLastSeen(targetUser?.lastSeen, targetUser?.settings?.privacy?.lastSeenVisibility)}
          </p>
        </div>

        <div className="mt-6 px-6 space-y-4 pb-8">
          <div className="flex gap-2">
            <Button onClick={handleStartChat} className="flex-1 h-12 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest gap-2 shadow-xl shadow-primary/20 text-[10px]">
              <MessageCircle className="w-4 h-4" /> Написать
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white/5 text-white" onClick={copyId}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          {targetUser?.bio && (
            <div className="space-y-1.5">
              <h3 className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">О себе</h3>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <p className="text-xs text-white/80 leading-relaxed">{targetUser.bio}</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <h3 className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Инфо</h3>
            <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/[0.03]">
              <InfoRow icon={Calendar} label="Вход" value={registrationDate} />
              <InfoRow icon={Shield} label="Узел" value={targetUser?.isPremium ? "Premium" : "Basic"} color={targetUser?.isPremium ? "text-accent" : ""} />
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
        </div>
      </DialogContent>
    </Dialog>
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
