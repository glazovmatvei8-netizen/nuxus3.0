"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, X, Paperclip, Mic, StopCircle, Edit2, Search,
  Smile, ImageIcon, Trash2, AtSign, RefreshCcw, CornerUpLeft, Circle, Video as VideoIcon
} from 'lucide-react';
import { MessageItem } from './message-item';
import { ChatInfoModal } from './modals/chat-info-modal';
import { CreatePollModal } from './modals/create-poll-modal';
import { EmojiPicker } from './emoji-picker';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, updateDoc } from 'firebase/firestore';
import { formatDisplayName, cn, compressImage, encryptSignal, isGlobalAdmin, decryptSignal, formatLastSeen, isUserPremium } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { addMinutes } from 'date-fns';

/**
 * ChatInputBar V26.8.0: Pure Communication (No AI).
 */
const ChatInputBar = memo(({ onSendMessage, canPost, onPollOpen, currentChatId, isPremium, replyTo, onCancelReply }: any) => {
  const { localDrafts, setLocalDrafts } = useAppState();
  const [messageInput, setMessageInput] = useState(localDrafts[currentChatId] || '');
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
      textarea.style.height = '44px';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.min(Math.max(scrollHeight, 44), 200) + 'px';
    }
  }, [messageInput]);

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    setLocalDrafts(prev => ({ ...prev, [currentChatId]: val }));
  };

  const handleSend = () => {
    if (!messageInput.trim()) return;
    onSendMessage(messageInput, 'text', null);
    setMessageInput('');
    setLocalDrafts(prev => ({ ...prev, [currentChatId]: '' }));
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(10);
  };

  const startRecording = async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
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
          onSendMessage(reader.result as string, recorderMode === 'video' ? 'video_note' : 'audio', null);
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

  if (!canPost) return null;

  return (
    <footer className="p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] obsidian-glass border-t border-white/5 shrink-0 z-40 relative flex flex-col gap-2">
      {replyTo && (
        <div className="bg-white/5 p-3 rounded-2xl flex items-center justify-between border border-white/5 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <CornerUpLeft className="w-4 h-4 text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{replyTo.senderName}</span>
              <span className="text-[11px] text-white/40 truncate italic">{decryptSignal(replyTo.content)}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onCancelReply}><X className="w-4 h-4" /></Button>
        </div>
      )}

      {isRecording && recorderMode === 'video' && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full overflow-hidden border-4 border-primary shadow-[0_0_60px_rgba(168,85,247,0.6)] z-50 bg-black animate-in zoom-in duration-500">
          <video ref={videoPreviewRef} autoPlay muted loop playsInline className={cn("w-full h-full object-cover", camMode === 'user' && "scale-x-[-1]")} />
          <button onClick={() => setCamMode(p => p === 'user' ? 'environment' : 'user')} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/10"><RefreshCcw className="w-6 h-6 text-white" /></button>
        </div>
      )}

      <div className="flex gap-2 items-end w-full">
        {!isRecording ? (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-2xl bg-white/5 hover:bg-primary/10 hover:text-primary mb-0.5"><Paperclip className="w-6 h-6" /></Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-64 obsidian-glass border-white/10 rounded-[2rem] p-2 mb-4">
                <AttachmentItem icon={ImageIcon} label="Медиа" color="text-primary" onClick={() => fileInputRef.current?.click()} />
                <AttachmentItem icon={AtSign} label="Опрос" color="text-blue-400" onClick={onPollOpen} />
              </PopoverContent>
            </Popover>
            
            <div className="flex-1 flex items-end bg-white/5 rounded-[1.5rem] border border-white/5 min-h-11 px-4 py-2 relative focus-within:bg-white/[0.08] focus-within:border-primary/30 shadow-inner">
              <Textarea 
                ref={textareaRef}
                placeholder="Сообщение..." 
                className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-white/20 font-medium min-h-[32px] max-h-[200px] overflow-y-auto scrollbar-hide py-1 text-base resize-none w-full" 
                value={messageInput} 
                onChange={e => handleInputChange(e.target.value)} 
              />
              
              <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                 <PopoverTrigger asChild>
                   <Button variant="ghost" size="icon" className="text-white/20 hover:text-primary h-9 w-9 shrink-0 mb-[-2px]"><Smile className="w-6 h-6" /></Button>
                 </PopoverTrigger>
                 <PopoverContent side="top" className="p-0 border-none bg-transparent w-[320px] mb-4">
                   <EmojiPicker onEmojiSelect={(e) => handleInputChange(messageInput + e)} onStickerSelect={(url) => { onSendMessage(url, 'sticker', null); setIsEmojiPickerOpen(false); }} />
                 </PopoverContent>
              </Popover>
            </div>

            {messageInput.trim() ? (
              <Button size="icon" className="h-11 w-11 rounded-2xl bg-primary text-white shadow-xl mb-0.5 shrink-0 active:scale-90 transition-all" onClick={handleSend}><Send className="w-5 h-5" /></Button>
            ) : (
              <div className="flex gap-1 mb-0.5 shrink-0">
                <Button size="icon" variant="ghost" className="h-11 w-11 rounded-2xl bg-white/5 text-white/30" onClick={() => setRecorderMode(recorderMode === 'audio' ? 'video' : 'audio')}>
                  {recorderMode === 'audio' ? <VideoIcon className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Button size="icon" className="h-11 w-11 rounded-2xl bg-primary text-white shadow-xl" onClick={startRecording}>
                  {recorderMode === 'audio' ? <Mic className="w-5 h-5" /> : <Circle className="w-5 h-5 fill-current" />}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center bg-primary/10 border border-primary/20 rounded-2xl h-11 px-4 gap-4 animate-in slide-in-from-right-8">
            <div className="flex items-center gap-2 text-primary animate-pulse"><div className="w-2 h-2 rounded-full bg-primary shadow-lg" /><span className="text-[10px] font-black uppercase tracking-widest">LIVE</span></div>
            <span className="text-lg font-black italic text-white flex-1 tabular-nums">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40" onClick={() => { if(mediaRecorderRef.current) mediaRecorderRef.current.onstop = null; stopRecording(); }}><Trash2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-primary" onClick={stopRecording}><StopCircle className="w-7 h-7 fill-current" /></Button>
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" />
    </footer>
  );
});

function AttachmentItem({ icon: Icon, label, color, onClick }: any) {
  return (
    <button onClick={onClick} className="flex items-center gap-4 w-full p-3.5 rounded-xl hover:bg-white/5 transition-all text-left group">
      <Icon className={cn("w-5 h-5", color)} />
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
  
  return (
    <div className="flex flex-col gap-2 max-w-5xl mx-auto px-4 md:px-10 py-8 min-h-full relative z-10 overflow-x-hidden">
      {sortedMessages.map((msg: Message) => (
        <MessageItem 
          key={msg.id} message={msg} isMe={msg.senderId === userId} 
          chatId={chatId} onReply={onReply} onPin={onPin} 
          amIPremium={amIPremium} isAdmin={isAdmin} isGroup={isGroup} 
          onEdit={onEdit} onForward={onForward} 
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
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const otherId = useMemo(() => {
    if (!chat || chat.type !== 'private' || !firebaseUser) return null;
    return chat.participantIds.find(id => id !== firebaseUser.uid);
  }, [chat, firebaseUser]);

  const otherUserRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUser } = useDoc<UserType>(otherUserRef);

  const messagesQuery = useMemoFirebase(() => (!db || !currentChatId) ? null : query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc')), [db, currentChatId]);
  const { data: messages } = useCollection<Message>(messagesQuery);

  const isPremium = useMemo(() => isUserPremium(userProfile), [userProfile]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior });
  }, []);

  useEffect(() => { scrollToBottom('auto'); }, [currentChatId, messages?.length, scrollToBottom]);

  const handleSendMessage = useCallback(async (content_msg: string, type_msg: Message['contentType'] = 'text') => {
    if (!content_msg.trim() || !currentChatId || !firebaseUser || !db) return;
    
    let finalContent = (type_msg === 'text' || type_msg === 'reply') ? encryptSignal(content_msg) : content_msg;
    if (type_msg === 'image' && !content_msg.startsWith('data:')) finalContent = await compressImage(content_msg, 1200, 0.6);

    const msgData: any = { 
      chatId: currentChatId, senderId: firebaseUser.uid, senderName: userProfile?.name || 'User', 
      content: finalContent, contentType: type_msg, sentAt: new Date().toISOString(), isRead: false,
      metadata: { bubbleStyle: userProfile?.settings?.bubbleStyle || 'default' }
    };

    if (replyTo) { 
      msgData.replyToId = replyTo.id; 
      msgData.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[Сигнал: ${replyTo.contentType.toUpperCase()}]`; 
      setReplyTo(null);
    }
    
    addDoc(collection(db, 'chats', currentChatId, 'messages'), msgData);
    updateDoc(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString() });
  }, [currentChatId, firebaseUser, db, userProfile, replyTo]);

  const headerTitle = useMemo(() => {
    if (!chat) return 'СИНХРОНИЗАЦИЯ...';
    if (chat.type === 'private') {
      const myMeta = chat.metadata?.[firebaseUser?.uid || ''];
      if (myMeta?.customName) return myMeta.customName;
      return formatDisplayName(otherUser?.name);
    }
    return formatDisplayName(chat.name);
  }, [chat, otherUser, firebaseUser?.uid]);

  const headerAvatarId = useMemo(() => {
    return chat?.type === 'private' ? otherId : null;
  }, [chat?.type, otherId]);

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden z-20 max-w-full">
      <header className="h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b border-white/5 obsidian-glass flex items-center justify-between px-5 shrink-0 z-30 shadow-xl">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden obsidian-glass rounded-xl text-white/50 h-10 w-10 shrink-0" onClick={() => setCurrentChatId(null)}><ChevronLeft className="w-6 h-6" /></Button>
          {!isSearchMode ? (
            <div className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 group" onClick={() => setIsChatInfoOpen(true)}>
              <UserAvatar 
                userId={headerAvatarId} 
                manualAvatarUrl={chat?.type !== 'private' ? chat?.avatarUrl : otherUser?.avatarUrl} 
                className="h-10 w-10 border border-white/10 shrink-0" 
                fallbackName={headerTitle} 
              />
              <div className="flex flex-col min-w-0 text-left">
                <span className="font-black text-[16px] truncate text-white italic tracking-tighter uppercase group-hover:text-primary transition-colors leading-tight">
                  {headerTitle}
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-primary/40 leading-none truncate mt-0.5">
                  {chat?.type === 'private' ? formatLastSeen(otherUser?.lastSeen, otherUser?.settings?.privacy?.lastSeenVisibility) : 'Сигнал активен'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-3 obsidian-glass px-4 rounded-xl h-10 border-white/10">
              <Search className="w-4 h-4 text-primary shrink-0" />
              <input placeholder="Поиск..." className="bg-transparent border-none outline-none text-sm text-white font-bold flex-1 min-w-0" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
              <button onClick={() => { setIsSearchMode(false); setSearchQuery(''); }} className="text-white/20 hover:text-white shrink-0"><X className="w-5 h-5" /></button>
            </div>
          )}
        </div>
        {!isSearchMode && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setIsSearchMode(true)} className="h-10 w-10 rounded-xl obsidian-glass text-white/20"><Search className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="h-10 w-10 rounded-xl obsidian-glass text-white/20"><Info className="w-6 h-6" /></Button>
          </div>
        )}
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0 z-10 bg-transparent">
        {userProfile?.settings?.chatBackground && (
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000"
            style={{ 
              backgroundImage: `url(${userProfile.settings.chatBackground})`,
              opacity: 0.4
            }}
          />
        )}
        
        <div ref={scrollContainerRef} className="flex-1 w-full relative z-10 overflow-y-auto scrollbar-hide scroll-smooth" onScroll={(e) => setShowScrollButton(e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight > 500)}>
          <MessageList 
            messages={messages} userId={firebaseUser?.uid} chatId={currentChatId} 
            onReply={setReplyTo} onForward={setForwardingMessage} amIPremium={isPremium} 
            isAdmin={isGlobalAdmin(userProfile)} isGroup={chat?.type !== 'private'} searchQuery={searchQuery} viewerProfile={userProfile} 
          />
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      <ChatInputBar 
        onSendMessage={handleSendMessage} canPost={true} 
        onPollOpen={() => setIsPollModalOpen(true)} currentChatId={currentChatId}
        isPremium={isPremium} replyTo={replyTo} onCancelReply={() => setReplyTo(null)}
      />

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      {currentChatId && <CreatePollModal open={isPollModalOpen} onOpenChange={setIsPollModalOpen} chatId={currentChatId} />}
    </div>
  );
}
