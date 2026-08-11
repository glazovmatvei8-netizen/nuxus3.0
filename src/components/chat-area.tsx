
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, ChevronLeft, X, Paperclip, Mic, StopCircle, 
  Smile, ImageIcon, Trash2, AtSign, CornerUpLeft, Circle, Video as VideoIcon
} from 'lucide-react';
import { MessageItem } from './message-item';
import { ChatInfoModal } from './modals/chat-info-modal';
import { CreatePollModal } from './modals/create-poll-modal';
import { EmojiPicker } from './emoji-picker';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, updateDoc } from 'firebase/firestore';
import { formatDisplayName, cn, compressImage, encryptSignal, decryptSignal, isUserPremium } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslations } from '@/hooks/use-translations';

const ChatInputBar = memo(({ onSendMessage, canPost, onPollOpen, currentChatId, isPremium, replyTo, onCancelReply }: any) => {
  const { localDrafts, setLocalDrafts } = useAppState();
  const { t } = useTranslations();
  
  const [messageInput, setMessageInput] = useState(localDrafts[currentChatId] || '');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recorderMode, setRecorderMode] = useState<'audio' | 'video'>('audio');
  const [recordingDuration, setRecordingDuration] = useState(0);

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
    <footer className="p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] bg-black/40 backdrop-blur-2xl border-t border-white/5 shrink-0 z-40 relative flex flex-col gap-2">
      {replyTo && (
        <div className="bg-white/5 p-2 rounded-xl flex items-center justify-between border border-white/5 mb-1 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 min-w-0">
            <CornerUpLeft className="w-3 h-3 text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold text-primary uppercase">{replyTo.senderName}</span>
              <span className="text-[11px] text-white/40 truncate italic">{decryptSignal(replyTo.content)}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/5" onClick={onCancelReply}><X className="w-3 h-3" /></Button>
        </div>
      )}

      <div className="flex gap-2 items-end w-full max-w-5xl mx-auto">
        {!isRecording ? (
          <>
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl bg-white/5 hover:bg-white/10" onClick={() => fileInputRef.current?.click()}><Paperclip className="w-5 h-5 text-white/40" /></Button>
            
            <div className="flex-1 flex items-end bg-white/5 rounded-xl border border-white/5 min-h-[40px] px-3 py-1.5 shadow-inner transition-all focus-within:border-white/10">
              <Textarea 
                placeholder={t('chat.placeholder')} 
                className="bg-transparent border-none focus-visible:ring-0 text-white min-h-[24px] max-h-[160px] py-0 text-[14px] resize-none w-full scrollbar-hide font-medium" 
                value={messageInput} 
                onChange={e => setMessageInput(e.target.value)} 
              />
              <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                 <PopoverTrigger asChild>
                   <Button variant="ghost" size="icon" className="text-white/20 h-7 w-7 hover:text-white/40"><Smile className="w-5 h-5" /></Button>
                 </PopoverTrigger>
                 <PopoverContent side="top" className="p-0 border-none bg-transparent w-[300px] mb-4">
                   <EmojiPicker onEmojiSelect={(e) => setMessageInput(messageInput + e)} onStickerSelect={(url) => { onSendMessage(url, 'sticker', null); setIsEmojiPickerOpen(false); }} />
                 </PopoverContent>
              </Popover>
            </div>

            {messageInput.trim() ? (
              <Button size="icon" className="h-10 w-10 rounded-xl bg-primary text-white active:scale-95 shadow-lg" onClick={handleSend}><Send className="w-4 h-4" /></Button>
            ) : (
              <button className="h-10 w-10 rounded-xl flex items-center justify-center transition-all bg-white/5 text-white/30 hover:bg-primary hover:text-white active:scale-95" onPointerDown={startAudioRecording} onPointerUp={stopAudioRecording}>
                <Mic className="w-5 h-5" />
              </button>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center bg-primary/10 border border-primary/20 rounded-xl h-10 px-4 gap-4 animate-in slide-in-from-right-4">
            <div className="flex items-center gap-2 text-primary animate-pulse"><div className="w-2 h-2 rounded-full bg-primary" /><span className="text-[10px] font-black">REC</span></div>
            <span className="text-sm font-bold flex-1 tabular-nums text-white">
              {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-red-500" onClick={() => { setIsRecording(false); setRecordingDuration(0); if(timerIntervalRef.current) clearInterval(timerIntervalRef.current); if(streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); }}><Trash2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onPointerUp={stopAudioRecording}><StopCircle className="w-5 h-5 fill-current" /></Button>
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" />
    </footer>
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
    if (replyTo) { msgData.replyToId = replyTo.id; msgData.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[Вложение]`; setReplyTo(null); }
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
    <div className="flex-1 flex flex-col h-full bg-[#050505] relative overflow-hidden z-20">
      {/* Background Overlay */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={bgStyle} />
      
      <header className="h-14 border-b border-white/5 bg-white/[0.02] backdrop-blur-3xl flex items-center px-4 shrink-0 z-30">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden rounded-xl text-white/50 h-9 w-9" onClick={() => setCurrentChatId(null)}><ChevronLeft className="w-5 h-5" /></Button>
          <div className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 group" onClick={() => setIsChatInfoOpen(true)}>
            <UserAvatar userId={chat?.type === 'private' ? chat.participantIds.find(id => id !== firebaseUser?.uid) : null} className="h-9 w-9 border border-white/10" manualAvatarUrl={chat?.avatarUrl} fallbackName={formatDisplayName(chat?.name)} showOnlineStatus />
            <div className="flex flex-col min-w-0 text-left">
              <span className="font-bold text-[14px] truncate text-white leading-tight">{formatDisplayName(chat?.name, chat?.username)}</span>
              <span className="text-[10px] font-medium text-primary/60 tracking-tight">{t('online')}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0 z-10">
        <ScrollArea className="flex-1 w-full">
          <div className="flex flex-col gap-1 max-w-4xl mx-auto px-4 py-4 min-h-full">
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

      <ChatInputBar onSendMessage={handleSendMessage} canPost={true} onPollOpen={() => setIsPollModalOpen(true)} currentChatId={currentChatId} isPremium={isPremium} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
      {currentChatId && <CreatePollModal open={isPollModalOpen} onOpenChange={setIsPollModalOpen} chatId={currentChatId} />}
    </div>
  );
}
