"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/app-state';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, ChevronLeft, X, Paperclip, Mic, StopCircle, 
<<<<<<< HEAD
  Smile, Trash2, Loader2, Phone, Video, Camera
=======
  Smile, Trash2, Loader2, Phone, Video, Camera, Sparkles, Wand2
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
} from 'lucide-react';
import { MessageItem } from './message-item';
import { ChatInfoModal } from './modals/chat-info-modal';
import { EmojiPicker } from './emoji-picker';
import { ImagePreviewModal } from './modals/image-preview-modal';
import { useUser, useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { collection, query, orderBy, doc, addDoc } from 'firebase/firestore';
<<<<<<< HEAD
import { formatDisplayName, cn, compressImage, triggerHaptic, isUserPremium } from '@/lib/utils';
=======
import { formatDisplayName, cn, compressImage, triggerHaptic, isUserPremium, decryptSignal } from '@/lib/utils';
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
import type { Message, User as UserType, Chat } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslations } from '@/hooks/use-translations';
import { useToast } from '@/hooks/use-toast';
import { signalService } from '@/services/signal-service';
<<<<<<< HEAD

/**
 * CHAT AREA V141.0 «THIN VIEW»
 * Логика JS удалена и заменена вызовами Kernel API (signalService).
 */
const ChatInputBar = memo(({ onSendMessage, currentChatId, replyTo, onCancelReply }: any) => {
=======
import { aiService } from '@/services/ai-service';

/**
 * CHAT AREA V142.0 «QUANTUM AI INTEGRATED»
 * Встроены инструменты Nuxus Core AI: умный ответ, улучшение черновика и сводка переписки.
 */
const ChatInputBar = memo(({ onSendMessage, currentChatId, replyTo, onCancelReply, recentMessages }: any) => {
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
  const { localDrafts, setLocalDrafts } = useAppState();
  const { t } = useTranslations();
  const { toast } = useToast();
  
  const [messageInput, setMessageInput] = useState(localDrafts[currentChatId] || '');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
<<<<<<< HEAD
=======
  const [isAiDrafting, setIsAiDrafting] = useState(false);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
  
  const [recordMode, setRecordMode] = useState<'voice' | 'video'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const [pendingFiles, setPendingFiles] = useState<{url: string, type: 'image' | 'video', file: File}[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMessageInput(localDrafts[currentChatId] || '');
  }, [currentChatId, localDrafts]);

  const handleSend = () => {
    if (!messageInput.trim()) return;
    triggerHaptic();
    onSendMessage(messageInput, 'text');
    setMessageInput('');
    setLocalDrafts(prev => ({ ...prev, [currentChatId]: '' }));
  };

<<<<<<< HEAD
=======
  const handleAiSmartDraft = async () => {
    if (isAiDrafting) return;
    triggerHaptic();
    setIsAiDrafting(true);
    try {
      const formattedContext = (recentMessages || [])
        .filter((m: Message) => m.contentType === 'text')
        .slice(-10)
        .map((m: Message) => ({
          senderName: m.senderName || 'Узел',
          content: decryptSignal(m.content),
        }));

      const promptText = messageInput.trim()
        ? `Улучши и дополни мой черновик сообщения: "${messageInput.trim()}"`
        : 'Предложи уместный и естественный ответ на последние сообщения в чате';

      const suggestion = await aiService.draftMessage(promptText, formattedContext);
      setMessageInput(suggestion);
      setLocalDrafts(prev => ({ ...prev, [currentChatId]: suggestion }));
      toast({ title: 'ИИ подготовил вариант сообщения' });
    } catch (e) {
      console.error("AI smart draft error:", e);
      toast({ title: "Ошибка ИИ-помощника", variant: "destructive" });
    } finally {
      setIsAiDrafting(false);
    }
  };

>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: recordMode === 'video' });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recordMode === 'voice' ? 'audio/ogg' : 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => onSendMessage(reader.result as string, recordMode === 'voice' ? 'audio' : 'video_note', { duration: recordingDuration });
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setRecordingDuration(0);
      };
      recorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
