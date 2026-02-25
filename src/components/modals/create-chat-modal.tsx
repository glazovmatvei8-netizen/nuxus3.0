"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Users, Radio, MessageSquarePlus, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { ChatType } from '@/lib/types';

interface CreateChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateChatModal({ open, onOpenChange }: CreateChatModalProps) {
  const { users, currentUser, chats, setChats, setCurrentChatId } = useAppState();
  const [search, setSearch] = useState('');
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [type, setType] = useState<ChatType>('private');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const { toast } = useToast();

  const filteredUsers = Object.values(users).filter(u => 
    u.phone !== currentUser?.phone &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()))
  );

  const startPrivateChat = (otherUser: any) => {
    const existing = chats.find(c => c.type === 'private' && c.participants.includes(otherUser.phone));
    if (existing) {
      setCurrentChatId(existing.id);
      onOpenChange(false);
      return;
    }

    const newChat = {
      id: Date.now().toString(),
      type: 'private' as const,
      name: otherUser.name,
      username: otherUser.username,
      avatar: otherUser.avatar,
      participants: [currentUser!.phone, otherUser.phone],
      admins: [currentUser!.phone],
      messages: [],
      createdAt: Date.now()
    };

    setChats([...chats, newChat]);
    setCurrentChatId(newChat.id);
    onOpenChange(false);
  };

  const createGroupOrChannel = () => {
    if (!name || !username) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    const formattedUsername = username.startsWith('@') ? username : '@' + username;
    const newChat = {
      id: Date.now().toString(),
      type: type,
      name: name,
      username: formattedUsername,
      avatar: null,
      participants: [currentUser!.phone],
      admins: [currentUser!.phone],
      messages: [{
        id: 'service-1',
        senderPhone: 'system',
        senderName: 'Nuxus',
        text: `${type === 'group' ? 'Group' : 'Channel'} created successfully!`,
        time: Date.now(),
        type: 'service' as const
      }],
      createdAt: Date.now()
    };

    setChats([...chats, newChat]);
    setCurrentChatId(newChat.id);
    onOpenChange(false);
    toast({ title: "Success", description: `${type} created!` });
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
                {filteredUsers.map(user => (
                  <div
                    key={user.phone}
                    onClick={() => startPrivateChat(user)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary/10 cursor-pointer group transition-all"
                  >
                    <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary/20">
                      <AvatarImage src={user.avatar || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold uppercase">{user.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm group-hover:text-primary transition-colors">{user.name}</span>
                      <span className="text-[10px] text-muted-foreground">{user.username}</span>
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
              <Button className="flex-1 rounded-xl h-11 shadow-lg shadow-primary/20" onClick={createGroupOrChannel}>Create {type}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}