
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, Info, ChevronLeft, X, Paperclip, Mic, StopCircle, Edit2, Search,
  Smile, ImageIcon, Trash2, AtSign, RefreshCcw, CornerUpLeft, Circle, Video as VideoIcon, Phone, Shield,
  Heart, Square, Triangle, Ghost, Star, Cloud, Pause, Play
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

const VIDEO_SHAPES = [
  { id: 'circle', icon: Circle, label: 'Круг', clip: 'circle(50% at 50% 50%)' },
  { id: 'square', icon: Square, label: 'Квадрат', clip: 'inset(0% rounded 25%)' },
  { id: 'heart', icon: Heart, label: 'Сердце', clip: 'polygon(50% 15%, 80% 0%, 100% 20%, 100% 50%, 50% 100%, 0% 50%, 0% 20%, 20% 0%)' },
  { id: 'triangle', icon: Triangle, label: 'Треугольник', clip: 'polygon(50% 0%, 0% 100%, 100% 100%)' },
  { id: 'poop', icon: Ghost, label: 'Какашка', clip: 'polygon(50% 0%, 63% 13%, 53% 25%, 80% 38%, 85% 61%, 69% 68%, 94% 82%, 100% 100%, 0% 100%, 6% 82%, 31% 68%, 15% 61%, 20% 38%, 47% 25%, 37% 13%)' }
];

