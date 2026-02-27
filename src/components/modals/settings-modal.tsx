
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
  ShieldCheck, Lock, Eye, Users, MessageCircle, Crown, Settings2, Check, Wand2, Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where, limit, getDocs, addDoc } from 'firebase/firestore';
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
      setShowStore(true);
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
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-3xl border-border/40 p-0 overflow-hidden h-[90vh] flex flex-col rounded-3xl">
          <DialogHeader className="p-4 border-b border-border/20 bg-muted/30 shrink-0 relative">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Settings2 className="w-5 h-5 text-primary" />
              <span>{showStore ? 'Магазин Nuxus' : 'Настройки'}</span>
            </DialogTitle>
            <div className="absolute right-12 top-4">
               <Button variant="ghost" size="sm" onClick={() => setShowStore(!showStore)} className="h-8 rounded-full gap-2">
                 {showStore ? <UserIcon className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4 text-accent" />}
                 <span className="text-xs font-bold">{showStore ? 'Профиль' : 'Магазин'}</span>
               </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              {showStore ? (
                <div className="p-6 space-y-8 pb-12">
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
                            <span className="text-[10px] text-muted-foreground">Эксклюзивные функции</span>
                          </div>
                          <span className="font-black text-primary">{plan.price} ₽</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  {/* Профиль шапка */}
                  <div className="flex flex-col items-center gap-4 py-8 bg-gradient-to-b from-primary/10 to-transparent relative">
                    <div className="absolute inset-0 nuxus-core-glow -z-10 animate-pulse-glow" />
                    <div className="relative group">
                      <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-background shadow-2xl" fallbackName={form.name} />
                      <button 
                        onClick={handleGenerateAiAvatar}
                        disabled={isGeneratingAvatar}
                        className="absolute bottom-0 right-0 bg-primary p-2 rounded-2xl border-4 border-background shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                        title="Сгенерировать AI аватар"
                      >
                        {isGeneratingAvatar ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Wand2 className="w-5 h-5 text-white" />}
                      </button>
                    </div>
                    <div className="text-center px-4">
                      <h3 className="font-bold text-2xl flex items-center justify-center gap-2">
                        {form.name || 'Пользователь'}
                        {isPremium && <Crown className="w-5 h-5 text-accent" />}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono tracking-widest">{form.username}</p>
                    </div>
                  </div>

                  <div className="p-4 space-y-8">
                    {/* Личные данные */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-primary" /> Профиль
                      </h4>
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
                          <Label className="text-xs text-muted-foreground ml-1">Био</Label>
                          <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-muted/30 border-none rounded-xl resize-none h-24" placeholder="Кратко о себе..." />
                        </div>
                      </div>
                    </div>

                    {/* Premium карточка */}
                    <div className="p-5 rounded-[1.5rem] bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 cursor-pointer group hover:border-primary/40 transition-all shadow-xl shadow-primary/5" onClick={() => setShowStore(true)}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Crown className={cn("w-6 h-6", isPremium ? "text-accent" : "text-primary")} />
                          <span className="font-bold text-base">Nuxus Premium</span>
                        </div>
                        {isPremium ? (
                          <div className="bg-accent/20 px-3 py-1 rounded-full text-accent text-[10px] font-bold uppercase">Активен</div>
                        ) : (
                          <div className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] bg-primary/10 px-3 py-1 rounded-full">Boost</div>
                        )}
                      </div>
                      {!isPremium && <p className="text-[11px] text-muted-foreground/80 leading-relaxed mb-4">AI аватары, озвучка сообщений, эксклюзивные темы и мгновенные реакции.</p>}
                      {!isPremium && <Button variant="default" className="w-full h-10 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90">Разблокировать функции</Button>}
                    </div>

                    {/* Оформление */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Оформление</h4>
                      <div className="grid grid-cols-2 gap-4">
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

                    {/* Конфиденциальность */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Конфиденциальность</h4>
                      <div className="space-y-4 bg-muted/20 p-5 rounded-[1.5rem] border border-border/20">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] flex items-center gap-2 text-muted-foreground"><Eye className="w-3 h-3" /> Кто видит мой номер</Label>
                          <Select value={form.phoneVisibility} onValueChange={(val) => setForm({...form, phoneVisibility: val as any})}>
                            <SelectTrigger className="bg-background/50 border-none rounded-xl h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="everybody">Все</SelectItem>
                              <SelectItem value="contacts">Контакты</SelectItem>
                              <SelectItem value="nobody">Никто</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] flex items-center gap-2 text-muted-foreground"><ShieldCheck className="w-3 h-3" /> Последний вход</Label>
                          <Select value={form.lastSeenVisibility} onValueChange={(val) => setForm({...form, lastSeenVisibility: val as any})}>
                            <SelectTrigger className="bg-background/50 border-none rounded-xl h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="everybody">Все</SelectItem>
                              <SelectItem value="nobody">Никто (был недавно)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] flex items-center gap-2 text-muted-foreground"><Users className="w-3 h-3" /> Кто может добавить в группы</Label>
                          <Select value={form.allowGroupsFrom} onValueChange={(val) => setForm({...form, allowGroupsFrom: val as any})}>
                            <SelectTrigger className="bg-background/50 border-none rounded-xl h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="everybody">Все</SelectItem>
                              <SelectItem value="contacts">Контакты</SelectItem>
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

                    <div className="pt-4 pb-12">
                      <Button variant="ghost" className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/10 justify-start gap-3" onClick={() => signOut(auth)}>
                        <LogOut className="w-5 h-5" /> <span className="font-bold">Выход из системы</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>

          {!showStore && (
            <div className="p-4 border-t border-border/20 bg-muted/20 shrink-0">
              <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20" onClick={handleSave}>
                <Check className="w-5 h-5 mr-2" /> Применить ядро
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingPayment} onOpenChange={(val) => !val && setPendingPayment(null)}>
        <DialogContent className="max-w-sm bg-card/98 backdrop-blur-3xl border-primary/20 p-0 overflow-hidden rounded-[2.5rem]">
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
