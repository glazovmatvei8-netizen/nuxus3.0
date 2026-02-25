
"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Paperclip, Smile, MoreVertical, ChevronLeft, 
  Sparkles, MessageSquare, Info, Mic, Camera, X, StopCircle, UserPlus,
  CornerUpLeft, Pencil, Trash2, Loader2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, arrayUnion } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';
import { cn } from '@/lib/utils';
import { formatLastSeen } from '@/lib/utils';
import type { Message } from '@/lib/types';

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
  
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [statusString, setStatusString] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
  const { data: chat, isLoading: isChatLoading } = useDoc(chatRef);

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

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !currentChatId || !isParticipant) return null;
    return query(
      collection(db, 'chats', currentChatId, 'messages'),
      orderBy('sentAt', 'asc')
    );
  }, [db, currentChatId, isParticipant]);
  
  const { data: messages, isLoading: isMessagesLoading } = useCollection<Message>(messagesQuery);

  useEffect(() => {
    if (!currentChatId || !user || !isParticipant || !db) return;
    
    if (inputText.length > 0) {
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId), {
        [`typing.${user.uid}`]: true
      });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        updateDocumentNonBlocking(doc(db, 'chats', currentChatId), {
          [`typing.${user.uid}`]: false
        });
      }, 3000);
    } else {
      updateDocumentNonBlocking(doc(db, 'chats', currentChatId), {
        [`typing.${user.uid}`]: false
      });
    }
  }, [inputText, currentChatId, user, db, isParticipant]);

  useEffect(() => {
    const isTyping = chat?.typing && otherId && chat.typing[otherId];
    if (isTyping) {
      setStatusString('печатает...');
    } else if (isOtherProfileLoading) {
      setStatusString('загрузка...');
    } else if (chat?.type === 'private') {
      setStatusString(formatLastSeen(otherUserProfile?.lastSeen));
    } else {
      setStatusString(chat?.type === 'group' ? 'Группа' : 'Канал');
    }
  }, [isOtherProfileLoading, otherUserProfile?.lastSeen, chat?.type, chat?.typing, otherId]);

  useEffect(() => {
    if (messages && user && currentChatId && chat && isParticipant && db) {
      const unread = messages.filter(msg => !msg.isRead && msg.senderId !== user.uid).slice(0, 5);
      unread.forEach(msg => {
        const msgRef = doc(db, 'chats', currentChatId, 'messages', msg.id);
        updateDocumentNonBlocking(msgRef, { isRead: true });
      });
    }
  }, [messages, user, currentChatId, isParticipant, db, chat]);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (content: string = inputText, type: string = 'text') => {
    const text = content.trim();
    if (!text && type === 'text') return;
    if (!currentChatId || !user || !isParticipant || !db) return;
    
    if (editMessage && type === 'text') {
      const ref = doc(db, 'chats', currentChatId, 'messages', editMessage.id);
      updateDocumentNonBlocking(ref, { content: text, editedAt: new Date().toISOString() });
      setEditMessage(null);
      setInputText('');
      return;
    }

    const data: Partial<Message> = {
      chatId: currentChatId,
      senderId: user.uid,
      senderName: userProfile?.name || 'User',
      content: text,
      contentType: type as any,
      sentAt: new Date().toISOString(),
      isRead: false
    };

    if (replyTo) {
      data.replyToId = replyTo.id;
      data.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[${replyTo.contentType}]`;
      setReplyTo(null);
    }

    addDocumentNonBlocking(collection(db, 'chats', currentChatId, 'messages'), data);
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
      const { draftMessage } = await suggestMessageDraft({ conversationHistory: history, currentUserInput: inputText });
      setInputText(draftMessage);
    } catch (e) {
      toast({ title: "Ошибка AI", variant: "destructive" });
    } finally { setIsSuggesting(false); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsRecordingAudio(false);
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = e => e.data.size > 0 && audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => handleSendMessage(reader.result as string, 'audio');
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current.start();
      setIsRecordingAudio(true);
    } catch (e) { toast({ title: "Нет доступа к микрофону", variant: "destructive" }); }
  };

  const chatDisplayName = otherId && chat?.metadata && chat.metadata[otherId] ? chat.metadata[otherId].name : chat?.name;

  if (!currentChatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
        <MessageSquare className="w-16 h-16 text-primary/20 mb-4" />
        <h2 className="text-xl font-bold opacity-60">Выберите чат</h2>
      </div>
    );
  }

  const customBackground = userProfile?.settings?.chatBackground;
  const bgStyle = customBackground && customBackground !== 'default' 
    ? { backgroundImage: `url(${customBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' } 
    : {};

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <header className="h-16 flex items-center justify-between px-4 border-b border-border/40 bg-card/20 backdrop-blur-xl z-20">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCurrentChatId(null)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setIsChatInfoOpen(true)}>
            <UserAvatar userId={chat?.type === 'private' ? otherId : null} fallbackName={chatDisplayName} className="h-9 w-9 ring-2 ring-primary/20" />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">{chatDisplayName}</span>
              <span className={cn("text-[10px] truncate", statusString === 'печатает...' ? 'text-accent font-bold' : 'text-muted-foreground')}>{statusString}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" onClick={() => setIsChatInfoOpen(true)}><Info className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground"><MoreVertical className="w-5 h-5" /></Button>
        </div>
      </header>

      <div className="flex-1 relative z-10 overflow-hidden">
        {customBackground && customBackground !== 'default' && (
          <div className="absolute inset-0 z-[-1] brightness-100" style={bgStyle} />
        )}
        <ScrollArea ref={scrollRef} className="h-full px-4 py-4">
          {!isParticipant && !isChatLoading && chat ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <UserPlus className="w-12 h-12 text-primary" />
              <p className="text-muted-foreground">Вы не в чате</p>
              <Button onClick={() => updateDocumentNonBlocking(chatRef!, { participantIds: arrayUnion(user?.uid) })}>Вступить</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-w-4xl mx-auto pb-4">
              {messages?.map(msg => (
                <MessageItem key={msg.id} message={msg} isMe={msg.senderId === user?.uid} chatId={currentChatId} onReply={() => setReplyTo(msg)} onEdit={() => { setEditMessage(msg); setInputText(msg.content); }} size={userProfile?.settings?.messageSize} />
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

      <footer className="p-3 bg-card/20 backdrop-blur-xl border-t border-border/40 z-20">
        {isParticipant ? (
          <div className="flex flex-col gap-2 max-w-4xl mx-auto">
            {replyTo && (
              <div className="flex items-center justify-between bg-muted/40 p-2 rounded-xl border-l-4 border-primary mb-2">
                <div className="flex items-center gap-3 truncate">
                  <CornerUpLeft className="w-4 h-4 text-primary" />
                  <span className="text-xs truncate italic">{replyTo.content}</span>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setReplyTo(null)} className="h-6 w-6"><X className="w-4 h-4" /></Button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-1 mb-1">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
                  const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => handleSendMessage(r.result as string, 'image'); r.readAsDataURL(f); }
                }} />
                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}><Paperclip className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" onClick={handleAISuggest} disabled={isSuggesting}><Sparkles className={cn("w-5 h-5 text-accent", isSuggesting && "animate-spin")} /></Button>
              </div>
              <div className="flex-1 relative">
                <Input placeholder={editMessage ? "Изменить..." : "Сообщение..."} value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="bg-muted/40 rounded-2xl h-11 pr-12" />
                <Button size="icon" className={cn("absolute right-1 top-1 w-9 h-9 rounded-xl transition-all", inputText.trim() ? 'scale-100' : 'scale-0')} onClick={() => handleSendMessage()}><Send className="w-4 h-4" /></Button>
              </div>
              <Button variant="ghost" size="icon" onClick={isRecordingAudio ? stopRecording : startAudioRecording} className={cn("mb-1", isRecordingAudio && "text-primary")}><Mic className="w-5 h-5" /></Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center max-w-4xl mx-auto">
             {chat && <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => updateDocumentNonBlocking(chatRef!, { participantIds: arrayUnion(user?.uid) })}>Вступить в обсуждение</Button>}
          </div>
        )}
      </footer>
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}
