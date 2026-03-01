
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, Loader2, Bookmark, X, Video, Wand2, Phone, Search as SearchIcon,
  Zap, Calendar as CalendarIcon, Paperclip, Mic, StopCircle, AtSign,
  Star, BarChart3, Video as VideoIcon, Camera
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { CreatePollModal } from './modals/create-poll-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, where, addDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { formatDisplayName, isUserPremium, isGlobalAdmin, cn } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useTranslations } from '@/hooks/use-translations';
import { differenceInSeconds, parseISO } from 'date-fns';

const MessageList = memo(({ 
  messages, 
  userId, 
  chatId, 
  onReply, 
  amIPremium, 
  isAdmin, 
  isGroup,
  onEdit
}: any) => {
  if (!messages) return null;
  const visibleMessages = messages.filter((m: Message) => {
    if (m.senderId === userId) return true;
    if (m.scheduledAt) return new Date(m.scheduledAt).getTime() <= Date.now();
    return true;
  });
  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto px-4 md:px-6 py-8 min-h-full">
      {visibleMessages.map((msg: Message) => (
        <MessageItem 
          key={msg.id} 
          message={msg} 
          isMe={msg.senderId === userId} 
          chatId={chatId} 
          onReply={onReply} 
          amIPremium={amIPremium}
          isAdmin={isAdmin}
          isGroup={isGroup}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
});
MessageList.displayName = 'MessageList';

const ChatHeaderSubInfo = memo(({ chat, participants, userId, t }: { chat: Chat, participants: UserType[] | null, userId: string | undefined, t: any }) => {
  const typingUsers = useMemo(() => {
    if (!chat?.typing || !userId) return [];
    return Object.entries(chat.typing)
      .filter(([uid, isTyping]) => isTyping && uid !== userId)
      .map(([uid]) => uid);
  }, [chat?.typing, userId]);

  const activeTypingUids = useMemo(() => {
    if (!participants || typingUsers.length === 0) return [];
    return typingUsers.filter(uid => {
      const p = participants.find(part => part.id === uid);
      if (!p?.lastSeen) return false;
      try {
        return Math.abs(differenceInSeconds(new Date(), parseISO(p.lastSeen))) < 20; 
      } catch (e) { return false; }
    });
  }, [participants, typingUsers]);

  if (activeTypingUids.length > 0 && participants) {
    const firstUid = activeTypingUids[0];
    const firstUser = participants.find(p => p.id === firstUid);
    const name = formatDisplayName(firstUser?.name || firstUser?.username || 'Кто-то');
    
    let text = "";
    if (activeTypingUids.length === 1) {
      text = `${name} ${t('chat.typing')}`;
    } else if (activeTypingUids.length === 2) {
      const secondUser = participants.find(p => p.id === activeTypingUids[1]);
      const name2 = formatDisplayName(secondUser?.name || secondUser?.username || 'Кто-то');
      text = `${name}, ${name2} печатают`;
    } else {
      text = `${name} и еще ${activeTypingUids.length - 1} печатают`;
    }

    return (
      <span className="text-[10px] text-accent tracking-wider truncate flex items-center gap-0.5 font-bold uppercase">
        {text}
        <span className="animate-typing-dot">.</span>
        <span className="animate-typing-dot [animation-delay:0.2s]">.</span>
        <span className="animate-typing-dot [animation-delay:0.4s]">.</span>
      </span>
    );
  }

  if (chat.type === 'group' || chat.type === 'channel') {
    return (
      <span className="text-[10px] text-muted-foreground/60 tracking-widest truncate uppercase font-bold">
        {chat.participantIds?.length || 0} участников
      </span>
    );
  }

  return (
    <span className="text-[10px] text-muted-foreground/60 tracking-widest truncate uppercase font-bold">
      Ядро Nuxus
    </span>
  );
});
ChatHeaderSubInfo.displayName = 'ChatHeaderSubInfo';

export default function ChatArea() {
  const { user: firebaseUser } = useUser();
  const db = useFirestore();
  const { t } = useTranslations();
  const { currentChatId, setCurrentChatId, setLocalDrafts, localDrafts, setActiveCallId } = useAppState();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  
  const [messageInput, setMessageInput] = useState('');
  const [pendingMedia, setPendingMedia] = useState<{ url: string, type: 'image' | 'video' }[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingLocal, setIsSearchingLocal] = useState(false);
  
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [expiryTime, setExpiryTime] = useState<number | null>(null);
  const [isOneTime, setIsOneTime] = useState(false);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  // Recording State
  const [recordingMode, setRecordingMode] = useState<'audio' | 'video'>('audio');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef<boolean>(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dataLoadedRef = useRef(false);
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);
  const amIPremium = useMemo(() => isUserPremium(userProfile), [userProfile]);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const participantsQuery = useMemoFirebase(() => {
    if (!db || !chat?.participantIds?.length) return null;
    return query(collection(db, 'users'), where('id', 'in', chat.participantIds.slice(0, 30)));
  }, [db, chat?.participantIds]);
  const { data: participants } = useCollection<UserType>(participantsQuery);

  const filteredParticipants = useMemo(() => {
    if (mentionQuery === null || !participants) return [];
    const q = mentionQuery.toLowerCase();
    return participants.filter(p => 
      p.id !== firebaseUser?.uid && 
      (p.username?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q))
    );
  }, [mentionQuery, participants, firebaseUser]);

  const isAdmin = useMemo(() => {
    return chat?.ownerId === firebaseUser?.uid || chat?.adminIds?.includes(firebaseUser?.uid || '') || isGlobalAdmin(userProfile);
  }, [chat, firebaseUser, userProfile]);

  const otherId = useMemo(() => {
    if (chat?.type === 'private' && firebaseUser) return chat.participantIds?.find((id: string) => id !== firebaseUser.uid);
    return null;
  }, [chat, firebaseUser]);

  const otherProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(otherProfileRef);

  const otherMetadata = useMemo(() => {
    if (otherId && chat?.metadata && chat.metadata[otherId]) return chat.metadata[otherId];
    return null;
  }, [otherId, chat]);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !currentChatId) return null;
    return query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc'));
  }, [db, currentChatId]);
  
  const { data: rawMessages } = useCollection<Message>(messagesQuery);

  const messages = useMemo(() => {
    if (!rawMessages) return null;
    if (!searchQuery.trim()) return rawMessages;
    return rawMessages.filter(m => m.contentType === 'text' && m.content.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [rawMessages, searchQuery]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    }
  }, []);

  const updateTypingStatus = useCallback((isTyping: boolean, targetChatId?: string) => {
    const cid = targetChatId || currentChatId;
    if (!db || !cid || !firebaseUser || (isTypingRef.current === isTyping && !targetChatId)) return;
    
    if (!targetChatId) isTypingRef.current = isTyping;
    const typingRef = doc(db, 'chats', cid);
    updateDoc(typingRef, { [`typing.${firebaseUser.uid}`]: isTyping }).catch(() => {});
  }, [db, currentChatId, firebaseUser]);

  useEffect(() => {
    const cid = currentChatId;
    return () => {
      if (cid) updateTypingStatus(false, cid);
    };
  }, [currentChatId, updateTypingStatus]);

  useEffect(() => {
    if (!messages || !firebaseUser || !currentChatId || !db) return;
    const unreadFromOthers = messages.filter(m => !m.isRead && m.senderId !== firebaseUser.uid);
    if (unreadFromOthers.length > 0) {
      unreadFromOthers.forEach(msg => {
        updateDocumentNonBlocking(doc(db, 'chats', currentChatId, 'messages', msg.id), { isRead: true });
      });
    }
  }, [messages, firebaseUser, currentChatId, db]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    }
  }, []);

  useEffect(() => {
    if (!currentChatId) return;
    if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    
    draftTimeoutRef.current = setTimeout(() => {
      if (mentionQuery !== null) return;
      
      if (localDrafts[currentChatId] !== messageInput) {
        setLocalDrafts((prev: Record<string, string>) => ({
          ...prev,
          [currentChatId]: messageInput
        }));
      }
    }, 1000);
    
    return () => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    };
  }, [messageInput, currentChatId, setLocalDrafts, localDrafts, mentionQuery]);

  const onInputChange = (val: string) => {
    setMessageInput(val);
    
    if (val.length > 0 && !isTypingRef.current) {
      updateTypingStatus(true);
    } else if (val.length === 0 && isTypingRef.current) {
      updateTypingStatus(false);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (val.length > 0) {
      typingTimeoutRef.current = setTimeout(() => updateTypingStatus(false), 5000);
    }
    
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const queryStr = textBeforeCursor.slice(lastAtSymbol + 1);
      if (!queryStr.includes(' ')) {
        setMentionQuery(queryStr);
        setMentionIndex(0);
      } else {
        setMentionQuery(null);
      }
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectMention = useCallback((targetUser: UserType) => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = messageInput.slice(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const beforeAt = messageInput.slice(0, lastAtSymbol);
      const afterCursor = messageInput.slice(cursorPosition);
      const newText = `${beforeAt}${targetUser.username} ${afterCursor}`;
      setMessageInput(newText);
      setMentionQuery(null);
      setTimeout(() => {
        if (inputRef.current) {
          const newPos = lastAtSymbol + targetUser.username.length + 1;
          inputRef.current.setSelectionRange(newPos, newPos);
          inputRef.current.focus();
        }
      }, 0);
    }
  }, [messageInput]);

  useEffect(() => {
    if (currentChatId) {
      setMessageInput(localDrafts[currentChatId] || '');
      setPendingMedia([]);
      isTypingRef.current = false;
      setMentionQuery(null);
      setReplyTo(null);
      setEditingMsg(null);
      dataLoadedRef.current = false;
    }
  }, [currentChatId, localDrafts]);

  useEffect(() => {
    if (messages?.length) {
      if (!dataLoadedRef.current) {
        setTimeout(() => scrollToBottom('instant' as any), 50);
        dataLoadedRef.current = true;
      } else {
        scrollToBottom('smooth');
      }
    }
  }, [messages?.length, currentChatId, scrollToBottom]);

  const handleSendMessage = useCallback(async (content_msg: string = messageInput, type_msg: Message['contentType'] = 'text') => {
    const trimmedContent = typeof content_msg === 'string' ? content_msg.trim() : content_msg;
    if ((!trimmedContent && pendingMedia.length === 0) || !currentChatId || !firebaseUser || !db) return;
    
    const captureContent = trimmedContent;
    const captureMedia = [...pendingMedia];
    const captureReply = replyTo;
    const captureEdit = editingMsg;
    const captureScheduled = scheduledDate;
    const captureExpiry = expiryTime;
    const captureOneTime = isOneTime;

    setMessageInput('');
    setPendingMedia([]);
    setReplyTo(null);
    setEditingMsg(null);
    setMentionQuery(null);
    setScheduledDate(undefined);
    setExpiryTime(null);
    setIsOneTime(false);
    updateTypingStatus(false);

    const senderDisplayName = userProfile?.name && userProfile.name !== 'User' 
      ? userProfile.name 
      : (userProfile?.username || firebaseUser.displayName || 'Nuxus User');

    if (captureEdit) {
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId, 'messages', captureEdit.id), {
        content: captureContent,
        editedAt: new Date().toISOString()
      });
      return;
    }

    if (captureMedia.length > 0) {
      const mediaMsg: Partial<Message> = {
        chatId: currentChatId,
        senderId: firebaseUser.uid,
        senderName: senderDisplayName,
        content: captureMedia.length === 1 ? captureMedia[0].url : JSON.stringify(captureMedia),
        contentType: captureMedia.length > 1 ? 'album' : captureMedia[0].type,
        sentAt: new Date().toISOString(),
        isRead: false,
        isOneTimeView: captureOneTime,
        expiresInSeconds: captureExpiry,
        scheduledAt: captureScheduled ? captureScheduled.toISOString() : null
      };
      addDocumentNonBlocking(collection(db, 'chats', currentChatId, 'messages'), mediaMsg);
    }

    if (captureContent && captureMedia.length === 0) {
      const isMentionAll = (isAdmin || isUserPremium(userProfile)) && typeof captureContent === 'string' && captureContent.includes('@all');
      
      const msgData: Partial<Message> = { 
        chatId: currentChatId, 
        senderId: firebaseUser.uid, 
        senderName: senderDisplayName, 
        content: captureContent, 
        contentType: type_msg, 
        sentAt: new Date().toISOString(), 
        isRead: false, 
        scheduledAt: captureScheduled ? captureScheduled.toISOString() : null,
        expiresInSeconds: captureExpiry,
        isOneTimeView: captureOneTime,
        isMentionAll: isMentionAll
      };
      if (captureReply) {
        msgData.replyToId = captureReply.id;
        msgData.replyToContent = captureReply.contentType === 'text' ? captureReply.content : `[${captureReply.contentType}]`;
      }
      addDocumentNonBlocking(collection(db, 'chats', currentChatId, 'messages'), msgData);
    }

    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString() });
  }, [messageInput, pendingMedia, currentChatId, firebaseUser, db, userProfile, replyTo, editingMsg, scheduledDate, expiryTime, isOneTime, updateTypingStatus, isAdmin]);

  const handleReply = useCallback((msg: Message) => {
    setReplyTo(msg);
    setEditingMsg(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleEdit = useCallback((msg: Message) => {
    setEditingMsg(msg);
    setMessageInput(msg.content);
    setReplyTo(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.slice(0, 10).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingMedia(prev => [...prev, {
          url: reader.result as string,
          type: file.type.startsWith('video') ? 'video' : 'image'
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingMedia = (index: number) => {
    setPendingMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!db || !firebaseUser || !otherId || !currentChatId) return;
    try {
      const callData = {
        callerId: firebaseUser.uid,
        receiverId: otherId,
        chatId: currentChatId,
        type,
        status: 'calling',
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'calls'), callData);
      setActiveCallId(docRef.id);
    } catch (e: any) {
      toast({ title: "Ошибка вызова", description: e.message, variant: "destructive" });
    }
  };

  // Improved Recording Logic with User Gesture requirement
  const startRecording = async () => {
    if (!navigator.mediaDevices) {
      toast({ variant: 'destructive', title: 'Ошибка безопасности', description: 'Ваш браузер блокирует доступ к камере (незащищенное соединение).' });
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: recordingMode === 'video' ? { 
          facingMode: 'user', 
          width: { ideal: 480 }, 
          height: { ideal: 480 },
          aspectRatio: { ideal: 1 }
        } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (recordingMode === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      const mimeType = recordingMode === 'video' 
        ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/webm')
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');

      const recorder = new MediaRecorder(stream, { mimeType });
      
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const type = recordingMode === 'video' ? 'video/webm' : 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          handleSendMessage(reader.result as string, recordingMode === 'video' ? 'video_note' : 'audio');
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Media error:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Доступ запрещен', 
        description: 'Пожалуйста, разрешите доступ к камере и микрофону в настройках браузера.' 
      });
    }
  };

  const stopRecording = (send: boolean = true) => {
    if (recorderRef.current && isRecording) {
      if (!send) chunksRef.current = [];
      recorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const toggleRecordingMode = () => {
    if (!isRecording) {
      setRecordingMode(prev => prev === 'audio' ? 'video' : 'audio');
    }
  };

  const chatDisplayName = useMemo(() => {
    const rawName = otherProfile?.name || otherMetadata?.name || chat?.name;
    if (rawName && rawName !== 'User' && rawName !== 'user') return rawName;
    return otherProfile?.username || otherMetadata?.username || chat?.username || rawName || '...';
  }, [chat, otherMetadata, otherProfile]);

  const headerAvatarUrl = useMemo(() => {
    if (otherId) return otherProfile?.avatarUrl || otherMetadata?.avatarUrl;
    return chat?.avatarUrl;
  }, [otherId, otherProfile, otherMetadata, chat]);

  if (!currentChatId) return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background relative overflow-hidden">
      <div className="bg-muted p-10 rounded-full mb-6 animate-float relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse-glow" />
        <Bookmark className="w-16 h-16 text-muted-foreground/30 relative z-10" />
      </div>
      <h2 className="text-xl font-bold text-muted-foreground uppercase tracking-[0.3em]">Выберите диалог Nuxus</h2>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden z-20">
      <header className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" className="md:hidden rounded-lg hover:bg-white/5" onClick={() => setCurrentChatId(null)}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          {isSearchingLocal ? (
            <div className="flex-1 flex items-center gap-2">
              <SearchIcon className="w-4 h-4 text-muted-foreground" />
              <Input autoFocus placeholder="Поиск сообщений..." className="bg-transparent border-none h-8 text-sm focus-visible:ring-0" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setIsSearchingLocal(false); setSearchQuery(''); }}><X className="w-4 h-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 cursor-pointer min-w-0 group" onClick={() => setIsChatInfoOpen(true)}>
              <UserAvatar userId={otherId} manualAvatarUrl={headerAvatarUrl} className="h-10 w-10" fallbackName={chatDisplayName} />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm truncate group-hover:text-primary transition-colors">{formatDisplayName(chatDisplayName)}</span>
                {chat && (
                  <ChatHeaderSubInfo 
                    chat={chat} 
                    participants={participants} 
                    userId={firebaseUser?.uid} 
                    t={t} 
                  />
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isSearchingLocal && <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => setIsSearchingLocal(true)}><SearchIcon className="w-5 h-5" /></Button>}
          {chat?.type === 'private' && (
            <>
              <Button variant="ghost" size="icon" className="rounded-lg text-primary" onClick={() => handleStartCall('audio')}><Phone className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" className="rounded-lg text-primary" onClick={() => handleStartCall('video')}><Video className="w-5 h-5" /></Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="rounded-lg"><Info className="w-5 h-5" /></Button>
        </div>
      </header>

      <ScrollArea ref={scrollRef} className="flex-1 w-full relative z-10 scrollbar-hide">
        {messages && (
          <MessageList 
            messages={messages} 
            userId={firebaseUser?.uid} 
            chatId={currentChatId} 
            onReply={handleReply} 
            onEdit={handleEdit} 
            amIPremium={amIPremium} 
            isAdmin={isAdmin}
            isGroup={chat?.type === 'group' || chat?.type === 'channel'}
          />
        )}
      </ScrollArea>

      <footer className="p-3 bg-card border-t border-white/5 shrink-0 relative">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Video Preview Bubble during recording */}
          {isRecording && recordingMode === 'video' && (
            <div className="absolute bottom-[120%] right-4 w-40 h-40 rounded-full border-4 border-primary shadow-2xl overflow-hidden bg-black z-50 animate-in zoom-in slide-in-from-bottom-4">
              <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-primary/10 animate-pulse pointer-events-none" />
            </div>
          )}

          {mentionQuery !== null && filteredParticipants.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mx-auto max-w-4xl px-3 pb-2 z-50">
              <div className="bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2">
                <div className="px-4 py-2 border-b border-white/5 bg-primary/5 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5"><AtSign className="w-3 h-3" /> Упомянуть участника</span>
                </div>
                <ScrollArea className="max-h-60">
                  <div className="p-1.5 space-y-1">
                    {filteredParticipants.map((p, idx) => (
                      <div 
                        key={p.id} 
                        onClick={() => handleSelectMention(p)}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border border-transparent hover:bg-primary/10",
                          mentionIndex === idx && "bg-primary/20 border-primary/20"
                        )}
                      >
                        <UserAvatar userId={p.id} className="h-8 w-8" manualAvatarUrl={p.avatarUrl} fallbackName={p.name} />
                        <div className="flex flex-col min-w-0 text-left">
                          <span className="font-bold text-sm truncate flex items-center gap-1.5">
                            {p.name} {isUserPremium(p) && <Star className="w-3 h-3 text-accent fill-accent" />}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono truncate">{p.username}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {isRecording && (
            <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-2xl border border-red-500/20 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-black text-red-500 uppercase tracking-widest">
                  Запись {recordingMode === 'video' ? 'кружка' : 'ГС'}: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold text-muted-foreground" onClick={() => stopRecording(false)}>Отмена</Button>
                <Button size="icon" className="h-9 w-9 rounded-xl bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20" onClick={() => stopRecording(true)}><StopCircle className="w-5 h-5" /></Button>
              </div>
            </div>
          )}
          
          {pendingMedia.length > 0 && (
            <div className="flex gap-2 p-2 bg-muted/40 rounded-2xl overflow-x-auto scrollbar-hide">
              {pendingMedia.map((media, idx) => (
                <div key={idx} className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-white/10">
                  {media.type === 'video' ? (
                    <video src={media.url} className="h-full w-full object-cover" />
                  ) : (
                    <img src={media.url} className="h-full w-full object-cover" />
                  )}
                  <button onClick={() => removePendingMedia(idx)} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 hover:bg-destructive"><X className="w-3 h-3 text-white" /></button>
                </div>
              ))}
            </div>
          )}
          {replyTo && (
            <div className="p-2 bg-muted/50 rounded-xl border-l-4 border-primary flex items-center justify-between">
              <div className="flex flex-col min-w-0 pl-2">
                <span className="text-[9px] font-bold text-primary uppercase tracking-widest">{t('chat.reply')}: {replyTo.senderName}</span>
                <span className="text-xs truncate text-muted-foreground italic">{replyTo.content}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></Button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input type="file" multiple accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl shrink-0 bg-muted" onClick={() => fileInputRef.current?.click()} disabled={isRecording}><Paperclip className="w-5 h-5 text-muted-foreground" /></Button>
            <Popover>
              <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl shrink-0 bg-muted" disabled={isRecording}><Zap className="w-5 h-5 text-primary" /></Button></PopoverTrigger>
              <PopoverContent className="w-64 p-3 rounded-2xl bg-card border-white/10 shadow-2xl space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2 text-[10px] font-bold uppercase" onClick={() => setIsPollModalOpen(true)}>
                    <BarChart3 className="w-4 h-4 text-accent" /> Опрос
                  </Button>
                  <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2 text-[10px] font-bold uppercase" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="w-4 h-4 text-primary" /> Файл
                  </Button>
                </div>
                <div className="space-y-2 pt-2 border-t border-white/5"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Отложенно</span><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start h-10 rounded-xl text-xs gap-2"><CalendarIcon className="w-4 h-4" /> {scheduledDate ? scheduledDate.toLocaleDateString() : 'Выбрать дату'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus /></PopoverContent></Popover></div>
                <div className="space-y-2"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Самоуничтожение</span><div className="grid grid-cols-3 gap-2">{[15, 60, 3600].map(time => (<Button key={time} variant={expiryTime === time ? 'default' : 'outline'} className="h-8 text-[10px] rounded-lg" onClick={() => setExpiryTime(time)}>{time < 60 ? `${time}с` : time < 3600 ? '1м' : '1ч'}</Button>))}</div></div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5"><span className="text-xs font-bold uppercase tracking-wider">Один просмотр</span><Button variant={isOneTime ? 'default' : 'outline'} size="sm" className="h-7 rounded-lg" onClick={() => setIsOneTime(!isOneTime)}>{isOneTime ? 'ВКЛ' : 'ВЫКЛ'}</Button></div>
              </PopoverContent>
            </Popover>
            <div className="flex-1 relative">
              <Input 
                ref={inputRef}
                placeholder={t('chat.placeholder')} 
                className="bg-muted border-none rounded-xl h-11 text-sm px-4 focus-visible:ring-1 focus-visible:ring-primary/20" 
                value={messageInput} 
                onChange={e => onInputChange(e.target.value)} 
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    if (mentionQuery !== null && filteredParticipants.length > 0) {
                      e.preventDefault();
                      handleSelectMention(filteredParticipants[mentionIndex]);
                    } else {
                      handleSendMessage();
                    }
                  }
                  if (mentionQuery !== null) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(prev => (prev + 1) % filteredParticipants.length); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(prev => (prev - 1 + filteredParticipants.length) % filteredParticipants.length); }
                    if (e.key === 'Escape') { setMentionQuery(null); }
                  }
                }}
                disabled={isRecording}
              />
              {amIPremium && !editingMsg && (<button onClick={async () => { setIsDrafting(true); const history = messages?.slice(-5).map(m => ({ sender: m.senderName, message: m.content })) || []; try { const { draftMessage } = await suggestMessageDraft({ conversationHistory: history, currentUserInput: messageInput }); setMessageInput(draftMessage); } catch(e){} finally { setIsDrafting(false); } }} disabled={isDrafting || isRecording} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:scale-110">{isDrafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}</button>)}
            </div>
            
            {(!messageInput.trim() && pendingMedia.length === 0 && !isRecording) ? (
              <div className="flex items-center gap-1.5">
                <Button 
                  size="icon" 
                  className={cn("h-11 w-11 rounded-xl shrink-0 transition-all", recordingMode === 'audio' ? "bg-primary" : "bg-accent text-accent-foreground")} 
                  onClick={startRecording}
                  onContextMenu={(e) => { e.preventDefault(); toggleRecordingMode(); }}
                >
                  {recordingMode === 'audio' ? <Mic className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-white"
                  onClick={toggleRecordingMode}
                  title="Переключить режим записи"
                >
                  {recordingMode === 'audio' ? <VideoIcon className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </Button>
              </div>
            ) : (
              !isRecording && (
                <Button size="icon" className="h-11 w-11 rounded-xl shrink-0 bg-primary" onClick={() => handleSendMessage()}>
                  <Send className="w-5 h-5" />
                </Button>
              )
            )}
          </div>
        </div>
      </footer>
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      <CreatePollModal open={isPollModalOpen} onOpenChange={setIsPollModalOpen} chatId={currentChatId} />
    </div>
  );
}
