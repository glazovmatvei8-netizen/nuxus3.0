
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, Loader2, Bookmark, Pin, X, Forward, Camera, Video, Circle, Wand2, Phone
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, limit, addDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { formatDisplayName, isUserPremium } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';

const MessageList = memo(({ 
  messages, 
  userId, 
  chatId, 
  onReply, 
  amIPremium, 
  isAdmin, 
  otherAvatarUrl 
}: any) => {
  if (!messages) return null;
  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto px-4 md:px-6 py-8 min-h-full">
      {messages.map((msg: Message) => (
        <MessageItem 
          key={msg.id} 
          message={msg} 
          isMe={msg.senderId === userId} 
          chatId={chatId} 
          onReply={onReply} 
          amIPremium={amIPremium}
          isAdmin={isAdmin}
          senderAvatarUrl={msg.senderId === userId ? null : otherAvatarUrl}
        />
      ))}
    </div>
  );
});
MessageList.displayName = 'MessageList';

export default function ChatArea() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId, forwardingMessage, setForwardingMessage, setActiveCallId } = useAppState();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [messageInput, setMessageInput] = useState('');
  
  // Video Message state
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dataLoadedRef = useRef(false);
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);
  const amIPremium = useMemo(() => isUserPremium(userProfile), [userProfile]);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const otherId = useMemo(() => {
    if (chat?.type === 'private' && user) {
      return chat.participantIds?.find((id: string) => id !== user.uid);
    }
    return null;
  }, [chat, user]);

  const otherProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(otherProfileRef);

  const otherMetadata = useMemo(() => {
    if (otherId && chat?.metadata && chat.metadata[otherId]) {
      return chat.metadata[otherId];
    }
    return null;
  }, [otherId, chat]);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !currentChatId) return null;
    return query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc'));
  }, [db, currentChatId]);
  
  const { data: messages, isLoading: isMessagesLoading } = useCollection<Message>(messagesQuery);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    }
  }, []);

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

  const handleSendMessage = useCallback((content: string = messageInput, type: 'text' | 'video' = 'text') => {
    const trimmedContent = content.trim();
    if (!trimmedContent || !currentChatId || !user || !db) return;
    
    setIsSending(true);
    const msgData: any = { 
      chatId: currentChatId, 
      senderId: user.uid, 
      senderName: userProfile?.name || 'User', 
      content: trimmedContent, 
      contentType: type, 
      sentAt: new Date().toISOString(), 
      isRead: false 
    };

    if (replyTo) {
      msgData.replyToId = replyTo.id;
      msgData.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[${replyTo.contentType}]`;
      setReplyTo(null);
    }

    addDocumentNonBlocking(collection(db, 'chats', currentChatId, 'messages'), msgData);
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { 
      lastMessageAt: new Date().toISOString()
    });
    
    if (type === 'text') setMessageInput('');
    setIsSending(false);
    setTimeout(() => scrollToBottom('smooth'), 100);
  }, [messageInput, currentChatId, user, db, userProfile, replyTo, scrollToBottom]);

  const handleAiDraft = async () => {
    if (!messages || !amIPremium) return;
    setIsDrafting(true);
    try {
      const history = messages.slice(-5).map(m => ({
        sender: m.senderName,
        message: m.content
      }));
      const { draftMessage } = await suggestMessageDraft({
        conversationHistory: history,
        currentUserInput: messageInput
      });
      setMessageInput(draftMessage);
      toast({ title: "AI предложил ответ", description: "Текст вставлен в поле ввода." });
    } catch (e) {
      toast({ title: "Ошибка AI", description: "Не удалось сформировать черновик.", variant: "destructive" });
    } finally {
      setIsDrafting(false);
    }
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!db || !user || !otherId || !currentChatId) return;
    
    try {
      const callData = {
        callerId: user.uid,
        callerName: userProfile?.name || 'Пользователь',
        receiverId: otherId,
        chatId: currentChatId,
        type,
        status: 'calling',
        createdAt: new Date().toISOString()
      };
      
      const callDoc = await addDoc(collection(db, 'calls'), callData);
      setActiveCallId(callDoc.id);
    } catch (e) {
      toast({ title: "Ошибка", description: "Не удалось начать вызов.", variant: "destructive" });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480 }, audio: true });
      setHasCameraPermission(true);
      setIsRecordingVideo(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          handleSendMessage(base64data, 'video');
        };
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
    } catch (err) {
      console.error('Camera access error:', err);
      setHasCameraPermission(false);
      toast({ variant: 'destructive', title: 'Ошибка камеры', description: 'Разрешите доступ к камере для видеосообщений.' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVideo(false);
  };

  const chatDisplayName = useMemo(() => {
    if (otherProfile?.name) return otherProfile.name;
    if (otherMetadata?.name) return otherMetadata.name;
    return chat?.name || '...';
  }, [chat, otherMetadata, otherProfile]);

  const chatDisplayUsername = useMemo(() => {
    if (otherProfile?.username) return otherProfile.username;
    if (otherMetadata?.username) return otherMetadata.username;
    if (chat?.username) return chat.username;
    return '';
  }, [otherMetadata, chat, otherProfile]);

  if (!currentChatId) return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background relative overflow-hidden">
      <div className="bg-muted p-10 rounded-full mb-6 animate-float relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse-glow" />
        <Bookmark className="w-16 h-16 text-muted-foreground/30 relative z-10" />
      </div>
      <h2 className="text-xl font-bold text-muted-foreground uppercase tracking-[0.3em]">Выберите диалог</h2>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden z-20">
      <header className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden rounded-lg hover:bg-white/5" 
            onClick={() => setCurrentChatId(null)}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3 cursor-pointer min-w-0 group" onClick={() => setIsChatInfoOpen(true)}>
            <UserAvatar userId={otherId} manualAvatarUrl={otherMetadata?.avatarUrl} className="h-10 w-10" fallbackName={chatDisplayName} />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm truncate group-hover:text-primary transition-colors">{formatDisplayName(chatDisplayName)}</span>
              <span className="text-[10px] text-muted-foreground/60 tracking-widest truncate">{chatDisplayUsername}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {chat?.type === 'private' && (
            <>
              <Button variant="ghost" size="icon" onClick={() => startCall('audio')} className="rounded-lg text-primary">
                <Phone className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => startCall('video')} className="rounded-lg text-primary">
                <Video className="w-5 h-5" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="rounded-lg">
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <ScrollArea ref={scrollRef} className="flex-1 w-full relative z-10 scrollbar-hide">
        {messages && (
          <MessageList 
            messages={messages}
            userId={user?.uid}
            chatId={currentChatId}
            onReply={setReplyTo}
            amIPremium={amIPremium}
            isAdmin={chat?.ownerId === user?.uid || chat?.adminIds?.includes(user?.uid || '')}
            otherAvatarUrl={otherProfile?.avatarUrl || otherMetadata?.avatarUrl}
          />
        )}
        {isMessagesLoading && (
          <div className="flex flex-col items-center justify-center p-24 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-30" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50">Загрузка...</span>
          </div>
        )}
      </ScrollArea>

      <footer className="p-3 bg-card border-t border-white/5 shrink-0">
        <div className="max-w-4xl mx-auto space-y-2">
          {forwardingMessage && (
            <div className="p-2 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Forward className="w-4 h-4 text-primary" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-bold text-primary uppercase">Пересылка</span>
                  <span className="text-xs truncate text-muted-foreground">От: {forwardingMessage.senderName}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setForwardingMessage(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          {replyTo && (
            <div className="p-2 bg-muted/50 rounded-xl border-l-4 border-primary flex items-center justify-between">
              <div className="flex flex-col min-w-0 pl-2">
                <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Ответ: {replyTo.senderName}</span>
                <span className="text-xs truncate text-muted-foreground italic">{replyTo.content}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setReplyTo(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {isRecordingVideo && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="relative flex flex-col items-center gap-6">
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-primary shadow-2xl bg-black">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                </div>
                {hasCameraPermission === false && (
                  <Alert variant="destructive" className="max-w-xs">
                    <AlertTitle>Доступ ограничен</AlertTitle>
                    <AlertDescription>Пожалуйста, разрешите доступ к камере в настройках браузера.</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-4">
                  <Button variant="outline" size="lg" className="rounded-full h-16 w-16" onClick={() => setIsRecordingVideo(false)}>
                    <X className="w-6 h-6" />
                  </Button>
                  <Button variant="default" size="lg" className="rounded-full h-16 w-16 bg-red-500 hover:bg-red-600 animate-pulse" onClick={stopRecording}>
                    <Circle className="w-8 h-8 fill-white" />
                  </Button>
                </div>
                <div className="text-white font-bold uppercase tracking-widest text-sm animate-pulse">Запись...</div>
              </div>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl shrink-0 bg-muted hover:bg-muted/80" onClick={() => toast({ title: "Скоро", description: "Функция фото в разработке" })}>
              <Camera className="w-5 h-5 text-muted-foreground" />
            </Button>
            
            <div className="flex-1 relative">
              <Input 
                placeholder="Напишите сообщение..." 
                className="bg-muted border-none rounded-xl h-11 text-sm px-4 pr-10" 
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={isSending}
              />
              {amIPremium && (
                <button 
                  onClick={handleAiDraft}
                  disabled={isDrafting}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform disabled:opacity-30"
                >
                  {isDrafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                </button>
              )}
            </div>
            
            {!messageInput.trim() ? (
              <Button size="icon" className="h-11 w-11 rounded-xl shrink-0 bg-primary hover:bg-primary/90" onClick={startRecording}>
                <Circle className="w-5 h-5" />
              </Button>
            ) : (
              <Button size="icon" className="h-11 w-11 rounded-xl shrink-0 bg-primary hover:bg-primary/90" onClick={() => handleSendMessage()} disabled={isSending}>
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </div>
      </footer>

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}
