
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, X, Paperclip, Mic, StopCircle, ChevronDown, Edit2, Pin, Search, PinOff,
  Smile, Instagram, Camera, Video, Sticker, Copy, Share2, Sparkles, Loader2, RefreshCw, Zap, Trash2, Pause, Play,
  BarChart3, Image as ImageIcon, ArrowDown, Menu as MenuIcon, List, Phone, Radio, UserPlus
} from 'lucide-react';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { CreatePollModal } from './modals/create-poll-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, limit, updateDoc, writeBatch, arrayUnion, getDocs, where, setDoc, getDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { formatDisplayName, cn, formatLastSeen, compressImage, encryptSignal, isGlobalAdmin, decryptSignal } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { EmojiPicker } from './emoji-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const MessageList = memo(({ 
  messages, userId, chatId, onReply, onPin, amIPremium, isAdmin, isGroup, onEdit, onForward, searchQuery, viewerProfile
}: any) => {
  if (!messages) return null;
  
  const sortedMessages = useMemo(() => [...messages].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()), [messages]);
  
  const filteredMessages = useMemo(() => {
    if (!searchQuery) return sortedMessages;
    return sortedMessages.filter((m: Message) => {
      const text = m.contentType === 'text' ? decryptSignal(m.content)?.toLowerCase() : '';
      return text.includes(searchQuery.toLowerCase());
    });
  }, [sortedMessages, searchQuery]);

  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto px-4 md:px-6 py-8 min-h-full touch-pan-y">
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
  const { currentChatId, setCurrentChatId, setForwardingMessage, localDrafts, setLocalDrafts, setActiveCallId, isInterceptionRequested } = useAppState();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const isKernelAdmin = useMemo(() => isGlobalAdmin(userProfile), [userProfile]);

  const isInterception = useMemo(() => {
    if (!chat || !firebaseUser || !isInterceptionRequested) return false;
    return !chat.participantIds.includes(firebaseUser.uid) && isKernelAdmin;
  }, [chat, firebaseUser, userProfile, isInterceptionRequested, isKernelAdmin]);

  const isParticipant = useMemo(() => {
    return chat?.participantIds?.includes(firebaseUser?.uid || '');
  }, [chat, firebaseUser]);

  const canPost = useMemo(() => {
    if (isInterception) return false;
    if (!chat || !firebaseUser) return false;
    if (chat.type === 'channel') {
      return chat.adminIds?.includes(firebaseUser.uid) || isKernelAdmin;
    }
    return isParticipant;
  }, [chat, firebaseUser, isKernelAdmin, isInterception, isParticipant]);

  const otherId = useMemo(() => {
    if (chat?.type === 'private' && firebaseUser) {
      if (isInterception) return null; 
      return chat.participantIds.find(id => id !== firebaseUser.uid);
    }
    return null;
  }, [chat, firebaseUser, isInterception]);

  const otherProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(otherProfileRef);

  const messagesQuery = useMemoFirebase(() => (!db || !currentChatId) ? null : query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc')), [db, currentChatId]);
  const { data: messages } = useCollection<Message>(messagesQuery);

  const pinnedMessage = useMemo(() => messages?.find(m => m.id === chat?.pinnedMessageId), [messages, chat?.pinnedMessageId]);

  const isTyping = useMemo(() => {
    if (!chat?.typing || isInterception) return false;
    return Object.entries(chat.typing).some(([uid, active]) => active && uid !== firebaseUser?.uid);
  }, [chat?.typing, firebaseUser?.uid, isInterception]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    if (currentChatId && messages) {
      const timer = setTimeout(() => scrollToBottom('instant'), 100);
      return () => clearTimeout(timer);
    }
  }, [currentChatId, messages?.length, scrollToBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 300;
    setShowScrollBottom(!isAtBottom);
  };

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    if (currentChatId) setLocalDrafts(prev => ({ ...prev, [currentChatId]: val }));
    if (db && currentChatId && firebaseUser && !isInterception && isParticipant) {
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { [`typing.${firebaseUser.uid}`]: !!val });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          handleSendMessage(base64Audio, 'audio');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(100);
    } catch (err) {
      toast({ title: "Ошибка микрофона", description: "Разрешите доступ к микрофону в настройках браузера.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    }
  };

  const handleJoinChat = async () => {
    if (!db || !firebaseUser || !currentChatId) return;
    setIsJoining(true);
    try {
      await updateDoc(doc(db, 'chats', currentChatId), {
        participantIds: arrayUnion(firebaseUser.uid)
      });
      toast({ title: "Вы вступили в сообщество" });
    } catch (e) {
      toast({ title: "Ошибка входа", variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  const handleSendMessage = useCallback(async (content_msg: string = messageInput, type_msg: Message['contentType'] = 'text') => {
    if (!content_msg.trim() && type_msg !== 'video_note' && type_msg !== 'sticker' && type_msg !== 'audio') return;
    if (!currentChatId || !firebaseUser || !db || isInterception || !canPost) return;
    
    let finalContent = content_msg;
    if (type_msg === 'text') finalContent = encryptSignal(content_msg);
    else if (type_msg === 'image') finalContent = await compressImage(content_msg, 800, 0.4);

    const captureReply = replyTo;
    const captureEdit = editingMsg;

    if (type_msg === 'text') {
      setMessageInput('');
      if (currentChatId) setLocalDrafts(prev => ({ ...prev, [currentChatId]: '' }));
    }
    
    setReplyTo(null); 
    setEditingMsg(null); 
    setShowEmojiPicker(false);

    if (captureEdit) {
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId, 'messages', captureEdit.id), { content: finalContent, editedAt: new Date().toISOString() });
      return;
    }

    const msgData: Partial<Message> = { 
      chatId: currentChatId, senderId: firebaseUser.uid, senderName: userProfile?.name || 'Nuxus User', 
      content: finalContent, contentType: type_msg, sentAt: new Date().toISOString(), isRead: false
    };
    if (captureReply) { 
      msgData.replyToId = captureReply.id; 
      msgData.replyToContent = captureReply.contentType === 'text' ? captureReply.content : `[${captureReply.contentType}]`; 
    }
    
    await addDoc(collection(db, 'chats', currentChatId, 'messages'), msgData);
    
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { 
      lastMessageAt: new Date().toISOString(), 
      lastSenderId: firebaseUser.uid, 
      [`typing.${firebaseUser.uid}`]: false 
    });
    setTimeout(() => scrollToBottom('smooth'), 100);
  }, [messageInput, currentChatId, firebaseUser, db, userProfile, replyTo, editingMsg, setLocalDrafts, scrollToBottom, isInterception, canPost]);

  const chatDisplayName = useMemo(() => {
    if (isInterception && chat?.type === 'private') {
      return `📡 ПЕРЕХВАТ: PRIVATE NODE`;
    }
    if (isInterception && chat) {
      return `📡 ПЕРЕХВАТ: ${chat.name || 'Community'}`;
    }
    if (chat?.type === 'private') {
      const myMeta = chat.metadata?.[firebaseUser?.uid || ''];
      if (myMeta?.customName) return myMeta.customName;
      if (otherProfile?.name) return formatDisplayName(otherProfile.name);
    }
    return formatDisplayName(chat?.name || otherProfile?.name || 'Чат');
  }, [chat, firebaseUser?.uid, otherProfile, isInterception]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden z-20">
      {userProfile?.settings?.chatBackground && (
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundImage: `url(${userProfile.settings.chatBackground})`, backgroundSize: userProfile.settings.chatBackgroundFit === 'contain' ? 'contain' : 'cover', backgroundPosition: 'center', backgroundColor: '#0a0a0c' }} />
      )}

      <header className="h-16 border-b border-white/5 bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 z-30">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden rounded-lg" onClick={() => setCurrentChatId(null)}><ChevronLeft /></Button>
          {!isSearchMode ? (
            <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setIsChatInfoOpen(true)}>
              <UserAvatar userId={otherId} manualAvatarUrl={chat?.avatarUrl || otherProfile?.avatarUrl} className="h-10 w-10" fallbackName={chatDisplayName} showOnlineStatus={!isInterception} />
              <div className="flex flex-col min-w-0">
                <span className={cn("font-bold text-sm truncate", isInterception && "text-red-500 animate-pulse")}>{chatDisplayName}</span>
                <span className="text-[10px] text-primary/80 font-bold uppercase tracking-widest">
                  {isInterception ? 'SIGNAL INTERCEPT ACTIVE' : (isTyping ? 'печатает...' : (chat?.type === 'private' ? formatLastSeen(otherProfile?.lastSeen) : 'сообщество'))}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 pr-4 animate-in fade-in slide-in-from-left-2">
              <Search className="w-4 h-4 text-primary" />
              <Input 
                placeholder="Поиск по сообщениям..." 
                className="bg-transparent border-none focus-visible:ring-0 text-sm h-8"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button onClick={() => { setIsSearchMode(false); setSearchQuery(''); }} className="p-1 hover:bg-white/5 rounded-full"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
          )}
        </div>
        {!isSearchMode && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsSearchMode(true)} className="text-white/60 hover:text-primary"><Search className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="text-white/60 hover:text-primary"><Info className="w-5 h-5" /></Button>
          </div>
        )}
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        <div 
          ref={scrollViewportRef}
          onScroll={handleScroll}
          className="flex-1 w-full relative z-10 overflow-y-auto scroll-smooth scrollbar-hide touch-pan-y"
        >
          <MessageList 
            messages={messages} userId={firebaseUser?.uid} chatId={currentChatId} onReply={setReplyTo} onEdit={setEditingMsg} 
            amIPremium={userProfile?.isPremium} isAdmin={isGlobalAdmin(userProfile)} isGroup={chat?.type !== 'private'} 
            searchQuery={searchQuery} viewerProfile={userProfile} 
          />
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {showScrollBottom && (
          <Button 
            size="icon" 
            className="absolute bottom-24 right-6 h-12 w-12 rounded-full bg-primary shadow-[0_0_30px_rgba(139,92,246,0.4)] z-40 animate-in fade-in zoom-in group"
            onClick={() => scrollToBottom()}
          >
            <ArrowDown className="w-6 h-6 text-white animate-bounce" />
          </Button>
        )}
      </div>

      {isInterception ? (
        <div className="p-4 bg-red-500/10 border-t border-red-500/20 text-center shrink-0 z-30">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] animate-pulse">
            РЕЖИМ ПЕРЕХВАТА АКТИВИРОВАН — ТОЛЬКО ЧТЕНИЕ
          </p>
        </div>
      ) : !isParticipant ? (
        <div className="p-4 bg-primary/5 border-t border-white/5 flex items-center justify-center shrink-0 z-30">
          <Button onClick={handleJoinChat} disabled={isJoining} className="h-12 px-10 rounded-2xl bg-primary font-black uppercase tracking-widest gap-2 shadow-xl shadow-primary/20">
            {isJoining ? <Loader2 className="animate-spin w-4 h-4" /> : <><UserPlus className="w-5 h-5" /> Вступить в сообщество</>}
          </Button>
        </div>
      ) : !canPost ? (
        <div className="p-4 bg-white/5 border-t border-white/5 text-center shrink-0 z-30">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
            КАНАЛ В РЕЖИМЕ ТРАНСЛЯЦИИ — ТОЛЬКО ЧТЕНИЕ
          </p>
        </div>
      ) : (
        <footer className="p-3 pb-6 bg-[#0a0a0c]/90 backdrop-blur-2xl border-t border-white/5 shrink-0 z-30">
          <div className="max-w-4xl mx-auto space-y-2 relative">
            {replyTo && (
              <div className="p-2 bg-muted/50 rounded-xl border-l-4 border-accent flex items-center justify-between animate-in slide-in-from-bottom-1">
                <div className="flex flex-col min-0 pl-2">
                  <span className="text-[9px] font-bold text-accent uppercase tracking-widest">Ответ: {replyTo.senderName}</span>
                  <span className="text-xs truncate italic">{decryptSignal(replyTo.content)}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></Button>
              </div>
            )}
            
            <div className="flex gap-3 items-center">
              <Popover>
                <PopoverTrigger asChild><Button variant="ghost" size="icon"><Paperclip /></Button></PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-48 bg-card border-white/10 rounded-2xl p-1 mb-2 shadow-2xl">
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-xs" onClick={() => fileInputRef.current?.click()}><ImageIcon className="w-4 h-4" /> Галерея</Button>
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-xs" onClick={() => setIsPollModalOpen(true)}><BarChart3 className="w-4 h-4" /> Опрос</Button>
                </PopoverContent>
              </Popover>
              
              <div className="flex-1 flex items-center bg-white/[0.03] rounded-2xl border border-white/[0.05] h-11 px-4 relative group">
                <Input placeholder="Сообщение" className="bg-transparent border-none focus-visible:ring-0" value={messageInput} onChange={e => handleInputChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
                <div className="flex items-center gap-2">
                  {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <button onClick={() => {}} className="text-primary/40 hover:text-primary transition-colors"><Sparkles className="w-4 h-4" /></button>}
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-white/20 hover:text-white transition-colors"><Smile /></button>
                </div>
              </div>

              {messageInput.trim() || isRecording ? (
                <Button size="icon" className="h-10 w-10 rounded-full bg-primary shadow-lg" onClick={() => isRecording ? stopRecording() : handleSendMessage()}>
                  {isRecording ? <StopCircle className="w-5 h-5 animate-pulse text-red-500" /> : <Send className="w-5 h-5" />}
                </Button>
              ) : (
                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full hover:bg-primary/10 text-primary" onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}>
                  <Mic className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </footer>
      )}

      {showEmojiPicker && <div className="absolute bottom-24 right-4 z-50 w-[320px] h-[400px]"><EmojiPicker onEmojiSelect={(e) => handleInputChange(messageInput + e)} onStickerSelect={(url) => handleSendMessage(url, 'sticker')} /></div>}
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      <CreatePollModal open={isPollModalOpen} onOpenChange={setIsPollModalOpen} chatId={currentChatId!} />
      <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" />
    </div>
  );
}
