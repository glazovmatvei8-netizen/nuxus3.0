
"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Star, Shield, UserPlus, X, Trash2, Wand2, Loader2, Sparkles, UserCheck, Gift, Zap
} from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, updateDoc, arrayUnion, query, collection, limit, orderBy, getDocs, arrayRemove } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { formatDisplayName, isUserPremium, formatLastSeen, decryptSignal, cn } from '@/lib/utils';
import type { User, Chat, ReceivedGift } from '@/lib/types';
import { AddMemberModal } from './add-member-modal';
import { GiftModal } from './gift-modal';
import { chatConversationSummary } from '@/ai/flows/chat-conversation-summary-flow';

/**
 * PARTICIPANT ITEM V2.0
 * Подтягивает реальные данные узла для списка участников.
 */
function ParticipantItem({ userId, onClick }: { userId: string, onClick: () => void }) {
  const db = useFirestore();
  const userRef = useMemoFirebase(() => (!db ? null : doc(db, 'users', userId)), [db, userId]);
  const { data: profile } = useDoc<User>(userRef);
  
  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5 shadow-lg">
       <div className="flex items-center gap-4 cursor-pointer" onClick={onClick}>
         <UserAvatar userId={userId} className="h-11 w-11 border border-white/10" manualAvatarUrl={profile?.avatarUrl} fallbackName={profile?.name} showOnlineStatus />
         <div className="flex flex-col text-left">
           <span className="text-[14px] font-black text-white italic tracking-tight uppercase">
             {userId === 'bot_nuxus_manager' ? 'Nuxus Manager 🛡️' : formatDisplayName(profile?.name, profile?.username)}
           </span>
           {profile?.username && (
             <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">{profile.username}</span>
           )}
         </div>
       </div>
    </div>
  );
}

