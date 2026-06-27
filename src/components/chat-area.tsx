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

  const startRecording = async () => {
    try {
      const constraints = {
        audio: true,
        video: recorderMode === 'video' ? { facingMode: 'user', width: 480, height: 480 } : false
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
      toast({ title: "Signal Access Error", description: "Camera or Microphone permission denied", variant: "destructive" });
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
      toast({ title: "Recording Terminated" });
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!canPost) return null;

  return (
    <footer className="p-4 pb-8 obsidian-glass border-t border-white/5 shrink-0 z-40 relative">
      {isRecording && recorderMode === 'video' && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full overflow-hidden border-4 border-primary shadow-[0_0_50px_rgba(168,85,247,0.5)] z-50 bg-black animate-in zoom-in duration-300">
          <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
          <div className="absolute inset-0 border-[10px] border-black/40 rounded-full pointer-events-none" />
        </div>
      )}

      <div className="max-w-4xl mx-auto relative">
        <div className="flex gap-4 items-center">
          {!isRecording ? (
            <>
              <Popover>
                <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-12 w-12 obsidian-glass rounded-2xl text-white/50 hover:text-primary transition-all"><Paperclip className="w-6 h-6" /></Button></PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-56 obsidian-glass border-white/10 rounded-[2rem] p-2 mb-3 shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 gap-1">
                    <AttachmentItem icon={ImageIcon} label="Gallery" color="text-primary" onClick={() => fileInputRef.current?.click()} />
                    {isPremium && (
                      <>
                        <AttachmentItem icon={Palette} label="AI Canvas" color="text-accent" onClick={async () => {
                          if (!messageInput.trim()) return;
                          setIsGeneratingImg(true);
                          try {
                            const { imageUrl } = await generateAiImage({ prompt: messageInput });
                            onSendMessage(imageUrl, 'image', destructTimer);
                            setMessageInput('');
                          } finally { setIsGeneratingImg(false); }
                        }} loading={isGeneratingImg} />
                      </>
                    )}
                    <AttachmentItem icon={AtSign} label="Poll" color="text-blue-400" onClick={onPollOpen} />
                    <div className="h-px bg-white/5 my-1.5 mx-2" />
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className={cn("flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-all text-left", destructTimer ? "text-primary" : "text-white/70")}>
                          <Timer className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Destruct</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="right" className="w-40 obsidian-glass border-white/10 rounded-2xl p-1.5 shadow-2xl">
                        {[
                          { l: 'Off', v: null },
                          { l: '1 Min', v: 1 },
                          { l: '1 Hour', v: 60 },
                          { l: '24 Hours', v: 1440 }
                        ].map(t => (
                          <button key={t.l} onClick={() => setDestructTimer(t.v)} className="w-full text-left p-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all">{t.l}</button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>
                </PopoverContent>
              </Popover>
              
              <div className="flex-1 flex items-center bg-white/[0.04] rounded-[1.8rem] border border-white/10 h-14 px-5 relative group transition-all focus-within:bg-white/[0.07] focus-within:border-primary/50 shadow-inner">
                {destructTimer && <Timer className="w-5 h-5 text-primary mr-3 animate-pulse" />}
                <Input 
                  placeholder="Neural Signal..." 
                  className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-white/20 font-bold italic tracking-tight" 
                  value={messageInput} 
                  onChange={e => handleInputChange(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSend()} 
                />
                <Button variant="ghost" size="icon" className="text-white/20 hover:text-primary transition-all"><Smile className="w-6 h-6" /></Button>
              </div>

              {messageInput.trim() ? (
                <Button size="icon" className="h-14 w-14 rounded-full bg-primary text-white shadow-[0_0_30px_rgba(168,85,247,0.4)] active:scale-90 transition-all hover:scale-105" onClick={handleSend}>
                  <Send className="w-6 h-6" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    size="icon" 
                    variant="ghost"
                    className="h-14 w-14 rounded-[1.4rem] obsidian-glass text-white/40 hover:text-primary transition-all active:scale-90"
                    onClick={() => setRecorderMode(recorderMode === 'audio' ? 'video' : 'audio')}
                  >
                    {recorderMode === 'audio' ? <VideoIcon className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </Button>
                  <Button 
                    size="icon" 
                    className="h-14 w-14 rounded-full bg-primary text-white shadow-[0_0_30px_rgba(168,85,247,0.4)] active:scale-90 transition-all animate-in zoom-in duration-300"
                    onClick={startRecording}
                  >
                    {recorderMode === 'audio' ? <Mic className="w-6 h-6" /> : <Circle className="w-6 h-6 fill-current" />}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center bg-primary/10 border border-primary/20 rounded-[2rem] h-14 px-6 gap-6 animate-in slide-in-from-right-4 duration-500 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
              <div className="flex items-center gap-3 text-primary animate-pulse">
                <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(168,85,247,1)]" />
                <span className="text-[11px] font-black uppercase tracking-[0.3em]">{recorderMode === 'audio' ? 'SYNCING' : 'LIVE'}</span>
              </div>
              <span className="text-lg font-black italic text-white flex-1 tracking-widest">{formatDuration(recordingDuration)}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-10 w-10 text-white/30 hover:text-destructive transition-colors" onClick={cancelRecording}>
                  <Trash2 className="w-6 h-6" />
                </Button>
                <Button variant="ghost" size="icon" className="h-12 w-12 text-primary hover:scale-125 transition-transform" onClick={stopRecording}>
                  <StopCircle className="w-8 h-8 fill-current" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" />
    </footer>
  );
});

function AttachmentItem({ icon: Icon, label, color, onClick, loading }: any) {
  return (
    <button onClick={onClick} className="flex items-center gap-4 w-full p-3.5 rounded-xl hover:bg-white/5 transition-all text-left group">
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", color)} />}
      <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{label}</span>
    </button>
  );
}

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
    <div className="flex flex-col gap-5 max-w-4xl mx-auto px-5 md:px-8 py-10 min-h-full touch-pan-y relative z-10 overflow-x-hidden bg-transparent">
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
    return `${chat?.participantIds?.length || 0} Nodes Connected`;
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
    if (type_msg === 'image' && !content_msg.startsWith('data:')) finalContent = await compressImage(content_msg, 1200, 0.6);

    const msgData: Partial<Message> = { 
      chatId: currentChatId, senderId: firebaseUser.uid, senderName: userProfile?.name || 'Nuxus Agent', 
      content: finalContent, contentType: type_msg, sentAt: new Date().toISOString(), isRead: false,
      metadata: { bubbleStyle: userProfile?.settings?.bubbleStyle || 'default' }
    };

    if (minutes) msgData.selfDestructAt = addMinutes(new Date(), minutes).toISOString();
    if (replyTo) { 
      msgData.replyToId = replyTo.id; 
      msgData.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[Signal: ${replyTo.contentType.toUpperCase()}]`; 
      setReplyTo(null);
    }
    
    await addDoc(collection(db, 'chats', currentChatId, 'messages'), msgData);
    updateDoc(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString(), lastSenderId: firebaseUser.uid });
    
    setTimeout(() => scrollToBottom('smooth'), 100);
  }, [currentChatId, firebaseUser, db, userProfile, replyTo, scrollToBottom]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    setShowScrollButton(distanceToBottom > 400);
  }, []);

  const handleSummary = async () => {
    if (!isPremium || !messages || messages.length < 5) return;
    setIsSummarizing(true);
    try {
      const chatMessages = messages.slice(-20).map(m => ({
        senderName: m.senderName,
        text: m.contentType === 'text' ? decryptSignal(m.content) : `[Signal: ${m.contentType}]`
      }));
      const { summary } = await chatConversationSummary({ chatMessages });
      toast({ title: "AI Intelligence Output", description: summary, duration: 15000 });
    } catch (e) {
      toast({ title: "Summary Encryption Failed", variant: "destructive" });
    } finally { setIsSummarizing(false); }
  };

  const chatDisplayName = useMemo(() => {
    if (chat?.id === 'saved_messages') return 'Archive Data';
    if (chat?.type === 'private') {
      const myMeta = chat.metadata?.[firebaseUser?.uid || ''];
      return myMeta?.customName || formatDisplayName(otherProfile?.name);
    }
    return formatDisplayName(chat?.name || 'Signal Cluster');
  }, [chat, firebaseUser?.uid, otherProfile]);

  const customBg = userProfile?.settings?.chatBackground;
  const bgFit = userProfile?.settings?.chatBackgroundFit || 'cover';

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden z-20 max-w-full">
      <div 
        className={cn("absolute inset-0 z-[-1] pointer-events-none transition-opacity duration-1000", (!customBg || customBg.trim() === '') && "chat-pattern-bg")}
        style={customBg && customBg.trim() !== '' ? { 
          backgroundImage: `url("${customBg}")`, 
          backgroundSize: bgFit, 
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.8
        } : {}}
      />

      <header className="h-20 border-b border-white/5 obsidian-glass flex items-center justify-between px-6 shrink-0 z-30 shadow-2xl">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden obsidian-glass rounded-xl text-white/70 h-10 w-10" onClick={() => setCurrentChatId(null)}><ChevronLeft /></Button>
          {!isSearchMode ? (
            <div className="flex items-center gap-4 cursor-pointer min-w-0 group" onClick={() => setIsChatInfoOpen(true)}>
              <UserAvatar userId={otherId} manualAvatarUrl={chat?.avatarUrl || otherProfile?.avatarUrl} className="h-12 w-12 border-2 border-white/10 group-hover:border-primary/50 transition-all" fallbackName={chatDisplayName} showOnlineStatus />
              <div className="flex flex-col min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[18px] truncate text-white italic tracking-tighter uppercase group-hover:text-primary transition-colors">{chatDisplayName}</span>
                  {otherProfile?.isPremium && <Star className="w-4 h-4 text-accent fill-accent animate-pulse" />}
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/60">
                  {chatSubtext}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-4 obsidian-glass px-4 rounded-2xl h-12">
              <Search className="w-5 h-5 text-primary" />
              <Input placeholder="Scan chat signals..." className="bg-transparent border-none focus-visible:ring-0 text-sm h-10 text-white font-bold" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
              <button onClick={() => { setIsSearchMode(false); setSearchQuery(''); }} className="text-white/20 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
          )}
        </div>
        {!isSearchMode && (
          <div className="flex items-center gap-2">
            {isPremium && (
              <Button variant="ghost" size="icon" onClick={handleSummary} disabled={isSummarizing} className={cn("h-11 w-11 rounded-2xl obsidian-glass text-primary hover:text-white transition-all", isSummarizing && "animate-spin")}>
                <Sparkles className="w-6 h-6" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsSearchMode(true)} className="h-11 w-11 rounded-2xl obsidian-glass text-white/40 hover:text-primary transition-all"><Search className="w-6 h-6" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="h-11 w-11 rounded-2xl obsidian-glass text-white/40 hover:text-primary transition-all"><Info className="w-6 h-6" /></Button>
          </div>
        )}
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0 z-10 bg-transparent">
        <div ref={scrollContainerRef} className="flex-1 w-full relative z-10 overflow-y-auto scrollbar-hide scroll-smooth" onScroll={handleScroll}>
          <MessageList 
            messages={messages} userId={firebaseUser?.uid} chatId={currentChatId} 
            onReply={setReplyTo} onForward={setForwardingMessage} amIPremium={isPremium} 
            isAdmin={isKernelAdmin} isGroup={chat?.type !== 'private'} searchQuery={searchQuery} viewerProfile={userProfile} 
          />
          <div ref={messagesEndRef} className="h-10" />
        </div>

        {showScrollButton && (
          <button 
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-10 right-8 h-14 w-14 rounded-[1.6rem] obsidian-glass border-primary/20 flex items-center justify-center text-primary shadow-2xl z-50 animate-in zoom-in hover:scale-110 active:scale-90 transition-all border"
          >
            <ChevronDown className="w-8 h-8" />
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