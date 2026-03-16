
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, X, Paperclip, Mic, StopCircle, Edit2, Search,
  Smile, ImageIcon, Video, Trash2, Loader2, UserPlus, AtSign
} from 'lucide-react';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { CreatePollModal } from './modals/create-poll-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, updateDoc, arrayUnion, where } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { formatDisplayName, cn, formatLastSeen, compressImage, encryptSignal, isGlobalAdmin, decryptSignal } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { EmojiPicker } from './emoji-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from './ui/scroll-area';

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
    <div className="flex flex-col gap-3 max-w-4xl mx-auto px-4 md:px-6 py-8 min-h-full touch-pan-y relative z-10">
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
  const { currentChatId, setCurrentChatId, setForwardingMessage, setLocalDrafts } = useAppState();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Mention State
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);

  // Recording State
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'review'>('idle');
  const [recordingType, setRecordingType] = useState<'audio' | 'video_note'>('audio');
  const [recordingTime, setRecordingTime] = useState(0);
  const [reviewBlobUrl, setReviewBlobUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const isKernelAdmin = useMemo(() => isGlobalAdmin(userProfile), [userProfile]);

  useEffect(() => {
    if (editingMsg && editingMsg.contentType === 'text') {
      setMessageInput(decryptSignal(editingMsg.content));
    } else if (!editingMsg && !currentChatId) {
      setMessageInput('');
    }
  }, [editingMsg, currentChatId]);

  const isParticipant = useMemo(() => {
    return chat?.participantIds?.includes(firebaseUser?.uid || '');
  }, [chat, firebaseUser]);

  const canPost = useMemo(() => {
    if (!chat || !firebaseUser) return false;
    if (chat.type === 'channel') {
      return chat.adminIds?.includes(firebaseUser.uid);
    }
    return isParticipant;
  }, [chat, firebaseUser, isParticipant]);

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

  const participantIds = useMemo(() => chat?.participantIds || [], [chat?.participantIds]);
  const participantsQuery = useMemoFirebase(() => {
    if (!db || participantIds.length === 0) return null;
    return query(collection(db, 'users'), where('id', 'in', participantIds.slice(0, 30)));
  }, [db, participantIds]);
  const { data: participants } = useCollection<UserType>(participantsQuery);

  const filteredMentions = useMemo(() => {
    if (mentionSearch === null || !participants) return [];
    const search = mentionSearch.toLowerCase();
    return participants.filter(p => 
      p.id !== firebaseUser?.uid && 
      (p.name?.toLowerCase().includes(search) || p.username?.toLowerCase().includes(search))
    );
  }, [mentionSearch, participants, firebaseUser?.uid]);

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    const lastAtIndex = val.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      // Список появляется если @ в начале или после пробела
      const isStart = lastAtIndex === 0;
      const isAfterSpace = lastAtIndex > 0 && val[lastAtIndex - 1] === ' ';
      
      if (isStart || isAfterSpace) {
        const textAfterAt = val.substring(lastAtIndex + 1);
        if (!textAfterAt.includes(' ')) {
          setMentionSearch(textAfterAt);
          return;
        }
      }
    }
    setMentionSearch(null);
  };

  const selectMention = (p: UserType) => {
    const lastAtIndex = messageInput.lastIndexOf('@');
    const prefix = messageInput.substring(0, lastAtIndex);
    const cleanUsername = p.username.startsWith('@') ? p.username : `@${p.username}`;
    const newVal = prefix + cleanUsername + ' ';
    setMessageInput(newVal);
    setMentionSearch(null);
    if (textInputRef.current) textInputRef.current.focus();
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  const handleJoinChat = useCallback(async () => {
    if (!currentChatId || !firebaseUser || !db) return;
    setIsJoining(true);
    try {
      const chatRef = doc(db, 'chats', currentChatId);
      await updateDoc(chatRef, {
        participantIds: arrayUnion(firebaseUser.uid)
      });
      toast({ title: "Успех", description: "Вы вступили в сообщество" });
    } catch (e: any) {
      toast({ title: "Ошибка", description: "Не удалось вступить в чат", variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  }, [currentChatId, firebaseUser, db, toast]);

  useEffect(() => {
    if (currentChatId && messages) {
      const timer = setTimeout(() => scrollToBottom('instant'), 100);
      return () => clearTimeout(timer);
    }
  }, [currentChatId, messages?.length, scrollToBottom]);

  const startRecording = async () => {
    try {
      const isVideo = recordingType === 'video_note';
      const constraints = { 
        audio: true, 
        video: isVideo ? { facingMode: 'user', width: 480, height: 480 } : false 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (isVideo && videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: isVideo ? 'video/webm;codecs=vp8,opus' : 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: isVideo ? 'video/webm' : 'audio/webm' });
        setReviewBlobUrl(URL.createObjectURL(blob));
        setRecordingState('review');
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setRecordingState('recording');
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      toast({ title: "Ошибка доступа", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecordingState('idle');
    setReviewBlobUrl(null);
  };

  const confirmSendRecording = async () => {
    if (!reviewBlobUrl) return;
    const response = await fetch(reviewBlobUrl);
    const blob = await response.blob();
    const reader = new FileReader();
    reader.onloadend = () => {
      handleSendMessage(reader.result as string, recordingType === 'video_note' ? 'video_note' : 'audio');
      cancelRecording();
    };
    reader.readAsDataURL(blob);
  };

  const handleSendMessage = useCallback(async (content_msg: string = messageInput, type_msg: Message['contentType'] = 'text') => {
    if (!content_msg.trim() && type_msg !== 'video_note' && type_msg !== 'sticker' && type_msg !== 'audio') return;
    if (!currentChatId || !firebaseUser || !db || !canPost) return;
    
    let finalContent = content_msg;
    if (type_msg === 'text') finalContent = encryptSignal(content_msg);
    else if (type_msg === 'image') finalContent = await compressImage(content_msg, 800, 0.4);

    const captureReply = replyTo;
    const captureEdit = editingMsg;

    if (type_msg === 'text') {
      setMessageInput('');
      setMentionSearch(null);
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
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString(), lastSenderId: firebaseUser.uid });
    setTimeout(() => scrollToBottom('smooth'), 100);
  }, [messageInput, currentChatId, firebaseUser, db, userProfile, replyTo, editingMsg, setLocalDrafts, scrollToBottom, canPost]);

  const handlePinMessage = useCallback(async (msg: Message) => {
    if (!db || !currentChatId) return;
    await updateDoc(doc(db, 'chats', currentChatId), { pinnedMessageId: msg.id });
    toast({ title: "Сообщение закреплено" });
  }, [db, currentChatId, toast]);

  const chatDisplayName = useMemo(() => {
    if (chat?.type === 'private') {
      const myMeta = chat.metadata?.[firebaseUser?.uid || ''];
      return myMeta?.customName || formatDisplayName(otherProfile?.name);
    }
    return formatDisplayName(chat?.name || 'Чат');
  }, [chat, firebaseUser?.uid, otherProfile]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden z-20">
      <header className="h-16 border-b border-white/5 bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 z-30">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden rounded-lg" onClick={() => setCurrentChatId(null)}><ChevronLeft /></Button>
          {!isSearchMode ? (
            <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setIsChatInfoOpen(true)}>
              <UserAvatar userId={otherId} manualAvatarUrl={chat?.avatarUrl || otherProfile?.avatarUrl} className="h-10 w-10" fallbackName={chatDisplayName} showOnlineStatus />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm truncate">{chatDisplayName}</span>
                <span className="text-[10px] text-primary/80 font-bold uppercase tracking-widest">
                  {chat?.type === 'private' ? formatLastSeen(otherProfile?.lastSeen) : 'сообщество'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 pr-4">
              <Search className="w-4 h-4 text-primary" />
              <Input placeholder="Поиск..." className="bg-transparent border-none focus-visible:ring-0 text-sm h-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
              <button onClick={() => { setIsSearchMode(false); setSearchQuery(''); }}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
          )}
        </div>
        {!isSearchMode && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsSearchMode(true)} className="text-muted-foreground hover:text-primary"><Search className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="text-muted-foreground hover:text-primary"><Info className="w-5 h-5" /></Button>
          </div>
        )}
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 w-full relative z-10 scrollbar-hide">
          <MessageList messages={messages} userId={firebaseUser?.uid} chatId={currentChatId} onReply={setReplyTo} onEdit={setEditingMsg} onForward={setForwardingMessage} onPin={handlePinMessage} amIPremium={userProfile?.isPremium} isAdmin={isKernelAdmin} isGroup={chat?.type !== 'private'} searchQuery={searchQuery} viewerProfile={userProfile} />
          <div ref={messagesEndRef} className="h-4" />
        </ScrollArea>

        {recordingState !== 'idle' && recordingType === 'video_note' && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-primary shadow-2xl bg-black">
              {recordingState === 'review' ? (
                <video ref={reviewVideoRef} src={reviewBlobUrl!} autoPlay loop playsInline className="w-full h-full object-cover scale-x-[-1]" />
              ) : (
                <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              )}
            </div>
            <div className="mt-8 flex gap-6">
              <Button onClick={cancelRecording} className="h-16 w-16 rounded-full bg-red-500/20 text-red-500"><Trash2 className="w-6 h-6" /></Button>
              {recordingState === 'review' ? (
                <Button onClick={confirmSendRecording} className="h-20 w-20 rounded-full bg-primary text-white"><Send className="w-8 h-8 ml-1" /></Button>
              ) : (
                <Button onClick={stopRecording} className="h-20 w-20 rounded-full bg-red-500 text-white"><StopCircle className="w-8 h-8" /></Button>
              )}
            </div>
          </div>
        )}
      </div>

      {(!isParticipant && !isKernelAdmin) ? (
        <div className="p-4 bg-primary/5 border-t border-white/5 flex items-center justify-center shrink-0 z-30">
          <Button onClick={handleJoinChat} disabled={isJoining} className="h-12 px-10 rounded-2xl bg-primary font-black uppercase tracking-widest gap-2 shadow-xl shadow-primary/20">
            {isJoining ? <Loader2 className="animate-spin w-4 h-4" /> : <><UserPlus className="w-5 h-5" /> Вступить в сообщество</>}
          </Button>
        </div>
      ) : !canPost ? (
        <div className="p-4 bg-white/5 border-t border-white/5 text-center shrink-0 z-30">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">ТОЛЬКО ЧТЕНИЕ</p>
        </div>
      ) : (
        <footer className="p-3 pb-6 bg-background/90 backdrop-blur-2xl border-t border-white/5 shrink-0 z-40 relative">
          <div className="max-w-4xl mx-auto space-y-2 relative">
            
            {/* Mention Suggestions Popup */}
            {mentionSearch !== null && filteredMentions.length > 0 && (
              <div className="absolute bottom-[110%] left-0 right-0 mb-2 bg-card/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-[1000]">
                <div className="p-2 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 px-2">Упомянуть...</span>
                  <AtSign className="w-3 h-3 text-primary/40 mr-2" />
                </div>
                <ScrollArea className="max-h-60">
                  <div className="p-1">
                    {filteredMentions.map((p) => (
                      <button key={p.id} onClick={() => selectMention(p)} className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 transition-colors text-left rounded-xl group">
                        <UserAvatar userId={p.id} className="h-9 w-9 border-2 border-transparent group-hover:border-primary/20" manualAvatarUrl={p.avatarUrl} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-white truncate">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-black truncate">{p.username}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {(replyTo || editingMsg) && (
              <div className="p-2 bg-muted/50 rounded-xl border-l-4 border-accent flex items-center justify-between">
                <div className="flex flex-col min-0 pl-2">
                  <span className="text-[9px] font-bold text-accent uppercase tracking-widest">{editingMsg ? "Редактирование" : `Ответ: ${replyTo?.senderName}`}</span>
                  <span className="text-xs truncate italic">{decryptSignal(editingMsg?.content || replyTo?.content)}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setReplyTo(null); setEditingMsg(null); }}><X className="w-4 h-4" /></Button>
              </div>
            )}
            
            <div className="flex gap-3 items-center">
              <Popover>
                <PopoverTrigger asChild><Button variant="ghost" size="icon"><Paperclip /></Button></PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-48 bg-card border-white/10 rounded-2xl p-1 mb-2 shadow-2xl">
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-xs" onClick={() => fileInputRef.current?.click()}><ImageIcon className="w-4 h-4" /> Галерея</Button>
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-xs" onClick={() => setIsPollModalOpen(true)}><AtSign className="w-4 h-4" /> Опрос</Button>
                </PopoverContent>
              </Popover>
              
              <div className="flex-1 flex items-center bg-muted/30 rounded-2xl border border-white/[0.05] h-11 px-4 relative group">
                <Input ref={textInputRef} placeholder="Сообщение" className="bg-transparent border-none focus-visible:ring-0" value={messageInput} onChange={e => handleInputChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-muted-foreground hover:text-foreground transition-colors"><Smile /></button>
              </div>

              {(messageInput.trim() || editingMsg) ? (
                <Button size="icon" className="h-10 w-10 rounded-full bg-primary shadow-lg" onClick={() => handleSendMessage()}><Send className="w-5 h-5" /></Button>
              ) : (
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full">
                  <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full text-muted-foreground" onClick={() => { setRecordingType('audio'); startRecording(); }}><Mic className="w-5 h-5" /></Button>
                  <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full text-muted-foreground" onClick={() => { setRecordingType('video_note'); startRecording(); }}><Video className="w-5 h-5" /></Button>
                </div>
              )}
            </div>
          </div>
        </footer>
      )}

      {showEmojiPicker && <div className="absolute bottom-24 right-4 z-50 w-[320px] h-[400px]"><EmojiPicker onEmojiSelect={(e) => setMessageInput(messageInput + e)} onStickerSelect={(url) => handleSendMessage(url, 'sticker')} /></div>}
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      <CreatePollModal open={isPollModalOpen} onOpenChange={setIsPollModalOpen} chatId={currentChatId!} />
      <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" />
    </div>
  );
}
