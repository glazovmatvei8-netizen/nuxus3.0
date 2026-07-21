
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, ChevronLeft, X, Paperclip, Mic, StopCircle, 
  Smile, ImageIcon, Trash2, AtSign, RefreshCcw, CornerUpLeft, Circle, Video as VideoIcon, Shield,
  Heart, Square, Triangle, Ghost, Play, Search, Sparkles, Loader2, Users
} from 'lucide-react';
import { MessageItem } from './message-item';
import { ChatInfoModal } from './modals/chat-info-modal';
import { CreatePollModal } from './modals/create-poll-modal';
import { EmojiPicker } from './emoji-picker';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, updateDoc, limit, getDocs, where, getDoc, writeBatch } from 'firebase/firestore';
import { formatDisplayName, cn, compressImage, encryptSignal, isGlobalAdmin, decryptSignal, formatLastSeen, isUserPremium } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { isToday, isYesterday, format } from 'date-fns';
import { ru } from 'date-fns/locale';

const ChatInputBar = memo(({ onSendMessage, canPost, onPollOpen, currentChatId, isPremium, replyTo, onCancelReply, onOpenProRecorder, messages, participantIds, isGroup }: any) => {
  const { localDrafts, setLocalDrafts } = useAppState();
  
  const [messageInput, setMessageInput] = useState(localDrafts[currentChatId] || '');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [recorderMode, setRecorderMode] = useState<'audio' | 'video'>('audio');
  const [recordingDuration, setRecordingDuration] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessageInput(localDrafts[currentChatId] || '');
  }, [currentChatId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (messageInput !== localDrafts[currentChatId]) {
        setLocalDrafts(prev => ({ ...prev, [currentChatId]: messageInput }));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [messageInput, currentChatId, setLocalDrafts, localDrafts]);

  const handleSend = () => {
    if (!messageInput.trim()) return;
    onSendMessage(messageInput, 'text', null);
    setMessageInput('');
    setLocalDrafts(prev => ({ ...prev, [currentChatId]: '' }));
  };

  const startAudioRecording = async () => {
    if (isRecording) return;
    try {
      chunksRef.current = []; 
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e) => { 
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        const dur = recordingDuration; // Capture final duration before reset
        
        if (blob.size > 1000) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              onSendMessage(reader.result as string, 'audio', { duration: dur });
            }
          };
          reader.readAsDataURL(blob);
        }
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }
        setIsRecording(false);
        setRecordingDuration(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };

      recorder.start(100); 
      setIsRecording(true);
      setRecordingDuration(0);
      
      // V5.9.0 Fix: Proper 1-second interval for duration
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(20);
    } catch (err) { 
      toast({ title: "Микрофон не доступен", variant: "destructive" });
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
      setRecordingDuration(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  if (!canPost) return null;

  return (
    <footer className="p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] obsidian-glass border-t border-white/5 shrink-0 z-40 relative flex flex-col gap-2">
      {replyTo && (
        <div className="bg-white/5 p-3 rounded-2xl flex items-center justify-between border border-white/5 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 min-w-0">
            <CornerUpLeft className="w-4 h-4 text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{replyTo.senderName}</span>
              <span className="text-[11px] text-white/40 truncate italic">{decryptSignal(replyTo.content)}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onCancelReply}><X className="w-4 h-4" /></Button>
        </div>
      )}

      <div className="flex gap-2 items-end w-full">
        {!isRecording ? (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-2xl bg-white/5 hover:bg-primary/10 mb-0.5"><Paperclip className="w-6 h-6" /></Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-64 obsidian-glass border-white/10 rounded-[2.2rem] p-2 mb-4 shadow-2xl">
                <AttachmentItem icon={ImageIcon} label="Медиа" color="text-primary" onClick={() => fileInputRef.current?.click()} />
                <AttachmentItem icon={AtSign} label="Опрос" color="text-blue-400" onClick={onPollOpen} />
              </PopoverContent>
            </Popover>
            
            <div className="flex-1 flex items-end bg-white/5 rounded-[1.5rem] border border-white/5 min-h-11 px-4 py-2 relative shadow-inner">
              <Textarea 
                ref={textareaRef}
                placeholder="Сообщение..." 
                className="bg-transparent border-none focus-visible:ring-0 text-white font-medium min-h-[32px] max-h-[200px] py-1 text-base resize-none w-full scrollbar-hide" 
                value={messageInput} 
                onChange={e => setMessageInput(e.target.value)} 
              />
              <div className="flex items-center gap-1 mb-[-2px] shrink-0">
                <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                   <PopoverTrigger asChild>
                     <Button variant="ghost" size="icon" className="text-white/20 hover:text-primary h-9 w-9"><Smile className="w-6 h-6" /></Button>
                   </PopoverTrigger>
                   <PopoverContent side="top" className="p-0 border-none bg-transparent w-[320px] mb-4">
                     <EmojiPicker onEmojiSelect={(e) => setMessageInput(messageInput + e)} onStickerSelect={(url) => { onSendMessage(url, 'sticker', null); setIsEmojiPickerOpen(false); }} />
                   </PopoverContent>
                </Popover>
              </div>
            </div>

            {messageInput.trim() ? (
              <Button size="icon" className="h-11 w-11 rounded-2xl bg-primary text-white shadow-xl mb-0.5 shrink-0 active:scale-90" onClick={handleSend}><Send className="w-5 h-5" /></Button>
            ) : (
              <div className="flex gap-1 mb-0.5 shrink-0">
                <Button size="icon" variant="ghost" className="h-11 w-11 rounded-2xl bg-white/5 text-white/30" onClick={() => setRecorderMode(recorderMode === 'audio' ? 'video' : 'audio')}>
                  {recorderMode === 'audio' ? <VideoIcon className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <button className="h-11 w-11 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90 bg-primary text-white" onPointerDown={() => recorderMode === 'audio' && startAudioRecording()} onPointerUp={() => recorderMode === 'audio' && stopAudioRecording()} onClick={() => recorderMode === 'video' && onOpenProRecorder()}>
                  {recorderMode === 'audio' ? <Mic className="w-5 h-5" /> : <Circle className="w-5 h-5 fill-current" />}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center bg-primary/10 border border-primary/20 rounded-[1.5rem] h-11 px-4 gap-4 animate-in slide-in-from-right-8">
            <div className="flex items-center gap-2 text-primary animate-pulse"><div className="w-2 h-2 rounded-full bg-primary shadow-lg" /><span className="text-[10px] font-black uppercase tracking-widest">LIVE</span></div>
            <span className="text-lg font-black italic flex-1 tabular-nums text-white">
              {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40" onClick={() => { if(mediaRecorderRef.current) { mediaRecorderRef.current.onstop = () => { setIsRecording(false); setRecordingDuration(0); if(streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); }; mediaRecorderRef.current.stop(); if(timerIntervalRef.current) clearInterval(timerIntervalRef.current); } }}><Trash2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-primary" onPointerDown={stopAudioRecording}><StopCircle className="w-7 h-7 fill-current" /></Button>
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" />
    </footer>
  );
});

function AttachmentItem({ icon: Icon, label, color, onClick }: any) {
  return (
    <button onClick={onClick} className="flex items-center gap-4 w-full p-3.5 rounded-xl hover:bg-white/5 transition-all text-left group">
      <Icon className={cn("w-5 h-5", color)} />
      <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{label}</span>
    </button>
  );
}

ChatInputBar.displayName = 'ChatInputBar';

export default function ChatArea() {
  const { user: firebaseUser } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId, setForwardingMessage } = useAppState();
  const { toast } = useToast();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProRecorderOpen, setIsProRecorderOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const messagesQuery = useMemoFirebase(() => (!db || !currentChatId) ? null : query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc')), [db, currentChatId]);
  const { data: messages } = useCollection<Message>(messagesQuery);

  const isPremium = useMemo(() => isUserPremium(userProfile), [userProfile]);

  useEffect(() => {
    if (!db || !currentChatId || !firebaseUser || !messages?.length) return;
    const unreadFromOthers = messages.filter(m => !m.isRead && m.senderId !== firebaseUser.uid);
    if (unreadFromOthers.length > 0) {
      const markAsRead = async () => {
        const batch = writeBatch(db);
        unreadFromOthers.forEach(m => {
          const mRef = doc(db, 'chats', currentChatId, 'messages', m.id);
          batch.update(mRef, { isRead: true });
        });
        try { await batch.commit(); } catch (e) { }
      };
      markAsRead();
    }
  }, [messages, currentChatId, firebaseUser, db]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const end = document.getElementById('messages-end');
    if (end) end.scrollIntoView({ behavior });
  }, []);

  useEffect(() => { scrollToBottom('auto'); }, [currentChatId, messages?.length, scrollToBottom]);

  const handleSendMessage = useCallback(async (content_msg: string, type_msg: Message['contentType'] = 'text', meta: any = null) => {
    if (!content_msg || !currentChatId || !firebaseUser || !db) return;
    
    let finalContent = (type_msg === 'text' || type_msg === 'reply') ? encryptSignal(content_msg) : content_msg;
    if (type_msg === 'image' && !content_msg.startsWith('data:')) finalContent = await compressImage(content_msg, 1200, 0.6);

    const msgData: any = { 
      chatId: currentChatId, senderId: firebaseUser.uid, senderName: userProfile?.name || 'User', 
      content: finalContent, contentType: type_msg, sentAt: new Date().toISOString(), isRead: false,
      metadata: { bubbleStyle: userProfile?.settings?.bubbleStyle || 'default', ...meta }
    };

    if (replyTo) { 
      msgData.replyToId = replyTo.id; 
      msgData.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[Сигнал: ${replyTo.contentType.toUpperCase()}]`; 
      setReplyTo(null);
    }
    
    addDoc(collection(db, 'chats', currentChatId, 'messages'), msgData);
    updateDoc(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString() });
  }, [currentChatId, firebaseUser, db, userProfile, replyTo]);

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden z-20 max-w-full">
      {userProfile?.settings?.chatBackground && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src={userProfile.settings.chatBackground} className="w-full h-full object-cover" alt="BG" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}
      
      <header className="h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b border-white/5 obsidian-glass flex items-center justify-between px-5 shrink-0 z-30">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden obsidian-glass rounded-xl text-white/50 h-10 w-10 shrink-0" onClick={() => setCurrentChatId(null)}><ChevronLeft className="w-6 h-6" /></Button>
          {!isSearchMode ? (
            <div className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 group" onClick={() => setIsChatInfoOpen(true)}>
              <UserAvatar userId={chat?.type === 'private' ? chat.participantIds.find(id => id !== firebaseUser?.uid) : null} manualAvatarUrl={chat?.type !== 'private' ? chat?.avatarUrl : null} className="h-10 w-10 border border-white/10 shrink-0" fallbackName={formatDisplayName(chat?.name)} showOnlineStatus />
              <div className="flex flex-col min-w-0 text-left">
                <span className="font-black text-[16px] truncate text-white italic tracking-tighter uppercase group-hover:text-primary transition-colors leading-tight">{formatDisplayName(chat?.name, chat?.username)}</span>
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-primary/40 leading-none truncate mt-0.5">Сигнал активен</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-3 obsidian-glass px-4 rounded-xl h-10 border-white/10">
              <Search className="w-4 h-4 text-primary shrink-0" />
              <input placeholder="Поиск..." className="bg-transparent border-none outline-none text-sm text-white font-bold flex-1 min-w-0" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
              <button onClick={() => { setIsSearchMode(false); setSearchQuery(''); }} className="text-white/20 hover:text-white shrink-0"><X className="w-5 h-5" /></button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0 z-10 bg-transparent">
        <ScrollArea className="flex-1 w-full relative z-10">
          <div className="flex flex-col gap-2 max-w-5xl mx-auto px-4 md:px-10 py-8 min-h-full">
            {messages?.map(msg => (
               <MessageItem 
                 key={msg.id} message={msg} isMe={msg.senderId === firebaseUser?.uid} 
                 chatId={currentChatId} onReply={setReplyTo} 
                 amIPremium={isPremium} isAdmin={isGlobalAdmin(userProfile)} isGroup={chat?.type !== 'private'} 
                 onForward={setForwardingMessage} 
                 viewerProfile={userProfile} 
               />
            ))}
            <div id="messages-end" className="h-4" />
          </div>
        </ScrollArea>
      </div>

      <ChatInputBar 
        onSendMessage={handleSendMessage} 
        canPost={true} 
        onPollOpen={() => setIsPollModalOpen(true)} 
        currentChatId={currentChatId} 
        isPremium={isPremium} 
        replyTo={replyTo} 
        onCancelReply={() => setReplyTo(null)} 
        onOpenProRecorder={() => setIsProRecorderOpen(true)} 
        messages={messages} 
        participantIds={chat?.participantIds} 
        isGroup={chat?.type !== 'private'}
      />

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      {currentChatId && <CreatePollModal open={isPollModalOpen} onOpenChange={setIsPollModalOpen} chatId={currentChatId} />}
    </div>
  );
}
