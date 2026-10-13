
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/app-state';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, ChevronLeft, X, Paperclip, Mic, StopCircle, 
  Smile, Trash2, CornerUpLeft, Loader2, Pin, XCircle, Zap, Phone, Video
} from 'lucide-react';
import { MessageItem } from './message-item';
import { ChatInfoModal } from './modals/chat-info-modal';
import { CreatePollModal } from './modals/create-poll-modal';
import { EmojiPicker } from './emoji-picker';
import { ImagePreviewModal } from './modals/image-preview-modal';
import { useUser, useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { collection, query, orderBy, doc, addDoc, updateDoc, increment, writeBatch, getDocs, where } from 'firebase/firestore';
import { formatDisplayName, cn, compressImage, encryptSignal, decryptSignal, isUserPremium, getReputationInfo, triggerHaptic } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslations } from '@/hooks/use-translations';
import { useToast } from '@/hooks/use-toast';

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

  useEffect(() => {
    setMessageInput(localDrafts[currentChatId] || '');
  }, [currentChatId, localDrafts]);

  const handleSend = () => {
    if (!messageInput.trim()) return;
    triggerHaptic();
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
    triggerHaptic();
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

  const stopAudioRecording = () => { if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop(); };

  return (
    <>
    <footer className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-[#030306]/95 backdrop-blur-[40px] border-t border-white/5 shrink-0 z-40 relative flex flex-col gap-2">
      {replyTo && (
        <div className="bg-white/5 p-3 rounded-2xl flex items-center justify-between border border-white/5 mb-1 animate-in slide-in-from-bottom-2 shadow-xl mx-auto w-full max-w-5xl">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-1 h-8 bg-primary rounded-full shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{replyTo.senderName}</span>
              <span className="text-[12px] text-white/60 truncate italic">
                {replyTo.contentType === 'text' ? decryptSignal(replyTo.content) : `[${replyTo.contentType}]`}
              </span>
            </div>
          </div>
          <button className="h-8 w-8 text-white/20 hover:text-white" onClick={onCancelReply}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex gap-3 items-end w-full max-w-5xl mx-auto relative">
        {!isRecording ? (
          <>
            <Button variant="ghost" size="icon" className="h-12 w-12 shrink-0 rounded-2xl bg-white/[0.03] hover:bg-white/10 border border-white/5 transition-all" onClick={() => { triggerHaptic(); fileInputRef.current?.click(); }}><Paperclip className="w-6 h-6 text-white/40" /></Button>
            
            <div className="flex-1 flex items-end bg-white/[0.04] rounded-[1.8rem] border border-white/10 min-h-[48px] px-5 py-2.5 transition-all focus-within:border-primary/30">
              <Textarea 
                placeholder={t('chat.placeholder')} 
                className="bg-transparent border-none focus-visible:ring-0 text-white min-h-[26px] max-h-[160px] py-0 text-[15px] resize-none w-full scrollbar-hide font-medium tracking-tight shadow-none" 
                value={messageInput} 
                onChange={e => {
                  setMessageInput(e.target.value);
                  setLocalDrafts(prev => ({ ...prev, [currentChatId]: e.target.value }));
                }} 
              />
              <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                 <PopoverTrigger asChild>
                   <Button variant="ghost" size="icon" className="text-white/20 h-8 w-8 hover:text-white/40 active:scale-90" onClick={triggerHaptic}><Smile className="w-6 h-6" /></Button>
                 </PopoverTrigger>
                 <PopoverContent side="top" className="p-0 border-none bg-transparent w-[320px] mb-6">
                   <EmojiPicker 
                     onEmojiSelect={(e) => setMessageInput(messageInput + e)} 
                     onStickerSelect={(url) => { 
                       onSendMessage(url, 'sticker', null); 
                       setIsEmojiPickerOpen(false); 
                       triggerHaptic();
                     }} 
                   />
                 </PopoverContent>
              </Popover>
            </div>

            {messageInput.trim() ? (
              <Button size="icon" className="h-12 w-12 rounded-2xl bg-primary text-white active:scale-90 shadow-xl shadow-primary/20 transition-all border border-white/10" onClick={handleSend}><Send className="w-5 h-5" /></Button>
            ) : (
              <button onClick={triggerHaptic} className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all bg-white/[0.04] text-white/30 hover:bg-primary/20 hover:text-primary active:scale-90 border border-white/5">
                <Mic className="w-6 h-6" />
              </button>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center bg-primary/10 border border-primary/20 rounded-[1.8rem] h-12 px-5 gap-4 animate-in slide-in-from-right-4 shadow-2xl">
            <div className="flex items-center gap-3 text-primary animate-pulse"><div className="w-2.5 h-2.5 rounded-full bg-primary" /><span className="text-[10px] font-black tracking-widest">REC</span></div>
            <span className="text-base font-black flex-1 tabular-nums text-white italic">
              {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </span>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-white/30 hover:text-red-500 rounded-full" onClick={() => { setIsRecording(false); setRecordingDuration(0); }}><Trash2 className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-primary active:scale-90" onPointerUp={stopAudioRecording}><StopCircle className="w-6 h-6 fill-current" /></Button>
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} hidden multiple accept="image/*,video/*" onChange={handleFileChange} />
    </footer>
    <ImagePreviewModal 
      open={isPreviewOpen} 
      onOpenChange={(val) => {
        if (!val) {
          setPendingFiles([]);
        }
        setIsPreviewOpen(val);
      }}
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
  const { currentChatId, setCurrentChatId, setInspectedUserId, setActiveCallId } = useAppState();
  const { t } = useTranslations();
  const { toast } = useToast();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser?.uid]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const otherId = useMemo(() => {
    if (chat?.type === 'private') {
      return chat.participantIds.find(id => id !== firebaseUser?.uid);
    }
    return null;
  }, [chat, firebaseUser?.uid]);

  const otherProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(otherProfileRef);

  const messagesQuery = useMemoFirebase(() => (!db || !currentChatId) ? null : query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc')), [db, currentChatId]);
  const { data: messages } = useCollection<Message>(messagesQuery);

  // 🛰️ AUTO-READ LOGIC: Mark incoming messages as read
  useEffect(() => {
    if (!db || !currentChatId || !firebaseUser || !messages) return;

    const unreadMessages = messages.filter(m => m.senderId !== firebaseUser.uid && !m.isRead);
    if (unreadMessages.length === 0) return;

    const markAsRead = async () => {
      const batch = writeBatch(db);
      unreadMessages.forEach(msg => {
        const msgRef = doc(db, 'chats', currentChatId, 'messages', msg.id);
        batch.update(msgRef, { isRead: true });
      });
      try {
        await batch.commit();
      } catch (e) {
        console.warn("Nuxus Signal: Read-receipt sync failed");
      }
    };

    markAsRead();
  }, [db, currentChatId, firebaseUser, messages]);

  const handleStartCall = async (type: 'audio' | 'video' = 'audio') => {
    if (!db || !firebaseUser || !otherId) return;
    triggerHaptic();
    try {
      const callData = {
        callerId: firebaseUser.uid,
        receiverId: otherId,
        participantIds: [firebaseUser.uid, otherId],
        status: 'calling',
        type: type,
        createdAt: new Date().toISOString(),
        chatId: currentChatId
      };
      const docRef = await addDoc(collection(db, 'calls'), callData);
      setActiveCallId(docRef.id);
    } catch (e) {
      toast({ title: "Сбой линии", variant: "destructive" });
    }
  };

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
      msgData.replyToSenderName = replyTo.senderName;
      setReplyTo(null); 
    }
    await addDoc(collection(db, 'chats', currentChatId, 'messages'), msgData);
    await updateDoc(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString() });
    
    if (userProfile) {
       await updateDoc(doc(db, 'users', firebaseUser.uid), { reputation: increment(0.2) });
    }
  }, [currentChatId, firebaseUser?.uid, db, userProfile, replyTo]);

  const currentDisplayName = useMemo(() => {
    if (!chat) return '...';
    if (chat.type === 'saved') return 'Архив Данных';
    if (chat.type === 'private') return formatDisplayName(otherProfile?.name, otherProfile?.username);
    return formatDisplayName(chat.name, chat.username);
  }, [chat, otherProfile]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030306] relative overflow-hidden z-20">
      <header className="h-16 border-b border-white/5 bg-white/[0.02] backdrop-blur-[40px] flex items-center px-4 shrink-0 z-30 shadow-2xl">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden rounded-2xl text-white/40 h-10 w-10 hover:bg-white/5" onClick={() => { triggerHaptic(); setCurrentChatId(null); }}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="flex items-center gap-4 cursor-pointer min-w-0 flex-1 group" onClick={() => { triggerHaptic(); otherId ? setInspectedUserId(otherId) : setIsChatInfoOpen(true); }}>
            <UserAvatar 
              userId={otherId || (chat?.type === 'saved' ? firebaseUser?.uid : null)} 
              className="h-11 w-11 border-2 border-white/10 group-hover:border-primary/40 transition-all shadow-xl" 
              manualAvatarUrl={chat?.type !== 'private' && chat?.type !== 'saved' ? chat?.avatarUrl : otherProfile?.avatarUrl} 
              fallbackName={currentDisplayName} 
              showOnlineStatus={chat?.type === 'private'} 
            />
            <div className="flex flex-col min-w-0 text-left">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-black text-base truncate text-white leading-tight italic tracking-tighter uppercase">{currentDisplayName}</span>
              </div>
              <span className="text-[9px] font-bold text-primary/60 tracking-widest uppercase italic">{chat?.type === 'private' ? t('online') : chat?.type === 'saved' ? 'Ваш Архив' : chat?.username}</span>
            </div>
          </div>
        </div>
        
        {chat?.type === 'private' && otherId && (
          <div className="flex items-center gap-2 pr-2">
             <Button variant="ghost" size="icon" className="rounded-xl text-white/40 hover:text-primary transition-all" onClick={() => handleStartCall('audio')}>
                <Phone size={20} />
             </Button>
             <Button variant="ghost" size="icon" className="rounded-xl text-white/40 hover:text-primary transition-all" onClick={() => handleStartCall('video')}>
                <Video size={20} />
             </Button>
          </div>
        )}
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0 z-10">
        <ScrollArea className="flex-1 w-full">
          <div className="flex flex-col gap-1 max-w-4xl mx-auto px-4 py-6 min-h-full">
            {messages?.map(msg => (
               <div id={msg.id} key={msg.id}>
                 <MessageItem 
                   message={msg} isMe={msg.senderId === firebaseUser?.uid} 
                   chatId={currentChatId} onReply={setReplyTo} 
                   amIPremium={isUserPremium(userProfile)} viewerProfile={userProfile} 
                 />
               </div>
            ))}
            <div id="messages-end" className="h-4" />
          </div>
        </ScrollArea>
      </div>

      <ChatInputBar onSendMessage={handleSendMessage} currentChatId={currentChatId} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}
