
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, X, Paperclip, Mic, StopCircle, ChevronDown, Edit2, Pin, Search, PinOff,
  Smile, Instagram, Camera, Video, Sticker, Copy, Share2, Sparkles, Loader2, RefreshCw, Zap, Trash2, Pause, Play
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { ImagePreviewModal } from './modals/image-preview-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, limit, updateDoc, writeBatch, arrayUnion, getDocs, where, setDoc, getDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { formatDisplayName, cn, formatLastSeen, compressImage } from '@/lib/utils';
import type { Message, User as UserType, Chat, StickerPack } from '@/lib/types';
import { EmojiPicker } from './emoji-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';

const MessageList = memo(({ 
  messages, 
  userId, 
  chatId, 
  onReply, 
  onPin,
  amIPremium, 
  isAdmin, 
  isGroup,
  onEdit,
  onForward,
  searchQuery
}: any) => {
  if (!messages) return null;
  
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => 
      new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );
  }, [messages]);

  const filteredMessages = searchQuery 
    ? sortedMessages.filter((m: Message) => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : sortedMessages;

  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto px-4 md:px-6 py-8 min-h-full">
      {filteredMessages.map((msg: Message) => (
        <MessageItem 
          key={msg.id} 
          message={msg} 
          isMe={msg.senderId === userId} 
          chatId={chatId} 
          onReply={onReply} 
          onPin={onPin}
          amIPremium={amIPremium}
          isAdmin={isAdmin}
          isGroup={isGroup}
          onEdit={onEdit}
          onForward={onForward}
          highlight={searchQuery && msg.content?.toLowerCase().includes(searchQuery.toLowerCase())}
        />
      ))}
    </div>
  );
});
MessageList.displayName = 'MessageList';

