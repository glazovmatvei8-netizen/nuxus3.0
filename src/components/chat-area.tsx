
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Paperclip, Sparkles, MessageSquare, Info, X, 
  CornerUpLeft, Loader2, ShieldAlert, ChevronLeft, ChevronDown,
  Search, MoreVertical, Mic, UserPlus, Pin
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, arrayUnion } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';
import { cn, formatDisplayName, formatLastSeen } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';

const ChatInput = React.memo(({ 
  onSend, 
  onTyping, 
  isSuggesting, 
  onSuggest, 
  onFileSelect, 
  isBlocked, 
  editMessage,
  replyTo,
  onCancelReply,
  isSending,
}: any) => {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editMessage) setText(editMessage.content);
    else setText('');
  }, [editMessage]);

  const handleSend = () => {
    if (!text.trim() || isSending) return;
    onSend(text, 'text');
    setText('');
    onTyping(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);
    onTyping(val.length > 0);
  };

  const handleSuggest = async () => {
    const draft = await onSuggest(text);
    if (draft) setText(draft);
  };

  return (
    <div className="flex flex-col gap-2 max-w-4xl mx-auto w-full">
      {replyTo && (
        <div className="flex items-center justify-between bg-muted/40 p-2 rounded-xl border-l-4 border-primary mb-1 animate-in slide-in-from-bottom-1">
          <div className="flex items-center gap-3 truncate">
            <CornerUpLeft className="w-4 h-4 text-primary" />
            <span className="text-xs truncate italic">{replyTo.content}</span>
          </div>
          <Button size="icon" variant="ghost" onClick={onCancelReply} className="h-6 w-6"><X className="w-4 h-4" /></Button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex items-center gap-1 mb-1">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={onFileSelect} />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="rounded-full"><Paperclip className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={handleSuggest} disabled={isSuggesting} className="rounded-full"><Sparkles className={cn("w-5 h-5 text-accent", isSuggesting && "animate-spin")} /></Button>
        </div>
        <div className="flex-1 relative">
          <Input 
            placeholder={editMessage ? "Изменить..." : "Сообщение..."} 
            value={text} 
            onChange={handleChange}
            onKeyDown={e => e.key === 'Enter' && handleSend()} 
            className="bg-muted/40 rounded-2xl h-11 pr-12 focus:ring-1 focus:ring-primary border-none text-base" 
            disabled={isBlocked || isSending}
          />
          {text.trim() ? (
            <Button 
              size="icon" 
              className="absolute right-1 top-1 w-9 h-9 rounded-xl transition-all duration-200" 
              onClick={handleSend}
              disabled={isSending}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1 w-9 h-9 rounded-full text-muted-foreground">
              <Mic className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';

export default function ChatArea({ toggleSidebar, isSidebarOpen }: any) {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId } = useAppState();
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  const [statusString, setStatusString] = useState<string>('');
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingSignalRef = useRef<number>(0);
  const lastMessageSentRef = useRef<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataLoadedRef = useRef(false);
  
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);

  const chatRef = useMemoFirebase(() => {
    if (!db || !currentChatId) return null;
    return doc(db, 'chats', currentChatId);
  }, [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const pinnedMessageRef = useMemoFirebase(() => {
    if (!db || !currentChatId || !chat?.pinnedMessageId) return null;
    return doc(db, 'chats', currentChatId, 'messages', chat.pinnedMessageId);
  }, [db, currentChatId, chat?.pinnedMessageId]);
  const { data: pinnedMessage } = useDoc<Message>(pinnedMessageRef);

  const isParticipant = chat?.participantIds?.includes(user?.uid || '');

  const otherId = useMemo(() => {
    if (chat?.type === 'private' && user) {
      return chat.participantIds?.find((id: string) => id !== user.uid);
    }
    return null;
  }, [chat, user]);

  const otherUserProfileRef = useMemoFirebase(() => {
    if (!db || !otherId) return null;
    return doc(db, 'users', otherId);
  }, [db, otherId]);
  const { data: otherUserProfile, isLoading: isOtherProfileLoading } = useDoc<UserType>(otherUserProfileRef);

  const isBlockedByMe = userProfile?.blockedUserIds?.includes(otherId || '');
  const isBlockedByThem = otherUserProfile?.blockedUserIds?.includes(user?.uid || '');
  const isBlocked = isBlockedByMe || isBlockedByThem;

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !currentChatId) return null;
    return query(
      collection(db, 'chats', currentChatId, 'messages'),
      orderBy('sentAt', 'asc')
    );
  }, [db, currentChatId]);
  
  const { data: messages, isLoading: isMessagesLoading } = useCollection<Message>(messagesQuery);

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    if (!isSearchOpen || !searchQuery.trim()) return messages;
    return messages.filter(msg => 
      msg.contentType === 'text' && 
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, isSearchOpen, searchQuery]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior });
      }
    }
  }, []);

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-primary/20');
      setTimeout(() => el.classList.remove('bg-primary/20'), 2000);
    }
  };

  useEffect(() => {
    if (messages && messages.length > 0) {
      const isInitial = !dataLoadedRef.current;
      if (isInitial) {
        setTimeout(() => scrollToBottom('instant' as any), 50);
        dataLoadedRef.current = true;
      } else {
        scrollToBottom('smooth');
      }
    }
  }, [messages, currentChatId, scrollToBottom]);

  useEffect(() => {
    dataLoadedRef.current = false;
  }, [currentChatId]);

  const handleTyping = useCallback((isTyping: boolean) => {
    if (!currentChatId || !user || !db || isBlocked || !isParticipant) return;
    
    const isOtherDeleted = otherUserProfile?.isBanned || otherUserProfile?.name?.includes('Удалённый Аккаунт');
    if (isOtherDeleted) return;

    const now = Date.now();
    const chatDocRef = doc(db, 'chats', currentChatId);

    if (isTyping) {
      if (now - lastTypingSignalRef.current > 3500) {
        updateDocumentNonBlocking(chatDocRef, { [`typing.${user.uid}`]: true });
        lastTypingSignalRef.current = now;
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (db && currentChatId && user) {
          updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { [`typing.${user.uid}`]: false });
        }
        lastTypingSignalRef.current = 0;
      }, 5000);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      updateDocumentNonBlocking(chatDocRef, { [`typing.${user.uid}`]: false });
      lastTypingSignalRef.current = 0;
    }
  }, [currentChatId, user, db, isBlocked, otherUserProfile, isParticipant]);

  useEffect(() => {
    const isOtherDeleted = otherUserProfile?.isBanned || otherUserProfile?.name?.includes('Удалённый Аккаунт');
    const isTyping = chat?.typing && otherId && chat.typing[otherId] && !isOtherDeleted;

    if (isBlockedByMe) setStatusString('Пользователь заблокирован');
    else if (isBlockedByThem) setStatusString('Вы заблокированы');
    else if (isTyping) setStatusString('печатает...');
    else if (isOtherProfileLoading) setStatusString('загрузка...');
    else if (chat?.type === 'private') setStatusString(formatLastSeen(otherUserProfile?.lastSeen, otherUserProfile?.settings?.privacy?.lastSeenVisibility, isOtherDeleted));
    else setStatusString(chat?.type === 'group' ? 'Группа' : (chat?.type === 'channel' ? 'Канал' : 'Избранное'));
  }, [isOtherProfileLoading, otherUserProfile, chat?.type, chat?.typing, otherId, isBlockedByMe, isBlockedByThem]);

  const handleSendMessage = useCallback((content: string, type: string = 'text') => {
    if (isBlocked || userProfile?.isBanned || !isParticipant) return;
    if (!content.trim() && type === 'text') return;
    if (!currentChatId || !user || !db) return;

    const now = Date.now();
    if (now - lastMessageSentRef.current < 1500) {
      toast({ title: "Слишком часто", description: "Пожалуйста, подождите немного", variant: "destructive" });
      return;
    }
    
    setIsSending(true);
    
    if (editMessage && type === 'text') {
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId, 'messages', editMessage.id), { 
        content: content.trim(), 
        editedAt: new Date().toISOString() 
      });
      setEditMessage(null);
      setIsSending(false);
      return;
    }

    const data: Partial<Message> = {
      chatId: currentChatId,
      senderId: user.uid,
      senderName: userProfile?.name || 'User',
      content: content.trim(),
      contentType: type as any,
      sentAt: new Date().toISOString(),
      isRead: false
    };

    if (replyTo) {
      data.replyToId = replyTo.id;
      data.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[${replyTo.contentType}]`;
      setReplyTo(null);
    }

    addDocumentNonBlocking(collection(db, 'chats', currentChatId, 'messages'), data);
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { [`typing.${user.uid}`]: false });
    
    lastMessageSentRef.current = now;
    setTimeout(() => {
      scrollToBottom('smooth');
      setIsSending(false);
    }, 100);
  }, [isBlocked, userProfile, currentChatId, user, db, editMessage, replyTo, scrollToBottom, isParticipant, toast]);

  const handleJoinChat = async () => {
    if (!db || !currentChatId || !user || isJoining) return;
    setIsJoining(true);
    try {
      await updateDocumentNonBlocking(doc(db, 'chats', currentChatId), {
        participantIds: arrayUnion(user.uid)
      });
      toast({ title: "Успех", description: "Вы вступили в чат!" });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  const handleUnpin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!db || !currentChatId) return;
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { pinnedMessageId: null });
    toast({ title: "Сообщение откреплено" });
  };

  const handleAISuggest = useCallback(async (currentInput: string) => {
    if (!messages || messages.length === 0) return null;
    setIsSuggesting(true);
    try {
      const history = messages.slice(-5).map(m => ({
        sender: m.senderName,
        message: m.contentType === 'text' ? m.content : `[${m.contentType}]`
      }));
      const { draftMessage } = await suggestMessageDraft({ conversationHistory: history, currentUserInput: currentInput });
      return draftMessage;
    } catch (e) {
      return null;
    } finally { setIsSuggesting(false); }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 10);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setPendingPhotos(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const chatDisplayName = formatDisplayName(otherUserProfile?.name || (otherId && chat?.metadata && chat.metadata[otherId] ? chat.metadata[otherId].name : chat?.name));

  if (!currentChatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
        <MessageSquare className="w-16 h-16 text-primary/20 mb-4" />
        <h2 className="text-xl font-bold opacity-60">Выберите чат</h2>
      </div>
    );
  }

  const customBackground = userProfile?.settings?.chatBackground;
  const bgStyle = customBackground && customBackground !== 'default' ? { backgroundImage: `url(${customBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {};

  return (
    <div className="flex-1 flex flex-col h-[100dvh] bg-background relative overflow-hidden">
      <header className="h-16 flex flex-col justify-center border-b border-border/40 bg-card/20 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center justify-between px-4 h-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCurrentChatId(null)}><ChevronLeft className="w-5 h-5" /></Button>
            
            {isSearchOpen ? (
              <div className="flex items-center gap-2 flex-1 animate-in fade-in slide-in-from-left-2">
                <Input 
                  autoFocus
                  placeholder="Поиск сообщений..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-muted/40 h-9 rounded-xl border-none focus:ring-1 focus:ring-primary text-base"
                />
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}><X className="w-5 h-5" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setIsChatInfoOpen(true)}>
                <UserAvatar userId={chat?.type === 'private' ? otherId : null} fallbackName={chatDisplayName} className="h-9 w-9 ring-2 ring-primary/20" />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm truncate">{chatDisplayName}</span>
                  <div className={cn("text-[10px] truncate leading-none mt-0.5", (statusString === 'печатает...' || isBlocked) ? 'text-accent font-bold' : 'text-muted-foreground')}>
                    {statusString === 'печатает...' ? (
                      <span className="flex items-center gap-0.5">печатает<span className="animate-typing-dot">.</span><span className="animate-typing-dot [animation-delay:0.2s]">.</span><span className="animate-typing-dot [animation-delay:0.4s]">.</span></span>
                    ) : statusString}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {!isSearchOpen && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)} className="rounded-full"><Search className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="rounded-full"><Info className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="w-5 h-5" /></Button>
            </div>
          )}
        </div>
      </header>

      {/* Pinned Message Bar */}
      {pinnedMessage && (
        <div 
          onClick={() => scrollToMessage(pinnedMessage.id)}
          className="h-11 bg-card/60 backdrop-blur-md border-b border-border/20 px-4 flex items-center justify-between cursor-pointer hover:bg-card/80 transition-all z-20 animate-in slide-in-from-top-full duration-300"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Pin className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-primary uppercase leading-tight">Закреплённое сообщение</span>
              <span className="text-[11px] text-foreground/80 truncate">
                {pinnedMessage.contentType === 'text' ? pinnedMessage.content : `[${pinnedMessage.contentType}]`}
              </span>
            </div>
          </div>
          {(chat?.ownerId === user?.uid || chat?.adminIds?.includes(user?.uid || '')) && (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted/40" onClick={handleUnpin}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}

      <div className="flex-1 relative z-10 overflow-hidden">
        {customBackground && customBackground !== 'default' && <div className="absolute inset-0 z-[-1]" style={bgStyle} />}
        <ScrollArea 
          ref={scrollRef} 
          className="h-full px-4 py-4" 
          onScroll={(e: any) => {
            const viewport = e.currentTarget;
            const isScrollTop = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > 300;
            setShowScrollDown(isScrollTop);
          }}
        >
          <div className="flex flex-col gap-2 max-w-4xl mx-auto pb-4">
            {filteredMessages.map(msg => (
              <MessageItem 
                key={msg.id} 
                message={msg} 
                isMe={msg.senderId === user?.uid} 
                chatId={currentChatId} 
                onReply={() => setReplyTo(msg)} 
                onEdit={() => setEditMessage(msg)} 
                size={userProfile?.settings?.messageSize} 
                isAdmin={chat?.ownerId === user?.uid || chat?.adminIds?.includes(user?.uid || '')}
              />
            ))}
            {isMessagesLoading && <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
          </div>
        </ScrollArea>
        {showScrollDown && (
          <Button 
            size="icon" 
            variant="secondary" 
            className="absolute bottom-4 right-4 rounded-full shadow-lg z-30 animate-in fade-in zoom-in duration-200" 
            onClick={() => scrollToBottom('smooth')}
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        )}
      </div>

      <footer className="p-3 bg-card/20 backdrop-blur-xl border-t border-border/40 z-20 shrink-0">
        <div className="flex flex-col gap-2 max-w-4xl mx-auto">
          {isBlocked || userProfile?.isBanned || !isParticipant ? (
            <div className="flex items-center justify-center h-14 bg-muted/20 rounded-xl border border-border/40 px-4">
              {userProfile?.isBanned ? (
                <div className="text-muted-foreground text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Аккаунт заблокирован
                </div>
              ) : !isParticipant ? (
                <Button 
                  className="w-full h-10 rounded-xl font-bold flex items-center gap-2"
                  onClick={handleJoinChat}
                  disabled={isJoining}
                >
                  {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {chat?.type === 'channel' ? 'Подписаться' : 'Вступить в группу'}
                </Button>
              ) : (
                <div className="text-muted-foreground text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Общение ограничено
                </div>
              )}
            </div>
          ) : (
            <>
              {pendingPhotos.length > 0 && (
                <div className="bg-card/90 backdrop-blur-md p-4 rounded-2xl mb-2 border border-primary/20 animate-in slide-in-from-bottom-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-primary flex items-center gap-2">Выбрано фото ({pendingPhotos.length})</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPendingPhotos([])}><X className="w-4 h-4" /></Button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button 
                      className="flex-1 h-9 font-bold" 
                      disabled={isSending}
                      onClick={() => { pendingPhotos.forEach(p => handleSendMessage(p, 'image')); setPendingPhotos([]); }}
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Отправить все'}
                    </Button>
                  </div>
                </div>
              )}
              <ChatInput 
                onSend={handleSendMessage}
                onTyping={handleTyping}
                isSuggesting={isSuggesting}
                onSuggest={handleAISuggest}
                onFileSelect={handleFileSelect}
                isBlocked={isBlocked}
                editMessage={editMessage}
                onCancelEdit={() => setEditMessage(null)}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                isSending={isSending}
              />
            </>
          )}
        </div>
      </footer>
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}
