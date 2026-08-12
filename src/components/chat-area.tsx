"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, ChevronLeft, X, Paperclip, Mic, StopCircle, 
  Smile, ImageIcon, Trash2, CornerUpLeft, Loader2
} from 'lucide-react';
import { MessageItem } from './message-item';
import { ChatInfoModal } from './modals/chat-info-modal';
import { CreatePollModal } from './modals/create-poll-modal';
import { EmojiPicker } from './emoji-picker';
import { ImagePreviewModal } from './modals/image-preview-modal';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, updateDoc } from 'firebase/firestore';
import { formatDisplayName, cn, compressImage, encryptSignal, decryptSignal, isUserPremium } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslations } from '@/hooks/use-translations';

const ChatInputBar = memo(({ onSendMessage, currentChatId, replyTo, onCancelReply }: any) => {
  const { localDrafts, setLocalDrafts } = useAppState();
  const { t } = useTranslations();
  
  const [messageInput, setMessageInput] = useState(localDrafts[currentChatId] || '');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const [pendingFiles, setPendingFiles] = useState<{url: string, type: 'image' | 'video', file: File}[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    setMessageInput(localDrafts[currentChatId] || '');
  }, [currentChatId, localDrafts]);

  const handleSend = () => {
    if (!messageInput.trim()) return;
    onSendMessage(messageInput, 'text', null);
    setMessageInput('');
    setLocalDrafts(prev => ({ ...prev, [currentChatId]: '' }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        setPendingFiles(prev => [...prev, { 
          url, 
          type: file.type.startsWith('video') ? 'video' : 'image',
          file
        }]);
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
        if (item.type === 'image') {
          content = await compressImage(item.url, 1200, 0.7);
        }
        await onSendMessage(content, item.type, null);
      }
      setPendingFiles([]);
      setIsPreviewOpen(false);
    } finally {
      setIsUploading(false);
    }
  };

  const startAudioRecording = async () => {
    if (isRecording) return;
    try {
      chunksRef.current = []; 
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        const finalDur = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        if (blob.size > 50) { 
          const reader = new FileReader();
          reader.onloadend = () => { if (reader.result) onSendMessage(reader.result as string, 'audio', { duration: finalDur }); };
          reader.readAsDataURL(blob);
        }
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        setRecordingDuration(0);
      };
      startTimeRef.current = Date.now();
      recorder.start(100); 
      setIsRecording(true);
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(() => setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000)), 500);
    } catch (err) { console.error(err); }
  };

  const stopAudioRecording = () => { if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop(); };

  return (
    <>
    <footer className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-black/60 backdrop-blur-[120px] border-t border-white/5 shrink-0 z-40 relative flex flex-col gap-2">
      {replyTo && (
        <div className="bg-white/5 p-3 rounded-2xl flex items-center justify-between border border-white/5 mb-1 animate-in slide-in-from-bottom-2 shadow-xl">
          <div className="flex items-center gap-4 min-w-0">
            <CornerUpLeft className="w-4 h-4 text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{replyTo.senderName}</span>
              <span className="text-[12px] text-white/40 truncate italic">{decryptSignal(replyTo.content)}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 rounded-full" onClick={onCancelReply}><X className="w-4 h-4" /></Button>
        </div>
      )}

      <div className="flex gap-3 items-end w-full max-w-5xl mx-auto">
        {!isRecording ? (
          <>
            <Button variant="ghost" size="icon" className="h-12 w-12 shrink-0 rounded-2xl obsidian-glass hover:bg-white/10 border border-white/5 shadow-xl transition-all" onClick={() => fileInputRef.current?.click()}><Paperclip className="w-6 h-6 text-white/40" /></Button>
            
            <div className="flex-1 flex items-end bg-white/5 rounded-[2rem] border border-white/5 min-h-[48px] px-4 py-2.5 shadow-inner transition-all focus-within:border-primary/40 focus-within:bg-white/[0.08]">
              <Textarea 
                placeholder={t('chat.placeholder')} 
                className="bg-transparent border-none focus-visible:ring-0 text-white min-h-[26px] max-h-[180px] py-0 text-[15px] resize-none w-full scrollbar-hide font-medium tracking-tight" 
                value={messageInput} 
                onChange={e => setMessageInput(e.target.value)} 
              />
              <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                 <PopoverTrigger asChild>
                   <Button variant="ghost" size="icon" className="text-white/20 h-8 w-8 hover:text-white/40 active:scale-90"><Smile className="w-6 h-6" /></Button>
                 </PopoverTrigger>
                 <PopoverContent side="top" className="p-0 border-none bg-transparent w-[320px] mb-6">
                   <EmojiPicker onEmojiSelect={(e) => setMessageInput(messageInput + e)} onStickerSelect={(url) => { onSendMessage(url, 'sticker', null); setIsEmojiPickerOpen(false); }} />
                 </PopoverContent>
              </Popover>
            </div>

            {messageInput.trim() ? (
              <Button size="icon" className="h-12 w-12 rounded-2xl bg-primary text-white active:scale-90 shadow-[0_10px_30px_rgba(var(--primary),0.3)] transition-all border border-white/10" onClick={handleSend}><Send className="w-5 h-5" /></Button>
            ) : (
              <button className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all bg-white/5 text-white/30 hover:bg-primary hover:text-white active:scale-90 shadow-xl border border-white/5" onPointerDown={startAudioRecording} onPointerUp={stopAudioRecording}>
                <Mic className="w-6 h-6" />
              </button>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center bg-primary/10 border border-primary/20 rounded-[2rem] h-12 px-5 gap-4 animate-in slide-in-from-right-4 shadow-2xl">
            <div className="flex items-center gap-3 text-primary animate-pulse"><div className="w-2.5 h-2.5 rounded-full bg-primary" /><span className="text-[10px] font-black tracking-widest">REC</span></div>
            <span className="text-base font-black flex-1 tabular-nums text-white italic">
              {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </span>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-white/30 hover:text-red-500 rounded-full" onClick={() => { setIsRecording(false); setRecordingDuration(0); if(timerIntervalRef.current) clearInterval(timerIntervalRef.current); if(streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); }}><Trash2 className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-primary active:scale-90" onPointerUp={stopAudioRecording}><StopCircle className="w-6 h-6 fill-current" /></Button>
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} hidden multiple accept="image/*,video/*" onChange={handleFileChange} />
    </footer>
    <ImagePreviewModal 
      open={isPreviewOpen} 
      onOpenChange={setIsPreviewOpen}
      files={pendingFiles.map(p => ({ url: p.url, type: p.type }))}
      onRemove={(idx) => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}
      onSend={handleSendFiles}
      isSending={isUploading}
    />
    </>
  );
});

ChatInputBar.displayName = 'ChatInputBar';

export default function ChatArea() {
  const { user: firebaseUser } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId } = useAppState();
  const { t } = useTranslations();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const userProfileRef = useMemo(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser?.uid]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);

  const chatRef = useMemo(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const messagesQuery = useMemo(() => (!db || !currentChatId) ? null : query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc')), [db, currentChatId]);
  const { data: messages } = useCollection<Message>(messagesQuery);

  const isPremium = useMemo(() => isUserPremium(userProfile), [userProfile]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const end = document.getElementById('messages-end');
    if (end) end.scrollIntoView({ behavior });
  }, []);

  useEffect(() => { 
    if (messages?.length) scrollToBottom('auto'); 
  }, [currentChatId, messages?.length, scrollToBottom]);

  const handleSendMessage = useCallback(async (content_msg: string, type_msg: Message['contentType'] = 'text', meta: any = null) => {
    if (!content_msg || !currentChatId || !firebaseUser || !db) return;
    let finalContent = (type_msg === 'text' || type_msg === 'reply') ? encryptSignal(content_msg) : content_msg;
    
    const msgData: any = { 
      chatId: currentChatId, senderId: firebaseUser.uid, senderName: userProfile?.name || 'User', 
      content: finalContent, contentType: type_msg, sentAt: new Date().toISOString(), isRead: false,
      metadata: { bubbleStyle: userProfile?.settings?.bubbleStyle || 'default', ...meta }
    };
    if (replyTo) { 
      msgData.replyToId = replyTo.id; 
      msgData.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[Вложение]`; 
      setReplyTo(null); 
    }
    addDoc(collection(db, 'chats', currentChatId, 'messages'), msgData);
    updateDoc(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString() });
  }, [currentChatId, firebaseUser?.uid, db, userProfile, replyTo]);

  const bgStyle = useMemo(() => {
    if (userProfile?.settings?.chatBackground) {
      return { backgroundImage: `url(${userProfile.settings.chatBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return {};
  }, [userProfile?.settings?.chatBackground]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030306] relative overflow-hidden z-20">
      <div className="absolute inset-0 z-0 opacity-[0.2] pointer-events-none" style={bgStyle} />
      
      <header className="h-16 border-b border-white/5 bg-white/[0.02] backdrop-blur-[120px] flex items-center px-4 shrink-0 z-30 shadow-2xl">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden rounded-2xl text-white/40 h-10 w-10 hover:bg-white/5" onClick={() => setCurrentChatId(null)}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="flex items-center gap-4 cursor-pointer min-w-0 flex-1 group" onClick={() => setIsChatInfoOpen(true)}>
            <UserAvatar 
              userId={chat?.type === 'private' ? chat.participantIds.find(id => id !== firebaseUser?.uid) : null} 
              className="h-11 w-11 border-2 border-white/10 group-hover:border-primary/40 transition-all shadow-xl" 
              manualAvatarUrl={chat?.avatarUrl} 
              fallbackName={formatDisplayName(chat?.name)} 
              showOnlineStatus 
            />
            <div className="flex flex-col min-w-0 text-left">
              <span className="font-black text-base truncate text-white leading-tight italic tracking-tighter uppercase">{formatDisplayName(chat?.name, chat?.username)}</span>
              <span className="text-[9px] font-bold text-primary/60 tracking-widest uppercase italic">{t('online')}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0 z-10">
        <ScrollArea className="flex-1 w-full">
          <div className="flex flex-col gap-1 max-w-4xl mx-auto px-4 py-6 min-h-full">
            {messages?.map(msg => (
               <MessageItem 
                 key={msg.id} message={msg} isMe={msg.senderId === firebaseUser?.uid} 
                 chatId={currentChatId} onReply={setReplyTo} 
                 amIPremium={isPremium} viewerProfile={userProfile} 
               />
            ))}
            <div id="messages-end" className="h-4" />
          </div>
        </ScrollArea>
      </div>

      <ChatInputBar onSendMessage={handleSendMessage} currentChatId={currentChatId} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      {currentChatId && <CreatePollModal open={isPollModalOpen} onOpenChange={setIsPollModalOpen} chatId={currentChatId} />}
    </div>
  );
}