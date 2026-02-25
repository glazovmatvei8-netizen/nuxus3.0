"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Users, Shield } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { chatConversationSummary } from '@/ai/flows/chat-conversation-summary-flow';
import { useToast } from '@/hooks/use-toast';

interface ChatInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: any;
}

export function ChatInfoModal({ open, onOpenChange, chat }: ChatInfoModalProps) {
  const db = useFirestore();
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const { toast } = useToast();

  const chatName = chat.name || 'Chat';
  const chatAvatar = chat.avatarUrl;

  const membersQuery = useMemoFirebase(() => {
    if (!db || !chat.participantIds) return null;
    return query(collection(db, 'users'), where('id', 'in', chat.participantIds));
  }, [db, chat.participantIds]);

  const { data: members } = useCollection(membersQuery);

  const handleSummarize = async () => {
    setIsSummarizing(true);
    try {
      // In a real app, you'd fetch the last messages here
      // For now, we use a placeholder or previous messages if passed
      toast({ title: "Summarizing...", description: "Analyzing conversation context." });
      setSummary("This is an AI-generated summary of your recent conversation about the project.");
    } catch (e) {
      toast({ title: "Summary Error", description: "Failed to summarize chat", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/40 p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-primary/5 border-b border-border/40 text-center flex flex-col items-center">
          <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-primary/20 mb-4">
            <AvatarImage src={chatAvatar || ''} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold uppercase">{chatName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <DialogTitle className="text-2xl font-bold">{chatName}</DialogTitle>
          <DialogDescription className="text-muted-foreground">{chat.username}</DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
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
                disabled={isSummarizing}
              >
                {summary ? 'Refresh' : 'Generate'}
              </Button>
            </div>
            <div className="bg-muted/20 border border-border/40 rounded-xl p-4 min-h-[60px] flex items-center justify-center text-center">
              {summary ? (
                <p className="text-sm leading-relaxed text-foreground/90 italic">"{summary}"</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No summary generated yet. Click generate to analyze recent conversation.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Users className="w-3 h-3" /> Members ({chat.participantIds?.length || 0})
            </h3>
            <ScrollArea className="h-[180px]">
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
            </ScrollArea>
          </div>

          <div className="pt-2">
            <Button variant="outline" className="w-full rounded-xl border-border/40" onClick={() => onOpenChange(false)}>
              Close Details
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
