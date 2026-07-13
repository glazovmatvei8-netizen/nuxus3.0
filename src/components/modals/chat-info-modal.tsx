"use client"

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Star, Shield, UserCheck, UserPlus2, X, Bell, BellOff, Clock, Edit3, Camera, Save, UserPlus, Trash2, Gift, Sparkles, Wand2, Loader2
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, updateDoc, arrayRemove, arrayUnion, query, collection, limit, orderBy, getDocs } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { formatDisplayName, isUserPremium, formatLastSeen, cn, isGlobalAdmin, decryptSignal } from '@/lib/utils';
import type { User, Chat, ReceivedGift, Message } from '@/lib/types';
import { addHours, isAfter, parseISO } from 'date-fns';
import { AddMemberModal } from './add-member-modal';
import { GiftModal } from './gift-modal';
import { chatConversationSummary } from '@/ai/flows/chat-conversation-summary-flow';

export function ChatInfoModal({ open, onOpenChange, chat }: { open: boolean, onOpenChange: (o: boolean) => void, chat: Chat }) {
  const db = useFirestore();
  const { user } = useUser();
  const { setCurrentChatId, setInspectedUserId } = useAppState();
  const { toast } = useToast();

  const isPrivate = chat.type === 'private';
  const otherId = isPrivate && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  
  const [editForm, setEditForm] = useState({
    name: '', username: chat.username || '', description: chat.description || '', avatarUrl: chat.avatarUrl || '', isPublic: !!chat.isPublic
  });

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: currentUserProfile } = useDoc<User>(userProfileRef);
  
  const otherUserProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUserProfile } = useDoc<User>(otherUserProfileRef);

  const giftsQuery = useMemoFirebase(() => {
    if (!db || !otherId) return null;
    return query(collection(db, 'users', otherId, 'receivedGifts'), limit(20));
  }, [db, otherId]);
  const { data: gifts } = useCollection<ReceivedGift>(giftsQuery);

  const isPremium = useMemo(() => isUserPremium(currentUserProfile), [currentUserProfile]);

  const handleAiSummary = async () => {
    if (!isPremium) {
      toast({ title: "Elite Only", variant: "destructive" });
      return;
    }
    setIsSummarizing(true);
    try {
      const q = query(collection(db!, 'chats', chat.id, 'messages'), orderBy('sentAt', 'desc'), limit(30));
      const snap = await getDocs(q);
      const history = snap.docs.map(d => ({
        senderName: d.data().senderName,
        text: decryptSignal(d.data().content)
      })).reverse();
      const { summary } = await chatConversationSummary({ chatMessages: history });
      setAiSummary(summary);
    } catch (e) { toast({ title: "Сбой ИИ", variant: "destructive" }); }
    finally { setIsSummarizing(true); }
  };

  const handleSaveEdit = async () => {
    if (!db || !chat.id || !user) return;
    try {
      if (isPrivate) {
        await updateDoc(doc(db, 'chats', chat.id), { [`metadata.${user.uid}.customName`]: editForm.name });
      } else {
        await updateDoc(doc(db, 'chats', chat.id), { ...editForm });
      }
      setIsEditing(false);
      toast({ title: "Данные сохранены" });
    } catch (e: any) { toast({ title: "Ошибка", variant: "destructive" }); }
  };

  const currentDisplayName = useMemo(() => {
    if (isPrivate) {
      const myMeta = chat.metadata?.[user?.uid || ''];
      return myMeta?.customName || formatDisplayName(otherUserProfile?.name);
    }
    return formatDisplayName(chat.name);
  }, [chat, user?.uid, otherUserProfile, isPrivate]);

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if(!o) setIsEditing(false); }}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-6 text-center flex flex-col items-center shrink-0 space-y-0 relative border-b border-white/5">
          <div className="relative mb-4">
             <UserAvatar userId={isPrivate ? otherId : null} manualAvatarUrl={isEditing && !isPrivate ? editForm.avatarUrl : (isPrivate ? otherUserProfile?.avatarUrl : chat.avatarUrl)} className="h-24 w-24 border-4 border-primary/20" fallbackName={currentDisplayName} showOnlineStatus={!isEditing} />
          </div>

          <div className="space-y-1">
             <DialogTitle className="text-xl font-black italic text-white flex items-center justify-center gap-2">
               {currentDisplayName} {isUserPremium(otherUserProfile) && <Star className="w-4 h-4 text-accent fill-accent" />}
             </DialogTitle>
             <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {isPrivate ? formatLastSeen(otherUserProfile?.lastSeen) : chat.username}
             </DialogDescription>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-2">
               <Button 
                 onClick={handleAiSummary} 
                 disabled={isSummarizing}
                 className="w-full h-12 bg-primary/10 border border-primary/20 text-primary rounded-xl font-black uppercase italic tracking-widest gap-2 text-[10px]"
               >
                 {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} ПЕРЕСКАЗ ДИАЛОГА (AI)
               </Button>
               {aiSummary && (
                 <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 animate-in fade-in zoom-in-95">
                    <p className="text-[12px] text-white/90 leading-relaxed font-medium">{aiSummary}</p>
                 </div>
               )}
            </div>

            {gifts && gifts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2 px-1"><Sparkles className="w-3.5 h-3.5" /> Артефакты</h3>
                <div className="grid grid-cols-4 gap-3">
                  {gifts.map(gift => (
                    <div key={gift.id} className="bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center p-3 shadow-lg">
                      <div className="text-3xl drop-shadow-2xl">{gift.giftIcon}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isPrivate && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Участники: {chat.participantIds?.length}</h3>
                  <Button variant="ghost" size="sm" className="h-7 text-[9px] uppercase font-black text-primary" onClick={() => setIsAddMemberOpen(true)}>Добавить</Button>
                </div>
                <div className="space-y-2">
                  {chat.participantIds?.map((pid: string) => (
                    <div key={pid} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group">
                       <div className="flex items-center gap-3 cursor-pointer" onClick={() => { onOpenChange(false); setInspectedUserId(pid); }}>
                         <UserAvatar userId={pid} className="h-10 w-10" showOnlineStatus />
                         <span className="text-sm font-semibold">{pid === 'bot_nuxus_manager' ? 'Nuxus Manager 🛡️' : 'Узел сети'}</span>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2" onClick={() => { deleteDocumentNonBlocking(doc(db!, 'chats', chat.id)); setCurrentChatId(null); onOpenChange(false); }}>
              <Trash2 className="w-4 h-4" /> Удалить диалог
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    <AddMemberModal open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen} chatId={chat.id} currentParticipantIds={chat.participantIds} />
    <GiftModal open={isGiftModalOpen} onOpenChange={setIsGiftModalOpen} targetUser={otherUserProfile || null} chatId={chat.id} />
    </>
  );
}
