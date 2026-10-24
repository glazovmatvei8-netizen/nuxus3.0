"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAppState } from '@/lib/app-state';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';
import { 
  Plus, Zap, Check, Smile, X, Search, ShieldCheck, ChevronLeft, ArrowDown, ImageIcon
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

const ChatInputBar = memo(({ onSendMessage, onUpdateMessage, currentChatId, replyTo, onCancelReply, editingMessage, onCancelEdit }: any) => {
  const { localDrafts, setLocalDrafts } = useAppState();
  const { t } = useTranslations();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [messageInput, setMessageInput] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

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
      onSendMessage(messageInput, 'text');
    }
    
    setMessageInput('');
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
      toast({ title: "Media Signal Transmitted" });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <footer className="p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] shrink-0 z-40 relative">
      <div className="max-w-5xl mx-auto relative flex items-end gap-3">
        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileSelect} />

        {(replyTo || editingMessage) && (
          <div className="absolute bottom-full left-0 right-0 mb-4 p-4 mig-glass rounded-[2rem] animate-in slide-in-from-bottom-4 shadow-2xl">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                   <div className="w-1 h-8 bg-primary rounded-full" />
                   <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{editingMessage ? 'EDITING' : 'REPLYING'}</span>
                      <span className="text-sm text-white/50 truncate italic">{decryptSignal(editingMessage?.content || replyTo?.content)}</span>
                   </div>
                </div>
                <button className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/20" onClick={editingMessage ? onCancelEdit : onCancelReply}><X size={16} /></button>
             </div>
          </div>
        )}

        <Button variant="ghost" size="icon" className="h-14 w-14 shrink-0 rounded-[1.5rem] bg-white/[0.04] border border-white/5 text-white/40 hover:text-white" onClick={() => fileInputRef.current?.click()}>
          <Plus className="w-6 h-6" />
        </Button>

        <div className="flex-1 mig-glass rounded-[1.8rem] min-h-[56px] px-6 py-4 flex items-end gap-3 group/input transition-all focus-within:bg-white/[0.08]">
           <Textarea 
             placeholder={editingMessage ? "Correcting signal..." : t('chat.placeholder')} 
             className="bg-transparent border-none focus-visible:ring-0 text-white min-h-[24px] max-h-[200px] py-0 text-[16px] font-bold resize-none w-full shadow-none placeholder:text-white/20" 
             value={messageInput} 
             autoFocus={!!editingMessage}
             onChange={e => { setMessageInput(e.target.value); if(!editingMessage) setLocalDrafts(prev => ({ ...prev, [currentChatId]: e.target.value })); }} 
             onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAction(); } }}
           />
           <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
              <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-white/20 h-6 w-6 shrink-0 hover:text-primary transition-colors mb-0.5"><Smile size={20} /></Button></PopoverTrigger>
              <PopoverContent side="top" className="p-0 border-none bg-transparent w-[320px] mb-8">
                <EmojiPicker onEmojiSelect={(e) => setMessageInput(prev => prev + e)} onStickerSelect={(url) => onSendMessage(url, 'sticker')} />
              </PopoverContent>
           </Popover>
        </div>

        <Button 
          size="icon" 
          className={cn(
            "h-14 w-14 rounded-[1.5rem] transition-all duration-500 shadow-2xl",
            messageInput.trim() ? "bg-primary text-white sonic-glow scale-105" : "bg-white/[0.04] text-white/20"
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
  const initialScrollDone = useRef(false);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

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

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior });
      }
    }
  }, []);

  useEffect(() => {
    if (!messages?.length) return;
    if (!initialScrollDone.current) {
      setTimeout(() => { scrollToBottom('auto'); initialScrollDone.current = true; }, 50);
    } else {
      scrollToBottom('smooth');
    }
  }, [messages?.length, scrollToBottom]);

  const displayName = useMemo(() => {
    if (!chat) return '...';
    if (chat.type === 'saved') return 'Data Archive';
    if (chat.type === 'private') return formatDisplayName(otherProfile?.name, otherProfile?.username);
    return formatDisplayName(chat.name, chat.username);
  }, [chat, otherProfile]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setShowScrollDown(target.scrollHeight - target.scrollTop - target.clientHeight > 300);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden z-20">
      <header className="h-24 bg-background/20 backdrop-blur-[50px] border-b border-white/5 flex items-center justify-between px-8 shrink-0 z-30">
        <div className="flex items-center gap-5 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden rounded-2xl" onClick={() => setCurrentChatId(null)}><ChevronLeft size={28} /></Button>
          <div className="flex items-center gap-4 cursor-pointer min-w-0" onClick={() => otherId ? setInspectedUserId(otherId) : setIsChatInfoOpen(true)}>
            <UserAvatar userId={otherId || (chat?.type === 'saved' ? firebaseUser?.uid : null)} className="h-14 w-14 rounded-2xl" manualAvatarUrl={chat?.type !== 'private' && chat?.type !== 'saved' ? chat?.avatarUrl : otherProfile?.avatarUrl} fallbackName={displayName} showOnlineStatus={chat?.type === 'private'} />
            <div className="flex flex-col min-w-0">
              <span className="font-black text-xl truncate text-white italic tracking-tighter leading-none">{displayName}</span>
              <span className="text-[10px] font-black text-primary/40 tracking-[0.3em] uppercase italic mt-1.5">{chat?.type === 'private' ? 'ENCRYPTED LINE' : chat?.username || 'CLUSTER'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white/[0.03] text-white/30 hover:text-primary transition-all"><Search size={22} /></Button>
           <div className="hidden sm:flex bg-primary/10 px-4 py-2 rounded-full border border-primary/20 items-center gap-2 shadow-lg">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">QES v28.4</span>
           </div>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        {otherProfile?.settings?.chatBackground && (
          <img src={otherProfile.settings.chatBackground} className="absolute inset-0 w-full h-full object-cover opacity-30 z-0" alt="Chat BG" />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,212,255,0.05)_0%,transparent_80%)] z-0" />
        
        <ScrollArea ref={scrollAreaRef} className="h-full w-full relative z-10" onScrollCapture={handleScroll}>
          <div className="flex flex-col gap-3 px-8 py-10">
            {groupedMessages.map(group => (
              <React.Fragment key={group.date}>
                <div className="flex justify-center my-6">
                   <div className="px-5 py-2 bg-white/[0.03] backdrop-blur-xl border border-white/5 rounded-full shadow-2xl">
                      <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.3em]">
                        {group.date === 'unknown' ? '' : isToday(parseISO(group.date)) ? 'Today' : isYesterday(parseISO(group.date)) ? 'Yesterday' : format(parseISO(group.date), 'd MMMM yyyy', { locale: ru })}
                      </span>
                   </div>
                </div>
                {group.messages.map(msg => (
                  <MessageItem key={msg.id} message={msg} isMe={msg.senderId === firebaseUser?.uid} chatId={currentChatId} onReply={setReplyTo} onEdit={setEditingMessage} />
                ))}
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>

        {showScrollDown && (
          <Button 
            size="icon" 
            onClick={() => scrollToBottom()}
            className="absolute bottom-10 right-10 h-14 w-14 rounded-full bg-primary text-white shadow-[0_15px_40px_rgba(var(--primary),0.4)] z-30 animate-in fade-in zoom-in duration-300 border border-white/20 active:scale-90"
          >
            <ArrowDown className="w-7 h-7" />
          </Button>
        )}
      </div>

      <ChatInputBar
        onSendMessage={(c, t) => signalService.broadcastSignal(currentChatId!, firebaseUser!.uid, firebaseUser!.displayName || 'User', c, replyTo).then(() => setReplyTo(null))}
        onUpdateMessage={(id, text) => signalService.updateSignal(currentChatId!, id, text).then(() => setEditingMessage(null))}
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