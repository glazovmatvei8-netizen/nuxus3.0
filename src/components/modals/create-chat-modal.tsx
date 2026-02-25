"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/lib/store';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Users, Radio, MessageSquarePlus, ArrowRight, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { ChatType } from '@/lib/types';
import { collection, query, addDoc, doc, getDocs, where } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface CreateChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateChatModal({ open, onOpenChange }: CreateChatModalProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { setCurrentChatId } = useAppState();
  const [search, setSearch] = useState('');
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [type, setType] = useState<ChatType>('private');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'));
  }, [db]);

  const { data: allUsers } = useCollection(usersQuery);

  const filteredUsers = (allUsers || []).filter(u => 
    u.id !== user?.uid &&
    (u.name?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase()))
  );

  const startPrivateChat = async (otherUser: any) => {
    if (!db || !user) return;
    setIsLoading(true);
    try {
      // Check for existing private chat
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'private'),
        where('participantIds', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find(d => d.data().participantIds.includes(otherUser.id));

      if (existing) {
        setCurrentChatId(existing.id);
        onOpenChange(false);
        return;
      }

      const newChatData = {
        type: 'private' as const,
        name: otherUser.name,
        username: otherUser.username,
        avatarUrl: otherUser.avatarUrl || null,
        participantIds: [user.uid, otherUser.id],
        adminIds: [user.uid],
        createdAt: new Date().toISOString(),
        ownerId: user.uid,
      };

      const docRef = await addDoc(collection(db, 'chats'), newChatData);
      setCurrentChatId(docRef.id);
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const createGroupOrChannel = async () => {
    if (!name || !username || !db || !user) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const formattedUsername = username.startsWith('@') ? username : '@' + username;
      const newChatData = {
        type: type,
        name: name,
        username: formattedUsername,
        avatarUrl: null,
        participantIds: [user.uid],
        adminIds: [user.uid],
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'chats'), newChatData);
      
      // Add welcome message
      const messagesCol = collection(db, 'chats', docRef.id, 'messages');
      addDocumentNonBlocking(messagesCol, {
        chatId: docRef.id,
        senderId: 'system',
        senderName: 'Nuxus',
        content: `${type === 'group' ? 'Group' : 'Channel'} created successfully!`,
        contentType: 'service',
        sentAt: new Date().toISOString(),
      });

      setCurrentChatId(docRef.id);
      onOpenChange(false);
      toast({ title: "Success", description: `${type} created!` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); setStep('select'); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border/40">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {step === 'select' ? <MessageSquarePlus className="w-5 h-5 text-primary" /> : <ArrowRight className="w-5 h-5 text-primary" />}
            {step === 'select' ? 'Start New conversation' : `Create ${type}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' ? 'Choose who you want to talk to or create a group' : 'Finalize your group details'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="flex flex-col">
            <div className="px-6 py-4 space-y-4">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl h-14 flex flex-col items-center justify-center gap-1 border-primary/20 hover:bg-primary/10 transition-colors"
                  onClick={() => { setType('group'); setStep('details'); }}
                >
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-[10px] font-bold">NEW GROUP</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl h-14 flex flex-col items-center justify-center gap-1 border-accent/20 hover:bg-accent/10 transition-colors"
                  onClick={() => { setType('channel'); setStep('details'); }}
                >
                  <Radio className="w-5 h-5 text-accent" />
                  <span className="text-[10px] font-bold">NEW FEED</span>
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search users..." 
                  className="pl-9 h-11 bg-muted/30 border-muted-foreground/10 rounded-xl"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="h-[300px] border-t border-border/40">
              <div className="p-2 space-y-1">
                {filteredUsers.map(u => (
                  <div
                    key={u.id}
                    onClick={() => startPrivateChat(u)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary/10 cursor-pointer group transition-all"
                  >
                    <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary/20">
                      <AvatarImage src={u.avatarUrl || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold uppercase">{u.name?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm group-hover:text-primary transition-colors">{u.name}</span>
                      <span className="text-[10px] text-muted-foreground">{u.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-dashed border-primary/40 flex flex-center items-center justify-center cursor-pointer hover:bg-primary/20 transition-all">
                {type === 'group' ? <Users className="w-8 h-8 text-primary" /> : <Radio className="w-8 h-8 text-accent" />}
              </div>
            </div>
            <div className="space-y-4">
              <Input 
                placeholder={`${type === 'group' ? 'Group' : 'Channel'} Name`} 
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-12 bg-muted/30 border-muted-foreground/10 rounded-xl text-lg font-semibold"
              />
              <Input 
                placeholder={`@${type}username`} 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="h-12 bg-muted/30 border-muted-foreground/10 rounded-xl"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setStep('select')}>Back</Button>
              <Button 
                className="flex-1 rounded-xl h-11 shadow-lg shadow-primary/20" 
                onClick={createGroupOrChannel}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : `Create ${type}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