const ChatInputBar = memo(({ onSendMessage, canPost, onPollOpen, currentChatId, isPremium, replyTo, onCancelReply, onOpenProRecorder }: any) => {
  const { localDrafts, setLocalDrafts } = useAppState();
  const [messageInput, setMessageInput] = useState(localDrafts[currentChatId] || '');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recorderMode, setRecorderMode] = useState<'audio' | 'video'>('audio');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const isActuallyRecording = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessageInput(localDrafts[currentChatId] || '');
  }, [currentChatId, localDrafts]);

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

  const startAudioRecording = async () => {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (chunksRef.current.length > 0) {
            onSendMessage(reader.result as string, 'audio', null);
          }
        };
        reader.readAsDataURL(blob);
        setIsRecording(false);
        isActuallyRecording.current = false;
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
      isActuallyRecording.current = true;
    } catch (err) { console.error(err); }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isActuallyRecording.current) {
      mediaRecorderRef.current.stop();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (recorderMode === 'audio') {
      startAudioRecording();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (recorderMode === 'audio' && isActuallyRecording.current) {
      stopAudioRecording();
    }
  };

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
                  className="h-11 w-11 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90 bg-primary text-white"
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onClick={() => recorderMode === 'video' && onOpenProRecorder()}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {recorderMode === 'audio' ? <Mic className="w-5 h-5" /> : <Circle className="w-5 h-5 fill-current" />}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center bg-primary/10 border border-primary/20 rounded-2xl h-11 px-4 gap-4 animate-in slide-in-from-right-8">
            <div className="flex items-center gap-2 text-primary animate-pulse"><div className="w-2 h-2 rounded-full bg-primary shadow-lg" /><span className="text-[10px] font-black uppercase tracking-widest">LIVE</span></div>
            <span className="text-lg font-black italic flex-1 tabular-nums text-white">
              {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40" onClick={() => { if(mediaRecorderRef.current) mediaRecorderRef.current.onstop = null; stopAudioRecording(); setIsRecording(false); }}><Trash2 className="w-4 h-4" /></Button>
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

const MessageList = memo(({ 
  messages, userId, chatId, onReply, onPin, amIPremium, isAdmin, isGroup, onEdit, onForward, searchQuery, viewerProfile
}: any) => {
  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.createdAt).getTime());
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

  // Pro Recorder State V29.4.1 (Quantum Switch Fix)
  const [isProRecorderOpen, setIsProRecorderOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [camMode, setCamMode] = useState<'user' | 'environment'>('user');
  const [selectedShape, setSelectedShape] = useState('circle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleSendMessage = useCallback(async (content_msg: string, type_msg: Message['contentType'] = 'text', meta: any = null) => {
    if (!content_msg.trim() || !currentChatId || !firebaseUser || !db) return;
    
    const currentSize = content_msg.length;
    // Лимит Firestore ~1MB (Base64 добавляет 33% веса, поэтому проверяем на честный лимит)
    if (currentSize > 1048500) {
      toast({ 
        title: "Критическое превышение лимита", 
        description: `Видео слишком тяжелое для Ядра (${(currentSize / 1024 / 1024).toFixed(2)}МБ). Сократите длительность.`, 
        variant: "destructive" 
      });
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
    
    addDoc(collection(db, 'chats', currentChatId, 'messages'), msgData);
    updateDoc(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString() });
  }, [currentChatId, firebaseUser, db, userProfile, replyTo, toast]);

  // PRO RECORDER LOGIC V29.4.1 (Quantum Stability & 480p 1MB Optimization)
  const startProRecording = async () => {
    try {
      if (!streamRef.current) {
        // Оптимизация: 480p при 18 FPS для снижения веса под лимит 1МБ
        streamRef.current = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: camMode, width: 480, height: 480, frameRate: 18 }, 
          audio: true 
        });
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = streamRef.current;
      }
      
      const recorder = new MediaRecorder(streamRef.current, { 
        mimeType: 'video/webm;codecs=vp8,opus', 
        videoBitsPerSecond: 82000, // Честные 82kbps позволяют уместить ~80 секунд в 1МБ Base64
        audioBitsPerSecond: 16000
      });
      
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (chunksRef.current.length > 0) {
            handleSendMessage(reader.result as string, 'video_note', { shape: selectedShape });
          }
        };
        reader.readAsDataURL(blob);
        closeProRecorder();
      };

      recorder.start(500); 
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);
      
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 180) { stopProRecording(); return 180; }
          return prev + 1;
        });
      }, 1000);

      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    } catch (e) { console.error(e); }
  };

  const stopProRecording = () => {
    if (mediaRecorderRef.current && (isRecording || isPaused)) {
      mediaRecorderRef.current.stop();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(20);
  };

  const closeProRecorder = () => {
    setIsProRecorderOpen(false);
    setIsRecording(false);
    setIsPaused(false);
    setRecordingDuration(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const switchCamera = async () => {
    const newMode = camMode === 'user' ? 'environment' : 'user';
    setCamMode(newMode);
    
    try {
      const wasRecording = isRecording;
      const wasPaused = isPaused;

      // Системная пауза для переключения
      if (wasRecording && !wasPaused) {
        mediaRecorderRef.current?.pause();
      }

      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: newMode, width: 480, height: 480, frameRate: 18 }, 
        audio: true 
      });

      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        // Подмена трека без разрыва потока
        streamRef.current.removeTrack(videoTrack);
        videoTrack.stop();
        streamRef.current.addTrack(newVideoTrack);
      } else {
        streamRef.current = newStream;
      }
      
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = streamRef.current;
      
      // Возвращаем в активное состояние
      if (wasRecording && !wasPaused) {
        setTimeout(() => {
          mediaRecorderRef.current?.resume();
        }, 100);
      }

      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(25);
    } catch (e) {
      toast({ title: "Ошибка камеры", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (isProRecorderOpen && !streamRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: camMode, width: 480, height: 480, frameRate: 18 }, audio: true })
        .then(s => {
          streamRef.current = s;
          if(videoPreviewRef.current) videoPreviewRef.current.srcObject = s;
        });
    }
  }, [isProRecorderOpen, camMode]);

  const currentShapeObj = VIDEO_SHAPES.find(s => s.id === selectedShape) || VIDEO_SHAPES[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden z-20 max-w-full">
      {userProfile?.settings?.chatBackground && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src={userProfile.settings.chatBackground} className="w-full h-full object-cover opacity-100 brightness-100" alt="BG" />
        </div>
      )}
      
      {isProRecorderOpen && (
        <div className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-[60px] w-screen h-[100dvh] flex flex-col items-center justify-between animate-in fade-in duration-500 overflow-hidden">
           <div className="w-full flex items-center justify-between px-6 pt-[calc(env(safe-area-inset-top,20px)+20px)] z-[5100]">
              <div className="flex flex-col text-left">
                 <span className="text-white font-black text-xl italic uppercase tracking-tighter block leading-none">NUXUS CIRCLE</span>
                 <span className="text-[8px] text-primary font-black uppercase tracking-[0.4em] mt-2 block ml-1">PRO STUDIO V29.4.1 (Stability Patch)</span>
              </div>
              <button onClick={closeProRecorder} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 shadow-2xl active:scale-90">
                <X className="w-7 h-7 text-white" />
              </button>
           </div>

           <div className="relative w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] bg-black rounded-full overflow-hidden shadow-[0_0_120px_rgba(168,85,247,0.5)] border-4 border-white/10 flex items-center justify-center">
              <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ clipPath: currentShapeObj.clip }} />
              {(isRecording || isPaused) && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-red-500/90 px-6 py-2 rounded-full flex items-center gap-3 shadow-2xl z-[5200]">
                   <div className={cn("w-3 h-3 rounded-full bg-white", !isPaused && "animate-pulse")} />
                   <span className={cn("text-white text-lg font-black tabular-nums tracking-widest", isPaused && "opacity-50")}>
                     {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
                   </span>
                </div>
              )}
           </div>

           <div className="w-full px-8 pb-[calc(4rem+env(safe-area-inset-bottom))] flex flex-col gap-8 z-[5100]">
              {!isRecording && !isPaused && (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide w-full justify-center py-4 bg-white/5 rounded-[3rem] border border-white/5 shadow-2xl backdrop-blur-md">
                  {VIDEO_SHAPES.map(shape => (
                    <button key={shape.id} onClick={() => setSelectedShape(shape.id)} className={cn("flex flex-col items-center gap-2 p-3 rounded-2xl transition-all", selectedShape === shape.id ? "bg-primary text-white scale-110 shadow-xl" : "bg-transparent text-white/30")}>
                      <shape.icon className="w-6 h-6" />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-center w-full relative h-28">
                <div className="absolute left-[10%] flex gap-4">
                   <button onClick={switchCamera} className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 active:scale-90 transition-all shadow-xl hover:bg-white/20">
                     <RefreshCcw className="w-7 h-7 text-white" />
                   </button>
                   
                   {(isRecording || isPaused) && (
                     <button onClick={togglePauseRecording} className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border transition-all shadow-xl", isPaused ? "bg-accent text-black border-accent" : "bg-white/10 text-white border-white/10")}>
                       {isPaused ? <Play className="w-7 h-7 fill-current" /> : <Pause className="w-7 h-7 fill-current" />}
                     </button>
                   )}
                </div>

                <button 
                  onClick={() => (isRecording || isPaused) ? stopProRecording() : startProRecording()}
                  className={cn("w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl relative border-4", (isRecording || isPaused) ? "bg-red-500 border-white/40 scale-110" : "bg-primary border-white/20 active:scale-95")}
                >
                  {(isRecording || isPaused) ? <StopCircle className="w-12 h-12 text-white fill-white" /> : <div className="w-10 h-10 rounded-full bg-white shadow-lg" />}
                </button>
              </div>
           </div>
        </div>
      )}

      <header className="h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b border-white/5 obsidian-glass flex items-center justify-between px-5 shrink-0 z-30 shadow-xl">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden obsidian-glass rounded-xl text-white/50 h-10 w-10 shrink-0" onClick={() => setCurrentChatId(null)}><ChevronLeft className="w-6 h-6" /></Button>
          {!isSearchMode ? (
            <div className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 group" onClick={() => setIsChatInfoOpen(true)}>
              {isSavedMessages ? (
                <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                  <Shield className="w-5 h-5 fill-current" />
                </div>
              ) : (
                <UserAvatar userId={chat?.type === 'private' ? otherId : null} manualAvatarUrl={chat?.type !== 'private' ? chat?.avatarUrl : otherUser?.avatarUrl} className="h-10 w-10 border border-white/10 shrink-0" fallbackName="Node" />
              )}
              <div className="flex flex-col min-w-0 text-left">
                <span className="font-black text-[16px] truncate text-white italic tracking-tighter uppercase group-hover:text-primary transition-colors leading-tight">{isSavedMessages ? 'Архив Данных' : formatDisplayName(chat?.name)}</span>
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-primary/40 leading-none truncate mt-0.5">{isSavedMessages ? 'Ваш терминал' : chat?.type === 'private' ? formatLastSeen(otherUser?.lastSeen) : 'Сигнал активен'}</span>
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
        <div ref={scrollContainerRef} className="flex-1 w-full relative z-10 overflow-y-auto scrollbar-hide scroll-smooth">
          <MessageList messages={messages} userId={firebaseUser?.uid} chatId={currentChatId} onReply={setReplyTo} onForward={setForwardingMessage} amIPremium={isPremium} isAdmin={isGlobalAdmin(userProfile)} isGroup={chat?.type !== 'private'} searchQuery={searchQuery} viewerProfile={userProfile} />
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      <ChatInputBar 
        onSendMessage={handleSendMessage} canPost={true} onPollOpen={() => setIsPollModalOpen(true)} 
        currentChatId={currentChatId} isPremium={isPremium} replyTo={replyTo} onCancelReply={() => setReplyTo(null)}
        onOpenProRecorder={() => setIsProRecorderOpen(true)}
      />

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      {currentChatId && <CreatePollModal open={isPollModalOpen} onOpenChange={setIsPollModalOpen} chatId={currentChatId} />}
    </div>
  );
}
