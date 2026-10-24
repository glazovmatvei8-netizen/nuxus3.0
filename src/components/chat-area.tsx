"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/app-state';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Send, ChevronLeft, X, Paperclip, Mic, StopCircle, 
  Smile, Trash2, Loader2, Phone, Video, ShieldCheck, Edit2, Check,
  Pin, ArrowDown, Search, Eraser, Flame, Clock, Plus, BarChart3, Zap, ImageIcon
} from 'lucide-react';
import { MessageItem } from './message-item';
import { ChatInfoModal } from './modals/chat-info-modal';
import { EmojiPicker } from './emoji-picker';
import { useUser, useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { collection, query, orderBy, doc, addDoc } from 'firebase/firestore';
import { formatDisplayName, cn, compressImage, triggerHaptic, decryptSignal } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslations } from '@/hooks/use-translations';
import { useToast } from '@/hooks/use-toast';
import { signalService } from '@/services/signal-service';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { addMinutes } from 'date-fns';

const ChatInputBar = memo(({ onSendMessage, onUpdateMessage, currentChatId, replyTo, onCancelReply, editingMessage, onCancelEdit }: any) => {
  const { localDrafts, setLocalDrafts } = useAppState();
  const { t } = useTranslations();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [messageInput, setMessageInput] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [ttl, setTtl] = useState<number | null>(null);

  useEffect(() => {
    if (editingMessage) {
      setMessageInput(decryptSignal(editingMessage.content));
    } else {
      setMessageInput(localDrafts[currentChatId] || '');
    }
  }, [currentChatId, localDrafts, editingMessage]);

  const handleAction = () => {
    if (!messageInput.trim()) return;
    triggerHaptic();
    
    if (editingMessage) {
      onUpdateMessage(editingMessage.id, messageInput);
    } else {
      let selfDestructAt = null;
      if (ttl) selfDestructAt = addMinutes(new Date(), ttl).toISOString();
      onSendMessage(messageInput, 'text', { selfDestructAt });
    }
    
    setMessageInput('');
    setTtl(null);
    if (!editingMessage) setLocalDrafts(prev => ({ ...prev, [currentChatId]: '' }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerHaptic();
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const compressed = await compressImage(base64, 1200, 0.7);
      onSendMessage(compressed, 'image');
      toast({ title: "Медиа пакет отправлен" });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <footer className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-[#010103]/60 backdrop-blur-[50px] border-t border-white/5 shrink-0 z-40 relative">
      <div className="flex gap-3 items-end w-full max-w-5xl mx-auto relative">
        
        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileSelect} />

        {(replyTo || editingMessage) && (
          <div className="absolute bottom-full left-0 right-0 mb-3 p-4 mig-glass rounded-3xl animate-in slide-in-from-bottom-4 shadow-2xl">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                   <div className="w-1 h-10 bg-primary rounded-full" />
                   <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">{editingMessage ? 'Редактирование' : 'Ответ'}</span>
                      <span className="text-sm text-white/60 truncate italic">{decryptSignal(editingMessage?.content || replyTo?.content)}</span>
                   </div>
                </div>
                <button className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/40" onClick={editingMessage ? onCancelEdit : onCancelReply}><X size={16} /></button>
             </div>
          </div>
        )}

        <Button variant="ghost" size="icon" className="h-14 w-14 shrink-0 rounded-2xl bg-white/[0.03] border border-white/5" onClick={() => fileInputRef.current?.click()}>
          <Plus className="w-7 h-7 text-white/20" />
        </Button>

        <div className="flex-1 flex items-end mig-glass rounded-[1.8rem] min-h-[56px] px-5 py-3.5 gap-2 group/input">
           <Textarea 
             placeholder={editingMessage ? "Править сигнал..." : t('chat.placeholder')} 
             className="bg-transparent border-none focus-visible:ring-0 text-white min-h-[24px] max-h-[200px] py-0 text-[16px] font-bold resize-none w-full shadow-none" 
             value={messageInput} 
             autoFocus={!!editingMessage}
             onChange={e => { setMessageInput(e.target.value); if(!editingMessage) setLocalDrafts(prev => ({ ...prev, [currentChatId]: e.target.value })); }} 
             onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAction(); } }}
           />
           <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
              <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-white/20 h-8 w-8 shrink-0 hover:text-primary transition-colors"><Smile size={24} /></Button></PopoverTrigger>
              <PopoverContent side="top" className="p-0 border-none bg-transparent w-[320px] mb-6">
                <EmojiPicker onEmojiSelect={(e) => setMessageInput(prev => prev + e)} onStickerSelect={(url) => onSendMessage(url, 'sticker')} />
              </PopoverContent>
           </Popover>
        </div>

        <Button 
          size="icon" 
          className={cn(
            "h-14 w-14 rounded-2xl transition-all shadow-2xl",
            messageInput.trim() ? "bg-primary text-white sonic-glow" : "bg-white/[0.03] text-white/20"
          )}
          onClick={handleAction}
          disabled={!messageInput.trim()}
        >
          {editingMessage ? <Check size={28} /> : <Zap size={28} className={messageInput.trim() ? "fill-current" : ""} />}
        </Button>
      </div>
    </footer>
  );
});
ChatInputBar.displayName = 'ChatInputBar';

