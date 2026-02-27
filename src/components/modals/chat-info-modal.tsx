
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sparkles, Loader2, Trash2, ShieldAlert, ShieldCheck, Ban, UserPlus, Info, Copy, Check, Star, Crown, Gift, XCircle, Calendar } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { chatConversationSummary } from '@/ai/flows/chat-conversation-summary-flow';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useAppState } from '@/lib/store';
import { cn, formatDisplayName, isUserPremium } from '@/lib/utils';
import type { Message, User } from '@/lib/types';
import { AddMemberModal } from './add-member-modal';
import { addMonths, addYears } from 'date-fns';

interface ChatInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: any;
}

export function ChatInfoModal({ open, onOpenChange, chat }: ChatInfoModalProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { setCurrentChatId } = useAppState();
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const isOwner = user && chat.ownerId === user.uid;
  const isPrivate = chat.type === 'private';
  const otherId = isPrivate && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: currentUserProfile } = useDoc<User>(userProfileRef);

  // Админ по номеру или UID
  const isAdmin = currentUserProfile?.phone === '+79513332147' || user?.uid === 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';
  
  const otherUserProfileRef = useMemoFirebase(() => {
    if (!db || !otherId) return null;
    return doc(db, 'users', otherId);
  }, [db, otherId]);
  const { data: otherUserProfile } = useDoc<User>(otherUserProfileRef);

  const isBlockedByMe = currentUserProfile?.blockedUserIds?.includes(otherId || '');
  const isTargetPremium = isUserPremium(otherUserProfile);

  const membersQuery = useMemoFirebase(() => {
    if (!db || !chat.participantIds) return null;
    const ids = chat.participantIds.slice(0, 20);
    return query(collection(db, 'users'), where('id', 'in', ids));
  }, [db, chat.participantIds]);

  const { data: members } = useCollection<User>(membersQuery);

  const handleSummarize = async () => {
    if (!db || !chat.id) return;
    setIsSummarizing(true);
    try {
      const msgsQuery = query(
        collection(db, 'chats', chat.id, 'messages'),
        orderBy('sentAt', 'desc'),
        limit(30)
      );
      const snap = await getDocs(msgsQuery);
      const msgs = snap.docs.map(d => ({
        senderName: d.data().senderName || 'Unknown',
        text: d.data().contentType === 'text' ? d.data().content : `[${d.data().contentType}]`
      })).reverse();

      const { summary: aiSummary } = await chatConversationSummary({ chatMessages: msgs });
      setSummary(aiSummary);
    } catch (e) {
      toast({ title: "Ошибка AI", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGrantPremium = (amount: number, unit: 'months' | 'years') => {
    if (!isAdmin || !db || !otherId) return;
    const targetRef = doc(db, 'users', otherId);
    let premiumUntil;
    if (unit === 'months') {
      premiumUntil = addMonths(new Date(), amount).toISOString();
    } else {
      premiumUntil = addYears(new Date(), amount).toISOString();
    }
    
    updateDocumentNonBlocking(targetRef, {
      isPremium: true,
      premiumUntil: premiumUntil
    });
    toast({ title: "Nuxus Premium выдан!", description: `Статус активен до ${new Date(premiumUntil).toLocaleDateString()}` });
  };

  const handleRevokePremium = () => {
    if (!isAdmin || !db || !otherId) return;
    const targetRef = doc(db, 'users', otherId);
    updateDocumentNonBlocking(targetRef, {
      isPremium: false,
      premiumUntil: null
    });
    toast({ title: "Nuxus Premium отозван" });
  };

  const handleDeleteChat = async () => {
    if (!db || !chat.id || (!isOwner && !isAdmin)) return;
    if (!confirm('Вы уверены, что хотите удалить этот чат для всех?')) return;
    
    setIsDeleting(true);
    try {
      deleteDocumentNonBlocking(doc(db, 'chats', chat.id));
      setCurrentChatId(null);
      onOpenChange(false);
      toast({ title: "Чат удален" });
    } catch (e) {
      toast({ title: "Ошибка при удалении", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = () => {
    if (!chat.username) return;
    navigator.clipboard.writeText(chat.username);
    setIsCopied(true);
    toast({ title: "Ссылка скопирована", description: `Никнейм ${chat.username} в буфере обмена` });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleToggleBlock = () => {
    if (!userProfileRef || !otherId) return;
    if (isBlockedByMe) {
      updateDocumentNonBlocking(userProfileRef, { blockedUserIds: arrayRemove(otherId) });
      toast({ title: "Пользователь разблокирован" });
    } else {
      updateDocumentNonBlocking(userProfileRef, { blockedUserIds: arrayUnion(otherId) });
      toast({ title: "Пользователь заблокирован" });
    }
  };

  const handleToggleBan = (targetUser: User) => {
    if (!isAdmin || !db) return;
    const targetRef = doc(db, 'users', targetUser.id);
    const newBanStatus = !targetUser.isBanned;
    updateDocumentNonBlocking(targetRef, { isBanned: newBanStatus });
    toast({ title: newBanStatus ? "Пользователь заблокирован" : "Блокировка снята", variant: newBanStatus ? "destructive" : "default" });
  };

  const chatName = formatDisplayName(chat.name || (otherUserProfile?.name) || 'Чат');
  const chatAvatar = chat.avatarUrl || otherUserProfile?.avatarUrl;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/40 p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 bg-primary/5 border-b border-border/40 text-center flex flex-col items-center shrink-0">
            <div className="relative mb-4">
              <Avatar className="h-24 w-24 ring-4 ring-primary/10 shadow-xl">
                <AvatarImage src={chatAvatar || ''} className="object-cover" />
                <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">{chatName.slice(0, 2)}</AvatarFallback>
              </Avatar>
              {isTargetPremium && (
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-purple-500 to-accent p-1.5 rounded-full shadow-lg border-4 border-background">
                  <Star className="w-4 h-4 text-white fill-white" />
                </div>
              )}
            </div>
            <DialogTitle className="text-xl flex items-center justify-center gap-2">
              {chatName}
              {isTargetPremium && <Star className="w-4 h-4 text-accent fill-accent" />}
              {(isAdmin || isOwner) && <ShieldCheck className="w-4 h-4 text-primary" />}
            </DialogTitle>
            <DialogDescription className="text-xs">{chat.username || otherUserProfile?.username}</DialogDescription>
            {chat.username && chat.type !== 'private' && chat.username !== '@saved' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 h-8 rounded-full text-[10px] font-bold gap-2 px-4"
                onClick={handleCopyLink}
              >
                {isCopied ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
                {isCopied ? 'Скопировано' : 'Копировать ссылку'}
              </Button>
            )}
          </DialogHeader>

          <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/30 p-1 shrink-0">
              <TabsTrigger value="info" className="rounded-lg text-xs">Инфо</TabsTrigger>
              <TabsTrigger value="members" className="rounded-lg text-xs">Участники</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="info" className="p-6 space-y-6 m-0">
                {/* Admin Actions for Premium */}
                {isAdmin && isPrivate && otherId && (
                  <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-4 rounded-2xl border border-primary/20 space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Crown className="w-3 h-3" /> Управление Nuxus Premium
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="h-9 rounded-xl text-[10px] gap-2 font-bold" onClick={() => handleGrantPremium(1, 'months')}>
                        <Gift className="w-3 h-3" /> 1 Месяц
                      </Button>
                      <Button variant="outline" size="sm" className="h-9 rounded-xl text-[10px] gap-2 font-bold" onClick={() => handleGrantPremium(3, 'months')}>
                        <Gift className="w-3 h-3" /> 3 Месяца
                      </Button>
                      <Button variant="outline" size="sm" className="h-9 rounded-xl text-[10px] gap-2 font-bold" onClick={() => handleGrantPremium(6, 'months')}>
                        <Gift className="w-3 h-3" /> 6 Месяцев
                      </Button>
                      <Button variant="outline" size="sm" className="h-9 rounded-xl text-[10px] gap-2 font-bold" onClick={() => handleGrantPremium(1, 'years')}>
                        <Calendar className="w-3 h-3" /> 1 Год
                      </Button>
                      <Button variant="outline" size="sm" className="h-9 rounded-xl text-[10px] gap-2 font-bold col-span-2" onClick={() => handleGrantPremium(2, 'years')}>
                        <Crown className="w-3 h-3" /> 2 Года
                      </Button>
                    </div>
                    {isTargetPremium && (
                      <Button variant="ghost" size="sm" className="w-full h-8 text-[10px] text-destructive hover:bg-destructive/10 rounded-lg gap-2" onClick={handleRevokePremium}>
                        <XCircle className="w-3 h-3" /> Отозвать подписку
                      </Button>
                    )}
                  </div>
                )}

                {chat.description && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Info className="w-3 h-3" /> Описание
                    </h3>
                    <p className="text-sm bg-muted/10 p-3 rounded-lg border border-border/20 italic">
                      {chat.description}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Суммаризация</h3>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={handleSummarize} disabled={isSummarizing}>
                      {isSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                      Обновить
                    </Button>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/40 min-h-[60px] flex items-center justify-center">
                    {summary ? <p className="text-sm italic leading-relaxed">{summary}</p> : <p className="text-[10px] text-muted-foreground italic text-center">Суммаризация доступна для этого чата.</p>}
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  {isPrivate && otherId && (
                    <Button 
                      variant={isBlockedByMe ? "outline" : "ghost"} 
                      className={isBlockedByMe ? "w-full text-accent border-accent/20" : "w-full text-destructive hover:bg-destructive/10"}
                      onClick={handleToggleBlock}
                    >
                      {isBlockedByMe ? <ShieldCheck className="w-4 h-4 mr-2" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                      {isBlockedByMe ? "Разблокировать" : "Заблокировать"}
                    </Button>
                  )}
                  {(isOwner || isAdmin) && (
                    <Button 
                      variant="ghost" 
                      className="w-full text-destructive hover:bg-destructive/10" 
                      onClick={handleDeleteChat}
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                      Удалить чат
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="members" className="p-4 space-y-2 m-0">
                {(isOwner || isAdmin || chat.type === 'group') && (
                  <Button 
                    variant="outline" 
                    className="w-full h-11 rounded-xl mb-4"
                    onClick={() => setIsAddMemberOpen(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" /> Добавить участников
                  </Button>
                )}
                <div className="space-y-1">
                  {members?.map(userMember => (
                    <div key={userMember.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-colors group">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={userMember.avatarUrl || ''} className="object-cover" />
                          <AvatarFallback className="bg-primary/20 text-primary font-bold uppercase">{userMember.name?.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold flex items-center gap-1">
                            {formatDisplayName(userMember.name)}
                            {isUserPremium(userMember) && <Star className="w-3 h-3 text-accent fill-accent" />}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{userMember.username}</span>
                        </div>
                      </div>
                      {isAdmin && userMember.id !== user?.uid && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 rounded-full text-destructive" 
                          onClick={() => handleToggleBan(userMember)}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
      {chat.id && (
        <AddMemberModal 
          open={isAddMemberOpen} 
          onOpenChange={setIsAddMemberOpen} 
          chatId={chat.id} 
          currentParticipantIds={chat.participantIds} 
        />
      )}
    </>
  );
}
