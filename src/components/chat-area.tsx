
"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Paperclip, Sparkles, MessageSquare, Info, Mic, Camera, X, UserPlus,
  CornerUpLeft, Loader2, ShieldAlert, Trash, Check, MoreVertical, ChevronLeft, ChevronDown,
  Images, Plus
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

interface ChatAreaProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export default function ChatArea({ toggleSidebar, isSidebarOpen }: ChatAreaProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId } = useAppState();
  const [inputText, setInputText] = useState('');
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [statusString, setStatusString] = useState<string>('');

  // Multi-photo state
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isCancelledRef = useRef(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: userProfile } = useDoc<User>(userProfileRef);

  const chatRef = useMemoFirebase(() => {
    if (!db || !currentChatId) return null;
    return doc(db, 'chats', currentChatId);
  }, [db, currentChatId]);
  const { data: chat, isLoading: isChatLoading } = useDoc(chatRef);

  const isParticipant = useMemo(() => {
    if (!chat || !user) return false;
    return chat.participantIds?.includes(user.uid) || false;
  }, [chat, user]);

  const otherId = chat?.type === 'private' && user ? chat.participantIds?.find((id: string = '') => id !== user.uid) : null;
  const otherUserRef = useMemoFirebase(() => {
    if (!db || !otherId) return null;
    return doc(db, 'users', otherId);
  }, [db, otherId]);
  const { data: otherUserProfile, isLoading: isOtherProfileLoading } = useDoc<User>(otherUserRef);

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

  useEffect(() => {
    if (isRecordingVideo && activeStream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = activeStream;
    }
  }, [isRecordingVideo, activeStream]);

  useEffect(() => {
    if (!currentChatId || !user || !isParticipant || !db || isBlocked) return;
    
    if (inputText.length > 0) {
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId), {
        [`typing.${user.uid}`]: true
      });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        updateDocumentNonBlocking(doc(db, 'chats', currentChatId), {
          [`typing.${user.uid}`]: false
        });
      }, 3000);
    } else {
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId), {
        [`typing.${user.uid}`]: false
      });
    }
  }, [inputText, currentChatId, user, db, isParticipant, isBlocked]);

  useEffect(() => {
    const isTyping = chat?.typing && otherId && chat.typing[otherId];
    if (isBlockedByMe) {
      setStatusString('Пользователь заблокирован');
    } else if (isBlockedByThem) {
      setStatusString('Вы заблокированы');
    } else if (isTyping) {
      setStatusString('печатает...');
    } else if (isOtherProfileLoading) {
      setStatusString('загрузка...');
    } else if (chat?.type === 'private') {
      setStatusString(formatLastSeen(otherUserProfile?.lastSeen, otherUserProfile?.settings?.privacy?.lastSeenVisibility));
    } else {
      setStatusString(chat?.type === 'group' ? 'Группа' : 'Канал');
    }
  }, [isOtherProfileLoading, otherUserProfile?.lastSeen, otherUserProfile?.settings?.privacy?.lastSeenVisibility, chat?.type, chat?.typing, otherId, isBlockedByMe, isBlockedByThem]);

  useEffect(() => {
    if (messages && user && currentChatId && chat && isParticipant && db) {
      const unread = messages.filter(msg => !msg.isRead && msg.senderId !== user.uid);
      unread.forEach(msg => {
        const msgRef = doc(db, 'chats', currentChatId, 'messages', msg.id);
        updateDocumentNonBlocking(msgRef, { isRead: true });
      });
    }
  }, [messages, user, currentChatId, isParticipant, db, chat]);

  useEffect(() => {
    if (scrollRef.current && !showScrollDown) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isUp = target.scrollHeight - target.scrollTop - target.clientHeight > 300;
    setShowScrollDown(isUp);
  };

  const handleSendMessage = (content: string = inputText, type: string = 'text') => {
    if (isBlocked || userProfile?.isBanned) {
      toast({ title: "Ошибка", description: "Вы не можете отправлять сообщения", variant: "destructive" });
      return;
    }
    const text = content.trim();
    if (!text && type === 'text') return;
    if (!currentChatId || !user || !isParticipant || !db) return;
    
    if (editMessage && type === 'text') {
      const ref = doc(db, 'chats', currentChatId, 'messages', editMessage.id);
      updateDocumentNonBlocking(ref, { content: text, editedAt: new Date().toISOString() });
      setEditMessage(null);
      setInputText('');
      return;
    }

    const data: Partial<Message> = {
      chatId: currentChatId,
      senderId: user.uid,
      senderName: userProfile?.name || 'User',
      content: text,
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
    if (type === 'text') setInputText('');
    setTimeout(scrollToBottom, 100);
  };

  const handleSendPhotos = () => {
    if (pendingPhotos.length === 0) return;
    pendingPhotos.forEach(photo => {
      handleSendMessage(photo, 'image');
    });
    setPendingPhotos([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 10);
    if (files.length === 0) return;
    
    const readers = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(results => {
      setPendingPhotos(results);
    });
  };

  const handleAISuggest = async () => {
    if (!messages || messages.length === 0) return;
    setIsSuggesting(true);
    try {
      const history = messages.slice(-5).map(m => ({
        sender: m.senderName,
        message: m.contentType === 'text' ? m.content : `[${m.contentType}]`
      }));
      const { draftMessage } = await suggestMessageDraft({ conversationHistory: history, currentUserInput: inputText });
      setInputText(draftMessage);
    } catch (e) {
      toast({ title: "Ошибка AI", variant: "destructive" });
    } finally { setIsSuggesting(false); }
  };

  const stopAllTracks = (stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setActiveStream(null);
  };

  const startVideoRecording = async () => {
    if (isBlocked || userProfile?.isBanned) return;
    isCancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { 
          width: 400, 
          height: 400, 
          facingMode: 'user' 
        } 
      });
      
      setActiveStream(stream);
      setIsRecordingVideo(true);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        if (!isCancelledRef.current && audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: 'video/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            handleSendMessage(reader.result as string, 'video');
          };
          reader.readAsDataURL(blob);
        }
        stopAllTracks(stream);
      };

      mediaRecorder.start();
    } catch (e) {
      console.error(e);
      toast({ title: "Нет доступа к камере", variant: "destructive" });
    }
  };

  const finishVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVideo(false);
  };

  const cancelVideoRecording = () => {
    isCancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVideo(false);
    toast({ title: "Запись отменена" });
  };

  const startAudioRecording = async () => {
    if (isBlocked || userProfile?.isBanned) return;
    isCancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setActiveStream(stream);
      setIsRecordingAudio(true);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        if (!isCancelledRef.current && audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            handleSendMessage(reader.result as string, 'audio');
          };
          reader.readAsDataURL(blob);
        }
        stopAllTracks(stream);
      };
      
      mediaRecorder.start();
    } catch (e) { 
      toast({ title: "Нет доступа к микрофону", variant: "destructive" }); 
    }
  };

  const finishAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingAudio(false);
  };

  const cancelAudioRecording = () => {
    isCancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingAudio(false);
    toast({ title: "Запись отменена" });
  };

  const chatDisplayName = otherId && chat?.metadata && chat.metadata[otherId] ? chat.metadata[otherId].name : chat?.name;

  if (!currentChatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
        <MessageSquare className="w-16 h-16 text-primary/20 mb-4" />
        <h2 className="text-xl font-bold opacity-60">Выберите чат</h2>
      </div>
    );
  }

  const customBackground = userProfile?.settings?.chatBackground;
  const bgStyle = customBackground && customBackground !== 'default' 
    ? { backgroundImage: `url(${customBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' } 
    : {};

  return (
    <div className="flex-1 flex flex-col h-[100dvh] bg-background relative overflow-hidden">
      <header className="h-16 flex items-center justify-between px-4 border-b border-border/40 bg-card/20 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCurrentChatId(null)} aria-label="Вернуться назад">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setIsChatInfoOpen(true)}>
            <UserAvatar userId={chat?.type === 'private' ? otherId : null} fallbackName={chatDisplayName} className="h-9 w-9 ring-2 ring-primary/20" />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">{chatDisplayName}</span>
              <span className={cn("text-[10px] truncate", (statusString === 'печатает...' || isBlocked) ? 'text-accent font-bold' : 'text-muted-foreground')}>{statusString}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" onClick={() => setIsChatInfoOpen(true)} aria-label="Информация о чате"><Info className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" aria-label="Дополнительно"><MoreVertical className="w-5 h-5" /></Button>
        </div>
      </header>

      <div className="flex-1 relative z-10 overflow-hidden">
        {customBackground && customBackground !== 'default' && (
          <div className="absolute inset-0 z-[-1] brightness-100" style={bgStyle} />
        )}
        <ScrollArea 
          ref={scrollRef} 
          className="h-full px-4 py-4"
          onScroll={handleScroll as any}
        >
          {!isParticipant && !isChatLoading && chat ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <UserPlus className="w-12 h-12 text-primary" />
              <p className="text-muted-foreground">Вы не в чате</p>
              <Button onClick={() => updateDocumentNonBlocking(chatRef!, { participantIds: arrayUnion(user?.uid) })}>Вступить</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-w-4xl mx-auto pb-4">
              {messages?.map(msg => (
                <MessageItem key={msg.id} message={msg} isMe={msg.senderId === user?.uid} chatId={currentChatId} onReply={() => setReplyTo(msg)} onEdit={() => { setEditMessage(msg); setInputText(msg.content); }} size={userProfile?.settings?.messageSize} />
              ))}
              {isMessagesLoading && (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        
        {showScrollDown && (
          <Button 
            size="icon" 
            variant="secondary" 
            className="absolute bottom-4 right-4 rounded-full shadow-lg z-30 animate-in fade-in zoom-in"
            onClick={scrollToBottom}
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        )}
      </div>

      <footer className="p-3 bg-card/20 backdrop-blur-xl border-t border-border/40 z-20 shrink-0">
        {isParticipant ? (
          <div className="flex flex-col gap-2 max-w-4xl mx-auto">
            {isBlocked || userProfile?.isBanned ? (
              <div className="flex items-center justify-center h-12 bg-muted/20 rounded-xl border border-border/40 text-muted-foreground text-xs font-semibold gap-2">
                <ShieldAlert className="w-4 h-4" />
                {userProfile?.isBanned ? "Ваш аккаунт заблокирован" : (isBlockedByMe ? "Вы заблокировали пользователя" : "Вы заблокированы этим пользователем")}
              </div>
            ) : (
              <>
                {pendingPhotos.length > 0 && (
                  <div className="bg-card/90 backdrop-blur-md p-4 rounded-2xl mb-2 border border-primary/20 animate-in slide-in-from-bottom-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-primary flex items-center gap-2">
                        <Images className="w-4 h-4" />
                        Выбрано фото ({pendingPhotos.length}/10)
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setPendingPhotos([])}><X className="w-4 h-4" /></Button>
                    </div>
                    <ScrollArea className="w-full whitespace-nowrap pb-2">
                      <div className="flex gap-2">
                        {pendingPhotos.map((photo, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-border/20">
                            <Image src={photo} alt={`Preview ${i}`} fill className="object-cover" />
                            <button 
                              onClick={() => setPendingPhotos(pendingPhotos.filter((_, idx) => idx !== i))}
                              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 hover:bg-black"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="mt-3 flex gap-2">
                      <Button className="flex-1 h-9 rounded-xl font-bold" onClick={handleSendPhotos}>Отправить все</Button>
                      <Button variant="outline" className="h-9 rounded-xl" onClick={() => fileInputRef.current?.click()}><Plus className="w-4 h-4 mr-1" /> Добавить</Button>
                    </div>
                  </div>
                )}
                {isRecordingVideo && (
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full overflow-hidden border-4 border-primary shadow-2xl z-50 bg-black">
                    <video 
                      ref={videoPreviewRef} 
                      autoPlay 
                      muted 
                      playsInline 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute top-4 left-0 right-0 flex justify-center">
                       <div className="bg-red-500 w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_red]" />
                    </div>
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-4 px-4">
                       <Button variant="destructive" size="icon" className="rounded-full h-10 w-10 shadow-lg" onClick={cancelVideoRecording} aria-label="Отменить видео">
                          <Trash className="w-5 h-5" />
                       </Button>
                       <Button variant="default" size="icon" className="bg-primary hover:bg-primary/90 rounded-full h-10 w-10 shadow-lg" onClick={finishVideoRecording} aria-label="Отправить видео">
                          <Check className="w-5 h-5" />
                       </Button>
                    </div>
                  </div>
                )}
                {isRecordingAudio && (
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-card/90 backdrop-blur-xl border border-primary/20 px-6 py-3 rounded-full shadow-2xl z-50 animate-in slide-in-from-bottom-5">
                    <div className="flex items-center gap-2 text-primary">
                       <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                       <span className="text-sm font-bold">Идет запись...</span>
                    </div>
                    <div className="flex gap-2">
                       <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={cancelAudioRecording} aria-label="Отменить аудио">
                          <Trash className="w-4 h-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="text-primary hover:text-primary h-8 w-8" onClick={finishAudioRecording} aria-label="Отправить аудио">
                          <Check className="w-4 h-4" />
                       </Button>
                    </div>
                  </div>
                )}
                {replyTo && (
                  <div className="flex items-center justify-between bg-muted/40 p-2 rounded-xl border-l-4 border-primary mb-2">
                    <div className="flex items-center gap-3 truncate">
                      <CornerUpLeft className="w-4 h-4 text-primary" />
                      <span className="text-xs truncate italic">{replyTo.content}</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setReplyTo(null)} className="h-6 w-6" aria-label="Отменить ответ"><X className="w-4 h-4" /></Button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex items-center gap-1 mb-1">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileSelect} />
                    <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} aria-label="Прикрепить файл"><Paperclip className="w-5 h-5" /></Button>
                    <Button variant="ghost" size="icon" onClick={handleAISuggest} disabled={isSuggesting} aria-label="AI черновик"><Sparkles className={cn("w-5 h-5 text-accent", isSuggesting && "animate-spin")} /></Button>
                  </div>
                  <div className="flex-1 relative">
                    <Input placeholder={editMessage ? "Изменить..." : "Сообщение..."} value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="bg-muted/40 rounded-2xl h-11 pr-12 focus:ring-1 focus:ring-primary" aria-label="Поле ввода сообщения" />
                    <Button size="icon" className={cn("absolute right-1 top-1 w-9 h-9 rounded-xl transition-all", (inputText.trim()) ? 'scale-100' : 'scale-0')} onClick={() => handleSendMessage()} aria-label="Отправить"><Send className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex gap-1 mb-1">
                    <Button variant="ghost" size="icon" onClick={isRecordingVideo ? finishVideoRecording : startVideoRecording} className={cn(isRecordingVideo && "text-primary animate-pulse")} aria-label="Записать видео"><Camera className="w-5 h-5" /></Button>
                    <Button variant="ghost" size="icon" onClick={isRecordingAudio ? finishAudioRecording : startAudioRecording} className={cn(isRecordingAudio && "text-primary animate-pulse")} aria-label="Записать аудио"><Mic className="w-5 h-5" /></Button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex justify-center max-w-4xl mx-auto">
             {chat && <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => updateDocumentNonBlocking(chatRef!, { participantIds: arrayUnion(user?.uid) })}>Вступить в обсуждение</Button>}
          </div>
        )}
      </footer>
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}
