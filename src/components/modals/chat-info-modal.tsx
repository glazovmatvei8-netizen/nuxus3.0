
"use client"

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, Gift, Crown, Star, LogOut, UserPlus, Shield, UserMinus, UserCheck,
  Settings2, Upload, Camera, Check, Info, Users, MessageSquare
} from 'lucide-react';
import { 
  Star as StarIcon, Heart, Zap, Flame, Trophy, Rocket, Diamond, 
  Cookie, PartyPopper, Ghost, Gem, Coffee, Pizza, Beer, Wine, 
  Camera as CameraIcon, Laptop, Watch, Smartphone, Car, Plane, Sun, Moon, 
  Cloud, Snowflake, Trees, Flower2, Dog, Cat, Bird, Fish, 
  Bitcoin, Coins, Gamepad2, Music, Smile, ThumbsUp, Bell, 
  Mail, Key, Lock, Shield as ShieldIcon, Sword, Anchor, Compass, Map, 
  Flag, Briefcase, GraduationCap 
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { chatConversationSummary } from '@/ai/flows/chat-conversation-summary-flow';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useAppState } from '@/lib/store';
import { cn, formatDisplayName, isUserPremium } from '@/lib/utils';
import type { User, ReceivedGift, Chat } from '@/lib/types';
import { AddMemberModal } from './add-member-modal';

const PRIME_UID = 'vnctow46';

export const AVAILABLE_GIFTS = [
  { id: 'gift_star', name: 'Звезда', icon: StarIcon, color: 'text-yellow-400', value: 100 },
  { id: 'gift_heart', name: 'Сердце', icon: Heart, color: 'text-red-500', value: 150 },
  { id: 'gift_zap', name: 'Молния', icon: Zap, color: 'text-yellow-300', value: 250 },
  { id: 'gift_fire', name: 'Огонь', icon: Flame, color: 'text-orange-600', value: 300 },
  { id: 'gift_trophy', name: 'Трофей', icon: Trophy, color: 'text-amber-500', value: 500 },
  { id: 'gift_rocket', name: 'Ракета', icon: Rocket, color: 'text-orange-500', value: 1500, isNFT: true },
  { id: 'gift_diamond', name: 'Алмаз', icon: Diamond, color: 'text-blue-400', value: 5000, isNFT: true },
  { id: 'gift_crown', name: 'Корона', icon: Crown, color: 'text-purple-400', value: 10000, isNFT: true },
  { id: 'gift_gem', name: 'Изумруд', icon: Gem, color: 'text-emerald-400', value: 2500, isNFT: true },
];

