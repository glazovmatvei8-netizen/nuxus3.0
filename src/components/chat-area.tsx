
"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  Send, Paperclip, Sparkles, MessageSquare, Info, X, 
  CornerUpLeft, Loader2, ShieldAlert, ChevronLeft, ChevronDown,
  Search, MoreVertical, Mic, UserPlus, Pin, Camera, StopCircle
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, arrayUnion } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';
import { cn, formatDisplayName, formatLastSeen, isUserPremium } from '@/lib/utils';
import type { Message, User as UserType, Chat } from '@/lib/types';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉', '💎', '⚡'];

export default function ChatArea() {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId } = useAppState();
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  const [statusString, setStatusString] = useState<string>('');
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [reactionTarget, setReactionTarget] = useState<Message | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingSignalRef = useRef<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataLoadedRef = useRef(false);
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: userProfile } = useDoc<UserType>(userProfileRef);
  const amIPremium = isUserPremium(userProfile);

  const chatRef = useMemoFirebase(() => (!db || !currentChatId) ? null : doc(db, 'chats', currentChatId), [db, currentChatId]);
  const { data: chat } = useDoc<Chat>(chatRef);

  const pinnedMessageRef = useMemoFirebase(() => (!db || !currentChatId || !chat?.pinnedMessageId) ? null : doc(db, 'chats', currentChatId, 'messages', chat.pinnedMessageId), [db, currentChatId, chat?.pinnedMessageId]);
  const { data: pinnedMessage } = useDoc<Message>(pinnedMessageRef);

  const otherId = useMemo(() => (chat?.type === 'private' && user) ? chat.participantIds?.find((id: string) => id !== user.uid) : null, [chat, user]);
  const otherUserProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUserProfile } = useDoc<UserType>(otherUserProfileRef);

  const isBlocked = userProfile?.blockedUserIds?.includes(otherId || '') || otherUserProfile?.blockedUserIds?.includes(user?.uid || '');
  const isParticipant = chat?.participantIds?.includes(user?.uid || '');

  const messagesQuery = useMemoFirebase(() => (!db || !currentChatId) ? null : query(collection(db, 'chats', currentChatId, 'messages'), orderBy('sentAt', 'asc')), [db, currentChatId]);
  const { data: messages, isLoading: isMessagesLoading } = useCollection<Message>(messagesQuery);

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    if (!isSearchOpen || !searchQuery.trim()) return messages;
    return messages.filter(msg => msg.contentType === 'text' && msg.content.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [messages, isSearchOpen, searchQuery]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    }
  }, []);

  useEffect(() => {
    if (messages?.length) {
      if (!dataLoadedRef.current) {
        setTimeout(() => scrollToBottom('instant' as any), 50);
        dataLoadedRef.current = true;
      } else {
        scrollToBottom('smooth');
      }
    }
  }, [messages, currentChatId, scrollToBottom]);

  useEffect(() => { dataLoadedRef.current = false; }, [currentChatId]);

  const handleSendMessage = useCallback((content: string, type: string = 'text') => {
    if (isBlocked || !isParticipant || (!content.trim() && type === 'text') || !currentChatId || !user || !db) return;
    setIsSending(true);
    const msgData: any = { chatId: currentChatId, senderId: user.uid, senderName: userProfile?.name || 'User', content: content.trim(), contentType: type, sentAt: new Date().toISOString(), isRead: false };
    if (replyTo) { msgData.replyToId = replyTo.id; msgData.replyToContent = replyTo.contentType === 'text' ? replyTo.content : `[${replyTo.contentType}]`; setReplyTo(null); }
    addDocumentNonBlocking(collection(db, 'chats', currentChatId, 'messages'), msgData);
    updateDocumentNonBlocking(doc(db, 'chats', currentChatId), { lastMessageAt: new Date().toISOString(), [`typing.${user.uid}`]: false });
    setTimeout(() => { scrollToBottom('smooth'); setIsSending(false); }, 100);
  }, [isBlocked, isParticipant, currentChatId, user, db, userProfile, replyTo, scrollToBottom]);

  const handleAddReaction = (emoji: string) => {
    if (!user || !db || !reactionTarget || !currentChatId) return;
    addDocumentNonBlocking(collection(db, 'chats', currentChatId, 'messages', reactionTarget.id, 'reactions'), { messageId: reactionTarget.id, reactorId: user.uid, emoji, reactedAt: new Date().toISOString() });
    setReactionTarget(null);
  };

  const chatDisplayName = formatDisplayName(otherUserProfile?.name || (otherId && chat?.metadata && chat.metadata[otherId] ? chat.metadata[otherId].name : chat?.name));
  const otherAvatarUrl = otherUserProfile?.avatarUrl || (otherId && chat?.metadata && chat.metadata[otherId] ? chat.metadata[otherId].avatarUrl : null);

  if (!currentChatId) return <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background"><MessageSquare className="w-16 h-16 text-primary/20 mb-4" /><h2 className="text-xl font-bold opacity-60">Выберите чат</h2></div>;

  return (
    <div className="flex-1 flex flex-col h-[100dvh] bg-background relative overflow-hidden">
      <header className="h-16 flex flex-col justify-center border-b border-border/40 bg-card/20 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center justify-between px-4 h-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCurrentChatId(null)}><ChevronLeft className="w-5 h-5" /></Button>
            <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setIsChatInfoOpen(true)}>
              <UserAvatar userId={null} manualAvatarUrl={otherAvatarUrl} className="h-9 w-9" fallbackName={chatDisplayName} />
              <div className="flex flex-col min-w-0"><span className="font-semibold text-sm truncate">{chatDisplayName}</span></div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsChatInfoOpen(true)} className="rounded-full"><Info className="w-5 h-5" /></Button>
        </div>
      </header>

      <ScrollArea ref={scrollRef} className="flex-1 w-full relative z-10">
        <div className="flex flex-col gap-2 max-w-4xl mx-auto px-4 py-4 min-h-full">
          {filteredMessages.map(msg => (
            <MessageItem 
              key={msg.id} 
              message={msg} 
              isMe={msg.senderId === user?.uid} 
              chatId={currentChatId} 
              onReply={setReplyTo} 
              onEdit={setEditMessage} 
              onOpenReactions={setReactionTarget}
              amIPremium={amIPremium}
              isAdmin={chat?.ownerId === user?.uid || chat?.adminIds?.includes(user?.uid || '')}
              senderAvatarUrl={msg.senderId === user?.uid ? userProfile?.avatarUrl : otherAvatarUrl}
            />
          ))}
          {isMessagesLoading && <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
        </div>
      </ScrollArea>

      <footer className="p-3 bg-card/20 backdrop-blur-xl border-t border-border/40 z-20 shrink-0">
        <div className="flex gap-2 max-w-4xl mx-auto items-end">
          <Input 
            placeholder="Сообщение..." 
            className="bg-muted/40 rounded-xl h-11 border-none" 
            onKeyDown={e => e.key === 'Enter' && handleSendMessage((e.target as any).value)}
          />
          <Button size="icon" className="h-11 w-11 rounded-xl"><Send className="w-5 h-5" /></Button>
        </div>
      </footer>

      <Dialog open={!!reactionTarget} onOpenChange={val => !val && setReactionTarget(null)}>
        <DialogContent className="max-w-[280px] p-2 bg-card/95 backdrop-blur-xl rounded-3xl">
          <DialogTitle className="sr-only">Реакции</DialogTitle>
          <DialogDescription className="sr-only">Выберите эмодзи</DialogDescription>
          <div className="grid grid-cols-5 gap-1">
            {REACTIONS.map(emoji => (
              <button key={emoji} className="p-3 text-2xl hover:bg-primary/10 rounded-xl transition-all hover:scale-125" onClick={() => handleAddReaction(emoji)}>{emoji}</button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}
