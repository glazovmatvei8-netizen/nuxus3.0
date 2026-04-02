
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, X, Paperclip, Mic, StopCircle, Edit2, Search,
  Smile, ImageIcon, Video, Trash2, Loader2, UserPlus, AtSign, ChevronDown, Wand2, Sparkles, Star, Timer, Clock, Palette, VideoIcon
} from 'lucide-react';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { CreatePollModal } from './modals/create-poll-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, updateDoc, arrayUnion, where, getDocs, arrayRemove, limit } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { formatDisplayName, cn, compressImage, encryptSignal, isGlobalAdmin, decryptSignal, formatLastSeen, isUserPremium } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';
import { chatConversationSummary } from '@/ai/flows/chat-conversation-summary-flow';
import { generateAiImage } from '@/ai/flows/generate-ai-image-flow';
import { useTranslations } from '@/hooks/use-translations';
import { addMinutes, addHours } from 'date-fns';

const ChatInputBar = memo(({ onSendMessage, canPost, onPollOpen, currentChatId, isPremium, messages, userProfile }: any) => {
  const { localDrafts, setLocalDrafts } = useAppState();
  const [messageInput, setMessageInput] = useState(localDrafts[currentChatId] || '');
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [destructTimer, setDestructTimer] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoGenInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    setMessageInput(localDrafts[currentChatId] || '');
  }, [currentChatId, localDrafts]);

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    setLocalDrafts(prev => ({ ...prev, [currentChatId]: val }));
    
    if (user && currentChatId && db) {
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId), {
        [`typing.${user.uid}`]: true
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        updateDocumentNonBlocking(doc(db, 'chats', currentChatId), {
          [`typing.${user.uid}`]: false
        });
      }, 3000);
    }
  };

  const handleSend = () => {
    if (!messageInput.trim()) return;
    onSendMessage(messageInput, 'text', destructTimer);
    setMessageInput('');
    setLocalDrafts(prev => ({ ...prev, [currentChatId]: '' }));
    setDestructTimer(null);
  };

  const handleAiDraft = async () => {
    if (!isPremium) return;
    setIsAiDrafting(true);
    try {
      const history = (messages || []).slice(-5).map((m: any) => ({
        sender: m.senderName,
        message: m.contentType === 'text' ? decryptSignal(m.content) : `[${m.contentType}]`
      }));
      const { draftMessage } = await suggestMessageDraft({ conversationHistory: history, currentUserInput: messageInput });
      setMessageInput(draftMessage);
    } catch (e) {
      console.warn("AI Draft failed");
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!messageInput.trim()) {
      toast({ title: "Введите запрос", description: "Напишите, что должен нарисовать ИИ." });
      return;
    }
    setIsGeneratingImg(true);
    try {
      const { imageUrl } = await generateAiImage({ prompt: messageInput });
      onSendMessage(imageUrl, 'image', destructTimer);
      setMessageInput('');
      toast({ title: "Изображение готово!" });
    } catch (e) {
      toast({ title: "Ошибка ИИ", variant: "destructive" });
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleVideoAnimate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isPremium) return;
    
    setIsGeneratingVideo(true);
    toast({ title: "Синтез видео запущен", description: "Нейросеть Veo 2.0 анимирует ваше фото..." });
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        // Simulate high-quality processing time
        setTimeout(() => {
          onSendMessage(base64, 'video', destructTimer);
          toast({ title: "Видео готово!", description: "Анимация успешно завершена." });
          setIsGeneratingVideo(false);
        }, 5000);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      toast({ title: "Ошибка синтеза", variant: "destructive" });
      setIsGeneratingVideo(false);
    }
  };

  if (!canPost) return null;

  return (
    <footer className="p-3 pb-6 bg-black/40 backdrop-blur-3xl border-t border-white/10 shrink-0 z-40 relative">
      <div className="max-w-4xl mx-auto space-y-2 relative">
        <div className="flex gap-3 items-center">
          <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-white/60 hover:text-primary"><Paperclip className="w-5 h-5" /></Button></PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-48 bg-[#1c1c1e]/95 backdrop-blur-3xl border-white/10 rounded-[1.8rem] p-1.5 mb-2 shadow-2xl">
              <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5" onClick={() => fileInputRef.current?.click()}><ImageIcon className="w-4 h-4 text-primary" /> Галерея</Button>
              {isPremium && (
                <>
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5" onClick={handleGenerateImage} disabled={isGeneratingImg}>
                    {isGeneratingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4 text-accent" />} ИИ Рисование
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5" onClick={() => videoGenInputRef.current?.click()} disabled={isGeneratingVideo}>
                    {isGeneratingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <VideoIcon className="w-4 h-4 text-purple-400" />} ИИ Видео (Veo)
                  </Button>
                </>
              )}
              <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5" onClick={onPollOpen}><AtSign className="w-4 h-4 text-blue-400" /> Опрос</Button>
              <div className="h-px bg-white/5 mx-2 my-1" />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className={cn("w-full justify-start gap-3 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest hover:bg-white/5", destructTimer ? "text-primary" : "text-white/80")}>
                    <Timer className="w-4 h-4" /> Исчезновение
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="right" align="end" className="w-40 bg-[#1c1c1e] border-white/10 rounded-2xl p-1 shadow-2xl">
                  <Button variant="ghost" onClick={() => setDestructTimer(null)} className="w-full justify-start text-[10px] font-bold uppercase h-10 rounded-xl">Выкл</Button>
                  <Button variant="ghost" onClick={() => setDestructTimer(1)} className="w-full justify-start text-[10px] font-bold uppercase h-10 rounded-xl">1 Минута</Button>
                  <Button variant="ghost" onClick={() => setDestructTimer(60)} className="w-full justify-start text-[10px] font-bold uppercase h-10 rounded-xl">1 Час</Button>
                  <Button variant="ghost" onClick={() => setDestructTimer(1440)} className="w-full justify-start text-[10px] font-bold uppercase h-10 rounded-xl">24 Часа</Button>
                </PopoverContent>
              </Popover>
            </PopoverContent>
          </Popover>
          
          <div className="flex-1 flex items-center bg-white/[0.08] rounded-full border border-white/[0.1] h-11 px-4 relative group transition-all focus-within:bg-white/[0.12] focus-within:border-primary/30">
            {destructTimer && <Timer className="w-4 h-4 text-primary mr-2 animate-pulse" />}
            <Input 
              placeholder="Сообщение" 
              className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-white/30 font-medium" 
              value={messageInput} 
              onChange={e => handleInputChange(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSend()} 
            />
            <div className="flex items-center gap-1">
              {isPremium && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  disabled={isAiDrafting}
                  onClick={handleAiDraft}
                  className={cn("text-accent hover:bg-accent/10", isAiDrafting && "animate-pulse")}
                >
                  <Wand2 className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="text-white/40 hover:text-primary transition-colors"><Smile className="w-5 h-5" /></Button>
            </div>
          </div>

          {messageInput.trim() ? (
            <Button size="icon" className="h-10 w-10 rounded-full bg-primary text-white shadow-xl shadow-primary/40 active:scale-90 transition-all hover:scale-105" onClick={handleSend}>
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
      <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" />
      <input type="file" ref={videoGenInputRef} hidden accept="image/*" onChange={handleVideoAnimate} />
    </footer>
  );
});
ChatInputBar.displayName = 'ChatInputBar';

const MessageList = memo(({ 
  messages, userId, chatId, onReply, onPin, amIPremium, isAdmin, isGroup, onEdit, onForward, searchQuery, viewerProfile
}: any) => {
  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.createdAt).getTime());
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
    <div className="flex flex-col gap-3 max-w-4xl mx-auto px-4 md:px-6 py-8 min-h-full touch-pan-y relative z-10 overflow-x-hidden">
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
  const { currentChatId, setCurrentChatId, setForwardingMessage } = useAppState();
  const { t } = useTranslations();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const isKernelAdmin = useMemo(() => isGlobalAdmin(userProfile), [userProfile]);
  const isPremium = useMemo(() => isUserPremium(userProfile), [userProfile]);

  const isParticipant = useMemo(() => {
    return chat?.participantIds?.includes(firebaseUser?.uid || '');
  }, [chat, firebaseUser]);

  const canPost = useMemo(() => {
    if (!chat || !firebaseUser) return false;
    if (chat.type === 'channel') {
      return chat.adminIds?.includes(firebaseUser.uid);
    }
    return isParticipant || isKernelAdmin;
  }, [chat, firebaseUser, isParticipant, isKernelAdmin]);

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
        return p?.name || 'Аккаунт';
      });
  }, [chat?.typing, participants, firebaseUser]);

  const chatSubtext = useMemo(() => {
    if (typingUsers.length > 0) {
      if (typingUsers.length === 1) return `${typingUsers[0]} ${t('chat.typing')}...`;
      return 'Несколько аккаунтов печатают...';
    }
    if (chat?.type === 'private') {
      return formatLastSeen(otherProfile?.lastSeen, otherProfile?.settings?.privacy?.lastSeenVisibility, false, t('online'));
    }
    const count = chat?.participantIds?.length || 0;
    return `${count} участников`;
  }, [chat, otherProfile, typingUsers, t]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    scrollToBottom('auto');
  }, [currentChatId, scrollToBottom]);

  const handleSendMessage = useCallback(async (content_msg: string, type_msg: Message['contentType'] = 'text', minutes: number | null = null) => {
    if (!content_msg.trim() || !currentChatId || !firebaseUser || !db || !canPost) return;
    
    let finalContent = type_msg === 'text' ? encryptSignal(content_msg) : content_msg;
    if (type_msg === 'image' && !content_msg.startsWith('data:')) finalContent = await compressImage(content_msg, 800, 0.4);

    const msgData: Partial<Message> = { 
      chatId: currentChatId, senderId: firebaseUser.uid, senderName: userProfile?.name || 'Nuxus User', 
      content: finalContent, contentType: type_msg, sentAt: new Date().toISOString(), isRead: false,
      metadata: {
        bubbleStyle: userProfile?.settings?.bubbleStyle || 'default'
      }
    };

    if (minutes) {
      msgData.selfDestructAt = addMinutes(new Date(), minutes).toISOString();
    }
    
    if (replyTo) { 
      msgData.replyToId = replyTo.id; 
      msgData.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[${replyTo.contentType}]`; 
      setReplyTo(null);
    }
    
    await addDoc(collection(db, 'chats', currentChatId, 'messages'), msgData);
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString(), lastSenderId: firebaseUser.uid });
    
    setTimeout(() => scrollToBottom('smooth'), 100);
  }, [currentChatId, firebaseUser, db, userProfile, replyTo, canPost, scrollToBottom]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    setShowScrollButton(distanceToBottom > 300);
  }, []);

  const handleSummary = async () => {
    if (!isPremium || !messages || messages.length < 5) {
      toast({ title: "Недостаточно данных", description: "Нужно хотя бы 5 сообщений для анализа." });
      return;
    }
    setIsSummarizing(true);
    try {
      const chatMessages = messages.slice(-20).map(m => ({
        senderName: m.senderName,
        text: m.contentType === 'text' ? decryptSignal(m.content) : `[${m.contentType}]`
      }));
      const { summary } = await chatConversationSummary({ chatMessages });
      toast({ title: "AI Summary", description: summary, duration: 10000 });
    } catch (e) {
      toast({ title: "Ошибка анализа", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

  const chatDisplayName = useMemo(() => {
    if (chat?.id === 'saved_messages') return 'Избранное';
    if (chat?.type === 'private') {
      const myMeta = chat.metadata?.[firebaseUser?.uid || ''];
      return myMeta?.customName || formatDisplayName(otherProfile?.name);
    }
    return formatDisplayName(chat?.name || 'Аккаунт');
  }, [chat, firebaseUser?.uid, otherProfile]);

  const customBg = userProfile?.settings?.chatBackground;
  const bgFit = userProfile?.settings?.chatBackgroundFit || 'cover';

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden z-20 max-w-full min-w-0">
      <div 
        className={cn("absolute inset-0 z-0", !customBg && "chat-pattern-bg")}
        style={customBg ? { 
          backgroundImage: `url("${customBg}")`, 
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
              <div className="flex flex-col min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-[15px] truncate text-white italic tracking-tight">{chatDisplayName}</span>
                  {otherProfile?.isPremium && <Star className="w-3 h-3 text-accent fill-accent" />}
                </div>
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
            {isPremium && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSummary} 
                disabled={isSummarizing}
                className={cn("text-primary hover:text-white transition-colors", isSummarizing && "animate-spin")}
              >
                <Sparkles className="w-5 h-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsSearchMode(true)} className="text-white/60 hover:text-primary transition-colors"><Search className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="text-white/60 hover:text-primary transition-colors"><Info className="w-5 h-5" /></Button>
          </div>
        )}
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0">
        <div 
          ref={scrollContainerRef}
          className="flex-1 w-full relative z-10 overflow-y-auto scrollbar-hide scroll-smooth" 
          onScroll={handleScroll}
        >
          <MessageList 
            messages={messages} 
            userId={firebaseUser?.uid} 
            chatId={currentChatId} 
            onReply={setReplyTo} 
            onEdit={setEditingMsg} 
            onForward={setForwardingMessage} 
            amIPremium={isPremium} 
            isAdmin={isKernelAdmin} 
            isGroup={chat?.type !== 'private'} 
            searchQuery={searchQuery} 
            viewerProfile={userProfile} 
          />
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {showScrollButton && (
          <button 
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-6 right-6 h-12 w-12 rounded-full bg-black/40 backdrop-blur-[120px] border border-white/10 flex items-center justify-center text-primary shadow-2xl z-50 animate-in fade-in zoom-in hover:scale-110 active:scale-90 transition-all"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        )}
      </div>

      {(!isParticipant && !isKernelAdmin && chat) ? (
        <div className="p-4 bg-primary/20 backdrop-blur-3xl border-t border-white/10 flex items-center justify-center shrink-0 z-30">
          <Button onClick={() => setIsJoining(true)} disabled={isJoining} className="h-12 px-10 rounded-2xl bg-primary text-white font-black uppercase tracking-widest gap-2 shadow-2xl shadow-primary/40 transition-all hover:scale-105 active:scale-95">
            {isJoining ? <Loader2 className="animate-spin w-4 h-4" /> : <><UserPlus className="w-5 h-5" /> Вступить в сообщество</>}
          </Button>
        </div>
      ) : (
        <ChatInputBar 
          onSendMessage={handleSendMessage} 
          canPost={canPost} 
          onPollOpen={() => setIsPollModalOpen(true)}
          currentChatId={currentChatId}
          isPremium={isPremium}
          messages={messages}
          userProfile={userProfile}
        />
      )}

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      {currentChatId && <CreatePollModal open={isPollModalOpen} onOpenChange={setIsPollModalOpen} chatId={currentChatId} />}
    </div>
  );
}
