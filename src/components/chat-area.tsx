
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Paperclip, Sparkles, MessageSquare, Info, Mic, Camera, X, 
  CornerUpLeft, Loader2, ShieldAlert, Trash, Check, MoreVertical, ChevronLeft, ChevronDown,
  Images
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, arrayUnion } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';
import { cn } from '@/lib/utils';
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
  onCancelReply
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
      <div className="flex items-end gap-2">
        <div className="flex items-center gap-1 mb-1">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={onFileSelect} />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}><Paperclip className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={handleSuggest} disabled={isSuggesting}><Sparkles className={cn("w-5 h-5 text-accent", isSuggesting && "animate-spin")} /></Button>
        </div>
        <div className="flex-1 relative">
          <Input 
            placeholder={editMessage ? "Изменить..." : "Сообщение..."} 
            value={text} 
            onChange={handleChange}
            onKeyDown={e => e.key === 'Enter' && handleSend()} 
            className="bg-muted/40 rounded-2xl h-11 pr-12 focus:ring-1 focus:ring-primary border-none" 
          />
          <Button 
            size="icon" 
            className={cn("absolute right-1 top-1 w-9 h-9 rounded-xl transition-all duration-200", text.trim() ? 'scale-100 opacity-100' : 'scale-0 opacity-0')} 
            onClick={handleSend}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-1 mb-1">
          <Button variant="ghost" size="icon" onClick={onStartVideo}><Camera className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={onStartAudio}><Mic className="w-5 h-5" /></Button>
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
  
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [statusString, setStatusString] = useState<string>('');
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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
  
  const { data: messages, isLoading: isMessagesLoading } = useCollection<Message>(messagesQuery);

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
    return () => {
      if (currentChatId && user && db) {
        const chatDocRef = doc(db, 'chats', currentChatId);
        updateDocumentNonBlocking(chatDocRef, { [`typing.${user.uid}`]: false });
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [currentChatId, user, db]);

  useEffect(() => {
    const isTyping = chat?.typing && otherId && chat.typing[otherId];
    if (isBlockedByMe) setStatusString('Пользователь заблокирован');
    else if (isBlockedByThem) setStatusString('Вы заблокированы');
    else if (isTyping) setStatusString('печатает...');
    else if (isOtherProfileLoading) setStatusString('загрузка...');
    else if (chat?.type === 'private') setStatusString(formatLastSeen(otherUserProfile?.lastSeen, otherUserProfile?.settings?.privacy?.lastSeenVisibility));
    else setStatusString(chat?.type === 'group' ? 'Группа' : 'Канал');
  }, [isOtherProfileLoading, otherUserProfile?.lastSeen, otherUserProfile?.settings?.privacy?.lastSeenVisibility, chat?.type, chat?.typing, otherId, isBlockedByMe, isBlockedByThem]);

  useEffect(() => {
    if (messages && user && currentChatId && chat && isParticipant && db) {
      const unread = messages.filter(msg => !msg.isRead && msg.senderId !== user.uid);
      unread.forEach(msg => {
        updateDocumentNonBlocking(doc(db, 'chats', currentChatId, 'messages', msg.id), { isRead: true });
      });
    }
  }, [messages, user, currentChatId, isParticipant, db, chat]);

  useEffect(() => {
    if (scrollRef.current && !showScrollDown) scrollToBottom();
  }, [messages]);

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

    if (replyTo) {
      data.replyToId = replyTo.id;
      data.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[${replyTo.contentType}]`;
      setReplyTo(null);
    }

    addDocumentNonBlocking(collection(db, 'chats', currentChatId, 'messages'), data);
    
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { [`typing.${user.uid}`]: false });
    
    setTimeout(scrollToBottom, 50);
  }, [isBlocked, userProfile, currentChatId, user, isParticipant, db, editMessage, replyTo, scrollToBottom]);

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
      toast({ title: "Ошибка AI", variant: "destructive" });
      return null;
    } finally { setIsSuggesting(false); }
  }, [messages, toast]);

  const startVideoRecording = async () => {
    if (isBlocked || userProfile?.isBanned) return;
    isCancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 400, height: 400, facingMode: 'user' } });
      setActiveStream(stream);
      setIsRecordingVideo(true);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        if (!isCancelledRef.current && audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: 'video/webm' });
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 10);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setPendingPhotos(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  // Приоритет имени из актуального профиля (для отображения "Удаленный аккаунт")
  const chatDisplayName = otherUserProfile?.name || (otherId && chat?.metadata && chat.metadata[otherId] ? chat.metadata[otherId].name : chat?.name);

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
          <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)}><Info className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
        </div>
      </header>

      <div className="flex-1 relative z-10 overflow-hidden">
        {customBackground && customBackground !== 'default' && <div className="absolute inset-0 z-[-1]" style={bgStyle} />}
        <ScrollArea ref={scrollRef} className="h-full px-4 py-4" onScroll={(e: any) => setShowScrollDown(e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight > 300)}>
          <div className="flex flex-col gap-2 max-w-4xl mx-auto pb-4">
            {messages?.map(msg => (
              <MessageItem key={msg.id} message={msg} isMe={msg.senderId === user?.uid} chatId={currentChatId} onReply={() => setReplyTo(msg)} onEdit={() => setEditMessage(msg)} size={userProfile?.settings?.messageSize} />
            ))}
            {isMessagesLoading && <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
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
                  onStartAudio={() => {}} 
                  isBlocked={isBlocked}
                  isBanned={userProfile?.isBanned}
                  editMessage={editMessage}
                  onCancelEdit={() => setEditMessage(null)}
                  replyTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
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
