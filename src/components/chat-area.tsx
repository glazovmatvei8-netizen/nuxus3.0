
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
import { collection, query, orderBy, doc, addDoc, updateDoc, arrayUnion, where, getDocs, arrayRemove, limit } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { formatDisplayName, cn, compressImage, encryptSignal, isGlobalAdmin, decryptSignal, formatLastSeen } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { addMinutes } from 'date-fns';

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
  const [isJoining, setIsJoining] = useState(false);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    }
  }, [editingMsg]);

  const isParticipant = useMemo(() => {
    return chat?.participantIds?.includes(firebaseUser?.uid || '');
  }, [chat, firebaseUser]);

  const isChatAdmin = useMemo(() => {
    if (!chat || !firebaseUser) return false;
    return chat.ownerId === firebaseUser.uid || chat.adminIds?.includes(firebaseUser.uid) || isKernelAdmin;
  }, [chat, firebaseUser, isKernelAdmin]);

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

  const typingUsers = useMemo(() => {
    if (!chat?.typing || !participants || !firebaseUser) return [];
    return Object.entries(chat.typing)
      .filter(([uid, typing]) => typing && uid !== firebaseUser.uid)
      .map(([uid]) => participants.find(p => p.id === uid)?.name || 'Кто-то');
  }, [chat?.typing, participants, firebaseUser]);

  const getParticipantWord = (n: number) => {
    const last = n % 10;
    const last100 = n % 100;
    if (last === 1 && last100 !== 11) return 'участник';
    if (last >= 2 && last <= 4 && (last100 < 10 || last100 >= 20)) return 'участника';
    return 'участников';
  };

  const chatSubtext = useMemo(() => {
    if (typingUsers.length > 0) {
      if (typingUsers.length === 1) return `${typingUsers[0]} печатает...`;
      return 'Несколько человек печатают...';
    }
    if (chat?.type === 'private') {
      return formatLastSeen(otherProfile?.lastSeen, otherProfile?.settings?.privacy?.lastSeenVisibility);
    }
    const count = chat?.participantIds?.length || 0;
    return `${count} ${getParticipantWord(count)}`;
  }, [chat, otherProfile, typingUsers]);

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    
    // Typing status
    if (firebaseUser && currentChatId && db) {
      if (!isTyping) {
        setIsTyping(true);
        updateDoc(doc(db, 'chats', currentChatId), {
          [`typing.${firebaseUser.uid}`]: true
        });
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        updateDoc(doc(db, 'chats', currentChatId), {
          [`typing.${firebaseUser.uid}`]: false
        });
      }, 3000);
    }

    const lastAtIndex = val.lastIndexOf('@');
    if (lastAtIndex !== -1) {
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

  const processBotCommand = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed.startsWith('!') || !currentChatId || !db || !chat || !firebaseUser || !isChatAdmin) return false;
    
    if (!chat.participantIds.includes('bot_nuxus_manager')) return false;

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].slice(1).toLowerCase();
    const mention = parts[1]; 

    let responseMessage = "";

    try {
      if (['хелп', 'help', 'помощь'].includes(cmd)) {
        responseMessage = "🤖 **Команды Nuxus Chat Manager**:\n\n!кик @user - Исключить участника\n!бан @user - Забанить навсегда\n!админ @user - Назначить администратором\n!разжаловать @user - Снять права админа\n!мут @user <мин> - Заглушить на время\n!анмут @user - Снять мут\n!статус - Информация о чате";
      } else if (['статус', 'status'].includes(cmd)) {
        responseMessage = `📊 **Статистика Узла**:\n\nУчастников: ${chat.participantIds.length}\nАдминов: ${chat.adminIds?.length || 1}\nТип: ${chat.type}\nID: ${chat.id}`;
      } else if (mention && mention.startsWith('@')) {
        const username = mention.toLowerCase();
        const userQ = query(collection(db, 'users'), where('username', '==', username), limit(1));
        const userSnap = await getDocs(userQ);
        
        if (userSnap.empty) {
          responseMessage = `❌ Узел ${username} не найден в базе Ядра.`;
        } else {
          const targetUser = userSnap.docs[0].data() as UserType;
          const targetId = targetUser.id;

          if (['кик', 'kick'].includes(cmd)) {
            if (targetId === chat.ownerId) {
              responseMessage = "⚠️ Невозможно исключить создателя узла.";
            } else {
              await updateDoc(doc(db, 'chats', currentChatId), {
                participantIds: arrayRemove(targetId),
                adminIds: arrayRemove(targetId)
              });
              responseMessage = `🚫 Пользователь ${targetUser.name} исключен из чата.`;
            }
          } else if (['бан', 'ban'].includes(cmd)) {
            if (targetId === chat.ownerId) {
              responseMessage = "⚠️ Невозможно забанить создателя узла.";
            } else {
              await updateDoc(doc(db, 'chats', currentChatId), {
                participantIds: arrayRemove(targetId),
                adminIds: arrayRemove(targetId),
                [`metadata.${targetId}.isBanned`]: true
              });
              responseMessage = `🔨 Пользователь ${targetUser.name} забанен навсегда.`;
            }
          } else if (['админ', 'admin'].includes(cmd)) {
            await updateDoc(doc(db, 'chats', currentChatId), {
              adminIds: arrayUnion(targetId)
            });
            responseMessage = `⭐ ${targetUser.name} теперь администратор чата.`;
          } else if (['разжаловать', 'unadmin'].includes(cmd)) {
            if (targetId === chat.ownerId) {
              responseMessage = "⚠️ Невозможно разжаловать создателя.";
            } else {
              await updateDoc(doc(db, 'chats', currentChatId), {
                adminIds: arrayRemove(targetId)
              });
              responseMessage = `📉 ${targetUser.name} больше не администратор.`;
            }
          } else if (['мут', 'mute'].includes(cmd)) {
            const mins = parseInt(parts[2]) || 60;
            const until = addMinutes(new Date(), mins).toISOString();
            await updateDoc(doc(db, 'chats', currentChatId), {
              [`metadata.${targetId}.mutedUntil`]: until
            });
            responseMessage = `🤐 ${targetUser.name} в муте на ${mins} мин.`;
          } else if (['анмут', 'unmute'].includes(cmd)) {
            await updateDoc(doc(db, 'chats', currentChatId), {
              [`metadata.${targetId}.mutedUntil`]: null
            });
            responseMessage = `🔊 С ${targetUser.name} сняты все ограничения.`;
          }
        }
      }

      if (responseMessage) {
        await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
          chatId: currentChatId,
          senderId: 'bot_nuxus_manager',
          senderName: 'Nuxus Manager 🛡️',
          content: responseMessage,
          contentType: 'text',
          sentAt: new Date().toISOString(),
          isRead: false
        });
        return true;
      }
    } catch (e: any) {
      console.error("Nuxus Bot Error:", e);
    }
    return false;
  };

  useEffect(() => {
    if (currentChatId && messages) {
      const timer = setTimeout(() => scrollToBottom('instant'), 100);
      return () => clearTimeout(timer);
    }
  }, [currentChatId, messages?.length, scrollToBottom]);

  const handleSendMessage = useCallback(async (content_msg: string = messageInput, type_msg: Message['contentType'] = 'text') => {
    if (!content_msg.trim() && type_msg !== 'video_note' && type_msg !== 'sticker' && type_msg !== 'audio') return;
    if (!currentChatId || !firebaseUser || !db || !canPost) return;
    
    // Clear typing
    if (type_msg === 'text') {
      setIsTyping(false);
      updateDoc(doc(db, 'chats', currentChatId), {
        [`typing.${firebaseUser.uid}`]: false
      });
    }

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
    
    if (type_msg === 'text' && content_msg.trim().startsWith('!')) {
      await processBotCommand(content_msg);
    }

    setTimeout(() => scrollToBottom('smooth'), 100);
  }, [messageInput, currentChatId, firebaseUser, db, userProfile, replyTo, editingMsg, setLocalDrafts, scrollToBottom, canPost, chat, isChatAdmin]);

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
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
                  {chatSubtext}
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
              </div>

              {(messageInput.trim() || editingMsg) ? (
                <Button size="icon" className="h-10 w-10 rounded-full bg-primary shadow-lg" onClick={() => handleSendMessage()}><Send className="w-5 h-5" /></Button>
              ) : (
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full">
                  <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full text-muted-foreground" onClick={() => { setRecordingType('audio'); }}><Mic className="w-5 h-5" /></Button>
                  <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full text-muted-foreground" onClick={() => { setRecordingType('video_note'); }}><Video className="w-5 h-5" /></Button>
                </div>
              )}
            </div>
          </div>
        </footer>
      )}

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      <CreatePollModal open={isPollModalOpen} onOpenChange={setIsPollModalOpen} chatId={currentChatId!} />
      <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" />
    </div>
  );
}
