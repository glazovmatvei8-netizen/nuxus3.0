
"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sparkles, Users, Shield, Loader2, Image as ImageIcon, Video, FileText } from 'lucide-react';
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

  const mediaQuery = useMemoFirebase(() => {
    if (!db || !chat.id || !isParticipant) return null;
    return query(
      collection(db, 'chats', chat.id, 'messages'),
      where('contentType', 'in', ['image', 'video']),
      orderBy('sentAt', 'desc')
    );
  }, [db, chat.id, isParticipant]);
  const { data: mediaMessages } = useCollection<Message>(mediaQuery);

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

      if (msgs.length === 0) {
        setSummary("Сообщений для суммаризации нет.");
        return;
      }

      const { summary: aiSummary } = await chatConversationSummary({ chatMessages: msgs });
      setSummary(aiSummary);
    } catch (e) {
      toast({ title: "Summary Error", description: "Failed to summarize chat", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/40 p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 bg-primary/5 border-b border-border/40 text-center flex flex-col items-center shrink-0">
          <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-primary/20 mb-4">
            <AvatarImage src={chatAvatar || ''} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold uppercase">{chatName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <DialogTitle className="text-2xl font-bold">{chatName}</DialogTitle>
          <DialogDescription className="text-muted-foreground">{chat.username}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 bg-muted/20 border-b border-border/40 rounded-none h-12">
            <TabsTrigger value="info" className="text-xs font-bold uppercase tracking-tight">Инфо</TabsTrigger>
            <TabsTrigger value="members" className="text-xs font-bold uppercase tracking-tight">Участники</TabsTrigger>
            <TabsTrigger value="media" className="text-xs font-bold uppercase tracking-tight">Медиа</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="info" className="p-6 space-y-6 m-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-accent" /> AI Summary
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-7 px-2 text-[10px] font-bold ${isSummarizing ? 'animate-pulse' : ''}`}
                    onClick={handleSummarize}
                    disabled={isSummarizing || !isParticipant}
                  >
                    {isSummarizing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : (summary ? 'Refresh' : 'Generate')}
                  </Button>
                </div>
                <div className="bg-muted/20 border border-border/40 rounded-xl p-4 min-h-[60px] flex items-center justify-center text-center">
                  {!isParticipant ? (
                    <p className="text-xs text-muted-foreground italic">Суммаризация доступна только участникам чата.</p>
                  ) : summary ? (
                    <p className="text-sm leading-relaxed text-foreground/90 italic">"{summary}"</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No summary generated yet. Click generate to analyze recent conversation.</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Описание</h3>
                <p className="text-sm text-foreground/80 leading-relaxed bg-muted/10 p-4 rounded-xl border border-border/40">
                  {chat.description || 'Описание отсутствует.'}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="members" className="p-4 m-0">
              <div className="space-y-2">
                {members?.map(user => {
                  const isAdmin = chat.adminIds?.includes(user.id);
                  return (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 group transition-all">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 ring-1 ring-border/40">
                          <AvatarImage src={user.avatarUrl || ''} />
                          <AvatarFallback className="text-xs bg-muted/40 font-bold uppercase">{user.name?.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold group-hover:text-primary transition-colors">{user.name}</span>
                          <span className="text-[10px] text-muted-foreground">{user.username}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="bg-primary/10 text-primary text-[8px] font-bold px-1.5 py-0.5 rounded border border-primary/20 uppercase flex items-center gap-1">
                          <Shield className="w-2 h-2" /> Admin
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="media" className="p-4 m-0">
              {!isParticipant ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                   <p className="text-xs italic">Медиа доступно только участникам чата</p>
                </div>
              ) : mediaMessages && mediaMessages.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {mediaMessages.map(msg => (
                    <div key={msg.id} className="aspect-square relative group cursor-pointer overflow-hidden rounded-md border border-border/20">
                      {msg.contentType === 'image' ? (
                        <img src={msg.content} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full bg-black flex items-center justify-center">
                          <Video className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <ImageIcon className="w-8 h-8 mx-auto opacity-20" />
                  <p className="text-xs italic">Медиафайлы еще не отправлялись</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <div className="p-4 bg-muted/10 border-t border-border/40 shrink-0">
          <Button variant="outline" className="w-full rounded-xl" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
