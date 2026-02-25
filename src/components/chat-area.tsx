"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Paperclip, Smile, MoreVertical, ChevronLeft, 
  Sparkles, MessageSquare, Info, Mic, Camera, X, StopCircle, UserPlus,
  CornerUpLeft, Pencil, Trash2, Loader2, Pin
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, arrayUnion } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';
import { cn } from '@/lib/utils';
import { formatLastSeen } from '@/lib/utils';
import type { Message } from '@/lib/types';

const EMOJIS = ['❤️', '👍', '😂', '🔥', '😮', '😢', '👏', '✅', '🚀', '🎉', '🙏', '💯'];

interface ChatAreaProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export default function ChatArea({ toggleSidebar, isSidebarOpen }: ChatAreaProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId } = useAppState();
  const [inputText, setInputText] = useState('');
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [statusString, setStatusString] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: userProfile } = useDoc(userProfileRef);

  const chatRef = useMemoFirebase(() => {
    if (!db || !currentChatId) return null;
    return doc(db, 'chats', currentChatId);
  }, [db, currentChatId]);
  const { data: chat } = useDoc(chatRef);

  const pinnedMsgRef = useMemoFirebase(() => {
    if (!db || !currentChatId || !chat?.pinnedMessageId) return null;
    return doc(db, 'chats', currentChatId, 'messages', chat.pinnedMessageId);
  }, [db, currentChatId, chat?.pinnedMessageId]);
  const { data: pinnedMessage } = useDoc<Message>(pinnedMsgRef);

  // Проверка участия (учитываем, что chat может загружаться)
  const isParticipant = useMemo(() => {
    if (!chat || !user) return false;
    return chat.participantIds?.includes(user.uid) || false;
  }, [chat, user]);

  const otherId = chat?.type === 'private' && user ? chat.participantIds?.find((id: string = '') => id !== user.uid) : null;
  const otherUserRef = useMemoFirebase(() => {
    if (!db || !otherId) return null;
    return doc(db, 'users', otherId);
  }, [db, otherId]);
  const { data: otherUserProfile, isLoading: isOtherProfileLoading } = useDoc(otherUserRef);

  // Запрашиваем сообщения ТОЛЬКО если пользователь является участником и данные чата загружены
  const messagesQuery = useMemoFirebase(() => {
    if (!db || !currentChatId || !chat || !isParticipant) return null;
    return query(
      collection(db, 'chats', currentChatId, 'messages'),
      orderBy('sentAt', 'asc')
    );
  }, [db, currentChatId, chat, isParticipant]);
  
  const { data: messages, isLoading: isMessagesLoading } = useCollection<Message>(messagesQuery);

  useEffect(() => {
    if (isOtherProfileLoading) {
      setStatusString('загрузка...');
    } else if (chat?.type === 'private') {
      setStatusString(formatLastSeen(otherUserProfile?.lastSeen));
    } else {
      setStatusString(chat?.type === 'group' ? 'Группа' : 'Канал');
    }
  }, [isOtherProfileLoading, otherUserProfile?.lastSeen, chat?.type]);

  // Управление темами
  useEffect(() => {
    if (userProfile?.settings?.theme) {
      const theme = userProfile.settings.theme;
      const root = document.documentElement;
      
      switch (theme) {
        case 'ocean':
          root.style.setProperty('--primary', '210 100% 50%');
          root.style.setProperty('--accent', '180 100% 40%');
          break;
        case 'forest':
          root.style.setProperty('--primary', '140 100% 30%');
          root.style.setProperty('--accent', '160 100% 45%');
          break;
        case 'sunset':
          root.style.setProperty('--primary', '20 100% 50%');
          root.style.setProperty('--accent', '45 100% 50%');
          break;
        case 'midnight':
          root.style.setProperty('--primary', '240 10% 10%');
          root.style.setProperty('--accent', '240 10% 40%');
          break;
        default:
          root.style.setProperty('--primary', '230 43% 42%');
          root.style.setProperty('--accent', '199 73% 58%');
      }
    }
  }, [userProfile?.settings?.theme]);

  // Пометка сообщений как прочитанных
  useEffect(() => {
    if (messages && user && currentChatId && chat && isParticipant) {
      const unread = messages.filter(msg => !msg.isRead && msg.senderId !== user.uid).slice(0, 10);
      unread.forEach(msg => {
        const msgRef = doc(db, 'chats', currentChatId, 'messages', msg.id);
        updateDocumentNonBlocking(msgRef, { isRead: true });
      });
    }
  }, [messages, user, currentChatId, isParticipant, db, chat]);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecordingAudio(false);
    setIsRecordingVideo(false);
    setVideoModalOpen(false);
  };

  const handleSendMessage = (content: string = inputText, type: string = 'text') => {
    const textToSend = content.trim();
    if (!textToSend && type === 'text') return;
    if (!currentChatId || !user) return;
    
    if (editMessage && type === 'text') {
      const messageRef = doc(db, 'chats', currentChatId, 'messages', editMessage.id);
      updateDocumentNonBlocking(messageRef, {
        content: textToSend,
        editedAt: new Date().toISOString()
      });
      setEditMessage(null);
      setInputText('');
      return;
    }

    const messageData: Partial<Message> = {
      chatId: currentChatId,
      senderId: user.uid,
      senderName: userProfile?.name || 'User',
      content: textToSend,
      contentType: type as any,
      sentAt: new Date().toISOString(),
      isRead: false
    };

    if (replyTo) {
      messageData.replyToId = replyTo.id;
      messageData.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[${replyTo.contentType}]`;
      setReplyTo(null);
    }

    const messagesCol = collection(db, 'chats', currentChatId, 'messages');
    addDocumentNonBlocking(messagesCol, messageData);
    if (type === 'text') setInputText('');
  };

  const handleAISuggest = async () => {
    if (!messages || messages.length === 0) return;
    setIsSuggesting(true);
    try {
      const history = messages.slice(-5).map(m => ({
        sender: m.senderName,
        message: m.contentType === 'text' ? m.content : `[${m.contentType}]`
      }));
      const { draftMessage } = await suggestMessageDraft({
        conversationHistory: history,
        currentUserInput: inputText
      });
      setInputText(draftMessage);
    } catch (e) {
      toast({ title: "AI Error", description: "Could not get suggestion.", variant: "destructive" });
    } finally {
      setIsSuggesting(false);
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => handleSendMessage(reader.result as string, 'audio');
      };
      mediaRecorderRef.current.start();
      setIsRecordingAudio(true);
    } catch (err) {
      toast({ title: "Ошибка", description: "Нет доступа к микрофону", variant: "destructive" });
    }
  };

  const startVideoRecording = async () => {
    try {
      setVideoModalOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      videoChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(videoBlob);
        reader.onloadend = () => handleSendMessage(reader.result as string, 'video');
      };
      mediaRecorderRef.current.start();
      setIsRecordingVideo(true);
    } catch (err) {
      setVideoModalOpen(false);
      toast({ title: "Ошибка", description: "Нет доступа к камере", variant: "destructive" });
    }
  };

  const handleUnpin = () => {
    if (!chatRef) return;
    updateDocumentNonBlocking(chatRef, { pinnedMessageId: null });
  };

  const chatDisplayName = otherId && chat?.metadata ? chat.metadata[otherId]?.name : chat?.name;

  if (!currentChatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 to-background">
        <div className="bg-primary/10 p-6 rounded-full mb-6">
          <MessageSquare className="w-16 h-16 text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold mb-2">NuxusChat Premium</h2>
        <p className="text-muted-foreground max-w-sm">Выберите чат, чтобы начать качественное общение.</p>
      </div>
    );
  }

  const customBackground = userProfile?.settings?.chatBackground;
  const backgroundStyle = customBackground && customBackground !== 'default' 
    ? { backgroundImage: `url(${customBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' } 
    : {};

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <header className="h-16 flex items-center justify-between px-4 border-b border-border/40 bg-card/20 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setCurrentChatId(null)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setIsChatInfoOpen(true)}>
            <UserAvatar 
              userId={chat?.type === 'private' ? otherId : null} 
              fallbackName={chatDisplayName}
              className="h-9 w-9 md:h-10 md:w-10 ring-2 ring-primary/20"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm leading-tight truncate">{chatDisplayName}</span>
              <span className={cn(
                "text-[10px] truncate",
                statusString === 'в сети' ? 'text-accent font-bold' : 'text-muted-foreground'
              )}>
                {statusString}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hidden sm:inline-flex" onClick={() => setIsChatInfoOpen(true)}>
            <Info className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {pinnedMessage && (
        <div className="h-12 bg-card/40 backdrop-blur-md border-b border-border/40 px-4 flex items-center justify-between z-10 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1" onClick={() => {
            const el = document.getElementById(`msg-${pinnedMessage.id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}>
            <Pin className="w-4 h-4 text-primary shrink-0 rotate-45" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-primary uppercase">Закрепленное сообщение</span>
              <span className="text-xs truncate text-muted-foreground">{pinnedMessage.content}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleUnpin}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex-1 relative z-10 overflow-hidden">
        {customBackground && customBackground !== 'default' && (
          <div className="absolute inset-0 z-[-1] opacity-100" style={backgroundStyle} />
        )}
        <ScrollArea ref={scrollRef} className="h-full px-4 py-4 overflow-y-auto">
          {(!isParticipant && chat) ? (
            <div className="min-h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <UserPlus className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Вы не являетесь участником</h3>
              <p className="text-sm text-muted-foreground max-w-xs">Вступите, чтобы общаться и видеть сообщения.</p>
              <Button onClick={() => updateDocumentNonBlocking(chatRef!, { participantIds: arrayUnion(user?.uid) })} className="rounded-xl px-8 h-12 shadow-lg shadow-primary/20">Вступить</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-w-4xl mx-auto min-h-full pb-4">
              {messages?.map((msg) => (
                <MessageItem 
                  key={msg.id} 
                  message={msg} 
                  isMe={msg.senderId === user?.uid}
                  chatId={currentChatId}
                  onReply={() => setReplyTo(msg)}
                  onEdit={() => { setEditMessage(msg); setInputText(msg.content); }}
                  size={userProfile?.settings?.messageSize}
                />
              ))}
              {isMessagesLoading && (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      <footer className="p-3 md:p-4 bg-card/20 backdrop-blur-xl border-t border-border/40 z-20 shrink-0">
        {!isParticipant ? (
          <div className="max-w-4xl mx-auto text-center py-2">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest italic">Режим просмотра</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-w-4xl mx-auto">
            {isRecordingAudio && (
              <div className="flex items-center justify-between bg-primary/10 p-3 rounded-2xl animate-in slide-in-from-bottom-2 mb-2">
                <div className="flex items-center gap-3 text-primary">
                  <Mic className="w-5 h-5 animate-pulse" />
                  <span className="font-mono font-bold">0:{recordingTime.toString().padStart(2, '0')}</span>
                  <span className="text-sm hidden sm:inline">Запись голоса...</span>
                </div>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={stopRecording}>
                  <StopCircle className="w-6 h-6" />
                </Button>
              </div>
            )}

            {replyTo && (
              <div className="flex items-center justify-between bg-muted/40 p-2 rounded-xl border-l-4 border-primary animate-in slide-in-from-bottom-2 mb-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <CornerUpLeft className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-primary truncate">{replyTo.senderName}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{replyTo.content}</span>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => setReplyTo(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex items-end gap-1 md:gap-2">
              <div className="flex items-center gap-0.5 md:gap-1 mb-1">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => handleSendMessage(reader.result as string, 'image');
                    reader.readAsDataURL(file);
                  }
                }} />
                <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10 text-muted-foreground hover:text-primary" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="w-5 h-5" />
                </Button>
                
                <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10 text-muted-foreground hover:text-primary">
                      <Smile className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2 bg-card/95 backdrop-blur-xl border-border/40 rounded-2xl" side="top">
                    <div className="grid grid-cols-6 gap-1">
                      {EMOJIS.map(emoji => (
                        <button 
                          key={emoji} 
                          onClick={() => { setInputText(prev => prev + emoji); setIsEmojiOpen(false); }}
                          className="text-xl hover:scale-125 transition-transform p-1"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("h-9 w-9 md:h-10 md:w-10 text-muted-foreground hover:text-primary transition-all", isSuggesting && "animate-spin")}
                  onClick={handleAISuggest}
                  disabled={isSuggesting}
                >
                  {isSuggesting ? <Loader2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5 text-accent" />}
                </Button>
              </div>

              <div className="flex-1 relative group">
                <Input 
                  placeholder={editMessage ? "Изменить сообщение..." : "Написать сообщение..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="bg-muted/40 border-muted-foreground/10 rounded-2xl h-10 md:h-11 pr-10 md:pr-12 focus:ring-1 focus:ring-primary/40 group-hover:bg-muted/60 transition-colors"
                  disabled={isRecordingAudio}
                />
                <Button 
                  size="icon" 
                  className={`absolute right-1 top-1 w-8 h-8 md:w-9 md:h-9 rounded-xl shadow-lg shadow-primary/20 transition-all ${inputText.trim() ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                  onClick={() => handleSendMessage()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-0.5 md:gap-1 mb-1">
                <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10 text-muted-foreground hover:text-primary hidden sm:inline-flex" onClick={startVideoRecording}>
                  <Camera className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className={cn("h-9 w-9 md:h-10 md:w-10 text-muted-foreground hover:text-primary", isRecordingAudio && "text-primary")} onClick={isRecordingAudio ? stopRecording : startAudioRecording}>
                  <Mic className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </footer>

      <Dialog open={videoModalOpen} onOpenChange={(val) => !val && stopRecording()}>
        <DialogContent className="sm:max-w-md bg-black border-none p-0 overflow-hidden">
          <DialogHeader className="p-4 absolute top-0 w-full z-10 bg-gradient-to-b from-black/60 to-transparent">
            <DialogTitle className="text-white flex items-center justify-between font-bold">
              Запись видео...
              <span className="font-mono text-red-500">0:{recordingTime.toString().padStart(2, '0')} / 3:00</span>
            </DialogTitle>
          </DialogHeader>
          <video ref={videoPreviewRef} autoPlay muted className="w-full aspect-video bg-black" />
          <div className="p-6 flex justify-center bg-gradient-to-t from-black/60 to-transparent absolute bottom-0 w-full">
            <Button size="lg" variant="destructive" className="rounded-full w-16 h-16 p-0 border-4 border-white/20" onClick={stopRecording}>
              <StopCircle className="w-8 h-8" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}