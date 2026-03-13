
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
  const { inspectedUserId, setInspectedUserId, setCurrentChatId, setActiveView } = useAppState();
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
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    }
  };

  const copyId = () => {
    if (!inspectedUserId) return;
    navigator.clipboard.writeText(inspectedUserId);
    toast({ title: "ID скопирован" });
  };

  if (!inspectedUserId) return null;

  const registrationDate = targetUser?.createdAt ? format(new Date(targetUser.createdAt), 'dd.MM.yyyy', { locale: ru }) : '...';

  return (
    <Dialog open={!!inspectedUserId} onOpenChange={(o) => !o && setInspectedUserId(null)}>
      <DialogContent className="max-w-md bg-[#0a0a0c] border-white/10 p-0 overflow-hidden h-auto max-h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{formatDisplayName(targetUser?.name)}</DialogTitle>
          <DialogDescription>Node information details</DialogDescription>
        </DialogHeader>

        <div className="absolute inset-0 nuxus-core-glow opacity-20 pointer-events-none" />
        
        <div className="relative h-24 bg-gradient-to-b from-primary/20 to-transparent shrink-0">
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
            <UserAvatar 
              userId={inspectedUserId} 
              className="h-20 w-20 border-4 border-[#0a0a0c] shadow-2xl" 
              manualAvatarUrl={targetUser?.avatarUrl}
              fallbackName={targetUser?.name}
              showOnlineStatus
            />
          </div>
        </div>

        <div className="mt-10 px-5 text-center shrink-0">
          <h2 className="text-lg font-black text-white flex items-center justify-center gap-2">
            {formatDisplayName(targetUser?.name)}
            {isUserPremium(targetUser) && <Star className="w-3.5 h-3.5 text-accent fill-accent" />}
          </h2>
          <p className="text-[8px] text-primary font-black uppercase tracking-[0.3em] mt-0.5">{targetUser?.username}</p>
          <p className="text-[8px] text-muted-foreground uppercase font-bold mt-1 opacity-60">
            {formatLastSeen(targetUser?.lastSeen, targetUser?.settings?.privacy?.lastSeenVisibility)}
          </p>
        </div>

        <div className="flex-1 mt-3 overflow-y-auto scrollbar-hide px-5 space-y-3 pb-6">
          <div className="flex gap-2">
            <Button onClick={handleStartChat} className="flex-1 h-10 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest gap-2 shadow-xl shadow-primary/20 text-[9px]">
              <MessageCircle className="w-3.5 h-3.5" /> Написать
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-white/5 text-white" onClick={copyId}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>

          {targetUser?.bio && (
            <div className="space-y-1">
              <h3 className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">О себе</h3>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                <p className="text-[11px] text-white/80 leading-snug">{targetUser.bio}</p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <h3 className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Параметры</h3>
            <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden divide-y divide-white/[0.03]">
              <InfoRow icon={Calendar} label="Вход" value={registrationDate} />
              <InfoRow icon={Shield} label="Узел" value={targetUser?.isPremium ? "Quantum" : "Basic"} color={targetUser?.isPremium ? "text-accent" : ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-9 rounded-xl border-white/10 text-[8px] font-black uppercase tracking-widest gap-2 opacity-60 hover:opacity-100">
              <Phone className="w-3 h-3" /> Звонок
            </Button>
            <Button variant="outline" className="h-9 rounded-xl border-white/10 text-[8px] font-black uppercase tracking-widest gap-2 opacity-60 hover:opacity-100">
              <Video className="w-3 h-3" /> Видео
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex items-center justify-between p-2.5">
      <div className="flex items-center gap-2">
        <Icon className="w-3 h-3 text-muted-foreground/40" />
        <span className="text-[9px] text-muted-foreground font-medium">{label}</span>
      </div>
      <span className={`text-[9px] font-bold ${color || 'text-white'}`}>{value}</span>
    </div>
  );
}
