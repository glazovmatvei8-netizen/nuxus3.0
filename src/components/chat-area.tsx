
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, X, Paperclip, Mic, StopCircle, ChevronDown, Edit2, Pin, Search, PinOff,
  Smile, Instagram, Camera, Video, Sticker, Copy, Share2, Sparkles, Loader2, RefreshCw, Zap, Trash2, Pause, Play,
  BarChart3, Image as ImageIcon, ArrowDown
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { ImagePreviewModal } from './modals/image-preview-modal';
import { CreatePollModal } from './modals/create-poll-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, limit, updateDoc, writeBatch, arrayUnion, getDocs, where, setDoc, getDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { formatDisplayName, cn, formatLastSeen, compressImage, encryptSignal, isGlobalAdmin, decryptSignal } from '@/lib/utils';
import type { Message, User as UserType, Chat, StickerPack } from '@/lib/types';
import { EmojiPicker } from './emoji-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';

const MessageList = memo(({ 
  messages, userId, chatId, onReply, onPin, amIPremium, isAdmin, isGroup, onEdit, onForward, searchQuery, viewerProfile
}: any) => {
  if (!messages) return null;
  const sortedMessages = useMemo(() => [...messages].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()), [messages]);
  const filteredMessages = searchQuery ? sortedMessages.filter((m: Message) => decryptSignal(m.content)?.toLowerCase().includes(searchQuery.toLowerCase())) : sortedMessages;

  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto px-4 md:px-6 py-8 min-h-full">
      {filteredMessages.map((msg: Message) => (
        <MessageItem key={msg.id} message={msg} isMe={msg.senderId === userId} chatId={chatId} onReply={onReply} onPin={onPin} amIPremium={amIPremium} isAdmin={isAdmin} isGroup={isGroup} onEdit={onEdit} onForward={onForward} highlight={searchQuery && decryptSignal(msg.content)?.toLowerCase().includes(searchQuery.toLowerCase())} viewerProfile={viewerProfile} />
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
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const otherId = useMemo(() => (chat?.type === 'private' && firebaseUser) ? chat.participantIds.find(id => id !== firebaseUser.uid) : null, [chat, firebaseUser]);
  const otherProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(otherProfileRef);

  const messagesQuery = useMemoFirebase(() => (!db || !currentChatId) ? null : query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc')), [db, currentChatId]);
  const { data: messages } = useCollection<Message>(messagesQuery);

  const pinnedMessage = useMemo(() => messages?.find(m => m.id === chat?.pinnedMessageId), [messages, chat?.pinnedMessageId]);

  const isTyping = useMemo(() => {
    if (!chat?.typing) return false;
    return Object.entries(chat.typing).some(([uid, active]) => active && uid !== firebaseUser?.uid);
  }, [chat?.typing, firebaseUser?.uid]);

  // AUTO SCROLL TO BOTTOM
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    if (messages && messages.length > 0) {
      // Small delay to ensure images/content are rendered
      setTimeout(() => scrollToBottom('instant'), 100);
    }
  }, [currentChatId]); // Scroll on chat switch

  useEffect(() => {
    if (messages && messages.length > 0) {
      // Scroll on new message if user is already near bottom
      scrollToBottom('smooth');
    }
  }, [messages?.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 300;
    setShowScrollBottom(!isNearBottom);
  };

  useEffect(() => {
    if (currentChatId && localDrafts[currentChatId]) {
      setMessageInput(localDrafts[currentChatId]);
    } else {
      setMessageInput('');
    }
  }, [currentChatId, localDrafts]);

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    if (currentChatId) setLocalDrafts(prev => ({ ...prev, [currentChatId]: val }));
    if (db && currentChatId && firebaseUser) {
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { [`typing.${firebaseUser.uid}`]: !!val });
    }
  };

  const handleAiDraft = async () => {
    if (!currentChatId || !messages) return;
    setIsAiLoading(true);
    try {
      const history = messages.slice(-5).map(m => ({
        sender: m.senderName,
        message: m.contentType === 'text' ? decryptSignal(m.content) : `[${m.contentType}]`
      }));
      const res = await suggestMessageDraft({ conversationHistory: history, currentUserInput: messageInput });
      handleInputChange(res.draftMessage);
      toast({ title: "Nuxus AI", description: "Ответ сгенерирован!" });
    } catch (e) {
      toast({ title: "Ошибка ИИ", variant: "destructive" });
    } finally {
      setIsAiLoading(false);
    }
  };

  // RECORDING LOGIC (PC SUPPORTED)
  const startRecording = async (type: 'video_note' | 'audio') => {
    try {
      const constraints = type === 'video_note' ? { video: true, audio: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const mimeType = type === 'video_note' ? 'video/webm' : 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => handleSendMessage(reader.result as string, type);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorderRef.current = recorder;
      recorder.start();
      if (type === 'video_note') setIsRecordingVideo(true);
      else setIsRecordingAudio(true);
    } catch (e) {
      toast({ title: "Ошибка доступа к медиа", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      setIsRecordingVideo(false);
      setIsRecordingAudio(false);
    }
  };

  // Handle PC/Touch difference for recording
  const handleRecordInteraction = (type: 'video_note' | 'audio') => {
    const isRecording = type === 'video_note' ? isRecordingVideo : isRecordingAudio;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(type);
    }
  };

  const handleSendMessage = useCallback(async (content_msg: string = messageInput, type_msg: Message['contentType'] = 'text') => {
    if (!content_msg.trim() && type_msg !== 'video_note' && type_msg !== 'sticker' && type_msg !== 'audio') return;
    if (!currentChatId || !firebaseUser || !db) return;
    
    let finalContent = content_msg;
    if (type_msg === 'text') {
      finalContent = encryptSignal(content_msg);
    } else if (type_msg === 'image') {
      finalContent = await compressImage(content_msg, 800, 0.4);
    }

    const captureReply = replyTo;
    const captureEdit = editingMsg;

    setMessageInput('');
    setReplyTo(null); setEditingMsg(null); setShowEmojiPicker(false);
    if (currentChatId) setLocalDrafts(prev => ({ ...prev, [currentChatId]: '' }));

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
    scrollToBottom();
  }, [messageInput, currentChatId, firebaseUser, db, userProfile, replyTo, editingMsg, setLocalDrafts, scrollToBottom]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden z-20">
      {userProfile?.settings?.chatBackground && (
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundImage: `url(${userProfile.settings.chatBackground})`, backgroundSize: userProfile.settings.chatBackgroundFit === 'contain' ? 'contain' : 'cover', backgroundPosition: 'center', backgroundColor: '#0a0a0c' }} />
      )}

      <header className="h-16 border-b border-white/5 bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 z-30">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden rounded-lg" onClick={() => setCurrentChatId(null)}><ChevronLeft /></Button>
          <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setIsChatInfoOpen(true)}>
            <UserAvatar userId={otherId} manualAvatarUrl={chat?.avatarUrl || otherProfile?.avatarUrl} className="h-10 w-10" fallbackName={chat?.name || otherProfile?.name} showOnlineStatus />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm truncate">{formatDisplayName(chat?.name || otherProfile?.name)}</span>
              <span className="text-[10px] text-primary/80 font-bold uppercase tracking-widest">{isTyping ? 'печатает...' : (chat?.type === 'private' ? formatLastSeen(otherProfile?.lastSeen) : 'сообщество')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsSearchMode(!isSearchMode)} className={cn(isSearchMode && "text-primary")}><Search className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)}><Info className="w-5 h-5" /></Button>
        </div>
      </header>

      {pinnedMessage && (
        <div className="h-12 bg-white/5 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 animate-in slide-in-from-top-2 z-20">
          <div className="flex items-center gap-3 min-w-0 cursor-pointer overflow-hidden">
            <div className="w-1 h-8 bg-primary rounded-full" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Закреплено</span>
              <p className="text-xs text-white/60 truncate italic">{pinnedMessage.contentType === 'text' ? decryptSignal(pinnedMessage.content) : `[${pinnedMessage.contentType}]`}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40" onClick={() => updateDocumentNonBlocking(doc(db!, 'chats', currentChatId!), { pinnedMessageId: null })}><X className="w-4 h-4" /></Button>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        <ScrollArea 
          onScroll={handleScroll}
          className="h-full w-full relative z-10 scrollbar-hide"
        >
          <MessageList 
            messages={messages} 
            userId={firebaseUser?.uid} 
            chatId={currentChatId} 
            onReply={setReplyTo} 
            onEdit={setEditingMsg} 
            amIPremium={userProfile?.isPremium} 
            isAdmin={isGlobalAdmin(userProfile)} 
            isGroup={chat?.type !== 'private'} 
            searchQuery={searchQuery} 
            viewerProfile={userProfile} 
          />
          <div ref={messagesEndRef} className="h-4" />
        </ScrollArea>

        {showScrollBottom && (
          <Button 
            size="icon" 
            className="absolute bottom-6 right-6 h-10 w-10 rounded-full bg-card/80 backdrop-blur-xl border border-white/10 shadow-2xl z-40 animate-in fade-in zoom-in"
            onClick={() => scrollToBottom()}
          >
            <ArrowDown className="w-5 h-5 text-primary" />
          </Button>
        )}
      </div>

      <footer className="p-3 pb-6 bg-[#0a0a0c]/90 backdrop-blur-2xl border-t border-white/5 shrink-0 z-30">
        <div className="max-w-4xl mx-auto space-y-2">
          {replyTo && (
            <div className="p-2 bg-muted/50 rounded-xl border-l-4 border-accent flex items-center justify-between animate-in slide-in-from-bottom-1">
              <div className="flex flex-col min-w-0 pl-2">
                <span className="text-[9px] font-bold text-accent uppercase tracking-widest">Ответ: {replyTo.senderName}</span>
                <span className="text-xs truncate italic">{decryptSignal(replyTo.content)}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></Button>
            </div>
          )}
          <div className="flex gap-3 items-center">
            <Popover>
              <PopoverTrigger asChild><Button variant="ghost" size="icon"><Paperclip /></Button></PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-48 bg-card border-white/10 rounded-2xl p-1 mb-2">
                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-xs" onClick={() => fileInputRef.current?.click()}><ImageIcon className="w-4 h-4" /> Галерея</Button>
                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-xs" onClick={() => setIsPollModalOpen(true)}><BarChart3 className="w-4 h-4" /> Опрос</Button>
              </PopoverContent>
            </Popover>
            <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" multiple onChange={async (e) => {
              const processed = await Promise.all(Array.from(e.target.files || []).map(f => new Promise(res => { const r = new FileReader(); r.onloadend = () => res({ url: r.result as string, type: f.type.startsWith('video') ? 'video' : 'image' }); r.readAsDataURL(f); })));
              setSelectedFiles(processed as any); setIsPreviewModalOpen(true);
            }} />
            <div className="flex-1 flex items-center bg-white/[0.03] rounded-2xl border border-white/[0.05] h-11 px-4 relative group">
              <Input placeholder="Сообщение" className="bg-transparent border-none focus-visible:ring-0" value={messageInput} onChange={e => handleInputChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
              <div className="flex items-center gap-2">
                {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <button onClick={handleAiDraft} className="text-primary/40 hover:text-primary transition-colors"><Sparkles className="w-4 h-4" /></button>}
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-white/20 hover:text-white transition-colors"><Smile /></button>
              </div>
            </div>
            {messageInput.trim() ? (
              <Button size="icon" className="h-10 w-10 rounded-full bg-primary shadow-lg" onClick={() => handleSendMessage()}><Send className="w-5 h-5" /></Button>
            ) : (
              <div className="flex gap-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className={cn("h-10 w-10 rounded-full", isRecordingVideo && "text-red-500 bg-red-500/10")} 
                  onClick={() => handleRecordInteraction('video_note')}
                >
                  {isRecordingVideo ? <StopCircle className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className={cn("h-10 w-10 rounded-full", isRecordingAudio && "text-primary bg-primary/10")} 
                  onClick={() => handleRecordInteraction('audio')}
                >
                  {isRecordingAudio ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      </footer>

      {showEmojiPicker && <div className="absolute bottom-20 right-4 z-50 w-[320px] h-[400px]"><EmojiPicker onEmojiSelect={(e) => handleInputChange(messageInput + e)} onStickerSelect={(url) => handleSendMessage(url, 'sticker')} /></div>}
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      <ImagePreviewModal open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen} files={selectedFiles} onRemove={(i) => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} onSend={async () => { for (const f of selectedFiles) await handleSendMessage(f.url, f.type); setSelectedFiles([]); setIsPreviewModalOpen(false); }} isSending={false} />
      {currentChatId && <CreatePollModal open={isPollModalOpen} onOpenChange={setIsPollModalOpen} chatId={currentChatId} />}
    </div>
  );
}
