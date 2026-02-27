"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Paperclip, Sparkles, MessageSquare, Info, Mic, Camera, X, 
  CornerUpLeft, Loader2, ShieldAlert, Trash, Check, MoreVertical, ChevronLeft, ChevronDown,
  Images, Pin, Search as SearchIcon, Forward
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, arrayUnion } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';
import { cn, formatDisplayName } from '@/lib/utils';
import { formatLastSeen } from '@/lib/utils';
import type { Message, User } from '@/lib/types';
import Image from 'next/image';

const ChatInput = React.memo(({ 
  onSend, 
  onTyping, 
  isSuggesting, 
  onSuggest, 
  onFileSelect, 
  onStartVideo, 
  onStartAudio, 
  isBlocked, 
  isBanned,
  editMessage,
  onCancelEdit,
  replyTo,
  onCancelReply,
  forwardingMessage,
  onCancelForward,
  isRecordingAudio
}: any) => {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editMessage) setText(editMessage.content);
    else setText('');
  }, [editMessage]);

  const handleSend = () => {
    if (!text.trim()) return;
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
      {forwardingMessage && (
        <div className="flex items-center justify-between bg-accent/10 p-2 rounded-xl border-l-4 border-accent mb-1 animate-in slide-in-from-bottom-1">
          <div className="flex items-center gap-3 truncate">
            <Forward className="w-4 h-4 text-accent" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-accent uppercase">Переслать сообщение</span>
              <span className="text-xs truncate italic">{forwardingMessage.content}</span>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onCancelForward} className="h-6 w-6"><X className="w-4 h-4" /></Button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex items-center gap-1 mb-1">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={onFileSelect} />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}><Paperclip className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={handleSuggest} disabled={isSuggesting}><Sparkles className={cn("w-5 h-5 text-accent", isSuggesting && "animate-spin")} /></Button>
        </div>
        <div className="flex-1 relative">
          {isRecordingAudio ? (
            <div className="flex items-center justify-between bg-accent/20 h-11 rounded-2xl px-4 border border-accent/40 animate-pulse">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                 <span className="text-xs font-bold text-accent">ЗАПИСЬ...</span>
               </div>
               <span className="text-xs font-mono">00:00</span>
            </div>
          ) : (
            <Input 
              placeholder={editMessage ? "Изменить..." : "Сообщение..."} 
              value={text} 
              onChange={handleChange}
              onKeyDown={e => e.key === 'Enter' && handleSend()} 
              className="bg-muted/40 rounded-2xl h-11 pr-12 focus:ring-1 focus:ring-primary border-none" 
            />
          )}
          <Button 
            size="icon" 
            className={cn("absolute right-1 top-1 w-9 h-9 rounded-xl transition-all duration-200", (text.trim() || forwardingMessage) ? 'scale-100 opacity-100' : 'scale-0 opacity-0')} 
            onClick={handleSend}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-1 mb-1">
          <Button variant="ghost" size="icon" onClick={onStartVideo}><Camera className="w-5 h-5" /></Button>
          <Button 
            variant={isRecordingAudio ? "default" : "ghost"} 
            size="icon" 
            onClick={onStartAudio}
            className={isRecordingAudio ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" : ""}
          >
            <Mic className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';

export default function ChatArea({ toggleSidebar, isSidebarOpen }: any) {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId, forwardingMessage, setForwardingMessage } = useAppState();
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [statusString, setStatusString] = useState<string>('');
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isCancelledRef = useRef(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingSignalRef = useRef<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: userProfile } = useDoc<User>(userProfileRef);

  const isAdmin = userProfile?.phone === '+79513332147' || user?.email === '79513332147@nuxus.chat';

  const chatRef = useMemoFirebase(() => {
    if (!db || !currentChatId) return null;
    return doc(db, 'chats', currentChatId);
  }, [db, currentChatId]);
  const { data: chat, isLoading: isChatLoading } = useDoc(chatRef);

  const pinnedMessageRef = useMemoFirebase(() => {
    if (!db || !currentChatId || !chat?.pinnedMessageId) return null;
    return doc(db, 'chats', currentChatId, 'messages', chat.pinnedMessageId);
  }, [db, currentChatId, chat?.pinnedMessageId]);
  const { data: pinnedMessage } = useDoc<Message>(pinnedMessageRef);

  const isParticipant = useMemo(() => {
    if (!chat || !user) return false;
    if (isAdmin) return true;
    return chat.participantIds?.includes(user.uid) || false;
  }, [chat, user, isAdmin]);

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
  const { data: otherUserProfile, isLoading: isOtherProfileLoading } = useDoc<User>(otherUserProfileRef);

  const isBlockedByMe = userProfile?.blockedUserIds?.includes(otherId || '');
  const isBlockedByThem = otherUserProfile?.blockedUserIds?.includes(user?.uid || '');
  const isBlocked = isBlockedByMe || isBlockedByThem;

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !currentChatId || !isParticipant) return null;
    return query(
      collection(db, 'chats', currentChatId, 'messages'),
      orderBy('sentAt', 'asc')
    );
  }, [db, currentChatId, isParticipant]);
  
  const { data: allMessages, isLoading: isMessagesLoading } = useCollection<Message>(messagesQuery);

  const messages = useMemo(() => {
    if (!searchQuery.trim()) return allMessages;
    return allMessages?.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allMessages, searchQuery]);

  const handleTyping = useCallback((isTyping: boolean) => {
    if (!currentChatId || !user || !isParticipant || !db || isBlocked) return;
    
    const now = Date.now();
    const chatDocRef = doc(db, 'chats', currentChatId);

    if (isTyping) {
      if (now - lastTypingSignalRef.current > 3000) {
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
  }, [currentChatId, user, db, isParticipant, isBlocked]);

  useEffect(() => {
    const isTyping = chat?.typing && otherId && chat.typing[otherId];
    const isOtherDeleted = otherUserProfile?.isBanned || otherUserProfile?.name?.includes('Удалённый Аккаунт');

    if (isBlockedByMe) setStatusString('Пользователь заблокирован');
    else if (isBlockedByThem) setStatusString('Вы заблокированы');
    else if (isTyping && !isOtherDeleted) setStatusString('печатает...');
    else if (isOtherProfileLoading) setStatusString('загрузка...');
    else if (chat?.type === 'private') setStatusString(formatLastSeen(otherUserProfile?.lastSeen, otherUserProfile?.settings?.privacy?.lastSeenVisibility, isOtherDeleted));
    else setStatusString(chat?.type === 'group' ? 'Группа' : 'Канал');
  }, [isOtherProfileLoading, otherUserProfile, chat?.type, chat?.typing, otherId, isBlockedByMe, isBlockedByThem]);

  useEffect(() => {
    if (allMessages && user && currentChatId && chat && isParticipant && db) {
      const unread = allMessages.filter(msg => !msg.isRead && msg.senderId !== user.uid);
      unread.forEach(msg => {
        updateDocumentNonBlocking(doc(db, 'chats', currentChatId, 'messages', msg.id), { isRead: true });
      });
    }
  }, [allMessages, user, currentChatId, isParticipant, db, chat]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'auto' });
      }
    }
  }, []);

  const handleSendMessage = useCallback((content: string, type: string = 'text') => {
    if (isBlocked || userProfile?.isBanned) return;
    if (!content.trim() && type === 'text') return;
    if (!currentChatId || !user || !isParticipant || !db) return;
    
    if (editMessage && type === 'text') {
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId, 'messages', editMessage.id), { 
        content: content.trim(), 
        editedAt: new Date().toISOString() 
      });
      setEditMessage(null);
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

    if (forwardingMessage) {
      data.content = forwardingMessage.content;
      data.contentType = forwardingMessage.contentType;
      data.senderName = `${userProfile?.name} (переслано от ${forwardingMessage.senderName})`;
      setForwardingMessage(null);
    }

    if (replyTo) {
      data.replyToId = replyTo.id;
      data.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[${replyTo.contentType}]`;
      setReplyTo(null);
    }

    addDocumentNonBlocking(collection(db, 'chats', currentChatId, 'messages'), data);
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { [`typing.${user.uid}`]: false });
    setTimeout(scrollToBottom, 50);
  }, [isBlocked, userProfile, currentChatId, user, isParticipant, db, editMessage, replyTo, forwardingMessage, scrollToBottom]);

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const startAudioRecording = async () => {
    if (isBlocked || userProfile?.isBanned) return;
    if (isRecordingAudio) {
       mediaRecorderRef.current?.stop();
       setIsRecordingAudio(false);
       return;
    }
    isCancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setActiveStream(stream);
      setIsRecordingAudio(true);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        if (!isCancelledRef.current && chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => handleSendMessage(reader.result as string, 'audio');
          reader.readAsDataURL(blob);
        }
        stream.getTracks().forEach(t => t.stop());
        setActiveStream(null);
      };
      mediaRecorder.start();
    } catch (e) { toast({ title: "Ошибка микрофона", variant: "destructive" }); }
  };

  const startVideoRecording = async () => {
    if (isBlocked || userProfile?.isBanned) return;
    isCancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 400, height: 400, facingMode: 'user' } });
      setActiveStream(stream);
      setIsRecordingVideo(true);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        if (!isCancelledRef.current && chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const reader = new FileReader();
          reader.onloadend = () => handleSendMessage(reader.result as string, 'video');
          reader.readAsDataURL(blob);
        }
        stream.getTracks().forEach(t => t.stop());
        setActiveStream(null);
      };
      mediaRecorder.start();
    } catch (e) { toast({ title: "Ошибка камеры", variant: "destructive" }); }
  };

  const handleAISuggest = useCallback(async (currentInput: string) => {
    if (!allMessages || allMessages.length === 0) return null;
    setIsSuggesting(true);
    try {
      const history = allMessages.slice(-5).map(m => ({
        sender: m.senderName,
        message: m.contentType === 'text' ? m.content : `[${m.contentType}]`
      }));
      const { draftMessage } = await suggestMessageDraft({ conversationHistory: history, currentUserInput: currentInput });
      return draftMessage;
    } catch (e) {
      toast({ title: "Ошибка AI", variant: "destructive" });
      return null;
    } finally { setIsSuggesting(false); }
  }, [allMessages, toast]);

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
      <header className="h-16 flex items-center justify-between px-4 border-b border-border/40 bg-card/20 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCurrentChatId(null)}><ChevronLeft className="w-5 h-5" /></Button>
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
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(!isSearchOpen)} className={isSearchOpen ? "text-primary bg-primary/10" : ""}><SearchIcon className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)}><Info className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
        </div>
      </header>

      {isSearchOpen && (
        <div className="bg-card/40 backdrop-blur-md px-4 py-2 border-b border-border/40 flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <Input 
            autoFocus
            placeholder="Поиск сообщений..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9 bg-muted/30 border-none rounded-xl"
          />
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}><X className="w-4 h-4" /></Button>
        </div>
      )}

      {chat?.pinnedMessageId && pinnedMessage && (
        <div 
          className="bg-primary/10 backdrop-blur-md px-4 py-2 border-b border-primary/20 flex items-center gap-3 cursor-pointer hover:bg-primary/15 transition-colors z-10 shrink-0"
          onClick={() => scrollToMessage(pinnedMessage.id)}
        >
          <Pin className="w-3 h-3 text-primary rotate-45 shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Закреплённое сообщение</span>
            <span className="text-xs truncate text-muted-foreground italic">
              {pinnedMessage.contentType === 'text' ? pinnedMessage.content : `[${pinnedMessage.contentType}]`}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={(e) => { e.stopPropagation(); updateDocumentNonBlocking(chatRef!, { pinnedMessageId: null }); }}><X className="w-3 h-3" /></Button>
        </div>
      )}

      <div className="flex-1 relative z-10 overflow-hidden">
        {customBackground && customBackground !== 'default' && <div className="absolute inset-0 z-[-1]" style={bgStyle} />}
        <ScrollArea ref={scrollRef} className="h-full px-4 py-4" onScroll={(e: any) => setShowScrollDown(e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight > 300)}>
          <div className="flex flex-col gap-2 max-w-4xl mx-auto pb-4">
            {messages?.map(msg => (
              <MessageItem key={msg.id} message={msg} isMe={msg.senderId === user?.uid} chatId={currentChatId} onReply={() => setReplyTo(msg)} onEdit={() => setEditMessage(msg)} size={userProfile?.settings?.messageSize} />
            ))}
            {isMessagesLoading && <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
            {messages?.length === 0 && searchQuery && <div className="text-center p-8 text-muted-foreground italic text-sm">Ничего не найдено</div>}
          </div>
        </ScrollArea>
        {showScrollDown && <Button size="icon" variant="secondary" className="absolute bottom-4 right-4 rounded-full shadow-lg z-30" onClick={scrollToBottom}><ChevronDown className="w-5 h-5" /></Button>}
      </div>

      <footer className="p-3 bg-card/20 backdrop-blur-xl border-t border-border/40 z-20 shrink-0">
        {isParticipant ? (
          <div className="flex flex-col gap-2 max-w-4xl mx-auto">
            {isBlocked || userProfile?.isBanned ? (
              <div className="flex items-center justify-center h-12 bg-muted/20 rounded-xl border border-border/40 text-muted-foreground text-xs font-semibold gap-2">
                <ShieldAlert className="w-4 h-4" />
                {userProfile?.isBanned ? "Аккаунт заблокирован" : "Общение ограничено"}
              </div>
            ) : (
              <>
                {pendingPhotos.length > 0 && (
                  <div className="bg-card/90 backdrop-blur-md p-4 rounded-2xl mb-2 border border-primary/20 animate-in slide-in-from-bottom-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-primary flex items-center gap-2"><Images className="w-4 h-4" />Выбрано фото ({pendingPhotos.length}/10)</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPendingPhotos([])}><X className="w-4 h-4" /></Button>
                    </div>
                    <ScrollArea className="w-full whitespace-nowrap pb-2">
                      <div className="flex gap-2">
                        {pendingPhotos.map((photo, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                            <Image src={photo} alt="P" fill className="object-cover" />
                            <button onClick={() => setPendingPhotos(pendingPhotos.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-black/60 p-0.5"><X className="w-3 h-3 text-white" /></button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="mt-3 flex gap-2">
                      <Button className="flex-1 h-9 font-bold" onClick={() => { pendingPhotos.forEach(p => handleSendMessage(p, 'image')); setPendingPhotos([]); }}>Отправить все</Button>
                    </div>
                  </div>
                )}
                {isRecordingVideo && (
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full overflow-hidden border-4 border-primary z-50 bg-black">
                    <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-4 px-4">
                       <Button variant="destructive" size="icon" className="rounded-full" onClick={() => { isCancelledRef.current = true; setIsRecordingVideo(false); mediaRecorderRef.current?.stop(); }}><Trash className="w-5 h-5" /></Button>
                       <Button variant="default" size="icon" className="bg-primary rounded-full" onClick={() => { setIsRecordingVideo(false); mediaRecorderRef.current?.stop(); }}><Check className="w-5 h-5" /></Button>
                    </div>
                  </div>
                )}
                <ChatInput 
                  onSend={handleSendMessage}
                  onTyping={handleTyping}
                  isSuggesting={isSuggesting}
                  onSuggest={handleAISuggest}
                  onFileSelect={handleFileSelect}
                  onStartVideo={startVideoRecording}
                  onStartAudio={startAudioRecording} 
                  isBlocked={isBlocked}
                  isBanned={userProfile?.isBanned}
                  editMessage={editMessage}
                  onCancelEdit={() => setEditMessage(null)}
                  replyTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
                  forwardingMessage={forwardingMessage}
                  onCancelForward={() => setForwardingMessage(null)}
                  isRecordingAudio={isRecordingAudio}
                />
              </>
            )}
          </div>
        ) : (
          <div className="flex justify-center max-w-4xl mx-auto">
             {chat && <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => updateDocumentNonBlocking(chatRef!, { participantIds: arrayUnion(user?.uid) })}>Вступить</Button>}
          </div>
        )}
      </footer>
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}
