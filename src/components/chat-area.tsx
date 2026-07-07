
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, X, Paperclip, Mic, StopCircle, Edit2, Search,
  Smile, ImageIcon, Trash2, AtSign, RefreshCcw, CornerUpLeft, Circle, Video as VideoIcon, Phone, Shield,
  Heart, Square, Triangle, Ghost, Star, Cloud
} from 'lucide-react';
import { MessageItem } from './message-item';
import { ChatInfoModal } from './modals/chat-info-modal';
import { CreatePollModal } from './modals/create-poll-modal';
import { EmojiPicker } from './emoji-picker';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, updateDoc, where, getDocs, writeBatch } from 'firebase/firestore';
import { formatDisplayName, cn, compressImage, encryptSignal, isGlobalAdmin, decryptSignal, formatLastSeen, isUserPremium } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

// Shapes for Video Notes V28.7.2
const VIDEO_SHAPES = [
  { id: 'circle', icon: Circle, label: 'Круг', clip: 'circle(50% at 50% 50%)' },
  { id: 'square', icon: Square, label: 'Квадрат', clip: 'inset(0% rounded 15%)' },
  { id: 'heart', icon: Heart, label: 'Сердце', clip: 'polygon(50% 15%, 80% 0%, 100% 20%, 100% 50%, 50% 100%, 0% 50%, 0% 20%, 20% 0%)' },
  { id: 'triangle', icon: Triangle, label: 'Треугольник', clip: 'polygon(50% 0%, 0% 100%, 100% 100%)' },
  { id: 'poop', icon: Ghost, label: 'Какашка', clip: 'polygon(50% 0%, 63% 13%, 53% 25%, 80% 38%, 85% 61%, 69% 68%, 94% 82%, 100% 100%, 0% 100%, 6% 82%, 31% 68%, 15% 61%, 20% 38%, 47% 25%, 37% 13%)' }
];

/**
 * ChatInputBar V28.7.2: Fullscreen UI matched to reference screenshot.
 */
