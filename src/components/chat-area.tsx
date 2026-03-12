
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
import { formatDisplayName, cn, formatLastSeen, compressImage, encryptSignal, isGlobalAdmin } from '@/lib/utils';
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
  searchQuery,
  viewerProfile
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

  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashOn, setFlashOn] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
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
  const isKernelAdmin = useMemo(() => isGlobalAdmin(userProfile), [userProfile]);

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
    return chat?.ownerId === firebaseUser?.uid || chat?.adminIds?.includes(firebaseUser?.uid || '') || isKernelAdmin;
  }, [chat, firebaseUser, isKernelAdmin]);

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
    if (!db || !currentChatId || !firebaseUser || !messages || !chat) return;
    
    // Админ не помечает как прочитанные если просто подглядывает
    if (!chat.participantIds.includes(firebaseUser.uid)) return;

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
      } catch (e) {}
    };

    markAsRead();
  }, [messages, currentChatId, firebaseUser, db, chat]);

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
    if (lower === '/newpack') { currentPackIdRef.current = 'pending_name'; botReply("Отлично! Как назовем новый стикерпак?"); return true; }
    if (currentPackIdRef.current === 'pending_name') {
      const packName = content.trim();
      const packId = `pack_${Date.now()}`;
      await setDoc(doc(db, 'stickerPacks', packId), { id: packId, ownerId: firebaseUser.uid, name: packName, iconUrl: null, stickerUrls: [], createdAt: new Date().toISOString() });
      await updateDoc(doc(db, 'users', firebaseUser.uid), { installedStickerPackIds: arrayUnion(packId) });
      currentPackIdRef.current = packId;
      botReply(`Пак "${packName}" создан! Отправьте фото.`);
      return true;
    }
    return false;
  };

  const handleSendMessage = useCallback(async (content_msg: string = messageInput, type_msg: Message['contentType'] = 'text') => {
    if (!content_msg.trim() && type_msg !== 'audio' && type_msg !== 'video_note' && type_msg !== 'sticker') return;
    if (!currentChatId || !firebaseUser || !db) return;
    
    // Если админ в чужом чате, запрещаем отправку чтобы не "светиться"
    if (chat && !chat.participantIds.includes(firebaseUser.uid)) {
      toast({ title: "Только чтение", description: "Вы находитесь в режиме перехвата." });
      return;
    }

    let finalContent = content_msg;
    if (type_msg === 'image' && finalContent.startsWith('data:image')) {
      finalContent = await compressImage(finalContent);
    }

    if (type_msg === 'text') {
      finalContent = encryptSignal(finalContent);
    }

    const isBotIntercepted = await handleBotLogic(finalContent, type_msg);
    if (isBotIntercepted) { setMessageInput(''); return; }
    
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
        content: finalContent, 
        editedAt: new Date().toISOString() 
      });
      return;
    }

    const senderDisplayName = userProfile?.name || firebaseUser.displayName || 'Nuxus User';

    const msgData: Partial<Message> = { 
      chatId: currentChatId, 
      senderId: firebaseUser.uid, 
      senderName: senderDisplayName, 
      content: finalContent, 
      contentType: type_msg, 
      sentAt: new Date().toISOString(), 
      isRead: false,
      lastSenderId: firebaseUser.uid
    };
    
    if (captureReply) { 
      msgData.replyToId = captureReply.id; 
      msgData.replyToContent = captureReply.contentType === 'text' ? captureReply.content : `[${captureReply.contentType}]`; 
    }
    
    await addDoc(collection(db, 'chats', currentChatId, 'messages'), msgData);
    
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { 
      lastMessageAt: new Date().toISOString(), 
      lastSenderId: firebaseUser.uid 
    });

  }, [messageInput, currentChatId, firebaseUser, db, userProfile, replyTo, editingMsg, setLocalDrafts, chat, toast]);

  const startRecording = async (type: 'audio' | 'video' = 'audio') => {
    try {
      const isVideo = type === 'video';
      const constraints = { audio: true, video: isVideo ? { facingMode: facingMode } : false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const mimeType = isVideo ? 'video/webm' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder; 
      chunksRef.current = [];
      if (isVideo && videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
      recorder.ondataavailable = (e) => { if (e.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader(); 
        reader.readAsDataURL(blob);
        reader.onloadend = () => { if (reader.result) handleSendMessage(reader.result as string, isVideo ? 'video_note' : 'audio'); };
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start(100);
      if (isVideo) setIsRecordingVideo(true); else setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => { if (!isPaused) setRecordingTime(p => p + 10); }, 10);
    } catch (err) { toast({ variant: 'destructive', title: 'Ошибка записи' }); }
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
      if (recorderRef.current.state === 'recording') { recorderRef.current.pause(); setIsPaused(true); }
      else if (recorderRef.current.state === 'paused') { recorderRef.current.resume(); setIsPaused(false); }
    }
  };

  const handleAiDraft = async () => {
    if (!messages || messages.length === 0 || isAiLoading) return;
    setIsAiLoading(true);
    try {
      const history = messages.slice(-5).map(m => ({ sender: m.senderName, message: m.contentType === 'text' ? m.content : `[${m.contentType}]` }));
      const result = await suggestMessageDraft({ conversationHistory: history, currentUserInput: messageInput });
      if (result.draftMessage) handleInputChange(result.draftMessage);
    } catch (e) {} finally { setIsAiLoading(false); }
  };

  const isAdminIntercept = chat && !chat.participantIds.includes(firebaseUser?.uid || '');

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden z-20">
      {userProfile?.settings?.chatBackground && (
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundImage: `url(${userProfile.settings.chatBackground})`, backgroundSize: userProfile.settings.chatBackgroundFit === 'contain' ? 'contain' : 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: '#0a0a0c' }} />
      )}

      {isRecordingVideo && (
        <div className="fixed inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative w-full max-w-[320px] aspect-square mb-12">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/10 bg-black">
              <video ref={videoPreviewRef} autoPlay muted playsInline className={cn("w-full h-full object-cover", facingMode === 'user' && "scale-x-[-1]")} />
            </div>
          </div>
          <div className="w-full max-w-sm px-8 flex items-center justify-between">
            <Button variant="ghost" onClick={() => stopRecording(false)} className="text-red-500"><Trash2 className="w-7 h-7" /></Button>
            <Button onClick={togglePause} className="h-16 w-16 rounded-full border-4 border-primary text-primary">{isPaused ? <Play /> : <Pause />}</Button>
            <Button onClick={() => stopRecording(true)} className="h-14 w-14 rounded-full bg-primary"><Send /></Button>
          </div>
        </div>
      )}

      <header className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-card/80 backdrop-blur-xl shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" className="md:hidden rounded-lg" onClick={() => setCurrentChatId(null)}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="flex items-center gap-3 cursor-pointer min-w-0 group" onClick={() => setIsChatInfoOpen(true)}>
            <UserAvatar userId={otherId} manualAvatarUrl={chat?.avatarUrl || otherProfile?.avatarUrl} className="h-10 w-10" fallbackName={chat?.name || otherProfile?.name} showOnlineStatus />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm truncate group-hover:text-primary transition-colors">{formatDisplayName(chat?.name || otherProfile?.name)}</span>
                {isAdminIntercept && <div className="bg-accent/20 px-1.5 py-0.5 rounded text-[7px] font-black text-accent uppercase animate-pulse">Intercept</div>}
              </div>
              <span className="text-[10px] text-muted-foreground/60 tracking-widest truncate uppercase font-bold">{isPrivate ? formatLastSeen(otherProfile?.lastSeen, otherProfile?.settings?.privacy?.lastSeenVisibility) : 'NUXUS 2.0'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsSearchMode(!isSearchMode)}><Search className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)}><Info className="w-5 h-5" /></Button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        <ScrollArea ref={scrollRef} className="h-full w-full relative z-10 scrollbar-hide bg-transparent" onClick={() => setShowEmojiPicker(false)}>
          {messages && (
            <MessageList 
              messages={messages} 
              userId={firebaseUser?.uid} 
              chatId={currentChatId} 
              onReply={setReplyTo} 
              onEdit={setEditingMsg} 
              onPin={(m: any) => updateDoc(doc(db!, 'chats', currentChatId!), { pinnedMessageId: m.id })}
              onForward={(m: any) => setForwardingMessage(m)}
              amIPremium={userProfile?.isPremium} 
              isAdmin={isAdmin} 
              isGroup={chat?.type === 'group'} 
              searchQuery={searchQuery}
              viewerProfile={userProfile}
            />
          )}
        </ScrollArea>
      </div>

      <footer className="p-3 pb-6 bg-[#0a0a0c]/90 backdrop-blur-2xl border-t border-white/5 shrink-0 relative z-30">
        <div className="max-w-4xl mx-auto space-y-2">
          {replyTo && (
            <div className="p-2 bg-muted/50 rounded-xl border-l-4 border-accent flex items-center justify-between animate-in slide-in-from-bottom-1">
              <div className="flex flex-col min-w-0 pl-2"><span className="text-[9px] font-bold text-accent uppercase tracking-widest">Ответ: {replyTo.senderName}</span><span className="text-xs truncate text-muted-foreground italic">{replyTo.content}</span></div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></Button>
            </div>
          )}
          <div className="flex gap-3 items-center">
            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}><Paperclip /></Button>
            <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" multiple onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) {
                const processed = await Promise.all(files.map(f => new Promise(res => { const r = new FileReader(); r.onloadend = () => res({ url: r.result as string, type: f.type.startsWith('video') ? 'video' : 'image' }); r.readAsDataURL(f); })));
                setSelectedFiles(processed as any); setIsPreviewModalOpen(true);
              }
            }} />
            <div className="flex-1 flex items-center bg-white/[0.03] rounded-[1.5rem] border border-white/[0.05] h-11 px-4 relative">
              <Input 
                placeholder={isAdminIntercept ? "Режим просмотра..." : "Сообщение"} 
                readOnly={isAdminIntercept}
                className="bg-transparent border-none focus-visible:ring-0" 
                value={messageInput} 
                onChange={e => handleInputChange(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()} 
              />
              {!isAdminIntercept && <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="ml-2 text-white/20 hover:text-white"><Smile /></button>}
            </div>
            {!isAdminIntercept && <Button size="icon" className="h-10 w-10 rounded-full bg-primary" onClick={() => handleSendMessage()}><Send className="w-5 h-5" /></Button>}
          </div>
        </div>
      </footer>
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      <ImagePreviewModal open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen} files={selectedFiles} onRemove={(i) => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} onSend={async () => { setIsSendingFiles(true); for (const f of selectedFiles) await handleSendMessage(f.url, f.type); setSelectedFiles([]); setIsPreviewModalOpen(false); setIsSendingFiles(false); }} isSending={isSendingFiles} />
    </div>
  );
}
