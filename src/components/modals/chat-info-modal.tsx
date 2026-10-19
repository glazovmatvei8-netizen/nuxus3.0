"use client"

import React, { useState, useMemo, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Star, Shield, UserPlus, X, Trash2, Wand2, Loader2, Sparkles, UserCheck, Gift, Zap, ShieldCheck, MoreVertical, Ban, UserMinus, Edit2, ShieldAlert, Settings
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, updateDoc, arrayUnion, query, collection, limit, orderBy, getDocs, arrayRemove, addDoc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/app-state';
import { formatDisplayName, isUserPremium, formatLastSeen, decryptSignal, cn, isGlobalAdmin } from '@/lib/utils';
import type { User, Chat, ReceivedGift } from '@/lib/types';
import { AddMemberModal } from './add-member-modal';
import { GiftModal } from './gift-modal';

const CustomTitleDialog = memo(({ 
  isOpen, 
  onClose, 
  onSave, 
  initialTitle 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (title: string) => void, 
  initialTitle: string 
}) => {
  const [value, setValue] = useState(initialTitle);
  React.useEffect(() => { if (isOpen) setValue(initialTitle); }, [isOpen, initialTitle]);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
       <DialogContent className="max-w-xs bg-[#0a0a0c]/98 border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl outline-none z-[1100]">
          <DialogHeader>
             <DialogTitle className="text-xl font-black uppercase italic text-white text-center w-full">Должность</DialogTitle>
             <DialogDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2 text-center w-full">Введите название для администратора</DialogDescription>
          </DialogHeader>
          <div className="py-6">
             <Input placeholder="например: Модератор" value={value} onChange={e => setValue(e.target.value)} maxLength={20} className="bg-white/5 border-white/10 h-12 rounded-xl text-center text-sm font-black uppercase tracking-widest italic focus:border-primary/50 transition-all" autoFocus />
          </div>
          <DialogFooter className="flex flex-col gap-2">
             <Button onClick={() => onSave(value)} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase italic tracking-widest shadow-xl">Сохранить</Button>
             <Button variant="ghost" onClick={onClose} className="w-full h-12 text-white/20 font-black uppercase text-[10px] tracking-widest">Отмена</Button>
          </DialogFooter>
       </DialogContent>
    </Dialog>
  );
});
CustomTitleDialog.displayName = 'CustomTitleDialog';

const ParticipantItem = memo(({ 
  userId, 
  onClick, 
  canManage, 
  isAdmin, 
  isOwner, 
  customTitle,
  onPromote, 
  onDemote, 
  onKick,
  onSetTitle
}: any) => {
  const db = useFirestore();
  const userRef = useMemo(() => (!db ? null : doc(db, 'users', userId)), [db, userId]);
  const { data: profile } = useDoc<User>(userRef);
  
  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5 shadow-lg">
       <div className="flex items-center gap-4 cursor-pointer flex-1 min-w-0" onClick={onClick}>
         <UserAvatar userId={userId} className="h-11 w-11 border border-white/10" manualAvatarUrl={profile?.avatarUrl} fallbackName={profile?.name} showOnlineStatus />
         <div className="flex flex-col text-left min-w-0">
           <div className="flex items-center gap-2">
             <span className="text-[14px] font-black text-white italic tracking-tight truncate">
               {formatDisplayName(profile?.name, profile?.username)}
             </span>
             {isOwner && <Star className="w-3.5 h-3.5 text-accent fill-accent animate-pulse" />}
             {isAdmin && !isOwner && <Shield className="w-3 h-3 text-primary" />}
           </div>
           <div className="flex flex-col">
              {customTitle ? (
                <span className="text-[9px] font-black text-primary uppercase tracking-widest truncate italic">{customTitle}</span>
              ) : (
                isAdmin && <span className="text-[9px] font-black text-white/30 uppercase tracking-widest truncate">{isOwner ? 'Владелец' : 'Администратор'}</span>
              )}
           </div>
         </div>
       </div>

       {canManage && !isOwner && (
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white/20 hover:text-white group-hover:opacity-100 transition-opacity">
               <MoreVertical className="w-4 h-4" />
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end" className="w-56 bg-[#0a0a0c]/95 backdrop-blur-xl border-white/10 rounded-2xl p-2 shadow-2xl">
             {isAdmin ? (
               <>
                 <DropdownMenuItem onClick={() => onSetTitle(userId)} className="gap-3 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest text-white"><Edit2 className="w-4 h-4 text-primary" /> Изменить должность</DropdownMenuItem>
                 <DropdownMenuItem onClick={() => onDemote(userId)} className="gap-3 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest text-orange-400"><Shield className="w-4 h-4" /> Снять админа</DropdownMenuItem>
               </>
             ) : (
               <DropdownMenuItem onClick={() => onPromote(userId)} className="gap-3 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest text-primary"><ShieldCheck className="w-4 h-4" /> Дать админа</DropdownMenuItem>
             )}
             <DropdownMenuItem onClick={() => onKick(userId)} className="gap-3 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest text-red-500"><UserMinus className="w-4 h-4" /> Исключить</DropdownMenuItem>
           </DropdownMenuContent>
         </DropdownMenu>
       )}
    </div>
  );
});
ParticipantItem.displayName = 'ParticipantItem';

