
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, X, Paperclip, Mic, StopCircle, ChevronDown, Edit2, Pin, Search, PinOff
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { ImagePreviewModal } from './modals/image-preview-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, limit, updateDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { formatDisplayName, cn } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';

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
  
  const filteredMessages = searchQuery 
    ? messages.filter((m: Message) => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

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

  const [selectedFiles, setSelectedFiles] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isSendingFiles, setIsSendingFiles] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dataLoadedRef = useRef(false);
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

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

  // Draft handling
  useEffect(() => {
    if (currentChatId) {
      setMessageInput(localDrafts[currentChatId] || '');
    }
  }, [currentChatId]);

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

  const handleSendMessage = useCallback(async (content_msg: string = messageInput, type_msg: Message['contentType'] = 'text') => {
    if (!content_msg.trim() || !currentChatId || !firebaseUser || !db) return;
    
    const captureContent = content_msg.trim();
    const captureReply = replyTo;
    const captureEdit = editingMsg;

    if (type_msg === 'text') {
      setMessageInput('');
      setLocalDrafts(prev => ({ ...prev, [currentChatId]: '' }));
    }
    setReplyTo(null); 
    setEditingMsg(null);

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
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString() });
  }, [messageInput, currentChatId, firebaseUser, db, userProfile, replyTo, editingMsg]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader(); reader.readAsDataURL(blob);
        reader.onloadend = () => handleSendMessage(reader.result as string, 'audio');
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start(); setIsRecording(true); setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch (err: any) { 
      toast({ variant: 'destructive', title: 'Доступ запрещен', description: 'Разрешите доступ к микрофону.' }); 
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

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden z-20">
      {userProfile?.settings?.chatBackground && (
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundImage: `url(${userProfile.settings.chatBackground})`, backgroundSize: userProfile.settings.chatBackgroundFit === 'contain' ? 'contain' : 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: '#0a0a0c', transform: 'translateZ(0)' }} />
      )}

      <header className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-card/80 backdrop-blur-xl shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" className="md:hidden rounded-lg" onClick={() => setCurrentChatId(null)}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="flex items-center gap-3 cursor-pointer min-w-0 group" onClick={() => setIsChatInfoOpen(true)}>
            <UserAvatar userId={otherId} manualAvatarUrl={chat?.avatarUrl || otherProfile?.avatarUrl} className="h-10 w-10" fallbackName={chatDisplayName} />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm truncate group-hover:text-primary transition-colors">{formatDisplayName(chatDisplayName)}</span>
              <span className="text-[10px] text-muted-foreground/60 tracking-widest truncate uppercase font-bold">Ядро Nuxus</span>
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
        <ScrollArea ref={scrollRef} className="h-full w-full relative z-10 scrollbar-hide bg-transparent">
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

      <footer className="p-3 bg-card/80 backdrop-blur-2xl border-t border-white/5 shrink-0 relative z-30">
        <div className="max-w-4xl mx-auto space-y-2">
          {isRecording && (
            <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-2xl border border-red-500/20 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3"><div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" /><span className="text-xs font-black text-red-500 uppercase tracking-widest">Запись ГС: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span></div>
              <div className="flex items-center gap-2"><Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold text-muted-foreground" onClick={() => stopRecording(false)}>Отмена</Button><Button size="icon" className="h-9 w-9 rounded-xl bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20" onClick={() => stopRecording(true)}><StopCircle className="w-5 h-5" /></Button></div>
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

          <div className="flex gap-2 items-end">
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl shrink-0 bg-muted hover:bg-muted/80 transition-colors" disabled={isRecording} onClick={() => fileInputRef.current?.click()}><Paperclip className="w-5 h-5 text-muted-foreground" /></Button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" multiple onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) {
                const newFiles = files.map(f => ({ url: URL.createObjectURL(f), type: f.type.startsWith('video') ? 'video' : 'image' }));
                setSelectedFiles(newFiles as any);
                setIsPreviewModalOpen(true);
              }
            }} />
            <div className="flex-1 relative">
              <Input ref={inputRef} placeholder="Напишите сообщение..." className="bg-muted border-none rounded-xl h-11 text-sm px-4 focus-visible:ring-1 focus-visible:ring-primary/20" value={messageInput} onChange={e => handleInputChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { handleSendMessage(); } }} disabled={isRecording} />
            </div>
            {!messageInput.trim() && !isRecording ? (
              <Button size="icon" className="h-11 w-11 rounded-xl shrink-0 bg-primary" onClick={startRecording}><Mic className="w-5 h-5" /></Button>
            ) : (
              !isRecording && <Button size="icon" className="h-11 w-11 rounded-xl shrink-0 bg-primary" onClick={() => handleSendMessage()}><Send className="w-5 h-5" /></Button>
            )}
          </div>
        </div>
      </footer>
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      <ImagePreviewModal open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen} files={selectedFiles} onRemove={(i) => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} onSend={() => { setIsSendingFiles(true); setTimeout(() => { setIsPreviewModalOpen(false); setIsSendingFiles(false); toast({ title: "Файлы отправлены" }); }, 1000); }} isSending={isSendingFiles} />
    </div>
  );
}