<<<<<<< HEAD
    } catch (e) { toast({ title: "Нет доступа", variant: "destructive" }); }
=======
    } catch (e) {
      console.error("Audio recording error:", e);
      toast({ title: "Нет доступа", variant: "destructive" });
    }
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPendingFiles(prev => [...prev, { url: ev.target?.result as string, type: file.type.startsWith('video') ? 'video' : 'image', file }]);
      };
      reader.readAsDataURL(file);
    });
    setIsPreviewOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendFiles = async () => {
    setIsUploading(true);
    try {
      for (const item of pendingFiles) {
        let content = item.url;
        if (item.type === 'image') content = await compressImage(item.url, 1200, 0.7);
        await onSendMessage(content, item.type);
      }
      setPendingFiles([]);
      setIsPreviewOpen(false);
    } finally { setIsUploading(false); }
  };

  return (
    <>
    <footer className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-[#030306]/95 backdrop-blur-[40px] border-t border-white/5 shrink-0 z-40 relative">
      {replyTo && (
        <div className="bg-white/5 p-3 rounded-2xl flex items-center justify-between border border-white/5 mb-2 animate-in slide-in-from-bottom-2 mx-auto w-full max-w-5xl">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-1 h-8 bg-primary rounded-full shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{replyTo.senderName}</span>
              <span className="text-[12px] text-white/60 truncate italic">[Цитирование]</span>
            </div>
          </div>
          <button className="text-white/20 hover:text-white" onClick={onCancelReply}><X size={16} /></button>
        </div>
      )}

      <div className="flex gap-3 items-end w-full max-w-5xl mx-auto">
        {!isRecording ? (
          <>
            <Button variant="ghost" size="icon" className="h-12 w-12 shrink-0 rounded-2xl bg-white/[0.03] border border-white/5" onClick={() => fileInputRef.current?.click()}><Paperclip className="w-6 h-6 text-white/40" /></Button>
<<<<<<< HEAD
            <div className="flex-1 flex items-end bg-white/[0.04] rounded-[1.8rem] border border-white/10 min-h-[48px] px-5 py-2.5">
=======
            <div className="flex-1 flex items-end bg-white/[0.04] rounded-[1.8rem] border border-white/10 min-h-[48px] px-5 py-2.5 gap-1">
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
              <Textarea 
                placeholder={t('chat.placeholder')} 
                className="bg-transparent border-none focus-visible:ring-0 text-white min-h-[26px] max-h-[160px] py-0 text-[15px] resize-none w-full shadow-none" 
                value={messageInput} 
                onChange={e => { setMessageInput(e.target.value); setLocalDrafts(prev => ({ ...prev, [currentChatId]: e.target.value })); }} 
              />
<<<<<<< HEAD
              <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                 <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-white/20 h-8 w-8"><Smile size={20} /></Button></PopoverTrigger>
=======
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={handleAiSmartDraft}
                disabled={isAiDrafting}
                title={messageInput.trim() ? "Улучшить текст с ИИ" : "Предложить ИИ-ответ"}
                className="text-primary/70 hover:text-primary h-8 w-8 shrink-0"
              >
                {isAiDrafting ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
              </Button>
              <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                 <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-white/20 h-8 w-8 shrink-0"><Smile size={20} /></Button></PopoverTrigger>
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
                 <PopoverContent side="top" className="p-0 border-none bg-transparent w-[320px] mb-6">
                   <EmojiPicker onEmojiSelect={(e) => setMessageInput(messageInput + e)} onStickerSelect={(url) => { onSendMessage(url, 'sticker'); setIsEmojiPickerOpen(false); }} />
                 </PopoverContent>
              </Popover>
            </div>
            {messageInput.trim() ? (
              <Button size="icon" className="h-12 w-12 rounded-2xl bg-primary text-white shadow-xl" onClick={handleSend}><Send size={20} /></Button>
            ) : (
              <button onMouseDown={startRecording} onMouseUp={stopRecording} className="h-12 w-12 rounded-2xl flex items-center justify-center bg-white/[0.04] text-white/30 hover:text-primary transition-all">
                {recordMode === 'voice' ? <Mic size={24} /> : <Camera size={24} />}
              </button>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center bg-primary/10 border border-primary/20 rounded-[1.8rem] h-12 px-5 gap-4">
            <div className="flex items-center gap-3 text-primary animate-pulse">
               <div className="w-2 h-2 rounded-full bg-primary" />
               <span className="text-[10px] font-black tracking-widest">SIGNAL REC</span>
            </div>
            <span className="text-base font-black flex-1 tabular-nums text-white italic">
              {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </span>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-primary animate-pulse" onClick={stopRecording}><StopCircle size={24} fill="currentColor" /></Button>
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} hidden multiple accept="image/*,video/*" onChange={handleFileChange} />
    </footer>
    <ImagePreviewModal open={isPreviewOpen} onOpenChange={setIsPreviewOpen} files={pendingFiles.map(p => ({ url: p.url, type: p.type }))} onRemove={(idx) => setPendingFiles(prev => prev.filter((_, i) => i !== idx))} onSend={handleSendFiles} isSending={isUploading} />
    </>
  );
});

ChatInputBar.displayName = 'ChatInputBar';

export default function ChatArea() {
  const { user: firebaseUser } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId, setInspectedUserId } = useAppState();
  const { t } = useTranslations();
  const { toast } = useToast();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
<<<<<<< HEAD
=======
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0

  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser?.uid]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const otherId = useMemo(() => chat?.type === 'private' ? chat.participantIds.find(id => id !== firebaseUser?.uid) : null, [chat, firebaseUser?.uid]);
  const otherProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(otherProfileRef);

  const messagesQuery = useMemoFirebase(() => (!db || !currentChatId) ? null : query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc')), [db, currentChatId]);
  const { data: messages } = useCollection<Message>(messagesQuery);

<<<<<<< HEAD
=======
  useEffect(() => {
    setAiSummary(null);
  }, [currentChatId]);

>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
  // Kernel Sync: Acknowledge signals via API
  useEffect(() => {
    if (currentChatId && messages && firebaseUser) {
      signalService.acknowledgeSignals(currentChatId, messages, firebaseUser.uid);
    }
  }, [currentChatId, messages, firebaseUser?.uid]);

<<<<<<< HEAD
=======
  const handleSummarizeChat = async () => {
    if (!messages || messages.length === 0 || isSummarizing) {
      toast({ title: 'Недостаточно сообщений для анализа' });
      return;
    }
    triggerHaptic();
    setIsSummarizing(true);
    try {
      const textMessages = messages
        .filter((m) => m.contentType === 'text')
        .slice(-30)
        .map((m) => ({
          senderName: m.senderName || 'Узел',
          content: decryptSignal(m.content),
        }));

      if (textMessages.length === 0) {
        toast({ title: 'В чате пока нет текстовых сообщений' });
        return;
      }

      const summary = await aiService.summarizeChat(textMessages);
      setAiSummary(summary);
    } catch (e) {
      console.error("Failed to summarize chat:", e);
      toast({ title: "Не удалось создать ИИ-сводку", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
  // View Handler: Send message via Kernel API
  const handleSendMessage = useCallback(async (content: string, type: Message['contentType'] = 'text', meta: any = null) => {
    if (!content || !currentChatId || !firebaseUser) return;
    
    try {
      if (type === 'text') {
        await signalService.broadcastSignal(currentChatId, firebaseUser.uid, userProfile?.name || 'User', content, replyTo);
      } else {
        // Media Signal Processing (Placeholder for full API integration)
        const msgData = { 
          chatId: currentChatId, senderId: firebaseUser.uid, senderName: userProfile?.name || 'User', 
          content, contentType: type, sentAt: new Date().toISOString(), isRead: false, metadata: meta
        };
        await addDoc(collection(db!, 'chats', currentChatId, 'messages'), msgData);
      }
      setReplyTo(null);
    } catch (e) {
<<<<<<< HEAD
=======
      console.error("Failed to send message in chat-area:", e);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      toast({ title: "Сбой шлюза", variant: "destructive" });
    }
  }, [currentChatId, firebaseUser?.uid, userProfile, replyTo, db, toast]);

  const currentDisplayName = useMemo(() => {
    if (!chat) return '...';
    if (chat.type === 'saved') return 'Архив Данных';
    if (chat.type === 'private') return formatDisplayName(otherProfile?.name, otherProfile?.username);
    return formatDisplayName(chat.name, chat.username);
  }, [chat, otherProfile]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030306] relative overflow-hidden z-20">
      {userProfile?.settings?.chatBackground && (
        <div className="absolute inset-0 z-0 opacity-40">
           <img src={userProfile.settings.chatBackground} className="w-full h-full object-cover blur-[2px]" alt="BG" />
        </div>
      )}

<<<<<<< HEAD
      <header className="h-16 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl flex items-center px-4 shrink-0 z-30 shadow-2xl">
=======
      <header className="h-16 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl flex items-center justify-between px-4 shrink-0 z-30 shadow-2xl">
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden rounded-2xl" onClick={() => { triggerHaptic(); setCurrentChatId(null); }}><ChevronLeft size={24} /></Button>
          <div className="flex items-center gap-4 cursor-pointer min-w-0 flex-1 group" onClick={() => otherId ? setInspectedUserId(otherId) : setIsChatInfoOpen(true)}>
            <UserAvatar userId={otherId || (chat?.type === 'saved' ? firebaseUser?.uid : null)} className="h-11 w-11 border border-white/10" manualAvatarUrl={chat?.type !== 'private' && chat?.type !== 'saved' ? chat?.avatarUrl : otherProfile?.avatarUrl} fallbackName={currentDisplayName} showOnlineStatus={chat?.type === 'private'} />
            <div className="flex flex-col min-w-0">
              <span className="font-black text-base truncate text-white italic tracking-tighter uppercase">{currentDisplayName}</span>
              <span className="text-[9px] font-bold text-primary/60 tracking-widest uppercase italic">{chat?.type === 'private' ? t('online') : chat?.type === 'saved' ? 'Ваш Архив' : chat?.username}</span>
            </div>
          </div>
        </div>
<<<<<<< HEAD
      </header>

=======

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSummarizeChat}
          disabled={isSummarizing}
          className="h-9 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/25 text-primary text-[10px] font-black uppercase tracking-wider gap-1.5 shrink-0"
        >
          {isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">ИИ-Сводка</span>
        </Button>
      </header>

      {aiSummary && (
        <div className="mx-4 mt-3 p-4 rounded-2xl bg-[#16161c]/95 border border-primary/30 shadow-xl z-20 relative">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Nuxus AI: Краткая сводка переписки
            </span>
            <button onClick={() => setAiSummary(null)} className="text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-white/90 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
            {aiSummary}
          </p>
        </div>
      )}

>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      <div className="flex-1 relative overflow-hidden z-10">
        <ScrollArea className="h-full w-full">
          <div className="flex flex-col gap-1 px-4 py-6">
            {messages?.map(msg => (
              <MessageItem 
                key={msg.id} 
                message={msg} 
                isMe={msg.senderId === firebaseUser?.uid} 
                chatId={currentChatId} 
                onReply={setReplyTo} 
                amIPremium={isUserPremium(userProfile)} 
                viewerProfile={userProfile} 
              />
            ))}
          </div>
        </ScrollArea>
      </div>

<<<<<<< HEAD
      <ChatInputBar onSendMessage={handleSendMessage} currentChatId={currentChatId} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
=======
      <ChatInputBar
        onSendMessage={handleSendMessage}
        currentChatId={currentChatId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        recentMessages={messages}
      />
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}
