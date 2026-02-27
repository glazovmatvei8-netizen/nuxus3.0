
"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sparkles, Loader2, Trash2, ShieldAlert, ShieldCheck, Ban, Gavel, UserX, UserPlus, Info, Copy, Images, Crown, Shield } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { chatConversationSummary } from '@/ai/flows/chat-conversation-summary-flow';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useAppState } from '@/lib/store';
import { cn, formatDisplayName } from '@/lib/utils';
import type { Message, User } from '@/lib/types';
import { AddMemberModal } from './add-member-modal';
import Image from 'next/image';

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
  const { toast } = useToast();

  const isOwner = user && chat.ownerId === user.uid;
  const isPrivate = chat.type === 'private';
  const otherId = isPrivate && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: currentUserProfile } = useDoc<User>(userProfileRef);

  const isAdmin = currentUserProfile?.phone === '+79513332147' || user?.email === '79513332147@nuxus.chat' || chat.adminIds?.includes(user?.uid);
  
  const otherUserProfileRef = useMemoFirebase(() => {
    if (!db || !otherId) return null;
    return doc(db, 'users', otherId);
  }, [db, otherId]);
  const { data: otherUserProfile } = useDoc<User>(otherUserProfileRef);

  const isBlockedByMe = currentUserProfile?.blockedUserIds?.includes(otherId || '');

  const membersQuery = useMemoFirebase(() => {
    if (!db || !chat.participantIds) return null;
    // В MVP ограничимся 20 участниками для быстроты
    const ids = chat.participantIds.slice(0, 20);
    return query(collection(db, 'users'), where('id', 'in', ids));
  }, [db, chat.participantIds]);

  const { data: members } = useCollection<User>(membersQuery);

  const mediaMessagesQuery = useMemoFirebase(() => {
    if (!db || !chat.id) return null;
    return query(
      collection(db, 'chats', chat.id, 'messages'),
      where('contentType', 'in', ['image', 'video']),
      orderBy('sentAt', 'desc')
    );
  }, [db, chat.id]);

  const { data: mediaMessages, isLoading: isMediaLoading } = useCollection<Message>(mediaMessagesQuery);

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

  const handleCopyLink = () => {
    if (chat.username) {
      navigator.clipboard.writeText(chat.username);
      toast({ title: "Ссылка скопирована", description: chat.username });
    }
  };

  const handleToggleBan = (targetUser: User) => {
    if (!isAdmin || !db) return;
    const targetRef = doc(db, 'users', targetUser.id);
    const newBanStatus = !targetUser.isBanned;
    updateDocumentNonBlocking(targetRef, { isBanned: newBanStatus });
    toast({ title: newBanStatus ? "Пользователь заблокирован" : "Блокировка снята", variant: newBanStatus ? "destructive" : "default" });
  };

  const handlePermanentDelete = (targetUser: User) => {
    if (!isAdmin || !db) return;
    if (!confirm(`ВНИМАНИЕ! Вы собираетесь навсегда удалить аккаунт ${targetUser.name}. Это действие нельзя отменить.`)) return;

    const targetRef = doc(db, 'users', targetUser.id);
    updateDocumentNonBlocking(targetRef, {
      isBanned: true,
      name: "Удалённый Аккаунт🚫",
      username: "@deleted",
      avatarUrl: null,
      lastSeen: null,
      deletedAt: new Date().toISOString()
    });
    toast({ title: "Аккаунт удален и номер заблокирован", variant: "destructive" });
  };

  const chatName = formatDisplayName(chat.name || (otherUserProfile?.name) || 'Чат');
  const chatAvatar = chat.avatarUrl || otherUserProfile?.avatarUrl;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/40 p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 bg-primary/5 border-b border-border/40 text-center flex flex-col items-center shrink-0">
            <Avatar className="h-24 w-24 mb-4 ring-4 ring-primary/10 shadow-xl">
              <AvatarImage src={chatAvatar || ''} className="object-cover" />
              <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">{chatName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <DialogTitle className="text-xl flex items-center gap-2">
              {chatName}
              {(isAdmin || isOwner) && <ShieldCheck className="w-4 h-4 text-accent" />}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-1">
              <DialogDescription className="text-xs">{chat.username || otherUserProfile?.username}</DialogDescription>
              {chat.username && (
                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-50 hover:opacity-100" onClick={handleCopyLink}>
                  <Copy className="w-3 h-3" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/30 p-1 shrink-0">
              <TabsTrigger value="info" className="rounded-lg text-xs">Инфо</TabsTrigger>
              <TabsTrigger value="members" className="rounded-lg text-xs">Участники</TabsTrigger>
              <TabsTrigger value="media" className="rounded-lg text-xs">Медиа</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="info" className="p-6 space-y-6 m-0">
                {(otherUserProfile?.bio || chat.description) && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Info className="w-3 h-3" /> {isPrivate ? "О себе" : "Описание"}
                    </h3>
                    <p className="text-sm bg-muted/10 p-3 rounded-lg border border-border/20 italic">
                      {isPrivate ? otherUserProfile?.bio : chat.description}
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
                    {summary ? <p className="text-sm italic leading-relaxed">{summary}</p> : <p className="text-[10px] text-muted-foreground italic text-center">Суммаризация поможет быстро узнать о чём общались в последнее время.</p>}
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
                      {isAdmin && !isOwner ? "Удалить чат (Админ)" : "Удалить чат для всех"}
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="members" className="p-4 space-y-2 m-0">
                {(isOwner || isAdmin || chat.type === 'group') && (
                  <Button 
                    variant="outline" 
                    className="w-full h-11 rounded-xl mb-4 border-primary/20 hover:bg-primary/5 text-primary font-bold gap-2"
                    onClick={() => setIsAddMemberOpen(true)}
                  >
                    <UserPlus className="w-4 h-4" /> Добавить участников
                  </Button>
                )}
                <div className="space-y-1">
                  {members?.map(userMember => {
                    const isMemberOwner = userMember.id === chat.ownerId;
                    const isMemberAdmin = chat.adminIds?.includes(userMember.id);
                    return (
                      <div key={userMember.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-colors group">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={userMember.avatarUrl || ''} className="object-cover" />
                            <AvatarFallback className="bg-primary/20 text-primary font-bold uppercase">{userMember.name?.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold">{formatDisplayName(userMember.name)}</span>
                              {isMemberOwner ? <Crown className="w-3 h-3 text-yellow-500" /> : isMemberAdmin ? <Shield className="w-3 h-3 text-accent" /> : null}
                              {userMember.isBanned && <Ban className="w-3 h-3 text-destructive" />}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{userMember.username}</span>
                          </div>
                        </div>
                        {isAdmin && userMember.id !== user?.uid && (
                          <div className="flex gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className={cn("h-8 w-8 rounded-full", userMember.isBanned ? "text-accent" : "text-destructive opacity-0 group-hover:opacity-100")} 
                              onClick={() => handleToggleBan(userMember)}
                              title={userMember.isBanned ? "Разбанить" : "Забанить"}
                            >
                              {userMember.isBanned ? <ShieldCheck className="w-4 h-4" /> : <Gavel className="w-4 h-4" />}
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 rounded-full text-destructive opacity-0 group-hover:opacity-100"
                              onClick={() => handlePermanentDelete(userMember)}
                              title="Удалить навсегда"
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="media" className="p-4 m-0">
                {isMediaLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : mediaMessages && mediaMessages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1">
                    {mediaMessages.map(msg => (
                      <div key={msg.id} className="relative aspect-square rounded-sm overflow-hidden border border-border/10 cursor-pointer hover:opacity-90 transition-opacity">
                        <Image 
                          src={msg.content} 
                          alt="Media" 
                          fill 
                          className="object-cover"
                          sizes="(max-width: 400px) 33vw, 150px"
                        />
                        {msg.contentType === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Loader2 className="w-6 h-6 text-white opacity-80" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center space-y-3">
                    <Images className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                    <p className="text-xs text-muted-foreground italic">Медиафайлов пока нет</p>
                  </div>
                )}
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
