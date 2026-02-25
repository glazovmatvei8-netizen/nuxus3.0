"use client"

import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, Paperclip, Smile, MoreVertical, ChevronLeft, 
  Sparkles, MessageSquare, Info
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface ChatAreaProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export default function ChatArea({ toggleSidebar, isSidebarOpen }: ChatAreaProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId } = useAppState();
  const [inputText, setInputText] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch current user profile to use real name in messages
  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: userProfile } = useDoc(userProfileRef);

  const chatRef = useMemoFirebase(() => {
    if (!db || !currentChatId) return null;
    return doc(db, 'chats', currentChatId);
  }, [db, currentChatId]);

  const { data: chat } = useDoc(chatRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !currentChatId) return null;
    return query(
      collection(db, 'chats', currentChatId, 'messages'),
      orderBy('sentAt', 'asc')
    );
  }, [db, currentChatId]);

  const { data: messages } = useCollection(messagesQuery);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !currentChatId || !user) return;
    
    const messageData = {
      chatId: currentChatId,
      senderId: user.uid,
      senderName: userProfile?.name || 'User', // Use real name from profile
      content: inputText,
      contentType: 'text',
      sentAt: new Date().toISOString(),
    };

    const messagesCol = collection(db, 'chats', currentChatId, 'messages');
    addDocumentNonBlocking(messagesCol, messageData);
    setInputText('');
  };

  const handleAIDraft = async () => {
    if (!messages || !user) return;
    setIsDrafting(true);
    try {
      const history = (messages || []).slice(-5).map(m => ({
        sender: m.senderName,
        message: m.content
      }));
      const response = await suggestMessageDraft({
        conversationHistory: history,
        currentUserInput: inputText
      });
      setInputText(response.draftMessage);
    } catch (e) {
      toast({ title: "AI Error", description: "Failed to suggest draft", variant: "destructive" });
    } finally {
      setIsDrafting(false);
    }
  };

  if (!currentChatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 to-background">
        <div className="bg-primary/10 p-6 rounded-full mb-6">
          <MessageSquare className="w-16 h-16 text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Welcome to NuxusChat</h2>
        <p className="text-muted-foreground max-w-sm">Select a conversation from the sidebar to start messaging in real-time with your contacts.</p>
        <Button variant="outline" className="mt-8 rounded-xl border-primary/20" onClick={toggleSidebar}>
          {isSidebarOpen ? "Maximize Area" : "Show Contacts"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative">
      <header className="h-16 flex items-center justify-between px-4 border-b border-border/40 bg-card/20 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCurrentChatId(null)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsChatInfoOpen(true)}>
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={chat?.avatarUrl || ''} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold">{chat?.name?.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight">{chat?.name}</span>
              <span className="text-xs text-green-500 font-medium">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" onClick={() => setIsChatInfoOpen(true)}>
            <Info className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-4 relative z-10 bg-gradient-to-b from-card/10 via-background to-background">
        <div className="flex flex-col gap-4 max-w-4xl mx-auto min-h-full">
          {messages?.map((msg) => (
            <MessageItem 
              key={msg.id} 
              message={msg} 
              isMe={msg.senderId === user?.uid}
              chatId={currentChatId}
            />
          ))}
        </div>
      </ScrollArea>

      <footer className="p-4 bg-card/20 backdrop-blur-xl border-t border-border/40 z-20">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-1 mb-1">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary transition-colors">
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary transition-colors">
              <Smile className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`h-10 w-10 text-muted-foreground hover:text-accent transition-all ${isDrafting ? 'animate-spin' : ''}`}
              onClick={handleAIDraft}
              disabled={isDrafting}
            >
              <Sparkles className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 relative group">
            <Input 
              placeholder="Write a message..." 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="bg-muted/40 border-muted-foreground/10 rounded-2xl h-11 pr-12 focus:ring-1 focus:ring-primary/40 group-hover:bg-muted/60 transition-colors"
            />
            <Button 
              size="icon" 
              className={`absolute right-1 top-1 w-9 h-9 rounded-xl shadow-lg shadow-primary/20 transition-all ${inputText.trim() ? 'scale-100 opacity-100 translate-x-0' : 'scale-0 opacity-0 translate-x-4'}`}
              onClick={handleSendMessage}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </footer>

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}
