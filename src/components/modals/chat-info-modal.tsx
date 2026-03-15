
"use client"

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Crown, Star, LogOut, Shield, UserCheck, UserPlus2, Link, Copy, X, Bell, BellOff, Clock, Edit3, Camera, Save, UserPlus, Trash2
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayRemove, arrayUnion, deleteDoc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { formatDisplayName, isUserPremium, formatLastSeen } from '@/lib/utils';
import type { User, Chat } from '@/lib/types';
import { addHours, isAfter, parseISO } from 'date-fns';
import { AddMemberModal } from './add-member-modal';

/**
 * ЧАТ-ИНФО 3.2
 * Исправлена работа удаления и обновлены права доступа.
 */
export function ChatInfoModal({ open, onOpenChange, chat }: { open: boolean, onOpenChange: (o: boolean) => void, chat: Chat }) {
  const db = useFirestore();
  const { user } = useUser();
  const { setCurrentChatId } = useAppState();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPrivate = chat.type === 'private';
  const otherId = isPrivate && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: '',
    username: chat.username || '',
    description: chat.description || '',
    avatarUrl: chat.avatarUrl || '',
    isPublic: !!chat.isPublic
  });

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: currentUserProfile } = useDoc<User>(userProfileRef);
  
  const otherUserProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUserProfile } = useDoc<User>(otherUserProfileRef);

  useEffect(() => {
    if (open) {
      const myMetadata = chat.metadata?.[user?.uid || ''];
      const initialName = isPrivate 
        ? (myMetadata?.customName || otherUserProfile?.name || '')
        : (chat.name || '');
      
      setEditForm(prev => ({
        ...prev,
        name: initialName,
        username: chat.username || '',
        description: chat.description || '',
        avatarUrl: chat.avatarUrl || '',
        isPublic: !!chat.isPublic
      }));
    }
  }, [open, chat, user?.uid, otherUserProfile, isPrivate]);

  const isOwner = user && chat.ownerId === user.uid;
  const isChatAdmin = isOwner || (user && chat.adminIds?.includes(user.uid));
  
  const isContact = currentUserProfile?.contactIds?.includes(otherId || '');
  const userMuteTimestamp = chat.metadata?.[user?.uid || '']?.mutedUntil;
  const isCurrentlyMuted = userMuteTimestamp && isAfter(parseISO(userMuteTimestamp), new Date());

  const handleSaveEdit = async () => {
    if (!db || !chat.id || !user) return;
    try {
      if (isPrivate) {
        await updateDoc(doc(db, 'chats', chat.id), {
          [`metadata.${user.uid}.customName`]: editForm.name
        });
        toast({ title: "Имя сохранено", description: "Это имя видите только вы" });
      } else {
        const formattedUsername = editForm.username.startsWith('@') ? editForm.username.toLowerCase() : '@' + editForm.username.toLowerCase();
        await updateDoc(doc(db, 'chats', chat.id), {
          name: editForm.name,
          username: formattedUsername,
          description: editForm.description,
          avatarUrl: editForm.avatarUrl,
          isPublic: editForm.isPublic
        });
        toast({ title: "Чат обновлен" });
      }
      setIsEditing(false);
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleContact = async () => {
    if (!db || !user || !otherId || !userProfileRef) return;
    const isCurrentlyContact = currentUserProfile?.contactIds?.includes(otherId);
    await updateDoc(userProfileRef, {
      contactIds: isCurrentlyContact ? arrayRemove(otherId) : arrayUnion(otherId)
    });
    toast({ title: isCurrentlyContact ? "Удалено из контактов" : "Добавлено в контакты" });
  };

  const handleMute = async (hours: number | 'forever') => {
    if (!db || !user || !chat.id) return;
    let mutedUntil = hours === 'forever' ? new Date(9999, 11, 31).toISOString() : addHours(new Date(), hours).toISOString();
    await updateDoc(doc(db, 'chats', chat.id), { [`metadata.${user.uid}.mutedUntil`]: mutedUntil });
    toast({ title: "Уведомления выключены" });
  };

  const handleUnmute = async () => {
    if (!db || !user || !chat.id) return;
    await updateDoc(doc(db, 'chats', chat.id), { [`metadata.${user.uid}.mutedUntil`]: null });
    toast({ title: "Уведомления включены" });
  };

  const handleDeleteNode = () => {
    if (!db || !chat.id || !user) return;
    
    const confirmMsg = isPrivate ? 'Удалить этот диалог навсегда для всех?' : (isOwner ? 'Удалить это сообщество навсегда?' : 'Выйти из этого сообщества?');
    
    if (confirm(confirmMsg)) {
      if (isPrivate || isOwner) {
        deleteDocumentNonBlocking(doc(db, 'chats', chat.id));
        toast({ title: "Узел уничтожен" });
      } else {
        updateDoc(doc(db, 'chats', chat.id), { participantIds: arrayRemove(user.uid) });
        toast({ title: "Вы покинули узел" });
      }
      setCurrentChatId(null);
      onOpenChange(false);
    }
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
          {/* Аватар */}
          <div className="relative group mb-4">
            <UserAvatar 
              userId={isPrivate ? otherId : null} 
              manualAvatarUrl={isEditing && !isPrivate ? editForm.avatarUrl : (isPrivate ? otherUserProfile?.avatarUrl : chat.avatarUrl)} 
              className="h-24 w-24 border-4 border-primary/20 shadow-2xl" 
              fallbackName={currentDisplayName} 
              showOnlineStatus={!isEditing}
            />
            {isEditing && !isPrivate && (
              <div 
                className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center cursor-pointer backdrop-blur-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-6 h-6 text-white" />
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if(f) {
                    const r = new FileReader();
                    r.onloadend = () => setEditForm({...editForm, avatarUrl: r.result as string});
                    r.readAsDataURL(f);
                  }
                }} />
              </div>
            )}
          </div>

          {!isEditing ? (
            <div className="space-y-1">
              <DialogTitle className="text-xl flex items-center justify-center gap-2 text-white font-black italic">
                {currentDisplayName} {isUserPremium(otherUserProfile) && <Star className="w-4 h-4 text-accent fill-accent" />}
              </DialogTitle>
              <DialogDescription className="text-xs font-mono opacity-60">
                {isPrivate ? formatLastSeen(otherUserProfile?.lastSeen, otherUserProfile?.settings?.privacy?.lastSeenVisibility) : chat.username}
              </DialogDescription>
            </div>
          ) : (
            <div className="w-full space-y-3 px-6 pb-2">
              <Input 
                value={editForm.name} 
                onChange={e => setEditForm({...editForm, name: e.target.value})} 
                className="bg-white/5 border-white/5 h-10 text-center font-bold" 
                placeholder={isPrivate ? "Имя для вас" : "Название"} 
              />
              {!isPrivate && <Input value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="bg-white/5 border-white/5 h-10 text-center font-mono text-xs" placeholder="@username" />}
              <Button variant="ghost" size="sm" className="w-fit mx-auto rounded-xl text-[9px] uppercase font-bold opacity-40 h-7" onClick={() => setIsEditing(false)}>Отмена</Button>
            </div>
          )}
          
          <div className="mt-4 w-full flex flex-col gap-2 px-6">
            {!isEditing && (
              <>
                {isPrivate && otherUserProfile && (
                  <Button 
                    variant={isContact ? "secondary" : "default"} 
                    className="w-full h-10 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest"
                    onClick={handleToggleContact}
                  >
                    {isContact ? <UserCheck className="w-4 h-4" /> : <UserPlus2 className="w-4 h-4" />}
                    {isContact ? "В контактах" : "В контакты"}
                  </Button>
                )}

                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex-1 h-10 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest border-white/5 bg-white/5">
                        {isCurrentlyMuted ? <BellOff className="w-4 h-4 text-primary" /> : <Bell className="w-4 h-4" />}
                        Мьюз
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-56 bg-card border-white/10 rounded-2xl">
                      {isCurrentlyMuted ? (
                        <DropdownMenuItem onClick={handleUnmute} className="gap-2 font-bold uppercase text-[10px] tracking-wider py-3"><Bell className="w-4 h-4 text-green-500" /> Включить звук</DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => handleMute(1)} className="gap-2 font-bold uppercase text-[10px] tracking-wider py-3"><Clock className="w-4 h-4" /> На 1 час</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMute(8)} className="gap-2 font-bold uppercase text-[10px] tracking-wider py-3"><Clock className="w-4 h-4" /> На 8 часов</DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem onClick={() => handleMute('forever')} className="gap-2 font-bold uppercase text-[10px] tracking-wider py-3 text-destructive"><BellOff className="w-4 h-4" /> Навсегда</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button 
                    variant="outline" 
                    className="flex-1 h-10 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest border-white/5 bg-white/5"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="w-4 h-4" /> {isPrivate ? "Имя" : "Правка"}
                  </Button>
                </div>
              </>
            )}

            {isEditing && (
              <Button className="w-full h-12 rounded-xl bg-primary font-black uppercase tracking-widest gap-2" onClick={handleSaveEdit}>
                <Save className="w-4 h-4" /> Сохранить {isPrivate ? "для себя" : ""}
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {isEditing && !isPrivate && (
              <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary">Описание</Label>
                  <Textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="bg-black/20 border-white/5 min-h-[80px] text-xs" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col"><span className="text-[11px] font-bold text-white">Публичный доступ</span><span className="text-[9px] text-muted-foreground uppercase">Доступен через поиск</span></div>
                  <Switch checked={editForm.isPublic} onCheckedChange={v => setEditForm({...editForm, isPublic: v})} />
                </div>
              </div>
            )}

            {!isEditing && chat.description && (
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary">О канале</h3>
                <p className="text-sm text-white/80 leading-relaxed">{chat.description}</p>
              </div>
            )}

            {!isPrivate && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Участники: {chat.participantIds?.length}</h3>
                  {isChatAdmin && (
                    <Button variant="ghost" size="sm" className="h-7 text-[9px] uppercase font-black text-primary gap-1" onClick={() => setIsAddMemberOpen(true)}>
                      <UserPlus className="w-3.5 h-3.5" /> Добавить
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {chat.participantIds?.map((pid: string) => (
                    <MemberRow 
                      key={pid} 
                      userId={pid} 
                      ownerId={chat.ownerId} 
                      adminIds={chat.adminIds || []}
                      isViewerAdmin={isChatAdmin}
                      viewerId={user?.uid || ''}
                      chatId={chat.id}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 pb-12 space-y-2">
              <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2" onClick={handleDeleteNode}>
                <Trash2 className="w-4 h-4" /> {isPrivate || isOwner ? "Удалить узел" : "Отключиться от узла"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    <AddMemberModal 
      open={isAddMemberOpen} 
      onOpenChange={setIsAddMemberOpen} 
      chatId={chat.id} 
      currentParticipantIds={chat.participantIds} 
    />
    </>
  );
}

function MemberRow({ userId, ownerId, adminIds, isViewerAdmin, viewerId, chatId }: any) {
  const db = useFirestore();
  const { toast } = useToast();
  const userRef = useMemoFirebase(() => (!db ? null : doc(db, 'users', userId)), [db, userId]);
  const { data: m } = useDoc<User>(userRef);
  
  const isTargetAdmin = adminIds.includes(userId);
  const isTargetOwner = userId === ownerId;

  const handleAction = async (action: 'make_admin' | 'remove_admin' | 'kick') => {
    if (!db) return;
    const chatRef = doc(db, 'chats', chatId);
    if (action === 'make_admin') await updateDoc(chatRef, { adminIds: arrayUnion(userId) });
    if (action === 'remove_admin') await updateDoc(chatRef, { adminIds: arrayRemove(userId) });
    if (action === 'kick') await updateDoc(chatRef, { participantIds: arrayRemove(userId), adminIds: arrayRemove(userId) });
    toast({ title: "Действие выполнено" });
  };

  if (!m) return null;
  
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group">
      <div className="flex items-center gap-3">
        <UserAvatar userId={m.id} className="h-10 w-10" fallbackName={m.name} showOnlineStatus />
        <div className="flex flex-col text-left">
          <span className="text-sm font-semibold flex items-center gap-1">
            {formatDisplayName(m.name)} 
            {isUserPremium(m) && <Star className="w-3 h-3 text-accent fill-accent" />}
            {isTargetOwner ? <Crown className="w-3 h-3 text-primary" /> : isTargetAdmin && <Shield className="w-3 h-3 text-primary" />}
          </span>
          <span className="text-[10px] text-muted-foreground">{m.username}</span>
        </div>
      </div>

      {isViewerAdmin && userId !== viewerId && !isTargetOwner && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-card border-white/10">
            {isTargetAdmin ? (
              <DropdownMenuItem onClick={() => handleAction('remove_admin')}>Снять админку</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => handleAction('make_admin')}>Назначить админом</DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={() => handleAction('kick')} className="text-destructive">Исключить</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