export function ChatInfoModal({ open, onOpenChange, chat }: { open: boolean, onOpenChange: (o: boolean) => void, chat: Chat }) {
  const db = useFirestore();
  const { user } = useUser();
  const { setCurrentChatId, setInspectedUserId } = useAppState();
  const { toast } = useToast();

  if (!chat) return null;

  const isPrivate = chat.type === 'private';
  const otherId = isPrivate && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [titleModalUser, setTitleModalUser] = useState<string | null>(null);

  const userProfileRef = useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: currentUserProfile } = useDoc<User>(userProfileRef);
  
  const otherUserProfileRef = useMemo(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUserProfile } = useDoc<User>(otherUserProfileRef);

  const amIAdmin = useMemo(() => {
    if (!user || !chat) return false;
    return chat.ownerId === user.uid || chat.adminIds?.includes(user.uid) || isGlobalAdmin(currentUserProfile);
  }, [chat, user?.uid, currentUserProfile]);

  const isOwner = useMemo(() => user && chat.ownerId === user.uid, [user, chat.ownerId]);
  const isContact = useMemo(() => otherId && currentUserProfile?.contactIds?.includes(otherId), [otherId, currentUserProfile?.contactIds]);

  const handlePromote = async (uid: string) => { if (!db) return; await updateDoc(doc(db, 'chats', chat.id), { adminIds: arrayUnion(uid) }); toast({ title: "Узел назначен администратором" }); };
  const handleDemote = async (uid: string) => { if (!db) return; await updateDoc(doc(db, 'chats', chat.id), { adminIds: arrayRemove(uid), [`metadata.${uid}.customTitle`]: null }); toast({ title: "Права администратора отозваны" }); };
  const handleKick = async (uid: string) => { if (!db) return; await updateDoc(doc(db, 'chats', chat.id), { participantIds: arrayRemove(uid), adminIds: arrayRemove(uid) }); toast({ title: "Узел исключен из кластера" }); };

  const handleSaveTitle = async (title: string) => {
    if (!db || !titleModalUser) return;
<<<<<<< HEAD
    try { await updateDoc(doc(db, 'chats', chat.id), { [`metadata.${titleModalUser}.customTitle`]: title.trim() || null }); toast({ title: "Должность обновлена" }); setTitleModalUser(null); } catch (e) { toast({ title: "Сбой синхронизации" }); }
=======
    try {
      await updateDoc(doc(db, 'chats', chat.id), { [`metadata.${titleModalUser}.customTitle`]: title.trim() || null });
      toast({ title: "Должность обновлена" });
      setTitleModalUser(null);
    } catch (e) {
      console.error("Failed to save custom title in chat-info-modal:", e);
      toast({ title: "Сбой синхронизации" });
    }
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
  };

  const toggleContact = async () => {
    if (!db || !user || !otherId) return;
<<<<<<< HEAD
    try { await updateDoc(doc(db, 'users', user.uid), { contactIds: isContact ? arrayRemove(otherId) : arrayUnion(otherId) }); toast({ title: isContact ? "Удалено из контактов" : "Узел добавлен в контакты" }); } catch (e) { toast({ title: "Ошибка синхронизации", variant: "destructive" }); }
=======
    try {
      await updateDoc(doc(db, 'users', user.uid), { contactIds: isContact ? arrayRemove(otherId) : arrayUnion(otherId) });
      toast({ title: isContact ? "Удалено из контактов" : "Узел добавлен в контакты" });
    } catch (e) {
      console.error("Failed to toggle contact in chat-info-modal:", e);
      toast({ title: "Ошибка синхронизации", variant: "destructive" });
    }
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
  };

  const currentDisplayName = useMemo(() => {
    if (!chat) return '...';
    if (isPrivate) { const myMeta = chat.metadata?.[user?.uid || '']; return myMeta?.customName || formatDisplayName(otherUserProfile?.name, otherUserProfile?.username); }
    if (chat.type === 'saved') return 'Архив Данных';
    return formatDisplayName(chat.name);
  }, [chat, user?.uid, otherUserProfile, isPrivate]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/95 backdrop-blur-[60px] border-white/10 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl outline-none">
        <DialogHeader className="p-8 text-center flex flex-col items-center shrink-0 space-y-0 relative border-b border-white/5 bg-gradient-to-b from-primary/10 to-transparent">
          <DialogTitle className="text-2xl font-black italic text-white flex items-center justify-center gap-3 tracking-tighter">{currentDisplayName} {isUserPremium(isPrivate ? otherUserProfile : currentUserProfile) && <Star className="w-5 h-5 text-accent fill-accent animate-pulse" />}</DialogTitle>
          <DialogDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 italic">{isPrivate ? formatLastSeen(otherUserProfile?.lastSeen) : (chat.type === 'saved' ? 'Сигнал активен' : chat.username)}</DialogDescription>
          
          <div className="relative mb-6 mt-6">
             <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full animate-pulse" />
             <UserAvatar userId={chat.type === 'saved' ? user?.uid : (isPrivate ? otherId : null)} manualAvatarUrl={chat.type !== 'private' && chat.type !== 'saved' ? chat.avatarUrl : null} className="h-28 w-28 border-[4px] border-[#0a0a0c] shadow-2xl relative z-10" fallbackName={currentDisplayName} showOnlineStatus />
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 px-1">
          <div className="p-6 space-y-8 pb-32">
            {isOwner && (
               <div className="p-6 bg-primary/5 rounded-[2.2rem] border border-primary/20 shadow-xl space-y-5">
                  <div className="flex items-center gap-3 text-primary">
                    <ShieldAlert className="w-5 h-5 animate-pulse" />
                    <h3 className="text-sm font-black uppercase italic tracking-widest">Управление кластером</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => setIsAddMemberOpen(true)} className="h-14 rounded-2xl bg-white/5 text-[10px] font-black uppercase gap-2 hover:bg-primary/20 border border-white/10 transition-all">
                      <UserPlus className="w-4 h-4" /> Добавить
                    </Button>
                    <Button onClick={() => toast({ title: "Настройки чата", description: "Доступно в следующем обновлении Ядра" })} className="h-14 rounded-2xl bg-white/5 text-[10px] font-black uppercase gap-2 hover:bg-primary/20 border border-white/10 transition-all">
                      <Settings className="w-4 h-4" /> Настройки
                    </Button>
                  </div>
               </div>
            )}

            <div className="flex flex-col gap-3">
               {isPrivate && (<Button onClick={toggleContact} variant={isContact ? "outline" : "default"} className={cn("w-full h-14 rounded-2xl font-black uppercase italic tracking-widest gap-2 shadow-xl", isContact ? "border-white/10 bg-white/5" : "bg-primary text-white")}>{isContact ? <><UserCheck className="w-5 h-5 text-primary" /> В контактах</> : <><UserPlus className="w-5 h-5" /> Добавить в контакты</>}</Button>)}
            </div>
            
            {isPrivate && (<div className="flex gap-3"><Button onClick={() => setIsGiftModalOpen(true)} variant="outline" className="flex-1 h-14 rounded-2xl border-white/10 bg-white/[0.02] text-white font-black uppercase italic text-[10px] tracking-widest gap-3 hover:bg-primary/5 transition-all"><Gift className="w-5 h-5 text-primary" /> Подарок</Button></div>)}
            
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Участники: {chat.participantIds?.length}</h3>
              </div>
              <div className="space-y-2">{chat.participantIds?.map((pid: string) => (<ParticipantItem key={pid} userId={pid} onClick={() => { onOpenChange(false); setInspectedUserId(pid); }} canManage={amIAdmin && pid !== user?.uid} isAdmin={chat.adminIds?.includes(pid)} isOwner={chat.ownerId === pid} customTitle={chat.metadata?.[pid]?.customTitle} onPromote={handlePromote} onDemote={handleDemote} onKick={handleKick} onSetTitle={(uid: any) => setTitleModalUser(uid)} />))}</div>
            </div>

            <Button variant="ghost" className="w-full h-12 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-2xl font-black uppercase italic text-[10px] tracking-widest gap-3 transition-all mt-4" onClick={() => { deleteDocumentNonBlocking(doc(db!, 'chats', chat.id)); setCurrentChatId(null); onOpenChange(false); }}><Trash2 className="w-4 h-4" /> Удалить диалог</Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    <CustomTitleDialog isOpen={!!titleModalUser} onClose={() => setTitleModalUser(null)} onSave={handleSaveTitle} initialTitle={titleModalUser ? (chat.metadata?.[titleModalUser]?.customTitle || '') : ''} />
    <AddMemberModal open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen} chatId={chat.id} currentParticipantIds={chat.participantIds} />
    <GiftModal open={isGiftModalOpen} onOpenChange={setIsGiftModalOpen} targetUser={otherUserProfile || null} chatId={chat.id} />
    </>
  );
}