const ChatInputBar = memo(({ onSendMessage, canPost, onPollOpen, currentChatId, isPremium, replyTo, onCancelReply }: any) => {
  const { localDrafts, setLocalDrafts } = useAppState();
  const [messageInput, setMessageInput] = useState(localDrafts[currentChatId] || '');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recorderMode, setRecorderMode] = useState<'audio' | 'video'>('audio');
  const [camMode, setCamMode] = useState<'user' | 'environment'>('user');
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const [selectedShape, setSelectedShape] = useState('circle');
  const [isProRecorderOpen, setIsProRecorderOpen] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isActuallyRecording = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessageInput(localDrafts[currentChatId] || '');
  }, [currentChatId, localDrafts]);

  useEffect(() => {
    if (isRecording && recordingDuration >= 100) {
      stopRecording();
    }
  }, [isRecording, recordingDuration]);

  const switchCamera = async () => {
    if (isRecording) return; 

    const newMode = camMode === 'user' ? 'environment' : 'user';
    setCamMode(newMode);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      const constraints = {
        video: { facingMode: newMode, width: 480, height: 480, aspectRatio: 1 },
        audio: true
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = newStream;
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = newStream;
    } catch (e) { console.error("Nuxus Flip Fail", e); }
  };

  useEffect(() => {
    if (isProRecorderOpen && recorderMode === 'video' && !isRecording) {
       navigator.mediaDevices.getUserMedia({ video: { facingMode: camMode, width: 480, height: 480 }, audio: true })
        .then(s => {
          streamRef.current = s;
          if(videoPreviewRef.current) videoPreviewRef.current.srcObject = s;
        });
    }
    return () => {
      if (!isProRecorderOpen && !isRecording && streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isProRecorderOpen, recorderMode, camMode, isRecording]);

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    setLocalDrafts(prev => ({ ...prev, [currentChatId]: val }));
  };

  const handleSend = () => {
    if (!messageInput.trim()) return;
    onSendMessage(messageInput, 'text', null);
    setMessageInput('');
    setLocalDrafts(prev => ({ ...prev, [currentChatId]: '' }));
  };

  const startRecording = async () => {
    try {
      if (!streamRef.current) {
        const constraints = {
          audio: true,
          video: recorderMode === 'video' ? { facingMode: camMode, width: 480, height: 480, aspectRatio: 1 } : false
        };
        streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
      }
      
      const recorderOptions: any = {
        mimeType: 'video/webm;codecs=vp8,opus'
      };
      
      const recorder = new MediaRecorder(streamRef.current, { ...recorderOptions, videoBitsPerSecond: 80000 });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (chunksRef.current.length > 0) {
            onSendMessage(reader.result as string, recorderMode === 'video' ? 'video_note' : 'audio', { shape: selectedShape });
          }
        };
        reader.readAsDataURL(blob);
        setIsProRecorderOpen(false);
        setIsRecording(false);
        isActuallyRecording.current = false;
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
      isActuallyRecording.current = true;
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    } catch (err) { console.error(err); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isActuallyRecording.current) {
      mediaRecorderRef.current.stop();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (recorderMode === 'audio') {
      startRecording();
      return;
    }
    longPressTimer.current = setTimeout(() => {
      startRecording();
      longPressTimer.current = null;
    }, 400);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      if (recorderMode === 'video') setIsProRecorderOpen(true);
    } else if (isActuallyRecording.current) {
      stopRecording();
    }
  };

  const currentShapeObj = VIDEO_SHAPES.find(s => s.id === selectedShape) || VIDEO_SHAPES[0];

  if (!canPost) return null;

  return (
    <footer className="p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] obsidian-glass border-t border-white/5 shrink-0 z-40 relative flex flex-col gap-2">
      {replyTo && (
        <div className="bg-white/5 p-3 rounded-2xl flex items-center justify-between border border-white/5 animate-in slide-in-from-bottom-2 duration-300">
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

      {/* PRO VIDEO RECORDER OVERLAY V28.7.2 - FULLSCREEN PER REFERENCE */}
      {isProRecorderOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-500">
           {/* Top Right: Close Button */}
           <div className="absolute top-10 right-6 z-[2100]">
              <button 
                onClick={() => setIsProRecorderOpen(false)} 
                className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 shadow-2xl"
              >
                <X className="w-8 h-8 text-white" />
              </button>
           </div>

           {/* Header Info */}
           <div className="absolute top-20 left-0 right-0 px-8 text-center">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] animate-pulse">НАЖМИТЕ ДЛЯ ЗАПИСИ</p>
           </div>

           {/* Central Preview - Perfect Circle/Shape */}
           <div className="relative w-full max-w-[340px] aspect-square bg-black rounded-full overflow-hidden shadow-[0_0_100px_rgba(168,85,247,0.4)] border border-white/10">
              <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ clipPath: currentShapeObj.clip }} />
              {isRecording && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-red-500/90 px-5 py-2 rounded-full flex items-center gap-2 shadow-2xl">
                   <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                   <span className="text-white text-sm font-black tabular-nums tracking-widest">
                     {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
                   </span>
                </div>
              )}
           </div>

           {/* Bottom Interface - Layout exactly from User Request */}
           <div className="absolute bottom-12 left-0 right-0 px-8 flex flex-col gap-12">
              
              {/* Shape Selector Bar */}
              {!isRecording && (
                <div className="flex gap-4 overflow-x-auto scrollbar-hide w-full justify-center py-5 bg-white/5 rounded-[3rem] border border-white/5 shadow-inner">
                  {VIDEO_SHAPES.map(shape => (
                    <button key={shape.id} onClick={() => setSelectedShape(shape.id)} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl transition-all", selectedShape === shape.id ? "bg-primary text-white scale-110 shadow-2xl" : "bg-transparent text-white/30")}>
                      <shape.icon className="w-7 h-7" />
                    </button>
                  ))}
                </div>
              )}

              {/* Functional Controls Row: Flip - Record - Branding */}
              <div className="flex items-center justify-center w-full relative h-32">
                
                {/* Left of Record: Flip Camera */}
                <div className="absolute left-[15%]">
                   {!isRecording && (
                     <button onClick={switchCamera} className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center border border-white/10 active:scale-90 transition-transform shadow-xl">
                       <RefreshCcw className="w-7 h-7 text-white" />
                     </button>
                   )}
                </div>

                {/* Center: Big Record Button */}
                <button 
                  onClick={() => isRecording ? stopRecording() : startRecording()}
                  className={cn(
                    "w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-[0_0_60px_rgba(0,122,255,0.5)] relative border-4",
                    isRecording ? "bg-red-500 border-white/40 scale-110" : "bg-[#007AFF] border-white/20 active:scale-95"
                  )}
                >
                  {isRecording ? <StopCircle className="w-12 h-12 text-white fill-white" /> : <div className="w-10 h-10 rounded-full bg-white" />}
                </button>

                {/* Left Bottom Branding (matching photo) */}
                <div className="absolute left-0 -bottom-2 text-left pointer-events-none opacity-40">
                   <span className="text-white font-black text-xl italic uppercase tracking-tighter block leading-none">NUXUS CIRCLE</span>
                   <span className="text-[8px] text-primary font-black uppercase tracking-[0.4em] mt-1 block">PRO STUDIO V28.7</span>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* QUICK RECORDING VIEW (Overlay during small recording) */}
      {isRecording && !isProRecorderOpen && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full overflow-hidden border-4 border-primary shadow-[0_0_80px_rgba(168,85,247,0.7)] z-50 bg-black animate-in zoom-in duration-500">
          <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ clipPath: currentShapeObj.clip }} />
        </div>
      )}

      <div className="flex gap-2 items-end w-full">
        {!isRecording ? (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-2xl bg-white/5 hover:bg-primary/10 hover:text-primary mb-0.5"><Paperclip className="w-6 h-6" /></Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-64 obsidian-glass border-white/10 rounded-[2rem] p-2 mb-4">
                <AttachmentItem icon={ImageIcon} label="Медиа" color="text-primary" onClick={() => fileInputRef.current?.click()} />
                <AttachmentItem icon={AtSign} label="Опрос" color="text-blue-400" onClick={onPollOpen} />
              </PopoverContent>
            </Popover>
            
            <div className="flex-1 flex items-end bg-white/5 rounded-[1.5rem] border border-white/5 min-h-11 px-4 py-2 relative shadow-inner">
              <Textarea 
                ref={textareaRef}
                placeholder="Сообщение..." 
                className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-white/20 font-medium min-h-[32px] max-h-[200px] overflow-y-auto scrollbar-hide py-1 text-base resize-none w-full" 
                value={messageInput} 
                onChange={e => handleInputChange(e.target.value)} 
              />
              <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                 <PopoverTrigger asChild>
                   <Button variant="ghost" size="icon" className="text-white/20 hover:text-primary h-9 w-9 shrink-0 mb-[-2px]"><Smile className="w-6 h-6" /></Button>
                 </PopoverTrigger>
                 <PopoverContent side="top" className="p-0 border-none bg-transparent w-[320px] mb-4">
                   <EmojiPicker onEmojiSelect={(e) => handleInputChange(messageInput + e)} onStickerSelect={(url) => { onSendMessage(url, 'sticker', null); setIsEmojiPickerOpen(false); }} />
                 </PopoverContent>
              </Popover>
            </div>

            {messageInput.trim() ? (
              <Button size="icon" className="h-11 w-11 rounded-2xl bg-primary text-white shadow-xl mb-0.5 shrink-0 active:scale-90 transition-all" onClick={handleSend}><Send className="w-5 h-5" /></Button>
            ) : (
              <div className="flex gap-1 mb-0.5 shrink-0">
                <Button size="icon" variant="ghost" className="h-11 w-11 rounded-2xl bg-white/5 text-white/30" onClick={() => { setRecorderMode(recorderMode === 'audio' ? 'video' : 'audio'); }}>
                  {recorderMode === 'audio' ? <VideoIcon className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <button 
                  className={cn(
                    "h-11 w-11 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90",
                    isProRecorderOpen ? "bg-accent text-black" : "bg-primary text-white"
                  )}
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {recorderMode === 'audio' ? <Mic className="w-5 h-5" /> : (isProRecorderOpen ? <currentShapeObj.icon className="w-5 h-5" /> : <Circle className="w-5 h-5 fill-current" />)}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center bg-primary/10 border border-primary/20 rounded-2xl h-11 px-4 gap-4 animate-in slide-in-from-right-8">
            <div className="flex items-center gap-2 text-primary animate-pulse"><div className="w-2 h-2 rounded-full bg-primary shadow-lg" /><span className="text-[10px] font-black uppercase tracking-widest">LIVE</span></div>
            <span className={cn("text-lg font-black italic flex-1 tabular-nums text-white", recordingDuration >= 80 && "text-red-500")}>
              {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40" onClick={() => { if(mediaRecorderRef.current) mediaRecorderRef.current.onstop = null; stopRecording(); setIsRecording(false); }}><Trash2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-primary" onPointerDown={stopRecording}><StopCircle className="w-7 h-7 fill-current" /></Button>
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

const MessageList = memo(({ 
  messages, userId, chatId, onReply, onPin, amIPremium, isAdmin, isGroup, onEdit, onForward, searchQuery, viewerProfile
}: any) => {
  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }, [messages]);
  
  return (
    <div className="flex flex-col gap-2 max-w-5xl mx-auto px-4 md:px-10 py-8 min-h-full relative z-10 overflow-x-hidden">
      {sortedMessages.map((msg: Message) => (
        <MessageItem 
          key={msg.id} message={msg} isMe={msg.senderId === userId} 
          chatId={chatId} onReply={onReply} onPin={onPin} 
          amIPremium={amIPremium} isAdmin={isAdmin} isGroup={isGroup} 
          onEdit={onEdit} onForward={onForward} 
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
  const { currentChatId, setCurrentChatId, setForwardingMessage, setActiveCallId } = useAppState();
  const { toast } = useToast();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const isSavedMessages = currentChatId?.startsWith('saved_');

  const otherId = useMemo(() => {
    if (!chat || chat.type !== 'private' || !firebaseUser) return null;
    return chat.participantIds.find(id => id !== firebaseUser.uid);
  }, [chat, firebaseUser]);

  const otherUserRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUser } = useDoc<UserType>(otherUserRef);

  const messagesQuery = useMemoFirebase(() => (!db || !currentChatId) ? null : query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc')), [db, currentChatId]);
  const { data: messages } = useCollection<Message>(messagesQuery);

  const isPremium = useMemo(() => isUserPremium(userProfile), [userProfile]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior });
  }, []);

  useEffect(() => { scrollToBottom('auto'); }, [currentChatId, messages?.length, scrollToBottom]);

  useEffect(() => {
    if (!db || !currentChatId || !firebaseUser || !messages) return;
    const unreadMessages = messages.filter(m => m.senderId !== firebaseUser.uid && !m.isRead);
    if (unreadMessages.length === 0) return;
    const batch = writeBatch(db);
    unreadMessages.forEach(msg => {
      const msgRef = doc(db, 'chats', currentChatId, 'messages', msg.id);
      batch.update(msgRef, { isRead: true });
    });
    batch.commit().catch(e => console.warn("Nuxus Sync: Read Receipt error"));
  }, [db, currentChatId, firebaseUser, messages]);

  const handleSendMessage = useCallback(async (content_msg: string, type_msg: Message['contentType'] = 'text', meta: any = null) => {
    if (!content_msg.trim() || !currentChatId || !firebaseUser || !db) return;
    
    if (content_msg.length > 1040000) {
      toast({ title: "Файл слишком велик", description: "Превышен системный лимит 1МБ. Попробуйте записать видео короче.", variant: "destructive" });
      return;
    }

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
    
    addDoc(collection(db, 'chats', currentChatId, 'messages'), msgData).catch(err => {
      toast({ title: "Сбой буфера", description: "Сообщение слишком тяжелое для этого чата.", variant: "destructive" });
    });
    updateDoc(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString() });
  }, [currentChatId, firebaseUser, db, userProfile, replyTo, toast]);

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!db || !firebaseUser || !otherId) return;
    const callRef = await addDoc(collection(db, 'calls'), {
      callerId: firebaseUser.uid,
      receiverId: otherId,
      participantIds: [firebaseUser.uid, otherId],
      chatId: currentChatId,
      type,
      status: 'calling',
      createdAt: new Date().toISOString()
    });
    setActiveCallId(callRef.id);
  };

  const headerTitle = useMemo(() => {
    if (isSavedMessages) return 'Архив Данных';
    if (!chat) return 'СИНХРОНИЗАЦИЯ...';
    if (chat.type === 'private') {
      const myMeta = chat.metadata?.[firebaseUser?.uid || ''];
      if (myMeta?.customName) return myMeta.customName;
      return formatDisplayName(otherUser?.name);
    }
    return formatDisplayName(chat.name);
  }, [chat, otherUser, firebaseUser?.uid, isSavedMessages]);

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden z-20 max-w-full">
      {userProfile?.settings?.chatBackground && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src={userProfile.settings.chatBackground} className="w-full h-full object-cover opacity-100 brightness-100" alt="BG" />
        </div>
      )}
      
      <header className="h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b border-white/5 obsidian-glass flex items-center justify-between px-5 shrink-0 z-30 shadow-xl">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden obsidian-glass rounded-xl text-white/50 h-10 w-10 shrink-0" onClick={() => setCurrentChatId(null)}><ChevronLeft className="w-6 h-6" /></Button>
          {!isSearchMode ? (
            <div className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 group" onClick={() => setIsChatInfoOpen(true)}>
              {isSavedMessages ? (
                <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                  <Shield className="w-5 h-5 fill-current" />
                </div>
              ) : (
                <UserAvatar 
                  userId={chat?.type === 'private' ? otherId : null} 
                  manualAvatarUrl={chat?.type !== 'private' ? chat?.avatarUrl : otherUser?.avatarUrl} 
                  className="h-10 w-10 border border-white/10 shrink-0" 
                  fallbackName={headerTitle} 
                />
              )}
              <div className="flex flex-col min-w-0 text-left">
                <span className="font-black text-[16px] truncate text-white italic tracking-tighter uppercase group-hover:text-primary transition-colors leading-tight">
                  {headerTitle}
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-primary/40 leading-none truncate mt-0.5">
                  {isSavedMessages ? 'Ваш терминал' : chat?.type === 'private' ? formatLastSeen(otherUser?.lastSeen, otherUser?.settings?.privacy?.lastSeenVisibility) : 'Сигнал активен'}
                </span>
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
        {!isSearchMode && (
          <div className="flex items-center gap-2 shrink-0">
            {!isSavedMessages && chat?.type === 'private' && (
              <>
                <Button variant="ghost" size="icon" onClick={() => handleStartCall('audio')} className="h-10 w-10 rounded-xl obsidian-glass text-white/40 hover:text-primary transition-colors"><Phone className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleStartCall('video')} className="h-10 w-10 rounded-xl obsidian-glass text-white/40 hover:text-primary transition-colors"><VideoIcon className="w-5 h-5" /></Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsSearchMode(true)} className="h-10 w-10 rounded-xl obsidian-glass text-white/20"><Search className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl obsidian-glass text-white/20" onClick={() => setIsChatInfoOpen(true)}><Info className="w-6 h-6" /></Button>
          </div>
        )}
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0 z-10 bg-transparent">
        <div ref={scrollContainerRef} className="flex-1 w-full relative z-10 overflow-y-auto scrollbar-hide scroll-smooth">
          <MessageList 
            messages={messages} userId={firebaseUser?.uid} chatId={currentChatId} 
            onReply={setReplyTo} onForward={setForwardingMessage} amIPremium={isPremium} 
            isAdmin={isGlobalAdmin(userProfile)} isGroup={chat?.type !== 'private'} searchQuery={searchQuery} viewerProfile={userProfile} 
          />
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      <ChatInputBar 
        onSendMessage={handleSendMessage} canPost={true} 
        onPollOpen={() => setIsPollModalOpen(true)} currentChatId={currentChatId}
        isPremium={isPremium} replyTo={replyTo} onCancelReply={() => setReplyTo(null)}
      />

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      {currentChatId && <CreatePollModal open={isPollModalOpen} onOpenChange={setIsPollModalOpen} chatId={currentChatId} />}
    </div>
  );
}