export default function ChatArea() {
  const { user: firebaseUser } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId, setForwardingMessage, localDrafts, setLocalDrafts } = useAppState();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isSendingFiles, setIsSendingFiles] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashOn, setFlashOn] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0); // in ms
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dataLoadedRef = useRef(false);
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const isPrivate = chat?.type === 'private';

  const pinnedMsgRef = useMemoFirebase(() => (!db || !currentChatId || !chat?.pinnedMessageId) ? null : doc(db, 'chats', currentChatId, 'messages', chat.pinnedMessageId), [db, currentChatId, chat?.pinnedMessageId]);
  const { data: pinnedMessage } = useDoc<Message>(pinnedMsgRef);

  const otherId = useMemo(() => {
    if (chat?.type === 'private' && firebaseUser) {
      return chat.participantIds.find(id => id !== firebaseUser.uid);
    }
    return null;
  }, [chat, firebaseUser]);

  const otherProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(otherProfileRef);

  const isAdmin = useMemo(() => {
    return chat?.ownerId === firebaseUser?.uid || chat?.adminIds?.includes(firebaseUser?.uid || '');
  }, [chat, firebaseUser]);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !currentChatId) return null;
    return query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc'));
  }, [db, currentChatId]);
  
  const { data: messages } = useCollection<Message>(messagesQuery);

  const currentPackIdRef = useRef<string | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    if (!db || !currentChatId || !firebaseUser || !messages) return;

    const markAsRead = async () => {
      const unreadMessages = messages.filter(m => !m.isRead && m.senderId !== firebaseUser.uid);
      if (unreadMessages.length === 0) return;

      const batch = writeBatch(db);
      unreadMessages.forEach(msg => {
        const mRef = doc(db, 'chats', currentChatId, 'messages', msg.id);
        batch.update(mRef, { isRead: true });
      });
      
      try {
        await batch.commit();
        // Also clear manual unread flag
        if (chat?.isManualUnread) {
          updateDoc(doc(db, 'chats', currentChatId), { isManualUnread: false });
        }
      } catch (e) {
        console.warn("Nuxus Read Receipt Sync: Retrying...");
      }
    };

    markAsRead();
  }, [messages, currentChatId, firebaseUser, db, chat?.isManualUnread]);

  useEffect(() => {
    if (currentChatId) {
      setMessageInput(localDrafts[currentChatId] || '');
    }
  }, [currentChatId, localDrafts]);

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    if (currentChatId) {
      setLocalDrafts(prev => ({ ...prev, [currentChatId]: val }));
    }
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 300;
        setShowScrollBottom(!isNearBottom);
      }
    }
  }, []);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.addEventListener('scroll', handleScroll);
      return () => viewport.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

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

  const handleBotLogic = async (content: string, type: Message['contentType']) => {
    if (chat?.username !== '@stickers' || !firebaseUser || !db) return false;

    const lower = content.toLowerCase();
    const botReply = (text: string) => {
      addDoc(collection(db, 'chats', currentChatId!, 'messages'), {
        chatId: currentChatId,
        senderId: 'bot_stickers',
        senderName: 'Sticker Bot 🎨',
        content: text,
        contentType: 'text',
        sentAt: new Date().toISOString()
      });
    };

    if (lower === '/newpack') {
      currentPackIdRef.current = 'pending_name';
      botReply("Отлично! Как назовем новый стикерпак?");
      return true;
    }

    if (currentPackIdRef.current === 'pending_name') {
      const packName = content.trim();
      const packId = `pack_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await setDoc(doc(db, 'stickerPacks', packId), {
        id: packId,
        ownerId: firebaseUser.uid,
        name: packName,
        iconUrl: null,
        stickerUrls: [],
        createdAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        installedStickerPackIds: arrayUnion(packId)
      });
      currentPackIdRef.current = packId;
      botReply(`Пак "${packName}" создан и активирован! Отправьте мне фото, чтобы добавить стикер в этот набор.`);
      return true;
    }

    if (lower.startsWith('/edit_')) {
      const targetId = content.replace('/edit_', '');
      currentPackIdRef.current = targetId;
      botReply(`Редактирование пака переключено. Присылайте фото для добавления стикеров.`);
      return true;
    }

    if (lower === '/packs' || lower === '/list') {
      const ids = userProfile?.installedStickerPackIds || [];
      if (ids.length === 0) {
        botReply("У вас пока нет созданных паков. Напишите /newpack для создания.");
      } else {
        let msg = "Ваши паки:\n\n";
        for (const id of ids) {
          const pSnap = await getDoc(doc(db, 'stickerPacks', id));
          if (pSnap.exists()) {
            const data = pSnap.data() as StickerPack;
            msg += `• ${data.name} (ID: ${id})\n/edit_${id}\n\n`;
          }
        }
        botReply(msg);
      }
      return true;
    }

    if (type === 'image' || content.startsWith('data:image')) {
      if (currentPackIdRef.current && currentPackIdRef.current !== 'pending_name') {
        const packRef = doc(db, 'stickerPacks', currentPackIdRef.current);
        await updateDoc(packRef, {
          stickerUrls: arrayUnion(content),
          iconUrl: content 
        });
        botReply("Стикер добавлен в активный пак! Он появится в вашей панели выбора (иконка улыбки -> Стикеры).");
      } else {
        botReply("Сначала создайте новый пак (/newpack) или выберите существующий (/packs).");
      }
      return true;
    }

    if (lower === '/share') {
      if (!currentPackIdRef.current || currentPackIdRef.current === 'pending_name') {
        const ids = userProfile?.installedStickerPackIds || [];
        if (ids.length === 0) {
          botReply("У вас нет паков, чтобы ими делиться.");
        } else {
          botReply("Выберите пак из списка /packs, чтобы получить на него ссылку.");
        }
      } else {
        const link = `${window.location.origin}/?stickers=${currentPackIdRef.current}`;
        botReply(`Вот ваша ссылка на текущий активный пак:\n\n${link}`);
      }
      return true;
    }

    return false;
  };

  const handleSendMessage = useCallback(async (content_msg: string = messageInput, type_msg: Message['contentType'] = 'text') => {
    if (!content_msg.trim() && type_msg !== 'audio' && type_msg !== 'video_note') return;
    if (!currentChatId || !firebaseUser || !db) return;
    
    let finalContent = content_msg;
    if (type_msg === 'image' && finalContent.startsWith('data:image')) {
      finalContent = await compressImage(finalContent);
    }

    const isBotIntercepted = await handleBotLogic(finalContent, type_msg);
    
    const captureContent = finalContent.trim();
    const captureReply = replyTo;
    const captureEdit = editingMsg;

    if (type_msg === 'text') {
      setMessageInput('');
      setLocalDrafts(prev => ({ ...prev, [currentChatId]: '' }));
    }
    setReplyTo(null); 
    setEditingMsg(null);
    setShowEmojiPicker(false);

    if (captureEdit) {
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId, 'messages', captureEdit.id), { 
        content: captureContent, 
        editedAt: new Date().toISOString() 
      });
      return;
    }

    const senderDisplayName = userProfile?.name && userProfile.name !== 'User' ? userProfile.name : (userProfile?.username || firebaseUser.displayName || 'Nuxus User');

    const msgData: Partial<Message> = { 
      chatId: currentChatId, 
      senderId: firebaseUser.uid, 
      senderName: senderDisplayName, 
      content: captureContent, 
      contentType: type_msg, 
      sentAt: new Date().toISOString(), 
      isRead: false 
    };
    
    if (captureReply) { 
      msgData.replyToId = captureReply.id; 
      msgData.replyToContent = captureReply.contentType === 'text' ? captureReply.content : `[${captureReply.contentType}]`; 
    }
    
    await addDoc(collection(db, 'chats', currentChatId, 'messages'), msgData);
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString(), isManualUnread: false });

  }, [messageInput, currentChatId, firebaseUser, db, userProfile, replyTo, editingMsg, setLocalDrafts, chat?.username]);

  const startRecording = async (type: 'audio' | 'video' = 'audio') => {
    try {
      const isVideo = type === 'video';
      const constraints = {
        audio: true,
        video: isVideo ? { facingMode: facingMode, width: { ideal: 720 }, height: { ideal: 720 } } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const mimeType = isVideo 
        ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm')
        : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm');

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder; 
      chunksRef.current = [];
      
      if (isVideo && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      recorder.ondataavailable = (e) => { 
        if (e.size > 0) chunksRef.current.push(e.data); 
      };

      recorder.onstop = async () => {
        if (chunksRef.current.length === 0) return;
        
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader(); 
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          if (reader.result) {
            handleSendMessage(reader.result as string, isVideo ? 'video_note' : 'audio');
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(100);
      if (isVideo) setIsRecordingVideo(true); else setIsRecording(true);
      setRecordingTime(0);
      const startTime = Date.now();
      recordingIntervalRef.current = setInterval(() => {
        if (!isPaused) {
          setRecordingTime(Date.now() - startTime);
        }
      }, 10);
    } catch (err: any) { 
      console.error("Recording error:", err);
      toast({ variant: 'destructive', title: 'Ошибка записи', description: 'Разрешите доступ к микрофону и камере.' }); 
    }
  };

  const stopRecording = (send: boolean = true) => {
    if (recorderRef.current && (isRecording || isRecordingVideo)) {
      if (!send) chunksRef.current = []; 
      recorderRef.current.stop(); 
      setIsRecording(false);
      setIsRecordingVideo(false);
      setIsPaused(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const togglePause = () => {
    if (recorderRef.current) {
      if (recorderRef.current.state === 'recording') {
        recorderRef.current.pause();
        setIsPaused(true);
      } else if (recorderRef.current.state === 'paused') {
        recorderRef.current.resume();
        setIsPaused(false);
      }
    }
  };

  const switchCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (isRecordingVideo) {
      toast({ title: "Камера переключена для следующей записи" });
    }
  };

  const formatRecordingTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(2, '0')}`;
  };

  const handleAiDraft = async () => {
    if (!messages || messages.length === 0 || isAiLoading) return;
    setIsAiLoading(true);
    try {
      const history = messages.slice(-5).map(m => ({
        sender: m.senderName,
        message: m.contentType === 'text' ? m.content : `[${m.contentType}]`
      }));
      const result = await suggestMessageDraft({
        conversationHistory: history,
        currentUserInput: messageInput
      });
      if (result.draftMessage) {
        handleInputChange(result.draftMessage);
        toast({ title: "ИИ предложил вариант", className: "bg-primary text-white" });
      }
    } catch (e) {
      toast({ title: "Ошибка ИИ", variant: "destructive" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePin = async (msg: Message) => {
    if (!db || !currentChatId) return;
    await updateDoc(doc(db, 'chats', currentChatId), { pinnedMessageId: msg.id });
    toast({ title: "Закреплено" });
  };

  const handleUnpin = async () => {
    if (!db || !currentChatId) return;
    await updateDoc(doc(db, 'chats', currentChatId), { pinnedMessageId: null });
    toast({ title: "Откреплено" });
  };

  const chatDisplayName = useMemo(() => {
    const rawName = otherProfile?.name || chat?.name;
    if (rawName && rawName !== 'User') return rawName;
    return otherProfile?.username || chat?.username || '...';
  }, [chat, otherProfile]);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      const processFiles = async () => {
        const newFiles = await Promise.all(files.map(async (f) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ 
              url: reader.result as string, 
              type: f.type.startsWith('video') ? 'video' : 'image' 
            });
            reader.readAsDataURL(f);
          });
        }));
        setSelectedFiles(newFiles as any);
        setIsPreviewModalOpen(true);
      };
      processFiles();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden z-20">
      {userProfile?.settings?.chatBackground && (
        <div 
          className="fixed inset-0 z-0 pointer-events-none" 
          style={{ 
            backgroundImage: `url(${userProfile.settings.chatBackground})`, 
            backgroundSize: userProfile.settings.chatBackgroundFit === 'contain' ? 'contain' : 'cover', 
            backgroundPosition: 'center', 
            backgroundRepeat: 'no-repeat', 
            backgroundColor: '#0a0a0c',
            transform: 'translateZ(0)' 
          }} 
        />
      )}

      {/* Video Note Professional Overlay */}
      {isRecordingVideo && (
        <div className="fixed inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative w-full max-w-[320px] aspect-square mb-12">
            <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="48"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeDasharray="301.59"
                strokeDashoffset={301.59 - (301.59 * (recordingTime / 60000))}
                strokeLinecap="round"
                className="transition-all duration-100 ease-linear opacity-80"
              />
            </svg>
            
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black">
              <video 
                ref={videoPreviewRef} 
                autoPlay 
                muted 
                playsInline 
                className={cn("w-full h-full object-cover", facingMode === 'user' && "scale-x-[-1]")} 
              />
            </div>
          </div>

          <div className="w-full max-w-sm px-8 flex flex-col items-center gap-8">
            <div className="flex items-center gap-6">
              <button 
                onClick={switchCamera}
                className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center text-white active:scale-90 transition-transform"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setFlashOn(!flashOn)}
                className={cn("w-14 h-14 rounded-full backdrop-blur-xl flex items-center justify-center text-white active:scale-90 transition-transform", flashOn ? "bg-primary" : "bg-white/10")}
              >
                <Zap className={cn("w-6 h-6", flashOn && "fill-current")} />
              </button>
              <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white font-mono font-bold tracking-wider">{formatRecordingTime(recordingTime)}</span>
              </div>
            </div>

            <div className="w-full flex items-center justify-between mt-12">
              <button onClick={() => stopRecording(false)} className="w-12 h-12 rounded-full flex items-center justify-center text-red-500 active:scale-90 transition-transform">
                <Trash2 className="w-7 h-7" />
              </button>
              
              <button 
                onClick={togglePause}
                className="w-16 h-16 rounded-full border-4 border-[#007AFF] flex items-center justify-center text-[#007AFF] active:scale-95 transition-transform"
              >
                {isPaused ? <Play className="w-8 h-8 fill-current ml-1" /> : <Pause className="w-8 h-8 fill-current" />}
              </button>

              <button 
                onClick={() => stopRecording(true)}
                className="w-14 h-14 rounded-full bg-[#007AFF] flex items-center justify-center text-white shadow-xl shadow-[#007AFF]/20 active:scale-90 transition-transform"
              >
                <Send className="w-7 h-7 fill-current" />
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-card/80 backdrop-blur-xl shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" className="md:hidden rounded-lg" onClick={() => setCurrentChatId(null)}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="flex items-center gap-3 cursor-pointer min-w-0 group" onClick={() => setIsChatInfoOpen(true)}>
            <UserAvatar userId={otherId} manualAvatarUrl={chat?.avatarUrl || otherProfile?.avatarUrl} className="h-10 w-10" fallbackName={chatDisplayName} showOnlineStatus />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm truncate group-hover:text-primary transition-colors">{formatDisplayName(chatDisplayName)}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground/60 tracking-widest truncate uppercase font-bold">
                  {chat?.username === '@stickers' ? 'STICKER PACK ENGINE' : (isPrivate ? formatLastSeen(otherProfile?.lastSeen, otherProfile?.settings?.privacy?.lastSeenVisibility) : 'NUXUS 2.0')}
                </span>
                {!isOnline && <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsSearchMode(!isSearchMode)} className={cn(isSearchMode && "text-primary")}><Search className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)}><Info className="w-5 h-5" /></Button>
        </div>
      </header>

      {isSearchMode && (
        <div className="p-2 bg-card/90 backdrop-blur-xl border-b border-white/5 flex gap-2 animate-in slide-in-from-top duration-200 z-30">
          <Input 
            placeholder="Поиск по переписке..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="bg-white/5 border-none h-10 text-sm"
            autoFocus
          />
          <Button variant="ghost" size="icon" onClick={() => { setIsSearchMode(false); setSearchQuery(''); }}><X className="w-4 h-4" /></Button>
        </div>
      )}

      {pinnedMessage && (
        <div className="px-4 py-2 bg-primary/5 backdrop-blur-xl border-b border-primary/10 flex items-center justify-between group/pin z-20 cursor-pointer hover:bg-primary/10 transition-all" onClick={() => {
          const el = document.getElementById(`msg-${pinnedMessage.id}`);
          el?.scrollIntoView({ behavior: 'smooth' });
        }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-1 h-8 bg-primary rounded-full" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1"><Pin className="w-3 h-3 fill-current" /> Закреп</span>
              <span className="text-xs truncate text-white/80 italic">{pinnedMessage.content}</span>
            </div>
          </div>
          {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover/pin:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleUnpin(); }}><PinOff className="w-4 h-4" /></Button>}
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        <ScrollArea ref={scrollRef} className="h-full w-full relative z-10 scrollbar-hide bg-transparent" onClick={() => setShowEmojiPicker(false)}>
          {messages && (
            <MessageList 
              messages={messages} 
              userId={firebaseUser?.uid} 
              chatId={currentChatId} 
              onReply={setReplyTo} 
              onEdit={setEditingMsg} 
              onPin={handlePin}
              onForward={(m: any) => { setForwardingMessage(m); }}
              amIPremium={userProfile?.isPremium} 
              isAdmin={isAdmin} 
              isGroup={chat?.type === 'group'} 
              searchQuery={searchQuery}
            />
          )}
        </ScrollArea>
        {showScrollBottom && <Button onClick={() => scrollToBottom('smooth')} className="absolute bottom-4 right-4 h-10 w-10 rounded-full bg-card/80 backdrop-blur-xl border border-white/10 shadow-2xl z-30 group animate-in fade-in zoom-in" size="icon"><ChevronDown className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" /></Button>}
      </div>

      <footer className="p-3 pb-6 bg-[#0a0a0c]/90 backdrop-blur-2xl border-t border-white/5 shrink-0 relative z-30">
        <div className="max-w-4xl mx-auto space-y-2">
          {isRecording && (
            <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-2xl border border-red-500/20 animate-in slide-in-from-bottom-2 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-black text-red-500 uppercase tracking-widest">
                  Запись ГС: {formatRecordingTime(recordingTime).split(',')[0]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold text-muted-foreground" onClick={() => stopRecording(false)}>Отмена</Button>
                <Button size="icon" className="h-9 w-9 rounded-xl bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20" onClick={() => stopRecording(true)}>
                  <StopCircle className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
          
          {editingMsg && (
            <div className="p-2 bg-primary/5 rounded-xl border-l-4 border-primary flex items-center justify-between animate-in slide-in-from-bottom-1">
              <div className="flex flex-col min-w-0 pl-2">
                <span className="text-[9px] font-bold text-primary uppercase tracking-widest flex items-center gap-1"><Edit2 className="w-3 h-3" /> Редактирование</span>
                <span className="text-xs truncate text-muted-foreground italic">{editingMsg.content}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => { setEditingMsg(null); setMessageInput(''); }}><X className="w-4 h-4" /></Button>
            </div>
          )}

          {replyTo && (
            <div className="p-2 bg-muted/50 rounded-xl border-l-4 border-accent flex items-center justify-between animate-in slide-in-from-bottom-1">
              <div className="flex flex-col min-w-0 pl-2"><span className="text-[9px] font-bold text-accent uppercase tracking-widest">Ответ: {replyTo.senderName}</span><span className="text-xs truncate text-muted-foreground italic">{replyTo.content}</span></div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></Button>
            </div>
          )}

          <div className="flex gap-3 items-center">
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-white/40 hover:text-white transition-colors" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="w-6 h-6" />
            </Button>
            <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" multiple onChange={handleFilesSelected} />
            
            <div className="flex-1 flex items-center bg-white/[0.03] rounded-[1.5rem] border border-white/[0.05] h-11 px-4 relative">
              <Input 
                ref={inputRef} 
                placeholder="Сообщение" 
                className="bg-transparent border-none rounded-none h-full text-[16px] p-0 focus-visible:ring-0 placeholder:text-white/20" 
                value={messageInput} 
                onChange={e => handleInputChange(e.target.value)} 
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { handleSendMessage(); } }} 
                disabled={isRecording || isRecordingVideo} 
              />
              
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <button className={cn("shrink-0 text-white/20 hover:text-white transition-colors ml-2", showEmojiPicker && "text-primary")}>
                    <Smile className="w-6 h-6" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-[320px] h-[450px] p-0 border-none bg-transparent shadow-none mb-4">
                  <EmojiPicker 
                    onEmojiSelect={(e) => setMessageInput(prev => prev + e)} 
                    onStickerSelect={(url) => { handleSendMessage(url, 'sticker'); setShowEmojiPicker(false); }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              {!messageInput.trim() && !isRecording && !isRecordingVideo ? (
                <>
                  <button 
                    className={cn("text-white/40 hover:text-primary transition-colors", isAiLoading && "animate-spin text-primary")} 
                    onClick={handleAiDraft}
                    disabled={isAiLoading}
                  >
                    {isAiLoading ? <Loader2 className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                  </button>
                  <button className="text-white/40 hover:text-white transition-colors" onClick={() => startRecording('video')}>
                    <Camera className="w-7 h-7" />
                  </button>
                  <button className="text-white/40 hover:text-white transition-colors" onClick={() => startRecording('audio')}>
                    <Mic className="w-7 h-7" />
                  </button>
                </>
              ) : (
                !(isRecording || isRecordingVideo) && (
                  <Button size="icon" className="h-10 w-10 rounded-full bg-primary shadow-lg shadow-primary/20" onClick={() => handleSendMessage()}>
                    <Send className="w-5 h-5" />
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </footer>
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      <ImagePreviewModal 
        open={isPreviewModalOpen} 
        onOpenChange={setIsPreviewModalOpen} 
        files={selectedFiles} 
        onRemove={(i) => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} 
        onSend={async () => { 
          setIsSendingFiles(true); 
          for (const file of selectedFiles) {
            await handleSendMessage(file.url, file.type);
          }
          setSelectedFiles([]); 
          setIsPreviewModalOpen(false); 
          setIsSendingFiles(false); 
        }} 
        isSending={isSendingFiles} 
      />
    </div>
  );
}
