
"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sparkles, Loader2, Trash2, ShieldAlert, ShieldCheck, Ban, Gavel, UserX, X } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { chatConversationSummary } from '@/ai/flows/chat-conversation-summary-flow';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { Message, User } from '@/lib/types';

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
  const { toast } = useToast();

  const isOwner = user && chat.ownerId === user.uid;
  const isPrivate = chat.type === 'private';
  const otherId = isPrivate && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: currentUserProfile } = useDoc<User>(userProfileRef);

  const isAdmin = currentUserProfile?.phone === '+79513332147';
  const isBlocked = currentUserProfile?.blockedUserIds?.includes(otherId || '');

  const membersQuery = useMemoFirebase(() => {
    if (!db || !chat.participantIds) return null;
    const ids = chat.participantIds.slice(0, 10);
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
        limit(20)
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
    if (isBlocked) {
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

  const handlePermanentDelete = (targetUser: User) => {
    if (!isAdmin || !db) return;
    if (!confirm(`ВНИМАНИЕ! Вы собираетесь навсегда удалить аккаунт ${targetUser.name}. Человек больше не сможет зайти. Продолжить?`)) return;

    const targetRef = doc(db, 'users', targetUser.id);
    updateDocumentNonBlocking(targetRef, {
      isBanned: true,
      name: "Удаленный аккаунт",
      username: "@deleted",
      avatarUrl: null,
      lastSeen: null,
      deletedAt: new Date().toISOString()
    });
    toast({ title: "Аккаунт удален и номер заблокирован", variant: "destructive" });
  };

  const chatName = chat.name || 'Чат';
  const chatAvatar = chat.avatarUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/40 p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 bg-primary/5 border-b border-border/40 text-center flex flex-col items-center relative">
           <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => onOpenChange(false)}><X className="w-5 h-5" /></Button>
          <Avatar className="h-24 w-24 mb-4 ring-4 ring-primary/10">
            <AvatarImage src={chatAvatar || ''} />
            <AvatarFallback className="text-2xl font-bold">{chatName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <DialogTitle className="text-xl flex items-center gap-2">
            {chatName}
            {isAdmin && <ShieldCheck className="w-4 h-4 text-accent" />}
          </DialogTitle>
          <DialogDescription className="text-xs">{chat.username}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/30 p-1">
            <TabsTrigger value="info" className="rounded-lg">Инфо</TabsTrigger>
            <TabsTrigger value="members" className="rounded-lg">Участники</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[350px]">
            <TabsContent value="info" className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Суммаризация</h3>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={handleSummarize} disabled={isSummarizing}>
                    {isSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    Обновить
                  </Button>
                </div>
                <div className="bg-muted/30 p-4 rounded-xl border border-border/40">
                  {summary ? <p className="text-sm italic leading-relaxed">{summary}</p> : <p className="text-xs text-muted-foreground italic text-center">Суммаризация последних сообщений поможет быстро войти в курс дела.</p>}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Описание</h3>
                <p className="text-sm bg-muted/10 p-3 rounded-lg border border-border/20">{chat.description || 'Нет описания'}</p>
              </div>

              <div className="pt-4 space-y-3">
                {isPrivate && otherId && (
                  <Button 
                    variant={isBlocked ? "outline" : "ghost"} 
                    className={isBlocked ? "w-full text-accent" : "w-full text-destructive hover:bg-destructive/10"}
                    onClick={handleToggleBlock}
                  >
                    {isBlocked ? <ShieldCheck className="w-4 h-4 mr-2" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                    {isBlocked ? "Разблокировать" : "Заблокировать для себя"}
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

            <TabsContent value="members" className="p-4 space-y-1">
              {members?.map(userMember => (
                <div key={userMember.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={userMember.avatarUrl || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold">{userMember.name?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold">{userMember.name}</span>
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
                        className={cn("h-8 w-8 rounded-full", userMember.isBanned ? "text-accent" : "text-destructive")} 
                        onClick={() => handleToggleBan(userMember)}
                        title={userMember.isBanned ? "Разбанить" : "Забанить"}
                      >
                        {userMember.isBanned ? <ShieldCheck className="w-4 h-4" /> : <Gavel className="w-4 h-4" />}
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 rounded-full text-destructive"
                        onClick={() => handlePermanentDelete(userMember)}
                        title="Удалить навсегда"
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
