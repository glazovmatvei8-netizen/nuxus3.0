
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, X, Paperclip, Mic, StopCircle, Edit2, Search,
  Smile, ImageIcon, Video, Trash2, Loader2, UserPlus, AtSign, ChevronDown, Wand2, Sparkles, Star, Timer, Clock, Palette, Video as VideoIcon, Circle, RefreshCcw
} from 'lucide-react';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { CreatePollModal } from './modals/create-poll-modal';
import { EmojiPicker } from './emoji-picker';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, updateDoc, arrayUnion, where, getDocs, arrayRemove, limit } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { formatDisplayName, cn, compressImage, encryptSignal, isGlobalAdmin, decryptSignal, formatLastSeen, isUserPremium } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { generateAiImage } from '@/ai/flows/generate-ai-image-flow';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';
import { useTranslations } from '@/hooks/use-translations';
import { addMinutes } from 'date-fns';

/**
 * ChatInputBar V26.2.0: Optimized for iPhone Bottom Inset.
 */
const ChatInputBar = memo(({ onSendMessage, canPost, onPollOpen, currentChatId, isPremium, messages, userProfile }: any) => {
  const { localDrafts, setLocalDrafts } = useAppState();
  const [messageInput, setMessageInput] = useState(localDrafts[currentChatId] || '');
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [destructTimer, setDestructTimer] = useState<number | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recorderMode, setRecorderMode] = useState<'audio' | 'video'>('audio');
  const [camMode, setCamMode] = useState<'user' | 'environment'>('user');
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessageInput(localDrafts[currentChatId] || '');
  }, [currentChatId, localDrafts]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '0px';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.min(Math.max(scrollHeight, 40), 200) + 'px';
    }
  }, [messageInput]);

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    setLocalDrafts(prev => ({ ...prev, [currentChatId]: val }));
  };

  const handleAiDraft = async () => {
    if (!isPremium || isAiDrafting) return;
    setIsAiDrafting(true);
    try {
      const history = (messages || []).slice(-5).map((m: any) => ({
        sender: m.senderName,
        message: decryptSignal(m.content)
      }));
      const { draftMessage } = await suggestMessageDraft({ 
        conversationHistory: history, 
        currentUserInput: messageInput 
      });
      if (draftMessage) handleInputChange(draftMessage);
    } catch (e) {
      console.error("AI Draft Error");
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handleSend = () => {
    if (!messageInput.trim()) return;
    onSendMessage(messageInput, 'text', destructTimer);
    setMessageInput('');
    setLocalDrafts(prev => ({ ...prev, [currentChatId]: '' }));
    setDestructTimer(null);
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(10);
  };

  const startRecording = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const constraints = {
        audio: true,
        video: recorderMode === 'video' ? { facingMode: camMode, width: 480, height: 480 } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (recorderMode === 'video' && videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorderMode === 'video' ? 'video/mp4' : 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          onSendMessage(reader.result as string, recorderMode === 'video' ? 'video_note' : 'audio', destructTimer);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    } catch (err) {}
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(30);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  if (!canPost) return null;

  return (
    <footer className="p-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] obsidian-glass border-t border-white/5 shrink-0 z-40 relative">
      {isRecording && recorderMode === 'video' && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full overflow-hidden border-4 border-primary shadow-[0_0_60px_rgba(168,85,247,0.6)] z-50 bg-black animate-in zoom-in duration-500">
          <video ref={videoPreviewRef} autoPlay muted loop playsInline className={cn("w-full h-full object-cover", camMode === 'user' && "scale-x-[-1]")} />
          <button 
            onClick={() => setCamMode(p => p === 'user' ? 'environment' : 'user')}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/10"
          >
            <RefreshCcw className="w-6 h-6 text-white" />
          </button>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex gap-3 items-end w-full">
          {!isRecording ? (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-14 w-14 obsidian-glass rounded-[1.5rem] text-white/30 hover:text-primary transition-all mb-0.5 shrink-0">
                    <Paperclip className="w-6 h-6" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-64 obsidian-glass border-white/10 rounded-[2.2rem] p-2 mb-4">
                  <div className="grid grid-cols-1 gap-1">
                    <AttachmentItem icon={ImageIcon} label="Медиатека" color="text-primary" onClick={() => fileInputRef.current?.click()} />
                    {isPremium && (
                      <AttachmentItem icon={Palette} label="ИИ Креатив" color="text-accent" onClick={async () => {
                        if (!messageInput.trim()) return;
                        setIsGeneratingImg(true);
                        try {
                          const { imageUrl } = await generateAiImage({ prompt: messageInput });
                          onSendMessage(imageUrl, 'image', destructTimer);
                          setMessageInput('');
                        } finally { setIsGeneratingImg(false); }
                      }} loading={isGeneratingImg} />
                    )}
                    <AttachmentItem icon={AtSign} label="Создать опрос" color="text-blue-400" onClick={onPollOpen} />
                  </div>
                </PopoverContent>
              </Popover>
              
              <div className="flex-1 flex items-end bg-white/[0.03] rounded-[2rem] border border-white/[0.06] min-h-14 px-5 py-2 relative focus-within:bg-white/[0.06] focus-within:border-primary/40 shadow-inner min-w-0">
                {destructTimer && <Timer className="w-5 h-5 text-primary mr-3 mb-2 animate-pulse shrink-0" />}
                <Textarea 
                  ref={textareaRef}
                  placeholder="Сигнал..." 
                  className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-white/10 font-bold italic tracking-tight min-h-[40px] max-h-[200px] overflow-y-auto scrollbar-hide py-2 text-base resize-none w-full" 
                  value={messageInput} 
                  onChange={e => handleInputChange(e.target.value)} 
                />
                
                {isPremium && (
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className={cn("text-white/10 hover:text-accent transition-all h-10 w-10 shrink-0 mb-1", isAiDrafting && "animate-spin text-accent")}
                     onClick={handleAiDraft}
                     disabled={isAiDrafting}
                   >
                     <Wand2 className="w-5 h-5" />
                   </Button>
                )}

                <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                   <PopoverTrigger asChild>
                     <Button variant="ghost" size="icon" className="text-white/10 hover:text-primary transition-all h-10 w-10 shrink-0 mb-1">
                       <Smile className="w-6 h-6" />
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent side="top" className="p-0 border-none bg-transparent w-[320px] mb-4">
                     <EmojiPicker 
                        onEmojiSelect={(e) => handleInputChange(messageInput + e)} 
                        onStickerSelect={(url) => { onSendMessage(url, 'sticker', destructTimer); setIsEmojiPickerOpen(false); }} 
                     />
                   </PopoverContent>
                </Popover>
              </div>

              {messageInput.trim() ? (
                <Button size="icon" className="h-14 w-14 rounded-full bg-primary text-white shadow-xl mb-0.5 shrink-0 active:scale-90 transition-all" onClick={handleSend}>
                  <Send className="w-6 h-6" />
                </Button>
              ) : (
                <div className="flex gap-2 mb-0.5 shrink-0">
                  <Button 
                    size="icon" 
                    variant="ghost"
                    className="h-14 w-14 rounded-[1.8rem] obsidian-glass text-white/20 hover:text-primary transition-all"
                    onClick={() => setRecorderMode(recorderMode === 'audio' ? 'video' : 'audio')}
                  >
                    {recorderMode === 'audio' ? <VideoIcon className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </Button>
                  <Button 
                    size="icon" 
                    className="h-14 w-14 rounded-full bg-primary text-white shadow-xl active:scale-90 transition-all"
                    onClick={startRecording}
                  >
                    {recorderMode === 'audio' ? <Mic className="w-6 h-6" /> : <Circle className="w-6 h-6 fill-current" />}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center bg-primary/10 border border-primary/20 rounded-[2.5rem] h-14 px-6 gap-6 shadow-xl animate-in slide-in-from-right-8">
              <div className="flex items-center gap-3 text-primary animate-pulse">
                <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_15px_rgba(168,85,247,1)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">{recorderMode === 'audio' ? 'SYNC AUDIO' : 'LIVE STREAM'}</span>
              </div>
              <span className="text-xl font-black italic text-white flex-1 tracking-widest tabular-nums">
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-10 w-10 text-white/20 hover:text-destructive rounded-xl" onClick={cancelRecording}>
                  <Trash2 className="w-5 h-5" />
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
    <button onClick={onClick} className="flex items-center gap-5 w-full p-4 rounded-2xl hover:bg-white/5 transition-all text-left group">
      {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Icon className={cn("w-6 h-6 transition-transform group-hover:scale-110", color)} />}
      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">{label}</span>
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
    <div className="flex flex-col gap-5 max-w-5xl mx-auto px-4 md:px-10 py-8 min-h-full touch-pan-y relative z-10 overflow-x-hidden bg-transparent">
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
    return `${chat?.participantIds?.length || 0} Участников`;
  }, [chat, otherProfile, t]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    scrollToBottom('auto');
  }, [currentChatId, messages?.length, scrollToBottom]);

  const handleSendMessage = useCallback(async (content_msg: string, type_msg: Message['contentType'] = 'text', minutes: number | null = null) => {
    if (!content_msg.trim() || !currentChatId || !firebaseUser || !db) return;
    
    let finalContent = (type_msg === 'text' || type_msg === 'reply') ? encryptSignal(content_msg) : content_msg;
    if (type_msg === 'image' && !content_msg.startsWith('data:')) finalContent = await compressImage(content_msg, 1200, 0.6);

    const msgData: any = { 
      chatId: currentChatId, senderId: firebaseUser.uid, senderName: userProfile?.name || 'User', 
      content: finalContent, contentType: type_msg, sentAt: new Date().toISOString(), isRead: false,
      metadata: { bubbleStyle: userProfile?.settings?.bubbleStyle || 'default' }
    };

    if (minutes) msgData.selfDestructAt = addMinutes(new Date(), minutes).toISOString();
    if (replyTo) { 
      msgData.replyToId = replyTo.id; 
      msgData.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[Сигнал: ${replyTo.contentType.toUpperCase()}]`; 
      setReplyTo(null);
    }
    
    addDoc(collection(db, 'chats', currentChatId, 'messages'), msgData);
    updateDoc(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString(), lastSenderId: firebaseUser.uid });
    
    setTimeout(() => scrollToBottom('smooth'), 100);
  }, [currentChatId, firebaseUser, db, userProfile, replyTo, scrollToBottom]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    setShowScrollButton(distanceToBottom > 500);
  }, []);

  const chatDisplayName = useMemo(() => {
    if (chat?.id === 'saved_messages') return 'Избранные пакеты';
    if (chat?.type === 'private') {
      const myMeta = chat.metadata?.[firebaseUser?.uid || ''];
      return myMeta?.customName || formatDisplayName(otherProfile?.name);
    }
    return formatDisplayName(chat?.name || 'Квантовый Канал');
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

      <header className="h-[calc(4.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b border-white/5 obsidian-glass flex items-center justify-between px-6 shrink-0 z-30 shadow-2xl">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden obsidian-glass rounded-2xl text-white/50 h-10 w-10 shrink-0" onClick={() => setCurrentChatId(null)}><ChevronLeft className="w-6 h-6" /></Button>
          {!isSearchMode ? (
            <div className="flex items-center gap-4 cursor-pointer min-w-0 flex-1 group" onClick={() => setIsChatInfoOpen(true)}>
              <UserAvatar userId={otherId} manualAvatarUrl={chat?.avatarUrl || otherProfile?.avatarUrl} className="h-12 w-12 border-2 border-white/10 group-hover:border-primary/50 transition-all shrink-0 shadow-lg" fallbackName={chatDisplayName} showOnlineStatus />
              <div className="flex flex-col min-w-0 text-left flex-1">
                <div className="flex items-center gap-2 min-w-0 w-full">
                  <span className="font-black text-[18px] truncate text-white italic tracking-tighter uppercase group-hover:text-primary transition-colors block leading-tight">
                    {chatDisplayName}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 leading-none truncate mt-0.5">
                  {chatSubtext}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-5 obsidian-glass px-5 rounded-[1.5rem] h-12 min-w-0 border-white/10">
              <Search className="w-5 h-5 text-primary shrink-0" />
              <input placeholder="Поиск сигналов..." className="bg-transparent border-none outline-none text-base h-full text-white font-bold flex-1 min-w-0" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
              <button onClick={() => { setIsSearchMode(false); setSearchQuery(''); }} className="text-white/20 hover:text-white transition-colors shrink-0"><X className="w-6 h-6" /></button>
            </div>
          )}
        </div>
        {!isSearchMode && (
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setIsSearchMode(true)} className="h-11 w-11 rounded-2xl obsidian-glass text-white/20 hover:text-primary transition-all"><Search className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="h-11 w-11 rounded-2xl obsidian-glass text-white/20 hover:text-primary transition-all"><Info className="w-6 h-6" /></Button>
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
            className="absolute bottom-10 right-8 h-14 w-14 rounded-full obsidian-glass border-primary/20 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(168,85,247,0.4)] z-50 animate-in zoom-in hover:scale-110 active:scale-90 transition-all border group"
          >
            <ChevronDown className="w-8 h-8 group-hover:translate-y-0.5 transition-transform" />
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
