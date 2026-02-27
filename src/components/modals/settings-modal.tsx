
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  LogOut, User as UserIcon, Palette, Loader2, ShoppingBag, CreditCard, Copy, Info, Type, Hexagon,
  ShieldCheck, Lock, Eye, Users, MessageCircle, Crown, Settings2, Check, Wand2, Sparkles, UserX, UserCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where, limit, getDocs, addDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDisplayName, isUserPremium, cn } from '@/lib/utils';
import { generateAiAvatar } from '@/ai/flows/generate-ai-avatar-flow';
import type { User } from '@/lib/types';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BACKGROUNDS = [
  { name: 'Стандарт', value: 'default' },
  { name: 'Ночной город', value: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&q=80&w=800' },
  { name: 'Минимализм', value: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800' },
  { name: 'Абстракция', value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800' },
  { name: 'Горы', value: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800' },
];

const PREMIUM_PLANS = [
  { id: '1m', name: '1 Месяц', price: 200, unit: 'months', amount: 1 },
  { id: '3m', name: '3 Месяца', price: 500, unit: 'months', amount: 3 },
  { id: '6m', name: '6 Месяцев', price: 900, unit: 'months', amount: 6 },
  { id: '1y', name: '1 Год', price: 1500, unit: 'years', amount: 1 },
  { id: '2y', name: '2 Года', price: 2500, unit: 'years', amount: 2 },
];

const CARD_NUMBER = "2204 1202 0495 4230";
const ADMIN_PHONE = '+79513332147';
const ADMIN_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isInitialized = useRef(false);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);
  const isPremium = isUserPremium(profile);

  const [form, setForm] = useState({
    name: '',
    username: '',
    bio: '',
    avatarUrl: '',
    chatBackground: 'default',
    messageSize: 'medium',
    phoneVisibility: 'nobody',
    lastSeenVisibility: 'everybody',
    allowGroupsFrom: 'everybody',
    whoCanMessageMe: 'everybody',
    showPreview: true,
    sounds: true,
  });

  const [showStore, setShowStore] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'store'>('profile');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{ type: 'premium', item: any } | null>(null);

  useEffect(() => {
    if (profile && (!isInitialized.current || !open)) {
      setForm({
        name: profile.name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || '',
        chatBackground: profile.settings?.chatBackground || 'default',
        messageSize: profile.settings?.messageSize || 'medium',
        phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'nobody',
        lastSeenVisibility: profile.settings?.privacy?.lastSeenVisibility || 'everybody',
        allowGroupsFrom: profile.settings?.privacy?.allowGroupsFrom || 'everybody',
        whoCanMessageMe: profile.settings?.privacy?.whoCanMessageMe || 'everybody',
        showPreview: profile.settings?.notifications?.showPreview ?? true,
        sounds: profile.settings?.notifications?.sounds ?? true,
      });
      if (open) isInitialized.current = true;
    }
  }, [profile, open]);

  const handleSave = () => {
    if (!userRef) return;
    updateDocumentNonBlocking(userRef, {
      name: form.name,
      username: form.username.startsWith('@') ? form.username.toLowerCase() : '@' + form.username.toLowerCase(),
      bio: form.bio,
      avatarUrl: form.avatarUrl,
      settings: {
        ...profile?.settings,
        chatBackground: form.chatBackground,
        messageSize: form.messageSize,
        notifications: {
          ...profile?.settings?.notifications,
          showPreview: form.showPreview,
          sounds: form.sounds,
        },
        privacy: {
          ...profile?.settings?.privacy,
          phoneVisibility: form.phoneVisibility,
          lastSeenVisibility: form.lastSeenVisibility,
          allowGroupsFrom: form.allowGroupsFrom,
          whoCanMessageMe: form.whoCanMessageMe,
        }
      }
    });
    onOpenChange(false);
    toast({ title: "Настройки сохранены" });
  };

  const handleGenerateAiAvatar = async () => {
    if (!isPremium) {
      toast({ title: "Только для Premium", description: "Генерация AI аватаров доступна только владельцам Premium!" });
      setActiveTab('store');
      return;
    }
    setIsGeneratingAvatar(true);
    try {
      const { imageUrl } = await generateAiAvatar();
      setForm({ ...form, avatarUrl: imageUrl });
      toast({ title: "Успех", description: "Новый аватар сгенерирован! Не забудьте сохранить изменения." });
    } catch (e) {
      toast({ title: "Ошибка", description: "Не удалось сгенерировать аватар.", variant: "destructive" });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!pendingPayment || !db || !user || !profile || isSubmittingPayment) return;
    setIsSubmittingPayment(true);

    try {
      let adminId = ADMIN_UID;
      const adminQuery = query(collection(db, 'users'), where('phone', '==', ADMIN_PHONE), limit(1));
      const adminSnap = await getDocs(adminQuery);
      if (!adminSnap.empty) adminId = adminSnap.docs[0].id;

      const chatQuery = query(
        collection(db, 'chats'),
        where('participantIds', 'array-contains', user.uid),
        where('username', '==', '@nuxus_bot')
      );
      const chatSnap = await getDocs(chatQuery);
      
      let adminChatId;
      if (chatSnap.empty) {
        const newChatRef = await addDoc(collection(db, 'chats'), {
          type: 'private',
          name: 'Nuxus Support',
          username: '@nuxus_bot',
          ownerId: adminId,
          participantIds: [user.uid, adminId],
          adminIds: [user.uid, adminId],
          createdAt: new Date().toISOString()
        });
        adminChatId = newChatRef.id;
      } else {
        adminChatId = chatSnap.docs[0].id;
      }

      const itemName = `Подписка Premium: ${pendingPayment.item.name}`;
      await addDoc(collection(db, 'chats', adminChatId, 'messages'), {
        chatId: adminChatId,
        senderId: 'nuxus_bot',
        senderName: 'Nuxus',
        content: `📦 Заявка на оплату: ${itemName}`,
        contentType: 'payment_request',
        sentAt: new Date().toISOString(),
        isRead: false,
        paymentData: {
          type: pendingPayment.type,
          itemName,
          targetUserId: user.uid,
          targetUserName: profile.name,
          targetUserUsername: profile.username,
          amount: pendingPayment.item.amount || null,
          unit: pendingPayment.item.unit || null,
          price: pendingPayment.item.price,
          status: 'pending'
        }
      });

      toast({ title: "Заявка отправлена", description: "Ожидайте подтверждения в чате Nuxus." });
      setPendingPayment(null);
    } catch (e) {
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden h-[90vh] flex flex-col rounded-3xl">
          <DialogHeader className="p-4 border-b border-border bg-muted/30 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Settings2 className="w-5 h-5 text-primary" />
              <span>Настройки</span>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-3 bg-muted/50 p-1 mx-4 mt-4 rounded-xl">
              <TabsTrigger value="profile">Профиль</TabsTrigger>
              <TabsTrigger value="privacy">Защита</TabsTrigger>
              <TabsTrigger value="store">Premium</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <TabsContent value="profile" className="p-6 space-y-6 m-0">
                  <div className="flex flex-col items-center gap-4 py-4 relative">
                    <div className="relative group">
                      <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-background shadow-2xl" fallbackName={form.name} />
                      <button 
                        onClick={handleGenerateAiAvatar}
                        disabled={isGeneratingAvatar}
                        className="absolute bottom-0 right-0 bg-primary p-2 rounded-2xl border-4 border-background shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                      >
                        {isGeneratingAvatar ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Wand2 className="w-5 h-5 text-white" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground ml-1">Имя</Label>
                      <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-muted/30 border-none h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground ml-1">Никнейм</Label>
                      <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-muted/30 border-none h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground ml-1">О себе</Label>
                      <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-muted/30 border-none rounded-xl resize-none h-24" placeholder="Напишите немного о себе..." />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-2"><Type className="w-3 h-3" /> Текст</Label>
                        <Select value={form.messageSize} onValueChange={(val) => setForm({...form, messageSize: val as any})}>
                          <SelectTrigger className="bg-background/50 border-none rounded-xl h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Мелкий</SelectItem>
                            <SelectItem value="medium">Средний</SelectItem>
                            <SelectItem value="large">Крупный</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-2"><Palette className="w-3 h-3" /> Обои</Label>
                        <Select value={form.chatBackground} onValueChange={(val) => setForm({...form, chatBackground: val})}>
                          <SelectTrigger className="bg-background/50 border-none rounded-xl h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {BACKGROUNDS.map(bg => <SelectItem key={bg.value} value={bg.value}>{bg.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="privacy" className="p-6 space-y-6 m-0">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Приватность</h4>
                    <div className="space-y-4 bg-muted/20 p-5 rounded-2xl border border-border/20">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] flex items-center gap-2 text-muted-foreground"><Eye className="w-3 h-3" /> Номер телефона</Label>
                        <Select value={form.phoneVisibility} onValueChange={(val) => setForm({...form, phoneVisibility: val as any})}>
                          <SelectTrigger className="bg-background/50 border-none rounded-xl h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="everybody">Все</SelectItem>
                            <SelectItem value="contacts">Мои контакты</SelectItem>
                            <SelectItem value="nobody">Никто</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] flex items-center gap-2 text-muted-foreground"><ShieldCheck className="w-3 h-3" /> Последняя активность</Label>
                        <Select value={form.lastSeenVisibility} onValueChange={(val) => setForm({...form, lastSeenVisibility: val as any})}>
                          <SelectTrigger className="bg-background/50 border-none rounded-xl h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="everybody">Все</SelectItem>
                            <SelectItem value="nobody">Никто</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] flex items-center gap-2 text-muted-foreground"><Users className="w-3 h-3" /> Добавление в группы</Label>
                        <Select value={form.allowGroupsFrom} onValueChange={(val) => setForm({...form, allowGroupsFrom: val as any})}>
                          <SelectTrigger className="bg-background/50 border-none rounded-xl h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="everybody">Все</SelectItem>
                            <SelectItem value="contacts">Мои контакты</SelectItem>
                            <SelectItem value="nobody">Никто</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] flex items-center gap-2 text-muted-foreground"><MessageCircle className="w-3 h-3" /> Кто может мне писать</Label>
                        <Select value={form.whoCanMessageMe} onValueChange={(val) => setForm({...form, whoCanMessageMe: val as any})}>
                          <SelectTrigger className="bg-background/50 border-none rounded-xl h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="everybody">Все</SelectItem>
                            <SelectItem value="premium">Только Premium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {profile?.blockedUserIds && profile.blockedUserIds.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Заблокированные пользователи</h4>
                      <div className="bg-muted/20 p-2 rounded-2xl border border-border/20 space-y-1">
                        {profile.blockedUserIds.map(bid => (
                          <div key={bid} className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-lg">
                            <span className="text-xs">Пользователь {bid.slice(0, 8)}...</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => updateDocumentNonBlocking(userRef!, { blockedUserIds: arrayRemove(bid) })}>
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="store" className="p-6 space-y-8 m-0">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                      <Crown className="w-5 h-5" /> Nuxus Premium
                    </h3>
                    <div className="space-y-3">
                      {PREMIUM_PLANS.map(plan => (
                        <Button 
                          key={plan.id} 
                          variant="outline" 
                          className="w-full h-14 rounded-2xl flex items-center justify-between px-6 border-primary/20 hover:bg-primary/10"
                          onClick={() => setPendingPayment({ type: 'premium', item: plan })}
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-bold">{plan.name}</span>
                            <span className="text-[10px] text-muted-foreground">Эксклюзивные функции Nuxus</span>
                          </div>
                          <span className="font-black text-primary">{plan.price} ₽</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </div>
          </Tabs>

          <div className="p-4 border-t border-border/20 bg-muted/20 shrink-0 flex gap-2">
            <Button variant="ghost" className="flex-1 h-12 rounded-xl text-destructive hover:bg-destructive/10 justify-start gap-3" onClick={() => signOut(auth)}>
              <LogOut className="w-5 h-5" /> <span className="font-bold">Выход</span>
            </Button>
            {activeTab !== 'store' && (
              <Button className="flex-[2] h-12 rounded-xl font-bold uppercase tracking-widest bg-primary hover:bg-primary/90" onClick={handleSave}>
                <Check className="w-5 h-5 mr-2" /> Сохранить
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingPayment} onOpenChange={(val) => !val && setPendingPayment(null)}>
        <DialogContent className="max-w-sm bg-card border-primary/20 p-0 overflow-hidden rounded-[2.5rem]">
          <DialogHeader className="p-6 bg-primary/10 border-b border-white/5">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <CreditCard className="w-6 h-6 text-primary" /> Оплата заказа
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="bg-background/50 p-5 rounded-3xl border border-white/5 shadow-inner">
              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Реквизиты платежа</span>
              <div className="text-lg font-mono font-bold text-white tracking-[0.1em] flex items-center justify-between mt-2">
                {CARD_NUMBER}
                <Button variant="ghost" size="icon" className="rounded-lg hover:bg-white/10" onClick={() => { navigator.clipboard.writeText(CARD_NUMBER.replace(/\s/g, '')); toast({ title: "Копировано" }); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-2xl border border-white/5">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed">Пожалуйста, переведите <span className="text-white font-bold">{pendingPayment?.item.price} ₽</span> по указанному номеру карты, затем нажмите кнопку подтверждения.</p>
              </div>
              <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg" onClick={handleConfirmPayment} disabled={isSubmittingPayment}>
                {isSubmittingPayment && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Я оплатил(а)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
