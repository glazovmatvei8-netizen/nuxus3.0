
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
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      .map(([uid]) => {
        const p = participants.find(p => p.id === uid);
        return p?.name || 'Кто-то';
      });
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
    
    if (firebaseUser && currentChatId && db) {
      if (!isTyping) {
        setIsTyping(true);
        updateDocumentNonBlocking(doc(db, 'chats', currentChatId), {
          [`typing.${firebaseUser.uid}`]: true
        });
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        updateDocumentNonBlocking(doc(db, 'chats', currentChatId), {
          [`typing.${firebaseUser.uid}`]: false
        });
      }, 3000);
    }
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  const handleJoinChat = async () => {
    if (!currentChatId || !firebaseUser || !db) return;
    setIsJoining(true);
    try {
      await updateDoc(doc(db, 'chats', currentChatId), {
        participantIds: arrayUnion(firebaseUser.uid)
      });
      toast({ title: "Вы вступили в сообщество" });
    } catch (e: any) {
      toast({ title: "Ошибка вступления", description: e.message, variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  const handleSendMessage = useCallback(async (content_msg: string = messageInput, type_msg: Message['contentType'] = 'text') => {
    if (!content_msg.trim() && type_msg !== 'video_note' && type_msg !== 'sticker' && type_msg !== 'audio') return;
    if (!currentChatId || !firebaseUser || !db || !canPost) return;
    
    if (type_msg === 'text') {
      setIsTyping(false);
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId), {
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
    
    setTimeout(() => scrollToBottom('smooth'), 100);
  }, [messageInput, currentChatId, firebaseUser, db, userProfile, replyTo, editingMsg, setLocalDrafts, scrollToBottom, canPost]);

  const chatDisplayName = useMemo(() => {
    if (chat?.type === 'private') {
      const myMeta = chat.metadata?.[firebaseUser?.uid || ''];
      return myMeta?.customName || formatDisplayName(otherProfile?.name);
    }
    return formatDisplayName(chat?.name || 'Чат');
  }, [chat, firebaseUser?.uid, otherProfile]);

  const customBg = userProfile?.settings?.chatBackground;
  const bgFit = userProfile?.settings?.chatBackgroundFit || 'cover';

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden z-20">
      {/* Background Layer - Brighter TG-Style */}
      <div 
        className={cn("absolute inset-0 z-0", !customBg && "chat-pattern-bg")}
        style={customBg ? { 
          backgroundImage: `url(${customBg})`, 
          backgroundSize: bgFit, 
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : {}}
      />

      <header className="h-16 border-b border-white/10 bg-black/40 backdrop-blur-3xl flex items-center justify-between px-4 shrink-0 z-30">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden rounded-lg text-white/80" onClick={() => setCurrentChatId(null)}><ChevronLeft /></Button>
          {!isSearchMode ? (
            <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setIsChatInfoOpen(true)}>
              <UserAvatar userId={otherId} manualAvatarUrl={chat?.avatarUrl || otherProfile?.avatarUrl} className="h-10 w-10 border border-white/20" fallbackName={chatDisplayName} showOnlineStatus />
              <div className="flex flex-col min-w-0">
                <span className="font-black text-[15px] truncate text-white italic tracking-tight">{chatDisplayName}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/90 animate-pulse">
                  {chatSubtext}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 pr-4">
              <Search className="w-4 h-4 text-primary" />
              <Input placeholder="Поиск в чате..." className="bg-transparent border-none focus-visible:ring-0 text-sm h-8 text-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
              <button onClick={() => { setIsSearchMode(false); setSearchQuery(''); }}><X className="w-4 h-4 text-white/40" /></button>
            </div>
          )}
        </div>
        {!isSearchMode && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsSearchMode(true)} className="text-white/60 hover:text-primary transition-colors"><Search className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="text-white/60 hover:text-primary transition-colors"><Info className="w-5 h-5" /></Button>
          </div>
        )}
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 w-full relative z-10 scrollbar-hide">
          <MessageList messages={messages} userId={firebaseUser?.uid} chatId={currentChatId} onReply={setReplyTo} onEdit={setEditingMsg} onForward={setForwardingMessage} amIPremium={userProfile?.isPremium} isAdmin={isKernelAdmin} isGroup={chat?.type !== 'private'} searchQuery={searchQuery} viewerProfile={userProfile} />
          <div ref={messagesEndRef} className="h-4" />
        </ScrollArea>
      </div>

      {(!isParticipant && !isKernelAdmin) ? (
        <div className="p-4 bg-primary/20 backdrop-blur-3xl border-t border-white/10 flex items-center justify-center shrink-0 z-30">
          <Button onClick={handleJoinChat} disabled={isJoining} className="h-12 px-10 rounded-2xl bg-primary text-white font-black uppercase tracking-widest gap-2 shadow-2xl shadow-primary/40 transition-all hover:scale-105 active:scale-95">
            {isJoining ? <Loader2 className="animate-spin w-4 h-4" /> : <><UserPlus className="w-5 h-5" /> Вступить в сообщество</>}
          </Button>
        </div>
      ) : !canPost ? (
        <div className="p-4 bg-black/40 backdrop-blur-3xl border-t border-white/10 text-center shrink-0 z-30">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-[0.3em]">Канал в режиме чтения</p>
        </div>
      ) : (
        <footer className="p-3 pb-6 bg-black/40 backdrop-blur-3xl border-t border-white/10 shrink-0 z-40 relative">
          <div className="max-w-4xl mx-auto space-y-2 relative">
            <div className="flex gap-3 items-center">
              <Popover>
                <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-white/60 hover:text-primary"><Paperclip className="w-5 h-5" /></Button></PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-48 bg-[#1c1c1e]/95 backdrop-blur-3xl border-white/10 rounded-[1.8rem] p-1.5 mb-2 shadow-2xl">
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5" onClick={() => fileInputRef.current?.click()}><ImageIcon className="w-4 h-4 text-primary" /> Галерея</Button>
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5" onClick={() => setIsPollModalOpen(true)}><AtSign className="w-4 h-4 text-accent" /> Опрос</Button>
                </PopoverContent>
              </Popover>
              
              <div className="flex-1 flex items-center bg-white/[0.08] rounded-full border border-white/[0.1] h-11 px-4 relative group transition-all focus-within:bg-white/[0.12] focus-within:border-primary/30">
                <Input ref={textInputRef} placeholder="Сообщение" className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-white/30 font-medium" value={messageInput} onChange={e => handleInputChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
                <Button variant="ghost" size="icon" className="text-white/40 hover:text-primary transition-colors"><Smile className="w-5 h-5" /></Button>
              </div>

              {(messageInput.trim() || editingMsg) ? (
                <Button size="icon" className="h-10 w-10 rounded-full bg-primary text-white shadow-xl shadow-primary/40 active:scale-90 transition-all hover:scale-105" onClick={() => handleSendMessage()}>
                  <Send className="w-5 h-5" />
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-10 w-10 text-white/60 hover:text-primary transition-colors"><Mic className="w-5 h-5" /></Button>
                  <Button size="icon" variant="ghost" className="h-10 w-10 text-white/60 hover:text-primary transition-colors"><Video className="w-5 h-5" /></Button>
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