export function ChatInfoModal({ open, onOpenChange, chat }: { open: boolean, onOpenChange: (o: boolean) => void, chat: Chat }) {
  const db = useFirestore();
  const { user } = useUser();
  const { setCurrentChatId, setInspectedUserId } = useAppState();
  const { toast } = useToast();

  const isPrivate = chat.type === 'private';
  const otherId = isPrivate && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

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
  const isContact = useMemo(() => otherId && currentUserProfile?.contactIds?.includes(otherId), [otherId, currentUserProfile]);

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
    finally { setIsSummarizing(false); }
  };

  const toggleContact = async () => {
    if (!db || !user || !otherId) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        contactIds: isContact ? arrayRemove(otherId) : arrayUnion(otherId)
      });
      toast({ title: isContact ? "Удалено из контактов" : "Добавлено в контакты" });
    } catch (e) { toast({ title: "Ошибка", variant: "destructive" }); }
  };

  const currentDisplayName = useMemo(() => {
    if (isPrivate) {
      const myMeta = chat.metadata?.[user?.uid || ''];
      return myMeta?.customName || formatDisplayName(otherUserProfile?.name, otherUserProfile?.username);
    }
    if (chat.type === 'saved') return 'Архив Данных';
    return formatDisplayName(chat.name);
  }, [chat, user?.uid, otherUserProfile, isPrivate]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/95 backdrop-blur-[60px] border-white/10 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl outline-none">
        <DialogHeader className="p-8 text-center flex flex-col items-center shrink-0 space-y-0 relative border-b border-white/5 bg-gradient-to-b from-primary/10 to-transparent">
          <div className="relative mb-6">
             <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full animate-pulse" />
             <UserAvatar 
               userId={chat.type === 'saved' ? user?.uid : (isPrivate ? otherId : null)} 
               manualAvatarUrl={chat.type !== 'private' && chat.type !== 'saved' ? chat.avatarUrl : null} 
               className="h-28 w-28 border-[4px] border-[#0a0a0c] shadow-2xl relative z-10" 
               fallbackName={currentDisplayName} 
               showOnlineStatus 
             />
          </div>

          <div className="space-y-1 relative z-10">
             <DialogTitle className="text-2xl font-black italic text-white flex items-center justify-center gap-3 uppercase tracking-tighter">
               {currentDisplayName} {isUserPremium(isPrivate ? otherUserProfile : currentUserProfile) && <Star className="w-5 h-5 text-accent fill-accent animate-pulse" />}
             </DialogTitle>
             <DialogDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 italic">
                {isPrivate ? formatLastSeen(otherUserProfile?.lastSeen) : (chat.type === 'saved' ? 'Сигнал активен' : chat.username)}
             </DialogDescription>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="p-6 space-y-8 pb-32">
            <div className="flex flex-col gap-3">
               {isPrivate && (
                 <Button 
                   onClick={toggleContact}
                   variant={isContact ? "outline" : "default"}
                   className={cn("w-full h-14 rounded-2xl font-black uppercase italic text-[11px] tracking-widest gap-3 shadow-xl", isContact ? "border-white/10 bg-white/5 text-white" : "bg-primary text-white")}
                 >
                   {isContact ? <><UserCheck className="w-5 h-5 text-primary" /> В контактах</> : <><UserPlus className="w-5 h-5" /> Добавить в контакты</>}
                 </Button>
               )}
               
               <Button 
                 onClick={handleAiSummary} 
                 disabled={isSummarizing}
                 className="w-full h-14 bg-white/[0.03] border border-white/10 text-white rounded-2xl font-black uppercase italic tracking-widest gap-3 shadow-inner text-[10px] hover:bg-primary/10 transition-all"
               >
                 {isSummarizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Wand2 className="w-5 h-5 text-primary" /> ПЕРЕСКАЗ ДИАЛОГА (AI)</>}
               </Button>
               {aiSummary && (
                 <div className="bg-primary/5 p-5 rounded-3xl border border-primary/10 animate-in fade-in zoom-in-95 shadow-xl">
                    <p className="text-[13px] text-white/90 leading-relaxed font-medium">{aiSummary}</p>
                 </div>
               )}
            </div>

            {isPrivate && (
              <div className="flex gap-3">
                 <Button onClick={() => setIsGiftModalOpen(true)} variant="outline" className="flex-1 h-14 rounded-2xl border-white/10 bg-white/[0.02] text-white font-black uppercase italic text-[10px] tracking-widest gap-3 hover:bg-primary/5 transition-all">
                   <Gift className="w-5 h-5 text-primary" /> Подарок
                 </Button>
              </div>
            )}

            {gifts && gifts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/60 flex items-center gap-2 px-1"><Sparkles className="w-3.5 h-3.5" /> Артефакты Ядра</h3>
                <div className="grid grid-cols-4 gap-3">
                  {gifts.map(gift => (
                    <div key={gift.id} className="aspect-square bg-white/[0.03] rounded-2xl border border-white/5 flex items-center justify-center p-3 shadow-inner hover:bg-white/10 transition-all">
                      <div className="text-3xl drop-shadow-2xl">{gift.giftIcon}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Узлы: {chat.participantIds?.length}</h3>
                {chat.type !== 'saved' && (
                  <Button variant="ghost" size="sm" className="h-8 text-[9px] uppercase font-black text-primary tracking-widest hover:bg-primary/10" onClick={() => setIsAddMemberOpen(true)}>
                    <Zap className="w-3 h-3 mr-2" /> Добавить
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {chat.participantIds?.map((pid: string) => (
                  <ParticipantItem 
                    key={pid} 
                    userId={pid} 
                    onClick={() => { onOpenChange(false); setInspectedUserId(pid); }} 
                  />
                ))}
              </div>
            </div>

            <Button 
              variant="ghost" 
              className="w-full h-12 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-2xl font-black uppercase italic text-[10px] tracking-widest gap-3 transition-all mt-4" 
              onClick={() => { deleteDocumentNonBlocking(doc(db!, 'chats', chat.id)); setCurrentChatId(null); onOpenChange(false); }}
            >
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