export function ChatInfoModal({ open, onOpenChange, chat }: { open: boolean, onOpenChange: (o: boolean) => void, chat: Chat }) {
  const db = useFirestore();
  const { user } = useUser();
  const { setCurrentChatId } = useAppState();
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showGiftSelection, setShowGiftSelection] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isOwner = user && chat.ownerId === user.uid;
  const isChatAdmin = isOwner || (user && chat.adminIds?.includes(user.uid));
  const isPrivate = chat.type === 'private';
  const otherId = isPrivate && user ? chat.participantIds?.find((id: string) => id !== user.uid) : null;

  const [editForm, setEditForm] = useState({
    name: chat.name || '',
    username: chat.username || '',
    description: chat.description || '',
    avatarUrl: chat.avatarUrl || ''
  });

  useEffect(() => {
    if (open) {
      setEditForm({
        name: chat.name || '',
        username: chat.username || '',
        description: chat.description || '',
        avatarUrl: chat.avatarUrl || ''
      });
    }
  }, [open, chat]);

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: currentUserProfile } = useDoc<User>(userProfileRef);
  const isGlobalAdminUser = currentUserProfile?.phone === '+79513332147' || user?.uid === PRIME_UID;
  
  const otherUserProfileRef = useMemoFirebase(() => (!db || !otherId) ? null : doc(db, 'users', otherId), [db, otherId]);
  const { data: otherUserProfile } = useDoc<User>(otherUserProfileRef);

  const receivedGiftsQuery = useMemoFirebase(() => {
    if (!db || !otherId) return null;
    return query(collection(db, 'users', otherId, 'receivedGifts'), orderBy('receivedAt', 'desc'));
  }, [db, otherId]);
  const { data: receivedGifts } = useCollection<ReceivedGift>(receivedGiftsQuery);

  const handleSendGift = async (gift: typeof AVAILABLE_GIFTS[0]) => {
    if (!isGlobalAdminUser || !db || !chat.id || !otherId) return;
    
    const messageData: any = {
      chatId: chat.id,
      senderId: user?.uid || 'admin',
      senderName: currentUserProfile?.name || 'Admin',
      content: gift.id,
      contentType: 'gift' as const,
      giftValue: gift.value,
      isNFT: gift.isNFT || false,
      sentAt: new Date().toISOString(),
      isRead: false
    };

    if (giftMessage.trim()) messageData.giftMessage = giftMessage.trim();

    const giftDocData: any = {
      giftType: gift.id,
      senderId: user?.uid || 'admin',
      senderName: currentUserProfile?.name || 'Admin',
      value: gift.value,
      isNFT: gift.isNFT || false,
      receivedAt: new Date().toISOString(),
      isSold: false
    };

    if (giftMessage.trim()) giftDocData.message = giftMessage.trim();

    addDocumentNonBlocking(collection(db, 'chats', chat.id, 'messages'), messageData);
    addDocumentNonBlocking(collection(db, 'users', otherId, 'receivedGifts'), giftDocData);
    
    setGiftMessage('');
    setShowGiftSelection(false);
    toast({ title: "Подарок отправлен!" });
  };

  const handleLeaveChat = async () => {
    if (!db || !user || !chat.id) return;
    try {
      const chatRef = doc(db, 'chats', chat.id);
      await updateDoc(chatRef, {
        participantIds: arrayRemove(user.uid),
        adminIds: arrayRemove(user.uid)
      });
      setCurrentChatId(null);
      onOpenChange(false);
      toast({ title: "Вы покинули чат" });
    } catch (e) {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  const handleSummarize = async () => {
    if (!db || !chat.id) return;
    setIsSummarizing(true);
    try {
      const msgsQuery = query(collection(db, 'chats', chat.id, 'messages'), orderBy('sentAt', 'desc'), limit(30));
      const snap = await getDocs(msgsQuery);
      const msgs = snap.docs.map(d => ({
        senderName: d.data().senderName || 'Unknown',
        text: d.data().contentType === 'text' ? d.data().content : `[${d.data().contentType}]`
      })).reverse();
      const { summary: aiSummary } = await chatConversationSummary({ chatMessages: msgs });
      setSummary(aiSummary);
    } catch (e) {
      toast({ title: "Ошибка AI", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleToggleAdmin = async (targetUserId: string, isAdmin: boolean) => {
    if (!db || !chat.id || !isOwner) return;
    try {
      const chatRef = doc(db, 'chats', chat.id);
      await updateDoc(chatRef, {
        adminIds: isAdmin ? arrayUnion(targetUserId) : arrayRemove(targetUserId)
      });
      toast({ title: isAdmin ? "Назначен админом" : "Снят с админки" });
    } catch (e) {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setEditForm(prev => ({ ...prev, avatarUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    if (!db || !chat.id || !isChatAdmin) return;
    setIsSaving(true);
    try {
      const chatRef = doc(db, 'chats', chat.id);
      const updatedUsername = editForm.username.startsWith('@') ? editForm.username.toLowerCase() : '@' + editForm.username.toLowerCase();
      
      await updateDoc(chatRef, {
        name: editForm.name,
        username: updatedUsername,
        description: editForm.description,
        avatarUrl: editForm.avatarUrl || null
      });
      
      toast({ title: "Настройки сохранены" });
    } catch (e: any) {
      toast({ title: "Ошибка сохранения", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const chatName = formatDisplayName(chat.name || otherUserProfile?.name || 'Чат');
  const chatUsername = otherUserProfile?.username || chat.username;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden h-[90vh] flex flex-col rounded-[2.5rem]">
        <DialogHeader className="p-6 bg-muted/30 border-b border-border text-center flex flex-col items-center shrink-0">
          <div className="relative group">
            <UserAvatar 
              userId={isPrivate ? otherId : null} 
              manualAvatarUrl={isChatAdmin ? editForm.avatarUrl : chat.avatarUrl} 
              className="h-20 w-20 mb-3 border-2 border-primary/20" 
              fallbackName={chatName} 
            />
            {isChatAdmin && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 h-20 w-20 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all mb-3"
              >
                <Camera className="w-6 h-6 text-white" />
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
          </div>
          <DialogTitle className="text-xl flex items-center justify-center gap-2">
            {chatName} {isUserPremium(otherUserProfile) && <Star className="w-4 h-4 text-accent fill-accent" />}
          </DialogTitle>
          <DialogDescription className="text-xs">{chatUsername}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TabsList className={cn("grid w-full h-10 bg-muted p-1 shrink-0", isChatAdmin && !isPrivate ? "grid-cols-3" : "grid-cols-2")}>
            <TabsTrigger value="info" className="text-[10px] font-bold uppercase tracking-widest"><Info className="w-3 h-3 mr-1.5" /> Инфо</TabsTrigger>
            <TabsTrigger value="members" className="text-[10px] font-bold uppercase tracking-widest"><Users className="w-3 h-3 mr-1.5" /> Участники</TabsTrigger>
            {isChatAdmin && !isPrivate && (
              <TabsTrigger value="manage" className="text-[10px] font-bold uppercase tracking-widest"><Settings2 className="w-3 h-3 mr-1.5" /> Управление</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="info" className="flex-1 min-h-0 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {chat.description && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Описание</h3>
                    <p className="text-sm bg-muted/20 p-3 rounded-xl border border-white/5">{chat.description}</p>
                  </div>
                )}

                {isPrivate && otherId && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Gift className="w-3 h-3" /> Подарки</h3>
                      {isGlobalAdminUser && <Button variant="ghost" size="sm" className="h-7 text-xs text-primary font-bold" onClick={() => setShowGiftSelection(!showGiftSelection)}>Подарить</Button>}
                    </div>
                    
                    {showGiftSelection && isGlobalAdminUser && (
                      <div className="space-y-3 p-3 bg-muted/50 rounded-2xl border border-border">
                        <Input placeholder="Сообщение..." value={giftMessage} onChange={e => setGiftMessage(e.target.value)} className="h-9 text-xs" />
                        <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                          {AVAILABLE_GIFTS.map(g => (
                            <button key={g.id} onClick={() => handleSendGift(g)} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-muted transition-colors group">
                              <g.icon className={cn("w-6 h-6", g.color)} />
                              <span className="text-[8px] font-bold uppercase truncate w-full text-center">{g.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2 p-3 bg-muted/20 rounded-2xl min-h-[60px]">
                      {receivedGifts?.filter(g => !g.isSold).map(g => {
                        const giftInfo = AVAILABLE_GIFTS.find(ag => ag.id === g.giftType);
                        const Icon = giftInfo?.icon || Gift;
                        return (
                          <div key={g.id} className="relative p-2 rounded-xl bg-muted/30 border border-white/5 flex flex-col items-center gap-1">
                            <Icon className={cn("w-6 h-6", giftInfo?.color)} />
                            <span className="text-[7px] font-bold text-center truncate w-full">{giftInfo?.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Sparkles className="w-3 h-3" /> AI Summary</h3>
                  <div className="bg-muted/30 p-4 rounded-xl border border-border">
                    {summary ? <p className="text-sm italic">{summary}</p> : <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleSummarize} disabled={isSummarizing}>Краткий обзор чата</Button>}
                  </div>
                </div>

                <div className="pt-4 pb-12 space-y-2">
                  {!isPrivate && (
                    <Button variant="outline" className="w-full h-11 rounded-xl gap-2 font-bold" onClick={handleLeaveChat}>
                      <LogOut className="w-4 h-4" /> Покинуть группу
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10" onClick={() => {
                    if (confirm('Удалить чат?')) {
                      deleteDocumentNonBlocking(doc(db, 'chats', chat.id));
                      setCurrentChatId(null);
                      onOpenChange(false);
                    }
                  }}>Удалить чат</Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="members" className="flex-1 min-h-0 m-0 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Участники: {chat.participantIds?.length}</span>
              {!isPrivate && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1 font-bold" onClick={() => setIsAddMemberOpen(true)}>
                  <UserPlus className="w-3.5 h-3.5" /> Добавить
                </Button>
              )}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {chat.participantIds?.map((pid: string) => (
                  <MemberRow 
                    key={pid} 
                    userId={pid} 
                    ownerId={chat.ownerId} 
                    adminIds={chat.adminIds || []}
                    isOwner={isOwner}
                    onToggleAdmin={handleToggleAdmin}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {isChatAdmin && !isPrivate && (
            <TabsContent value="manage" className="flex-1 min-h-0 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6 pb-24">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Название {chat.type === 'group' ? 'группы' : 'канала'}</Label>
                      <Input 
                        value={editForm.name} 
                        onChange={e => setEditForm({...editForm, name: e.target.value})} 
                        className="bg-muted/30 border-white/5 h-12 rounded-2xl" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Никнейм сообщества</Label>
                      <Input 
                        value={editForm.username} 
                        onChange={e => setEditForm({...editForm, username: e.target.value})} 
                        className="bg-muted/30 border-white/5 h-12 rounded-2xl" 
                        placeholder="@channel_id"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Описание</Label>
                      <Textarea 
                        value={editForm.description} 
                        onChange={e => setEditForm({...editForm, description: e.target.value})} 
                        className="bg-muted/30 border-white/5 rounded-2xl min-h-[100px]" 
                        placeholder="О чем ваше сообщество?"
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full h-12 rounded-2xl font-bold bg-primary shadow-lg shadow-primary/20" 
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                  >
                    {isSaving ? "Сохранение..." : "Сохранить изменения"}
                  </Button>
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
    <AddMemberModal 
      open={isAddMemberOpen} 
      onOpenChange={setIsAddMemberOpen} 
      chatId={chat.id} 
      currentParticipantIds={chat.participantIds || []} 
    />
    </>
  );
}

function MemberRow({ userId, ownerId, adminIds, isOwner, onToggleAdmin }: { 
  userId: string, 
  ownerId: string, 
  adminIds: string[],
  isOwner: boolean,
  onToggleAdmin: (uid: string, isAdmin: boolean) => void
}) {
  const db = useFirestore();
  const userRef = useMemoFirebase(() => (!db ? null : doc(db, 'users', userId)), [db, userId]);
  const { data: m } = useDoc<User>(userRef);
  
  const isTargetAdmin = adminIds.includes(userId);
  const isTargetOwner = userId === ownerId;

  if (!m) return null;
  
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3">
        <UserAvatar userId={m.id} className="h-10 w-10" fallbackName={m.name} />
        <div className="flex flex-col text-left">
          <span className="text-sm font-semibold flex items-center gap-1">
            {formatDisplayName(m.name)} 
            {isUserPremium(m) && <Star className="w-3 h-3 text-accent fill-accent" />}
            {isTargetOwner ? <Crown className="w-3 h-3 text-primary" /> : isTargetAdmin && <Shield className="w-3 h-3 text-primary" />}
          </span>
          <span className="text-[10px] text-muted-foreground">{m.username}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        {isOwner && !isTargetOwner && (
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-8 w-8", isTargetAdmin ? "text-primary" : "text-muted-foreground")}
            onClick={() => onToggleAdmin(userId, !isTargetAdmin)}
          >
            {isTargetAdmin ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
