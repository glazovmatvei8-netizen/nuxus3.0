
"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sparkles, Users, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { chatConversationSummary } from '@/ai/flows/chat-conversation-summary-flow';
import { useToast } from '@/hooks/use-toast';
import type { Message } from '@/lib/types';

interface ChatInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: any;
}

export function ChatInfoModal({ open, onOpenChange, chat }: ChatInfoModalProps) {
  const db = useFirestore();
  const { user } = useUser();
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const { toast } = useToast();

  const isParticipant = useMemo(() => {
    return user && chat.participantIds?.includes(user.uid);
  }, [user, chat.participantIds]);

  const chatName = chat.name || 'Chat';
  const chatAvatar = chat.avatarUrl;

  const membersQuery = useMemoFirebase(() => {
    if (!db || !chat.participantIds) return null;
    return query(collection(db, 'users'), where('id', 'in', chat.participantIds));
  }, [db, chat.participantIds]);

  const { data: members } = useCollection(membersQuery);

  const handleSummarize = async () => {
    if (!db || !chat.id || !isParticipant) return;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/40 p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 bg-primary/5 border-b border-border/40 text-center flex flex-col items-center">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={chatAvatar || ''} />
            <AvatarFallback>{chatName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <DialogTitle>{chatName}</DialogTitle>
          <DialogDescription>{chat.username}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Инфо</TabsTrigger>
            <TabsTrigger value="members">Участники</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[300px]">
            <TabsContent value="info" className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground">AI Summary</h3>
                  <Button variant="ghost" size="sm" onClick={handleSummarize} disabled={isSummarizing}>
                    {isSummarizing ? <Loader2 className="animate-spin" /> : 'Обновить'}
                  </Button>
                </div>
                <div className="bg-muted/20 p-4 rounded-xl border border-border/40">
                  {summary ? <p className="text-sm italic">{summary}</p> : <p className="text-xs text-muted-foreground">Нет данных</p>}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase text-muted-foreground">Описание</h3>
                <p className="text-sm">{chat.description || 'Нет описания'}</p>
              </div>
            </TabsContent>

            <TabsContent value="members" className="p-4">
              {members?.map(user => (
                <div key={user.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/30">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatarUrl || ''} />
                    <AvatarFallback>{user.name?.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold">{user.name}</span>
                </div>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <div className="p-4 border-t border-border/40">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
