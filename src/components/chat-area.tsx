
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, Loader2, MessageSquare
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

// Изолированный список сообщений для предотвращения перерисовок всего ChatArea
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
    <div className="flex flex-col gap-2 max-w-4xl mx-auto px-4 py-4 min-h-full">
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
  const { currentChatId, setCurrentChatId } = useAppState();
  
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

  const otherAvatarUrl = useMemo(() => {
    if (otherId && chat?.metadata && chat.metadata[otherId]) {
      return chat.metadata[otherId].avatarUrl;
    }
    return null;
  }, [otherId, chat]);

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

  const chatDisplayName = useMemo(() => {
    if (!chat) return '...';
    if (otherId && chat.metadata?.[otherId]) return chat.metadata[otherId].name;
    return chat.name;
  }, [chat, otherId]);

  if (!currentChatId) return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
      <div className="bg-primary/5 p-6 rounded-full mb-4">
        <MessageSquare className="w-16 h-16 text-primary/20" />
      </div>
      <h2 className="text-xl font-bold opacity-60">Выберите чат, чтобы начать общение</h2>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-[100dvh] bg-background relative overflow-hidden">
      <header className="h-16 flex flex-col justify-center border-b border-border/40 bg-card/20 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center justify-between px-4 h-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCurrentChatId(null)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setIsChatInfoOpen(true)}>
              <UserAvatar userId={otherId} manualAvatarUrl={otherAvatarUrl} className="h-9 w-9" fallbackName={chatDisplayName} />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm truncate">{formatDisplayName(chatDisplayName)}</span>
                {chat?.type === 'private' && (
                  <span className="text-[10px] text-muted-foreground truncate">{otherId ? '@' + otherId.slice(0, 8) : ''}</span>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="rounded-full">
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <ScrollArea ref={scrollRef} className="flex-1 w-full relative z-10">
        {messages && (
          <MessageList 
            messages={messages}
            userId={user?.uid}
            chatId={currentChatId}
            onReply={setReplyTo}
            amIPremium={amIPremium}
            isAdmin={chat?.ownerId === user?.uid || chat?.adminIds?.includes(user?.uid || '')}
            otherAvatarUrl={otherAvatarUrl}
          />
        )}
        {isMessagesLoading && (
          <div className="flex flex-col items-center justify-center p-12 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Загрузка истории...</span>
          </div>
        )}
      </ScrollArea>

      <footer className="p-3 bg-card/20 backdrop-blur-xl border-t border-border/40 z-20 shrink-0">
        {replyTo && (
          <div className="max-w-4xl mx-auto mb-2 p-2 bg-primary/5 rounded-xl border-l-4 border-primary flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-primary uppercase">Ответ для {replyTo.senderName}</span>
              <span className="text-xs truncate opacity-70">{replyTo.content}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
              <Info className="w-4 h-4 rotate-45" />
            </Button>
          </div>
        )}
        <div className="flex gap-2 max-w-4xl mx-auto items-end">
          <Input 
            placeholder="Сообщение..." 
            className="bg-muted/40 rounded-xl h-11 border-none focus-visible:ring-1 focus-visible:ring-primary/30" 
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            disabled={isSending}
          />
          <Button size="icon" className="h-11 w-11 rounded-xl shrink-0 shadow-lg shadow-primary/20" onClick={handleSendMessage} disabled={isSending || !messageInput.trim()}>
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </footer>

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}
