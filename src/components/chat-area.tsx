"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, Loader2, MessageSquare, Pin, X, Forward, Camera
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { formatDisplayName, isUserPremium } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';

const MessageList = memo(({ 
  messages, 
  userId, 
  chatId, 
  onReply, 
  amIPremium, 
  isAdmin, 
  otherAvatarUrl 
}: any) => {
  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto px-6 py-8 min-h-full">
      {messages.map((msg: Message) => (
        <MessageItem 
          key={msg.id} 
          message={msg} 
          isMe={msg.senderId === userId} 
          chatId={chatId} 
          onReply={onReply} 
          amIPremium={amIPremium}
          isAdmin={isAdmin}
          senderAvatarUrl={msg.senderId === userId ? null : otherAvatarUrl}
        />
      ))}
    </div>
  );
});
MessageList.displayName = 'MessageList';

export default function ChatArea() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId, forwardingMessage, setForwardingMessage } = useAppState();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [messageInput, setMessageInput] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const dataLoadedRef = useRef(false);
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);
  const amIPremium = useMemo(() => isUserPremium(userProfile), [userProfile]);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const otherId = useMemo(() => {
    if (chat?.type === 'private' && user) {
      return chat.participantIds?.find((id: string) => id !== user.uid);
    }
    return null;
  }, [chat, user]);

  const otherProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(otherProfileRef);

  const otherMetadata = useMemo(() => {
    if (otherId && chat?.metadata && chat.metadata[otherId]) {
      return chat.metadata[otherId];
    }
    return null;
  }, [otherId, chat]);

  const pinnedMessageRef = useMemoFirebase(() => {
    if (!db || !currentChatId || !chat?.pinnedMessageId) return null;
    return doc(db, 'chats', currentChatId, 'messages', chat.pinnedMessageId);
  }, [db, currentChatId, chat?.pinnedMessageId]);
  const { data: pinnedMessage } = useDoc<Message>(pinnedMessageRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !currentChatId) return null;
    return query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc'));
  }, [db, currentChatId]);
  
  const { data: messages, isLoading: isMessagesLoading } = useCollection<Message>(messagesQuery);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    }
  }, []);

  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-primary/20');
      setTimeout(() => el.classList.remove('bg-primary/20'), 2000);
    }
  };

  useEffect(() => {
    if (messages?.length) {
      if (!dataLoadedRef.current) {
        setTimeout(() => scrollToBottom('instant' as any), 100);
        dataLoadedRef.current = true;
      } else {
        scrollToBottom('smooth');
      }
    }
  }, [messages?.length, currentChatId, scrollToBottom]);

  useEffect(() => { dataLoadedRef.current = false; }, [currentChatId]);

  const handleSendMessage = useCallback(() => {
    const content = messageInput.trim();
    if (!content || !currentChatId || !user || !db) return;
    
    setIsSending(true);
    const msgData: any = { 
      chatId: currentChatId, 
      senderId: user.uid, 
      senderName: userProfile?.name || 'User', 
      content, 
      contentType: 'text', 
      sentAt: new Date().toISOString(), 
      isRead: false 
    };

    if (replyTo) {
      msgData.replyToId = replyTo.id;
      msgData.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[${replyTo.contentType}]`;
      setReplyTo(null);
    }

    addDocumentNonBlocking(collection(db, 'chats', currentChatId, 'messages'), msgData);
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { 
      lastMessageAt: new Date().toISOString()
    });
    
    setMessageInput('');
    setIsSending(false);
    setTimeout(() => scrollToBottom('smooth'), 100);
  }, [messageInput, currentChatId, user, db, userProfile, replyTo, scrollToBottom]);

  const unpinMessage = () => {
    if (!db || !currentChatId) return;
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { pinnedMessageId: null });
  };

  const chatDisplayName = useMemo(() => {
    if (otherProfile?.name) return otherProfile.name;
    if (otherMetadata?.name) return otherMetadata.name;
    return chat?.name || '...';
  }, [chat, otherMetadata, otherProfile]);

  const chatDisplayUsername = useMemo(() => {
    if (otherProfile?.username) return otherProfile.username;
    if (otherMetadata?.username) return otherMetadata.username;
    if (chat?.username) return chat.username;
    return '';
  }, [otherMetadata, chat, otherProfile]);

  if (!currentChatId) return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-50" />
      <div className="bg-primary/5 p-10 rounded-full mb-6 relative z-10 animate-float">
        <MessageSquare className="w-20 h-20 text-primary/30" />
      </div>
      <h2 className="text-2xl font-black uppercase tracking-widest text-white/40 relative z-10">Выберите диалог</h2>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-[100dvh] bg-background relative overflow-hidden">
      <header className="h-20 flex flex-col justify-center border-b border-white/5 bg-card/40 backdrop-blur-3xl z-30 shrink-0">
        <div className="flex items-center justify-between px-6 h-full">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="md:hidden rounded-2xl" onClick={() => setCurrentChatId(null)}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-4 cursor-pointer min-w-0 group" onClick={() => setIsChatInfoOpen(true)}>
              <UserAvatar userId={otherId} manualAvatarUrl={otherMetadata?.avatarUrl} className="h-11 w-11 rounded-2xl ring-2 ring-primary/20 ring-offset-2 ring-offset-background group-hover:scale-105 transition-all" fallbackName={chatDisplayName} />
              <div className="flex flex-col min-w-0">
                <span className="font-black text-sm uppercase tracking-tighter truncate group-hover:text-primary transition-colors">{formatDisplayName(chatDisplayName)}</span>
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest truncate">{chatDisplayUsername}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="rounded-2xl hover:bg-white/5 hover:text-primary transition-all">
              <Info className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </header>

      {pinnedMessage && (
        <div className="h-14 bg-primary/10 backdrop-blur-2xl border-b border-primary/20 px-6 flex items-center justify-between z-20 shrink-0 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4 cursor-pointer min-w-0 flex-1" onClick={() => scrollToMessage(pinnedMessage.id)}>
            <div className="bg-primary/20 p-2 rounded-xl">
              <Pin className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Закреплено</span>
              <span className="text-xs truncate text-white/80 font-medium">{pinnedMessage.content}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-white/5" onClick={unpinMessage}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      <ScrollArea ref={scrollRef} className="flex-1 w-full relative z-10 scrollbar-hide">
        {messages && (
          <MessageList 
            messages={messages}
            userId={user?.uid}
            chatId={currentChatId}
            onReply={setReplyTo}
            amIPremium={amIPremium}
            isAdmin={chat?.ownerId === user?.uid || chat?.adminIds?.includes(user?.uid || '')}
            otherAvatarUrl={otherProfile?.avatarUrl || otherMetadata?.avatarUrl}
          />
        )}
        {isMessagesLoading && (
          <div className="flex flex-col items-center justify-center p-24 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-30" />
            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/50">Синхронизация...</span>
          </div>
        )}
      </ScrollArea>

      <footer className="p-4 bg-card/60 backdrop-blur-3xl border-t border-white/5 z-30 shrink-0">
        <div className="max-w-4xl mx-auto space-y-3">
          {forwardingMessage && (
            <div className="mb-2 p-4 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-between animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="bg-primary/20 p-2 rounded-xl">
                  <Forward className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">Пересылка</span>
                  <span className="text-xs truncate text-white/70 font-medium">От: {forwardingMessage.senderName}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl" onClick={() => setForwardingMessage(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          )}
          {replyTo && (
            <div className="mb-2 p-3 bg-white/5 rounded-2xl border-l-4 border-primary flex items-center justify-between animate-in slide-in-from-bottom-4">
              <div className="flex flex-col min-w-0 pl-2">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Ответ: {replyTo.senderName}</span>
                <span className="text-xs truncate text-white/60 italic">{replyTo.content}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setReplyTo(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-3 items-end">
            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl shrink-0 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-primary transition-all">
              <Camera className="w-6 h-6" />
            </Button>
            <div className="flex-1 relative">
              <Input 
                placeholder="Напишите что-нибудь..." 
                className="bg-white/5 rounded-2xl h-14 border-white/5 focus-visible:ring-1 focus-visible:ring-primary/40 transition-all text-sm px-6 placeholder:uppercase placeholder:text-[10px] placeholder:font-black placeholder:tracking-widest" 
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={isSending}
              />
            </div>
            <Button size="icon" className="h-14 w-14 rounded-2xl shrink-0 shadow-2xl shadow-primary/40 bg-gradient-to-br from-primary to-primary/80 transition-transform active:scale-90" onClick={handleSendMessage} disabled={isSending || !messageInput.trim()}>
              {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </footer>

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}