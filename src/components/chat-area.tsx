
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, Loader2, Bookmark, X, Video, Circle, Wand2, Phone, Search as SearchIcon,
  Zap, Calendar as CalendarIcon
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, updateDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { formatDisplayName, isUserPremium, isGlobalAdmin } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useTranslations } from '@/hooks/use-translations';

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

const MessageList = memo(({ 
  messages, 
  userId, 
  chatId, 
  onReply, 
  amIPremium, 
  isAdmin, 
  otherAvatarUrl,
  onEdit
}: any) => {
  if (!messages) return null;
  const visibleMessages = messages.filter((m: Message) => {
    if (m.senderId === userId) return true;
    if (m.scheduledAt) return new Date(m.scheduledAt).getTime() <= Date.now();
    return true;
  });
  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto px-4 md:px-6 py-8 min-h-full">
      {visibleMessages.map((msg: Message) => (
        <MessageItem 
          key={msg.id} 
          message={msg} 
          isMe={msg.senderId === userId} 
          chatId={chatId} 
          onReply={onReply} 
          amIPremium={amIPremium}
          isAdmin={isAdmin}
          senderAvatarUrl={msg.senderId === userId ? null : otherAvatarUrl}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
});
MessageList.displayName = 'MessageList';

export default function ChatArea() {
  const { user: firebaseUser } = useUser();
  const db = useFirestore();
  const { t } = useTranslations();
  const { currentChatId, setCurrentChatId, setForwardingMessage, setActiveCallId } = useAppState();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [localDrafts, setLocalDrafts] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingLocal, setIsSearchingLocal] = useState(false);
  
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [expiryTime, setExpiryTime] = useState<number | null>(null);
  const [isOneTime, setIsOneTime] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dataLoadedRef = useRef(false);
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);
  const amIPremium = useMemo(() => isUserPremium(userProfile), [userProfile]);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const otherId = useMemo(() => {
    if (chat?.type === 'private' && firebaseUser) return chat.participantIds?.find((id: string) => id !== firebaseUser.uid);
    return null;
  }, [chat, firebaseUser]);

  const otherProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(otherProfileRef);

  const otherMetadata = useMemo(() => {
    if (otherId && chat?.metadata && chat.metadata[otherId]) return chat.metadata[otherId];
    return null;
  }, [otherId, chat]);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !currentChatId) return null;
    return query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc'));
  }, [db, currentChatId]);
  
  const { data: rawMessages } = useCollection<Message>(messagesQuery);

  const messages = useMemo(() => {
    if (!rawMessages) return null;
    if (!searchQuery.trim()) return rawMessages;
    return rawMessages.filter(m => m.contentType === 'text' && m.content.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [rawMessages, searchQuery]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
      if ("Notification" in window && Notification.permission === 'default') Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!messages || !firebaseUser || !currentChatId || !db) return;
    const unreadFromOthers = messages.filter(m => !m.isRead && m.senderId !== firebaseUser.uid);
    if (unreadFromOthers.length > 0) {
      unreadFromOthers.forEach(msg => updateDocumentNonBlocking(doc(db, 'chats', currentChatId, 'messages', msg.id), { isRead: true }));
    }
  }, [messages, firebaseUser, currentChatId, db]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    }
  }, []);

  useEffect(() => {
    if (!db || !currentChatId || !firebaseUser) return;
    const typingRef = doc(db, 'chats', currentChatId);
    if (messageInput.length > 0) updateDoc(typingRef, { [`typing.${firebaseUser.uid}`]: true }).catch(() => {});
    else updateDoc(typingRef, { [`typing.${firebaseUser.uid}`]: false }).catch(() => {});
  }, [messageInput, currentChatId, firebaseUser, db]);

  useEffect(() => {
    if (currentChatId) setMessageInput(localDrafts[currentChatId] || '');
  }, [currentChatId, localDrafts]);

  const onInputChange = (val: string) => {
    setMessageInput(val);
    if (currentChatId) setLocalDrafts(prev => ({ ...prev, [currentChatId]: val }));
  };

  useEffect(() => {
    if (messages?.length) {
      if (!dataLoadedRef.current) {
        setTimeout(() => scrollToBottom('instant' as any), 100);
        dataLoadedRef.current = true;
      } else {
        scrollToBottom('smooth');
      }
    }
  }, [messages?.length, currentChatId, scrollToBottom]);

  useEffect(() => { dataLoadedRef.current = false; }, [currentChatId]);

  const handleSendMessage = useCallback((content_msg: string = messageInput, type_msg: Message['contentType'] = 'text') => {
    const trimmedContent = content_msg.trim();
    if (!trimmedContent || !currentChatId || !firebaseUser || !db) return;
    setIsSending(true);
    if (editingMsg) {
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId, 'messages', editingMsg.id), {
        content: trimmedContent,
        editedAt: new Date().toISOString()
      });
      setEditingMsg(null);
      setMessageInput('');
      setIsSending(false);
      return;
    }
    const msgData: Partial<Message> = { 
      chatId: currentChatId, 
      senderId: firebaseUser.uid, 
      senderName: userProfile?.name || 'User', 
      content: trimmedContent, 
      contentType: type_msg, 
      sentAt: new Date().toISOString(), 
      isRead: false,
      scheduledAt: scheduledDate ? scheduledDate.toISOString() : null,
      expiresInSeconds: expiryTime,
      isOneTimeView: isOneTime
    };
    if (replyTo) {
      msgData.replyToId = replyTo.id;
      msgData.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[${replyTo.contentType}]`;
      setReplyTo(null);
    }
    addDocumentNonBlocking(collection(db, 'chats', currentChatId, 'messages'), msgData);
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString() });
    setScheduledDate(undefined);
    setExpiryTime(null);
    setIsOneTime(false);
    if (type_msg === 'text') {
      setMessageInput('');
      if (currentChatId) setLocalDrafts(prev => ({ ...prev, [currentChatId]: '' }));
    }
    setIsSending(false);
    setTimeout(() => scrollToBottom('smooth'), 100);
  }, [messageInput, currentChatId, firebaseUser, db, userProfile, replyTo, editingMsg, scrollToBottom, scheduledDate, expiryTime, isOneTime]);

  const handleAiDraft = async () => {
    if (!messages || !amIPremium) return;
    setIsDrafting(true);
    try {
      const history = messages.slice(-5).map(m => ({ sender: m.senderName, message: m.content }));
      const { draftMessage } = await suggestMessageDraft({ conversationHistory: history, currentUserInput: messageInput });
      setMessageInput(draftMessage);
      toast({ title: "ИИ предложил", description: "Текст вставлен в поле ввода." });
    } catch (e) {
      toast({ title: "Ошибка ИИ", description: "Не удалось создать черновик.", variant: "destructive" });
    } finally {
      setIsDrafting(false);
    }
  };

  const startCall = async (type_call: 'audio' | 'video') => {
    if (!db || !firebaseUser || !otherId || !currentChatId) return;
    try {
      const callData = { callerId: firebaseUser.uid, callerName: userProfile?.name || 'User', receiverId: otherId, chatId: currentChatId, type: type_call, status: 'calling', createdAt: new Date().toISOString() };
      const callDoc = await addDoc(collection(db, 'calls'), callData);
      setActiveCallId(callDoc.id);
    } catch (e) { toast({ title: "Ошибка", description: "Не удалось начать вызов.", variant: "destructive" }); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480 }, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => { handleSendMessage(reader.result as string, 'video'); };
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
    } catch (err) { toast({ variant: 'destructive', title: 'Ошибка камеры', description: 'Предоставьте доступ к камере в настройках.' }); }
  };

  const chatDisplayName = useMemo(() => {
    if (otherProfile?.name) return otherProfile.name;
    if (otherMetadata?.name) return otherMetadata.name;
    return chat?.name || '...';
  }, [chat, otherMetadata, otherProfile]);

  if (!currentChatId) return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background relative overflow-hidden">
      <div className="bg-muted p-10 rounded-full mb-6 animate-float relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse-glow" />
        <Bookmark className="w-16 h-16 text-muted-foreground/30 relative z-10" />
      </div>
      <h2 className="text-xl font-bold text-muted-foreground uppercase tracking-[0.3em]">Выберите диалог Nuxus</h2>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden z-20">
      <header className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" className="md:hidden rounded-lg hover:bg-white/5" onClick={() => setCurrentChatId(null)}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          {isSearchingLocal ? (
            <div className="flex-1 flex items-center gap-2">
              <SearchIcon className="w-4 h-4 text-muted-foreground" />
              <Input autoFocus placeholder="Поиск сообщений..." className="bg-transparent border-none h-8 text-sm focus-visible:ring-0" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setIsSearchingLocal(false); setSearchQuery(''); }}><X className="w-4 h-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 cursor-pointer min-w-0 group" onClick={() => setIsChatInfoOpen(true)}>
              <UserAvatar userId={otherId} manualAvatarUrl={otherMetadata?.avatarUrl} className="h-10 w-10" fallbackName={chatDisplayName} />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm truncate group-hover:text-primary transition-colors">{formatDisplayName(chatDisplayName)}</span>
                <span className="text-[10px] text-muted-foreground/60 tracking-widest truncate uppercase">Ядро Nuxus</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isSearchingLocal && <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => setIsSearchingLocal(true)}><SearchIcon className="w-5 h-5" /></Button>}
          {chat?.type === 'private' && (
            <>
              <Button variant="ghost" size="icon" className="rounded-lg text-primary" onClick={() => startCall('audio')}><Phone className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" className="rounded-lg text-primary" onClick={() => startCall('video')}><Video className="w-5 h-5" /></Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="rounded-lg"><Info className="w-5 h-5" /></Button>
        </div>
      </header>

      <ScrollArea ref={scrollRef} className="flex-1 w-full relative z-10 scrollbar-hide">
        {messages && (
          <MessageList 
            messages={messages} userId={firebaseUser?.uid} chatId={currentChatId} onReply={setReplyTo} onEdit={(msg: Message) => { setEditingMsg(msg); setMessageInput(msg.content); setReplyTo(null); }} amIPremium={amIPremium} isAdmin={chat?.ownerId === firebaseUser?.uid || isGlobalAdmin(userProfile)} otherAvatarUrl={otherProfile?.avatarUrl || otherMetadata?.avatarUrl}
          />
        )}
      </ScrollArea>

      <footer className="p-3 bg-card border-t border-white/5 shrink-0">
        <div className="max-w-4xl mx-auto space-y-2">
          {replyTo && (
            <div className="p-2 bg-muted/50 rounded-xl border-l-4 border-primary flex items-center justify-between">
              <div className="flex flex-col min-w-0 pl-2">
                <span className="text-[9px] font-bold text-primary uppercase tracking-widest">{t('chat.reply')}: {replyTo.senderName}</span>
                <span className="text-xs truncate text-muted-foreground italic">{replyTo.content}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></Button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl shrink-0 bg-muted"><Zap className="w-5 h-5 text-primary" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 rounded-2xl bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Отложенно</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start h-10 rounded-xl text-xs gap-2"><CalendarIcon className="w-4 h-4" /> {scheduledDate ? scheduledDate.toLocaleDateString() : 'Выбрать дату'}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Самоуничтожение</span>
                  <div className="grid grid-cols-3 gap-2">{[15, 60, 3600].map(time => (<Button key={time} variant={expiryTime === time ? 'default' : 'outline'} className="h-8 text-[10px] rounded-lg" onClick={() => setExpiryTime(time)}>{time < 60 ? `${time}с` : time < 3600 ? '1м' : '1ч'}</Button>))}</div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-xs font-bold uppercase tracking-wider">Один просмотр</span>
                  <Button variant={isOneTime ? 'default' : 'outline'} size="sm" className="h-7 rounded-lg" onClick={() => setIsOneTime(!isOneTime)}>{isOneTime ? 'ВКЛ' : 'ВЫКЛ'}</Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex-1 relative">
              <Input placeholder={t('chat.placeholder')} className="bg-muted border-none rounded-xl h-11 text-sm px-4" value={messageInput} onChange={e => onInputChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()} />
              {amIPremium && !editingMsg && (<button onClick={handleAiDraft} disabled={isDrafting} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:scale-110">{isDrafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}</button>)}
            </div>
            {!messageInput.trim() ? (<Button size="icon" className="h-11 w-11 rounded-xl shrink-0 bg-primary" onClick={startRecording}><Circle className="w-5 h-5" /></Button>) : (<Button size="icon" className="h-11 w-11 rounded-xl shrink-0 bg-primary" onClick={() => handleSendMessage()} disabled={isSending}>{isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</Button>)}
          </div>
        </div>
      </footer>
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}
