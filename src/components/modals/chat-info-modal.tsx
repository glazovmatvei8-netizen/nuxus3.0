
"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Crown, Star, LogOut, Shield, UserMinus, UserCheck, Phone, UserPlus2, Link, Copy, X
} from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayRemove, arrayUnion, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/store';
import { formatDisplayName, isUserPremium } from '@/lib/utils';
import type { User, Chat } from '@/lib/types';

export function ChatInfoModal({ open, onOpenChange, chat }: { open: boolean, onOpenChange: (o: boolean) => void, chat: Chat }) {
  const db = useFirestore();
  const { user } = useUser();
  const { setCurrentChatId } = useAppState();
  const { toast } = useToast();

  const isOwner = user && chat.ownerId === user.uid;
  const isChatAdmin = isOwner || (user && chat.adminIds?.includes(user.uid));
  const isPrivate = chat.type === 'private';
  const otherId = isPrivate && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: currentUserProfile } = useDoc<User>(userProfileRef);
  
  const otherUserProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUserProfile } = useDoc<User>(otherUserProfileRef);

  const isContact = currentUserProfile?.contactIds?.includes(otherId || '');

  const inviteLink = useMemo(() => {
    if (typeof window === 'undefined' || isPrivate || !chat.username) return '';
    return `${window.location.origin}/?join=${chat.username.replace('@', '')}`;
  }, [chat.username, isPrivate]);

  const handleToggleContact = async () => {
    if (!db || !user || !otherId || !userProfileRef) return;
    const isCurrentlyContact = currentUserProfile?.contactIds?.includes(otherId);
    await updateDoc(userProfileRef, {
      contactIds: isCurrentlyContact ? arrayRemove(otherId) : arrayUnion(otherId)
    });
    toast({ title: isCurrentlyContact ? "Удалено из контактов" : "Добавлено в контакты" });
  };

  const chatName = formatDisplayName(chat.name || otherUserProfile?.name || 'Чат');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden h-[80vh] flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-6 text-center flex flex-col items-center shrink-0 space-y-0">
          <UserAvatar 
            userId={isPrivate ? otherId : null} 
            manualAvatarUrl={isPrivate ? otherUserProfile?.avatarUrl : chat.avatarUrl} 
            className="h-24 w-24 mb-3 border-4 border-primary/20 shadow-2xl" 
            fallbackName={chatName} 
          />
          <DialogTitle className="text-xl flex items-center justify-center gap-2">
            {chatName} {isUserPremium(otherUserProfile) && <Star className="w-4 h-4 text-accent fill-accent" />}
          </DialogTitle>
          <DialogDescription className="text-xs font-mono opacity-60">{otherUserProfile?.username || chat.username}</DialogDescription>
          
          {isPrivate && otherUserProfile && (
            <div className="mt-4 w-full flex flex-col gap-2 px-6">
              <Button 
                variant={isContact ? "secondary" : "default"} 
                className="w-full h-10 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest"
                onClick={handleToggleContact}
              >
                {isContact ? <UserCheck className="w-4 h-4" /> : <UserPlus2 className="w-4 h-4" />}
                {isContact ? "В контактах" : "В контакты"}
              </Button>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {!isPrivate && inviteLink && (
              <div className="p-4 bg-primary/5 rounded-[1.5rem] border border-primary/10 space-y-3">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary">
                  <Link className="w-3.5 h-3.5" /> Ссылка на приглашение
                </div>
                <div className="flex gap-2">
                  <Input readOnly value={inviteLink} className="bg-black/20 border-white/5 h-10 text-[10px] font-mono rounded-xl truncate" />
                  <Button size="icon" variant="outline" className="h-10 w-10 shrink-0 rounded-xl border-white/10" onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: "Ссылка скопирована!" }); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Участники: {chat.participantIds?.length}</h3>
              <div className="space-y-2">
                {chat.participantIds?.map((pid: string) => (
                  <MemberRow 
                    key={pid} 
                    userId={pid} 
                    ownerId={chat.ownerId} 
                    adminIds={chat.adminIds || []}
                    isOwner={isOwner}
                    isViewerAdmin={isChatAdmin}
                    viewerId={user?.uid || ''}
                  />
                ))}
              </div>
            </div>

            <div className="pt-4 pb-12 space-y-2">
              <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => {
                if (confirm('Удалить чат?')) {
                  deleteDoc(doc(db, 'chats', chat.id));
                  setCurrentChatId(null);
                  onOpenChange(false);
                }
              }}>Удалить чат</Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({ userId, ownerId, adminIds, isOwner, isViewerAdmin, viewerId }: any) {
  const db = useFirestore();
  const userRef = useMemoFirebase(() => (!db ? null : doc(db, 'users', userId)), [db, userId]);
  const { data: m } = useDoc<User>(userRef);
  
  const isTargetAdmin = adminIds.includes(userId);
  const isTargetOwner = userId === ownerId;

  if (!m) return null;
  
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3">
        <UserAvatar userId={m.id} className="h-10 w-10" fallbackName={m.name} />
        <div className="flex flex-col text-left">
          <span className="text-sm font-semibold flex items-center gap-1">
            {formatDisplayName(m.name)} 
            {isUserPremium(m) && <Star className="w-3 h-3 text-accent fill-accent" />}
            {isTargetOwner ? <Crown className="w-3 h-3 text-primary" /> : isTargetAdmin && <Shield className="w-3 h-3 text-primary" />}
          </span>
          <span className="text-[10px] text-muted-foreground">{m.username}</span>
        </div>
      </div>
    </div>
  );
}