export default function ChatArea() {
  const { user: firebaseUser } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId, setInspectedUserId } = useAppState();
  const { toast } = useToast();
  
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const userProfileRef = useMemoFirebase(() => (!db || !firebaseUser) ? null : doc(db, 'users', firebaseUser.uid), [db, firebaseUser?.uid]);
  const { data: myProfile } = useDoc<UserType>(userProfileRef);

  const otherId = useMemo(() => chat?.type === 'private' ? chat.participantIds.find(id => id !== firebaseUser?.uid) : null, [chat, firebaseUser?.uid]);
  const otherProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherProfile } = useDoc<UserType>(otherProfileRef);

  const messagesQuery = useMemoFirebase(() => (!db || !currentChatId) ? null : query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc')), [db, currentChatId]);
  const { data: messages } = useCollection<Message>(messagesQuery);

  const groupedMessages = useMemo(() => {
    if (!messages) return [];
    const groups: { date: string, messages: Message[] }[] = [];
    messages.forEach(msg => {
      const date = msg.sentAt ? format(parseISO(msg.sentAt), 'yyyy-MM-dd') : 'unknown';
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === date) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ date, messages: [msg] });
      }
    });
    return groups;
  }, [messages]);

  const handleSendMessage = useCallback(async (content: string, type: Message['contentType'] = 'text', meta: any = null) => {
    if (!content || !currentChatId || !firebaseUser) return;
    try {
      if (type === 'text') {
        await signalService.broadcastSignal(currentChatId, firebaseUser.uid, firebaseUser.displayName || 'User', content, replyTo, meta?.selfDestructAt);
      } else {
        await addDoc(collection(db!, 'chats', currentChatId, 'messages'), { 
          chatId: currentChatId, senderId: firebaseUser.uid, senderName: firebaseUser.displayName || 'User', 
          content, contentType: type, sentAt: new Date().toISOString(), isRead: false
        });
      }
      setReplyTo(null);
    } catch (e) { toast({ title: "Signal Error", variant: "destructive" }); }
  }, [currentChatId, firebaseUser, replyTo, db, toast]);

  const handleUpdateMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!currentChatId || !newContent.trim()) return;
    try {
      await signalService.updateSignal(currentChatId, messageId, newContent);
      setEditingMessage(null);
    } catch (e) { toast({ title: "Ошибка обновления", variant: "destructive" }); }
  }, [currentChatId, toast]);

  const displayName = useMemo(() => {
    if (!chat) return '...';
    if (chat.type === 'saved') return 'DATA ARCHIVE';
    if (chat.type === 'private') return formatDisplayName(otherProfile?.name, otherProfile?.username);
    return formatDisplayName(chat.name, chat.username);
  }, [chat, otherProfile]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
        if (isAtBottom) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }
  }, [messages?.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isUp = target.scrollHeight - target.scrollTop - target.clientHeight > 300;
    setShowScrollDown(isUp);
  };

  const formatDateLabel = (dateStr: string) => {
    if (dateStr === 'unknown') return '';
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Сегодня';
    if (isYesterday(date)) return 'Вчера';
    return format(date, 'd MMMM yyyy', { locale: ru });
  };

  const chatBackground = myProfile?.settings?.chatBackground;

  return (
    <div className="flex-1 flex-col h-full bg-[#010103] relative overflow-hidden z-20 flex">
      <header className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-3xl flex items-center justify-between px-6 shrink-0 z-30 shadow-2xl">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden rounded-2xl" onClick={() => setCurrentChatId(null)}><ChevronLeft size={28} /></Button>
          <div className="flex items-center gap-4 cursor-pointer min-w-0 flex-1 group" onClick={() => otherId ? setInspectedUserId(otherId) : setIsChatInfoOpen(true)}>
            <UserAvatar userId={otherId || (chat?.type === 'saved' ? firebaseUser?.uid : null)} className="h-12 w-12 rounded-[1.2rem] border border-white/10" manualAvatarUrl={chat?.type !== 'private' && chat?.type !== 'saved' ? chat?.avatarUrl : otherProfile?.avatarUrl} fallbackName={displayName} showOnlineStatus={chat?.type === 'private'} />
            <div className="flex flex-col min-w-0">
              <span className="font-black text-lg truncate text-white italic tracking-tighter leading-none">{displayName}</span>
              <span className="text-[10px] font-black text-primary/60 tracking-widest italic mt-1">{chat?.type === 'private' ? 'SIGNAL ACTIVE' : chat?.username || 'CLUSTER'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white/[0.03] text-white/40"><Search size={22} /></Button>
           <div className="hidden sm:flex bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">QES 28.4</span>
           </div>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden z-10">
        {chatBackground ? (
          <div className="absolute inset-0 z-0">
             <img src={chatBackground} className="w-full h-full object-cover opacity-80" alt="Chat BG" />
             <div className="absolute inset-0 bg-black/20" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,212,255,0.03)_0%,transparent_70%)]" />
        )}
        
        <ScrollArea ref={scrollAreaRef} className="h-full w-full relative z-10" onScrollCapture={handleScroll}>
          <div className="flex flex-col gap-2 px-6 py-8">
            {groupedMessages.map(group => (
              <React.Fragment key={group.date}>
                <div className="flex justify-center my-4 sticky top-4 z-20">
                   <div className="px-4 py-1.5 bg-black/40 backdrop-blur-xl border border-white/5 rounded-full shadow-xl">
                      <span className="text-[9px] font-black uppercase text-white/40 tracking-[0.2em]">{formatDateLabel(group.date)}</span>
                   </div>
                </div>
                {group.messages.map(msg => (
                  <MessageItem 
                    key={msg.id} 
                    message={msg} 
                    isMe={msg.senderId === firebaseUser?.uid} 
                    chatId={currentChatId} 
                    onReply={setReplyTo} 
                    onEdit={setEditingMessage}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>

        {showScrollDown && (
          <Button 
            size="icon" 
            onClick={scrollToBottom}
            className="absolute bottom-6 right-6 h-12 w-12 rounded-full bg-primary/80 backdrop-blur-xl text-white shadow-2xl z-30 animate-in fade-in zoom-in duration-300 border border-white/10"
          >
            <ArrowDown className="w-6 h-6" />
          </Button>
        )}
      </div>

      <ChatInputBar
        onSendMessage={handleSendMessage}
        onUpdateMessage={handleUpdateMessage}
        currentChatId={currentChatId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
      />
      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}
