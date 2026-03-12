
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, X, Paperclip, Mic, StopCircle, ChevronDown, Edit2, Pin, Search, PinOff,
  Smile, Instagram, Camera, Video, Sticker, Copy, Share2, Sparkles, Loader2, RefreshCw, Zap, Trash2, Pause, Play,
  BarChart3, Image as ImageIcon
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
    ? sortedMessages.filter((m: Message) => 
        decryptSignal(m.content)?.toLowerCase().includes(searchQuery.toLowerCase())
      )
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
          highlight={searchQuery && decryptSignal(msg.content)?.toLowerCase().includes(searchQuery.toLowerCase())}
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
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
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

  const scrollToMessage = useCallback((msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-2xl');
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000);
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

  const handleAiDraft = async () => {
    if (!messages || messages.length === 0 || isAiLoading) return;
    setIsAiLoading(true);
    try {
      const history = messages.slice(-5).map(m => ({ sender: m.senderName, message: m.contentType === 'text' ? decryptSignal(m.content) : `[${m.contentType}]` }));
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

      <header className="flex flex-col border-b border-white/5 bg-card/80 backdrop-blur-xl shrink-0 z-30">
        <div className="h-16 flex items-center justify-between px-4">
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
            <Button variant="ghost" size="icon" className={cn(isSearchMode && "text-primary bg-primary/10")} onClick={() => setIsSearchMode(!isSearchMode)}><Search className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)}><Info className="w-5 h-5" /></Button>
          </div>
        </div>

        {isSearchMode && (
          <div className="px-4 py-2 bg-white/5 animate-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                autoFocus
                placeholder="Поиск сообщений..." 
                className="bg-black/20 border-none h-10 pl-10 rounded-xl"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => { setIsSearchMode(false); setSearchQuery(''); }}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {pinnedMessage && (
          <div 
            className="px-4 py-2 bg-primary/5 border-t border-white/5 flex items-center justify-between cursor-pointer hover:bg-primary/10 transition-colors group"
            onClick={() => scrollToMessage(pinnedMessage.id)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-1 h-8 bg-primary rounded-full" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black uppercase text-primary tracking-widest">Закреплено</span>
                <p className="text-xs text-white/80 truncate font-medium">
                  {pinnedMessage.contentType === 'text' ? decryptSignal(pinnedMessage.content) : `[${pinnedMessage.contentType}]`}
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); updateDoc(doc(db!, 'chats', currentChatId!), { pinnedMessageId: null }); }}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
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
        {showScrollBottom && (
          <Button size="icon" className="absolute bottom-6 right-6 h-10 w-10 rounded-full bg-card/80 backdrop-blur-md shadow-xl border border-white/5 z-20" onClick={() => scrollToBottom('smooth')}>
            <ChevronDown className="w-5 h-5" />
          </Button>
        )}
      </div>

      <footer className="p-3 pb-6 bg-[#0a0a0c]/90 backdrop-blur-2xl border-t border-white/5 shrink-0 relative z-30">
        <div className="max-w-4xl mx-auto space-y-2">
          {replyTo && (
            <div className="p-2 bg-muted/50 rounded-xl border-l-4 border-accent flex items-center justify-between animate-in slide-in-from-bottom-1">
              <div className="flex flex-col min-w-0 pl-2">
                <span className="text-[9px] font-bold text-accent uppercase tracking-widest">Ответ: {replyTo.senderName}</span>
                <span className="text-xs truncate text-muted-foreground italic">{decryptSignal(replyTo.content)}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></Button>
            </div>
          )}
          <div className="flex gap-3 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white"><Paperclip /></Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-48 bg-card border-white/10 rounded-2xl p-1 mb-2">
                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-xs font-bold uppercase tracking-wider" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="w-4 h-4 text-primary" /> Галерея
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-xs font-bold uppercase tracking-wider" onClick={() => setIsPollModalOpen(true)}>
                  <BarChart3 className="w-4 h-4 text-accent" /> Опрос
                </Button>
              </PopoverContent>
            </Popover>

            <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" multiple onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) {
                const processed = await Promise.all(files.map(f => new Promise(res => { const r = new FileReader(); r.onloadend = () => res({ url: r.result as string, type: f.type.startsWith('video') ? 'video' : 'image' }); r.readAsDataURL(f); })));
                setSelectedFiles(processed as any); setIsPreviewModalOpen(true);
              }
            }} />
            <div className="flex-1 flex items-center bg-white/[0.03] rounded-[1.5rem] border border-white/[0.05] h-11 px-4 relative group">
              <Input 
                placeholder={isAdminIntercept ? "Режим просмотра..." : "Сообщение"} 
                readOnly={isAdminIntercept}
                className="bg-transparent border-none focus-visible:ring-0" 
                value={messageInput} 
                onChange={e => handleInputChange(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()} 
              />
              {!isAdminIntercept && (
                <div className="flex items-center gap-2">
                  {messages && messages.length > 0 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary/40 hover:text-primary opacity-0 group-focus-within:opacity-100 transition-opacity" onClick={handleAiDraft} disabled={isAiLoading}>
                      {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    </Button>
                  )}
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-white/20 hover:text-white transition-colors"><Smile /></button>
                </div>
              )}
            </div>
            {!isAdminIntercept && (
              messageInput.trim() ? (
                <Button size="icon" className="h-10 w-10 rounded-full bg-primary shadow-lg shadow-primary/20" onClick={() => handleSendMessage()}>
                  <Send className="w-5 h-5" />
                </Button>
              ) : (
                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full hover:bg-white/5" onMouseDown={() => startRecording()} onMouseUp={() => stopRecording()} onTouchStart={() => startRecording()} onTouchEnd={() => stopRecording()}>
                  <Mic className={cn("w-5 h-5 transition-colors", isRecording && "text-red-500 animate-pulse")} />
                </Button>
              )
            )}
          </div>
        </div>
      </footer>

      {showEmojiPicker && (
        <div className="absolute bottom-[80px] right-4 z-50 w-[320px] h-[400px] animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
          <EmojiPicker 
            onEmojiSelect={(e) => handleInputChange(messageInput + e)} 
            onStickerSelect={(url) => handleSendMessage(url, 'sticker')} 
          />
        </div>
      )}

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      <ImagePreviewModal open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen} files={selectedFiles} onRemove={(i) => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} onSend={async () => { setIsSendingFiles(true); for (const f of selectedFiles) await handleSendMessage(f.url, f.type); setSelectedFiles([]); setIsPreviewModalOpen(false); setIsSendingFiles(false); }} isSending={isSendingFiles} />
      {currentChatId && <CreatePollModal open={isPollModalOpen} onOpenChange={setIsPollModalOpen} chatId={currentChatId} />}
    </div>
  );
}
