
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, X, Paperclip, Mic, StopCircle, Edit2, Search,
  Smile, ImageIcon, Video, Trash2, Loader2, UserPlus, AtSign, ChevronDown, Wand2, Sparkles, Star, Timer, Clock, Palette, Video as VideoIcon, Circle
} from 'lucide-react';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { CreatePollModal } from './modals/create-poll-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, updateDoc, arrayUnion, where, getDocs, arrayRemove, limit } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { formatDisplayName, cn, compressImage, encryptSignal, isGlobalAdmin, decryptSignal, formatLastSeen, isUserPremium } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';
import { chatConversationSummary } from '@/ai/flows/chat-conversation-summary-flow';
import { generateAiImage } from '@/ai/flows/generate-ai-image-flow';
import { generateAiVideo } from '@/ai/flows/generate-ai-video-flow';
import { useTranslations } from '@/hooks/use-translations';
import { addMinutes, addHours } from 'date-fns';

const ChatInputBar = memo(({ onSendMessage, canPost, onPollOpen, currentChatId, isPremium, messages, userProfile }: any) => {
  const { localDrafts, setLocalDrafts } = useAppState();
  const [messageInput, setMessageInput] = useState(localDrafts[currentChatId] || '');
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [destructTimer, setDestructTimer] = useState<number | null>(null);
  
  // Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recorderMode, setRecorderMode] = useState<'audio' | 'video'>('audio');
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoGenInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    setMessageInput(localDrafts[currentChatId] || '');
  }, [currentChatId, localDrafts]);

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    setLocalDrafts(prev => ({ ...prev, [currentChatId]: val }));
    
    if (user && currentChatId && db) {
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId), {
        [`typing.${user.uid}`]: true
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        updateDocumentNonBlocking(doc(db, 'chats', currentChatId), {
          [`typing.${user.uid}`]: false
        });
      }, 3000);
    }
  };

  const handleSend = () => {
    if (!messageInput.trim()) return;
    onSendMessage(messageInput, 'text', destructTimer);
    setMessageInput('');
    setLocalDrafts(prev => ({ ...prev, [currentChatId]: '' }));
    setDestructTimer(null);
  };

  // Recording Logic
  const startRecording = async () => {
    try {
      const constraints = {
        audio: true,
        video: recorderMode === 'video' ? { facingMode: 'user', width: 400, height: 400 } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (recorderMode === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorderMode === 'video' ? 'video/mp4' : 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          onSendMessage(base64, recorderMode === 'video' ? 'video_note' : 'audio', destructTimer);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast({ title: "Доступ запрещен", description: "Проверьте разрешения камеры и микрофона", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      toast({ title: "Запись отменена" });
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!canPost) return null;

  return (
    <footer className="p-3 pb-6 bg-black/40 backdrop-blur-3xl border-t border-white/10 shrink-0 z-40 relative">
      {isRecording && recorderMode === 'video' && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full overflow-hidden border-4 border-primary shadow-2xl z-50 bg-black animate-in zoom-in duration-300">
          <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-2 relative">
        <div className="flex gap-3 items-center">
          {!isRecording ? (
            <>
              <Popover>
                <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-white/60 hover:text-primary"><Paperclip className="w-5 h-5" /></Button></PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-48 bg-[#1c1c1e]/95 backdrop-blur-3xl border-white/10 rounded-[1.8rem] p-1.5 mb-2 shadow-2xl">
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5" onClick={() => fileInputRef.current?.click()}><ImageIcon className="w-4 h-4 text-primary" /> Галерея</Button>
                  {isPremium && (
                    <>
                      <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5" onClick={async () => {
                        if (!messageInput.trim()) return;
                        setIsGeneratingImg(true);
                        try {
                          const { imageUrl } = await generateAiImage({ prompt: messageInput });
                          onSendMessage(imageUrl, 'image', destructTimer);
                          setMessageInput('');
                        } catch(e) { toast({title:"Error", variant:"destructive"}); }
                        finally { setIsGeneratingImg(false); }
                      }} disabled={isGeneratingImg}>
                        {isGeneratingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4 text-accent" />} ИИ Рисование
                      </Button>
                      <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5" onClick={() => videoGenInputRef.current?.click()} disabled={isGeneratingVideo}>
                        {isGeneratingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <VideoIcon className="w-4 h-4 text-purple-400" />} ИИ Видео
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5" onClick={onPollOpen}><AtSign className="w-4 h-4 text-blue-400" /> Опрос</Button>
                  <div className="h-px bg-white/5 mx-2 my-1" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className={cn("w-full justify-start gap-3 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest hover:bg-white/5", destructTimer ? "text-primary" : "text-white/80")}>
                        <Timer className="w-4 h-4" /> Исчезновение
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="end" className="w-40 bg-[#1c1c1e] border-white/10 rounded-2xl p-1 shadow-2xl">
                      <Button variant="ghost" onClick={() => setDestructTimer(null)} className="w-full justify-start text-[10px] font-bold uppercase h-10 rounded-xl">Выкл</Button>
                      <Button variant="ghost" onClick={() => setDestructTimer(1)} className="w-full justify-start text-[10px] font-bold uppercase h-10 rounded-xl">1 Минута</Button>
                      <Button variant="ghost" onClick={() => setDestructTimer(60)} className="w-full justify-start text-[10px] font-bold uppercase h-10 rounded-xl">1 Час</Button>
                      <Button variant="ghost" onClick={() => setDestructTimer(1440)} className="w-full justify-start text-[10px] font-bold uppercase h-10 rounded-xl">24 Часа</Button>
                    </PopoverContent>
                  </Popover>
                </PopoverContent>
              </Popover>
              
              <div className="flex-1 flex items-center bg-white/[0.08] rounded-full border border-white/[0.1] h-11 px-4 relative group transition-all focus-within:bg-white/[0.12] focus-within:border-primary/30">
                {destructTimer && <Timer className="w-4 h-4 text-primary mr-2 animate-pulse" />}
                <Input 
                  placeholder="Сообщение" 
                  className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-white/30 font-medium" 
                  value={messageInput} 
                  onChange={e => handleInputChange(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSend()} 
                />
                <Button variant="ghost" size="icon" className="text-white/40 hover:text-primary transition-colors"><Smile className="w-5 h-5" /></Button>
              </div>

              {messageInput.trim() ? (
                <Button size="icon" className="h-11 w-11 rounded-full bg-primary text-white shadow-xl shadow-primary/40 active:scale-90 transition-all" onClick={handleSend}>
                  <Send className="w-5 h-5" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    size="icon" 
                    variant="ghost"
                    className="h-11 w-11 rounded-full text-white/60 hover:text-primary transition-all active:scale-90"
                    onClick={() => setRecorderMode(recorderMode === 'audio' ? 'video' : 'audio')}
                  >
                    {recorderMode === 'audio' ? <VideoIcon className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>
                  <Button 
                    size="icon" 
                    className="h-11 w-11 rounded-full bg-primary text-white shadow-xl shadow-primary/40 active:scale-90 transition-all animate-in zoom-in duration-300"
                    onClick={startRecording}
                  >
                    {recorderMode === 'audio' ? <Mic className="w-5 h-5" /> : <Circle className="w-5 h-5 fill-current" />}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center bg-primary/10 border border-primary/20 rounded-full h-11 px-4 gap-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 text-primary animate-pulse">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest">{recorderMode === 'audio' ? 'REC' : 'LIVE'}</span>
              </div>
              <span className="text-sm font-mono font-bold text-white flex-1">{formatDuration(recordingDuration)}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="text-white/40 hover:text-destructive transition-colors" onClick={cancelRecording}>
                  <Trash2 className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-primary hover:scale-110 transition-transform" onClick={stopRecording}>
                  <StopCircle className="w-6 h-6 fill-current" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" />
      <input type="file" ref={videoGenInputRef} hidden accept="image/*" />
    </footer>
  );
});
ChatInputBar.displayName = 'ChatInputBar';

const MessageList = memo(({ 
  messages, userId, chatId, onReply, onPin, amIPremium, isAdmin, isGroup, onEdit, onForward, searchQuery, viewerProfile
}: any) => {
  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }, [messages]);
  
  const filteredMessages = useMemo(() => {
    if (!searchQuery) return sortedMessages;
    const q = searchQuery.toLowerCase();
    return sortedMessages.filter((m: Message) => {
      if (m.contentType !== 'text') return false;
      const text = decryptSignal(m.content)?.toLowerCase() || '';
      return text.includes(q);
    });
  }, [sortedMessages, searchQuery]);

  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto px-4 md:px-6 py-8 min-h-full touch-pan-y relative z-10 overflow-x-hidden bg-transparent">
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
          highlight={searchQuery && msg.contentType === 'text' && decryptSignal(msg.content)?.toLowerCase().includes(searchQuery.toLowerCase())} 
          viewerProfile={viewerProfile} 
        />
      ))}
    </div>
  );
});
MessageList.displayName = 'MessageList';

export default function ChatArea() {
  const { user: firebaseUser } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId, setForwardingMessage } = useAppState();
  const { t } = useTranslations();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const isKernelAdmin = useMemo(() => isGlobalAdmin(userProfile), [userProfile]);
  const isPremium = useMemo(() => isUserPremium(userProfile), [userProfile]);

  const otherId = useMemo(() => {
    if (chat?.type === 'private' && firebaseUser) {
      return chat.participantIds.find(id => id !== firebaseUser.uid);
    }
    return null;
  }, [chat, firebaseUser]);

  const otherProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(otherProfileRef);

  const messagesQuery = useMemoFirebase(() => (!db || !currentChatId) ? null : query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc')), [db, currentChatId]);
  const { data: messages } = useCollection<Message>(messagesQuery);

  const chatSubtext = useMemo(() => {
    if (chat?.type === 'private') {
      return formatLastSeen(otherProfile?.lastSeen, otherProfile?.settings?.privacy?.lastSeenVisibility, false, t('online'));
    }
    const count = chat?.participantIds?.length || 0;
    return `${count} участников`;
  }, [chat, otherProfile, t]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    scrollToBottom('auto');
  }, [currentChatId, scrollToBottom]);

  const handleSendMessage = useCallback(async (content_msg: string, type_msg: Message['contentType'] = 'text', minutes: number | null = null) => {
    if (!content_msg.trim() || !currentChatId || !firebaseUser || !db) return;
    
    let finalContent = (type_msg === 'text' || type_msg === 'reply') ? encryptSignal(content_msg) : content_msg;
    if (type_msg === 'image' && !content_msg.startsWith('data:')) finalContent = await compressImage(content_msg, 800, 0.4);

    const msgData: Partial<Message> = { 
      chatId: currentChatId, senderId: firebaseUser.uid, senderName: userProfile?.name || 'Nuxus User', 
      content: finalContent, contentType: type_msg, sentAt: new Date().toISOString(), isRead: false,
      metadata: {
        bubbleStyle: userProfile?.settings?.bubbleStyle || 'default'
      }
    };

    if (minutes) {
      msgData.selfDestructAt = addMinutes(new Date(), minutes).toISOString();
    }
    
    if (replyTo) { 
      msgData.replyToId = replyTo.id; 
      msgData.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[${replyTo.contentType}]`; 
      setReplyTo(null);
    }
    
    await addDoc(collection(db, 'chats', currentChatId, 'messages'), msgData);
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString(), lastSenderId: firebaseUser.uid });
    
    setTimeout(() => scrollToBottom('smooth'), 100);
  }, [currentChatId, firebaseUser, db, userProfile, replyTo, scrollToBottom]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    setShowScrollButton(distanceToBottom > 300);
  }, []);

  const handleSummary = async () => {
    if (!isPremium || !messages || messages.length < 5) {
      toast({ title: "Недостаточно данных", description: "Нужно хотя бы 5 сообщений для анализа." });
      return;
    }
    setIsSummarizing(true);
    try {
      const chatMessages = messages.slice(-20).map(m => ({
        senderName: m.senderName,
        text: m.contentType === 'text' ? decryptSignal(m.content) : `[${m.contentType}]`
      }));
      const { summary } = await chatConversationSummary({ chatMessages });
      toast({ title: "AI Summary", description: summary, duration: 10000 });
    } catch (e) {
      toast({ title: "Ошибка анализа", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

  const chatDisplayName = useMemo(() => {
    if (chat?.id === 'saved_messages') return 'Избранное';
    if (chat?.type === 'private') {
      const myMeta = chat.metadata?.[firebaseUser?.uid || ''];
      return myMeta?.customName || formatDisplayName(otherProfile?.name);
    }
    return formatDisplayName(chat?.name || 'Аккаунт');
  }, [chat, firebaseUser?.uid, otherProfile]);

  const customBg = userProfile?.settings?.chatBackground;
  const bgFit = userProfile?.settings?.chatBackgroundFit || 'cover';

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden z-20 max-w-full min-w-0">
      <div 
        className={cn("absolute inset-0 z-[-1] pointer-events-none transition-opacity duration-1000", (!customBg || customBg.trim() === '') && "chat-pattern-bg")}
        style={customBg && customBg.trim() !== '' ? { 
          backgroundImage: `url("${customBg}")`, 
          backgroundSize: bgFit, 
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 1
        } : {}}
      />

      <header className="h-16 border-b border-white/10 bg-black/40 backdrop-blur-3xl flex items-center justify-between px-4 shrink-0 z-30">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden rounded-lg text-white/80" onClick={() => setCurrentChatId(null)}><ChevronLeft /></Button>
          {!isSearchMode ? (
            <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setIsChatInfoOpen(true)}>
              <UserAvatar userId={otherId} manualAvatarUrl={chat?.avatarUrl || otherProfile?.avatarUrl} className="h-10 w-10 border border-white/20" fallbackName={chatDisplayName} showOnlineStatus />
              <div className="flex flex-col min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-[15px] truncate text-white italic tracking-tight">{chatDisplayName}</span>
                  {otherProfile?.isPremium && <Star className="w-3 h-3 text-accent fill-accent" />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/90 animate-pulse">
                  {chatSubtext}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 pr-4">
              <Search className="w-4 h-4 text-primary" />
              <Input placeholder="Поиск в чате..." className="bg-transparent border-none focus-visible:ring-0 text-sm h-8 text-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
              <button onClick={() => { setIsSearchMode(false); setSearchQuery(''); }}><X className="w-4 h-4 text-white/40" /></button>
            </div>
          )}
        </div>
        {!isSearchMode && (
          <div className="flex items-center gap-1">
            {isPremium && (
              <Button variant="ghost" size="icon" onClick={handleSummary} disabled={isSummarizing} className={cn("text-primary hover:text-white transition-colors", isSummarizing && "animate-spin")}>
                <Sparkles className="w-5 h-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsSearchMode(true)} className="text-white/60 hover:text-primary transition-colors"><Search className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="text-white/60 hover:text-primary transition-colors"><Info className="w-5 h-5" /></Button>
          </div>
        )}
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0 z-10 bg-transparent">
        <div ref={scrollContainerRef} className="flex-1 w-full relative z-10 overflow-y-auto scrollbar-hide scroll-smooth bg-transparent" onScroll={handleScroll}>
          <MessageList 
            messages={messages} userId={firebaseUser?.uid} chatId={currentChatId} 
            onReply={setReplyTo} onForward={setForwardingMessage} amIPremium={isPremium} 
            isAdmin={isKernelAdmin} isGroup={chat?.type !== 'private'} searchQuery={searchQuery} viewerProfile={userProfile} 
          />
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {showScrollButton && (
          <button 
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-6 right-6 h-12 w-12 rounded-full bg-black/40 backdrop-blur-[120px] border border-white/10 flex items-center justify-center text-primary shadow-2xl z-50 animate-in fade-in zoom-in hover:scale-110 active:scale-90 transition-all"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        )}
      </div>

      <ChatInputBar 
        onSendMessage={handleSendMessage} canPost={true} 
        onPollOpen={() => setIsPollModalOpen(true)} currentChatId={currentChatId}
        isPremium={isPremium} messages={messages} userProfile={userProfile}
      />

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      {currentChatId && <CreatePollModal open={isPollModalOpen} onOpenChange={setIsPollModalOpen} chatId={currentChatId} />}
    </div>
  );
}
