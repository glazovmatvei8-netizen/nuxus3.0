
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
  LogOut, User as UserIcon, LayoutGrid, Palette, Loader2, Sparkles, Wand2, AtSign, Settings2, Check, 
  ShieldCheck, Lock, UserX, Star, Crown, Bell, ShoppingBag, Coins, CreditCard, Copy, Info, Type, XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where, limit, getDocs, addDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { generateAiAvatar } from '@/ai/flows/generate-ai-avatar-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDisplayName, isUserPremium, cn } from '@/lib/utils';
import type { User, Chat } from '@/lib/types';

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
  { id: '6m', name: '6 Месяцев', price: 1700, unit: 'months', amount: 6 },
  { id: '1y', name: '1 Год', price: 2000, unit: 'years', amount: 1 },
  { id: '2y', name: '2 Года', price: 2200, unit: 'years', amount: 2 },
];

const STAR_PACKS = [
  { id: '50s', stars: 50, price: 50 },
  { id: '100s', stars: 100, price: 100 },
  { id: '500s', stars: 500, price: 500 },
  { id: '1000s', stars: 1000, price: 1000 },
  { id: '5000s', stars: 5000, price: 5000 },
];

const CARD_NUMBER = "2202 2024 2025 2026";
const ADMIN_PHONE = '+79513332147';
const ADMIN_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const isInitialized = useRef(false);

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

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

  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
    type: 'premium' | 'stars';
    item: any;
  } | null>(null);

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

  const handleConfirmPayment = async () => {
    if (!pendingPayment || !db || !user || !profile || isSubmittingPayment) return;
    setIsSubmittingPayment(true);

    try {
      // 1. Пытаемся найти админа по номеру или используем UID
      let adminId = ADMIN_UID;
      const adminQuery = query(collection(db, 'users'), where('phone', '==', ADMIN_PHONE), limit(1));
      const adminSnap = await getDocs(adminQuery);
      
      if (!adminSnap.empty) {
        adminId = adminSnap.docs[0].id;
      }

      // 2. Ищем или создаем чат с админом для уведомлений
      const chatQuery = query(
        collection(db, 'chats'),
        where('type', '==', 'private'),
        where('participantIds', 'array-contains', user.uid)
      );
      const chatSnap = await getDocs(chatQuery);
      let adminChat = chatSnap.docs.find(d => {
        const participants = d.data().participantIds || [];
        return participants.includes(adminId) && participants.includes(user.uid);
      });

      let adminChatId;
      if (!adminChat) {
        const newChatData = {
          type: 'private',
          name: 'Nuxus System',
          username: '@nuxus_system',
          ownerId: adminId,
          participantIds: Array.from(new Set([user.uid, adminId])),
          adminIds: [user.uid, adminId],
          createdAt: new Date().toISOString(),
          metadata: {
            [user.uid]: { name: profile.name, username: profile.username, avatarUrl: profile.avatarUrl || null },
            [adminId]: { name: 'Nuxus', username: '@nuxus_admin', avatarUrl: null }
          }
        };
        const newChatRef = await addDoc(collection(db, 'chats'), newChatData);
        adminChatId = newChatRef.id;
      } else {
        adminChatId = adminChat.id;
      }

      // 3. Отправляем структурированное сообщение о запросе оплаты
      const itemName = pendingPayment.type === 'premium' ? `Подписка Premium: ${pendingPayment.item.name}` : `Пакет звезд: ${pendingPayment.item.stars} ⭐`;
      
      const messagesCol = collection(db, 'chats', adminChatId, 'messages');
      await addDoc(messagesCol, {
        chatId: adminChatId,
        senderId: 'system',
        senderName: 'Nuxus',
        content: `Пользователь оплатил: ${itemName}`,
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
          stars: pendingPayment.item.stars || null,
          price: pendingPayment.item.price,
          status: 'pending'
        }
      });

      toast({ 
        title: "Заявка отправлена", 
        description: "Ваш платеж передан на проверку администратору. Ожидайте подтверждения." 
      });
      setPendingPayment(null);
    } catch (e: any) {
      console.error("Payment confirmation error:", e);
      toast({ title: "Ошибка", description: "Не удалось отправить запрос. Попробуйте позже.", variant: "destructive" });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleCopyCard = () => {
    navigator.clipboard.writeText(CARD_NUMBER.replace(/\s/g, ''));
    toast({ title: "Номер карты скопирован" });
  };

  const handleLogout = async () => {
    await signOut(auth);
    onOpenChange(false);
  };

  const handleGenerateAiAvatar = async () => {
    setIsGeneratingAvatar(true);
    try {
      const result = await generateAiAvatar();
      setForm(prev => ({ ...prev, avatarUrl: result.imageUrl }));
      toast({ title: "AI-аватар создан. Не забудьте сохранить!" });
    } catch (e) {
      toast({ title: "Ошибка генерации аватара", variant: "destructive" });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-border/40 p-0 overflow-hidden h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl shadow-2xl">
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
                    <h3 className="text-lg font-bold flex items-center gap-2 text-accent">
                      <Coins className="w-5 h-5" /> Купить Звезды (1₽ = 1⭐)
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {STAR_PACKS.map(pack => (
                        <Button 
                          key={pack.id} 
                          variant="outline" 
                          className="h-16 rounded-2xl flex flex-col items-center justify-center border-accent/20 hover:bg-accent/10 transition-all"
                          onClick={() => setPendingPayment({ type: 'stars', item: pack })}
                        >
                          <span className="text-sm font-black text-accent">{pack.stars} ⭐</span>
                          <span className="text-[10px] text-muted-foreground">{pack.price} ₽</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                      <Crown className="w-5 h-5" /> Подписки Nuxus Premium
                    </h3>
                    <div className="space-y-3">
                      {PREMIUM_PLANS.map(plan => (
                        <Button 
                          key={plan.id} 
                          variant="outline" 
                          className="w-full h-14 rounded-2xl flex items-center justify-between px-6 border-primary/20 hover:bg-primary/10 transition-all"
                          onClick={() => setPendingPayment({ type: 'premium', item: plan })}
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-bold">{plan.name}</span>
                            <span className="text-[10px] text-muted-foreground">Полный доступ</span>
                          </div>
                          <span className="font-black text-primary">{plan.price} ₽</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="flex flex-col items-center gap-4 py-6 bg-gradient-to-b from-primary/10 to-transparent">
                    <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                      <UserAvatar 
                        userId={user?.uid} 
                        manualAvatarUrl={form.avatarUrl}
                        className="h-28 w-28 border-4 border-background shadow-2xl" 
                        fallbackName={form.name}
                      />
                      <div className="absolute bottom-1 right-1 bg-primary p-2 rounded-full border-2 border-background shadow-lg group-hover:scale-110 transition-transform">
                        <LayoutGrid className="w-4 h-4 text-white" />
                      </div>
                      <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const r = new FileReader();
                          r.onloadend = () => setForm(prev => ({ ...prev, avatarUrl: r.result as string }));
                          r.readAsDataURL(f);
                        }
                      }} />
                    </div>
                    <div className="text-center px-4">
                      <h3 className="font-bold text-xl leading-tight flex items-center justify-center gap-2">
                        {formatDisplayName(form.name) || 'Без имени'}
                        {isPremium && <Star className="w-5 h-5 text-accent fill-accent" />}
                      </h3>
                      <p className="text-sm text-muted-foreground">{form.username || '@username'}</p>
                      <div className="mt-2 flex items-center justify-center gap-1 bg-accent/20 px-3 py-1 rounded-full">
                        <Coins className="w-3 h-3 text-accent" />
                        <span className="text-xs font-black text-accent">{profile?.stars || 0} звезд</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                        <UserIcon className="w-4 h-4" /> Аккаунт
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground ml-1">Имя</Label>
                          <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-muted/30 border-none h-11 rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground ml-1">Никнейм</Label>
                          <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-muted/30 border-none h-11 rounded-xl pl-9" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground ml-1">О себе</Label>
                          <Textarea 
                            value={form.bio} 
                            onChange={e => setForm({...form, bio: e.target.value})} 
                            placeholder="Напишите что-нибудь о себе..."
                            className="bg-muted/30 border-none rounded-xl min-h-[80px] resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer",
                      isPremium ? "bg-gradient-to-br from-purple-500/20 via-accent/10 to-primary/10 border-purple-500/30" : "bg-muted/30 border-border/40"
                    )} onClick={() => setShowStore(true)}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Crown className={cn("w-5 h-5", isPremium ? "text-accent" : "text-muted-foreground")} />
                          <span className="font-bold text-sm">Nuxus Premium</span>
                        </div>
                        {isPremium ? <Check className="text-accent w-5 h-5" /> : <Lock className="text-muted-foreground w-4 h-4" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-4">
                        {isPremium 
                          ? "Все возможности Nuxus Premium доступны в вашем профиле." 
                          : "Получите уникальные реакции, расшифровку голоса и другие возможности."}
                      </p>
                      {!isPremium && (
                        <Button variant="outline" className="w-full h-9 rounded-xl text-xs font-bold border-primary/20 hover:bg-primary/10">
                          Купить подписку
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted/20 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Bell className="w-5 h-5 text-primary" />
                          <span className="text-sm font-medium">Уведомления и звуки</span>
                        </div>
                        <Switch checked={form.sounds} onCheckedChange={(val) => setForm({...form, sounds: val})} />
                      </div>

                      <div className="space-y-2 p-4 bg-muted/20 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldCheck className="w-4 h-4 text-accent" />
                          <span className="text-xs font-bold text-muted-foreground uppercase">Конфиденциальность</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Номер телефона</span>
                            <span className="text-xs text-primary font-medium">{form.phoneVisibility === 'nobody' ? 'Никто' : 'Все'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Последняя активность</span>
                            <span className="text-xs text-primary font-medium">{form.lastSeenVisibility === 'everybody' ? 'Все' : 'Никто'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Кто может мне писать</span>
                              {!isPremium && <Lock className="w-3 h-3 text-muted-foreground" />}
                            </div>
                            <Select disabled={!isPremium} value={form.whoCanMessageMe} onValueChange={(val) => setForm({...form, whoCanMessageMe: val as any})}>
                              <SelectTrigger className={cn("w-28 h-8 text-[10px] bg-background/50 border-none rounded-lg", !isPremium && "opacity-50")}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="everybody">Все</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 p-4 bg-muted/20 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Palette className="w-4 h-4 text-accent" />
                          <span className="text-xs font-bold text-muted-foreground uppercase">Настройки чатов</span>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs flex items-center gap-2"><Type className="w-3 h-3" /> Размер текста</Label>
                            <Select value={form.messageSize} onValueChange={(val) => setForm({...form, messageSize: val as any})}>
                              <SelectTrigger className="bg-background/50 border-none rounded-xl h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Мелкий</SelectItem>
                                <SelectItem value="medium">Средний</SelectItem>
                                <SelectItem value="large">Крупный</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Фон чатов</Label>
                            <Select value={form.chatBackground} onValueChange={(val) => setForm({...form, chatBackground: val})}>
                              <SelectTrigger className="bg-background/50 border-none rounded-xl h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {BACKGROUNDS.map(bg => (
                                  <SelectItem key={bg.value} value={bg.value}>{bg.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-3">
                        <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                          <Sparkles className="w-3 h-3" /> AI Лаборатория
                        </div>
                        <Button 
                          variant="ghost" 
                          className="w-full h-10 bg-background/50 rounded-xl text-xs flex items-center justify-between px-4"
                          onClick={handleGenerateAiAvatar}
                          disabled={isGeneratingAvatar}
                        >
                          <div className="flex items-center gap-3">
                            {isGeneratingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-primary" />}
                            <span>Создать AI-аватар</span>
                          </div>
                        </Button>
                      </div>
                    </div>

                    <div className="pt-4 space-y-2 pb-12">
                      <Button 
                        variant="ghost" 
                        className="w-full h-11 rounded-xl text-destructive hover:bg-destructive/10 justify-start gap-3"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-5 h-5" />
                        <span className="font-bold">Выйти</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full h-11 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/5 justify-start gap-3"
                        onClick={() => {
                          if (confirm('Вы уверены? Это действие нельзя отменить.')) {
                            setIsDeleting(true);
                            updateDocumentNonBlocking(userRef!, { isBanned: true, name: 'Удалённый Аккаунт', username: '@deleted' });
                            setTimeout(() => signOut(auth), 1000);
                          }
                        }}
                        disabled={isDeleting}
                      >
                        <UserX className="w-5 h-5" />
                        <span className="font-bold">{isDeleting ? 'Удаление...' : 'Удалить аккаунт'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>

          {!showStore && (
            <div className="p-4 border-t border-border/20 bg-muted/20 shrink-0">
              <Button className="w-full h-12 rounded-xl font-bold shadow-lg" onClick={handleSave}>
                 <Check className="w-5 h-5 mr-2" /> Применить изменения
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingPayment} onOpenChange={(val) => !val && setPendingPayment(null)}>
        <DialogContent className="max-w-sm bg-card/98 backdrop-blur-2xl border-primary/20 p-0 overflow-hidden rounded-3xl shadow-2xl">
          <DialogHeader className="p-6 bg-primary/10 border-b border-white/5">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <CreditCard className="w-6 h-6 text-primary" />
              Оплата заказа
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Для совершения покупки переведите указанную сумму на карту
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="bg-background/50 p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Сумма к оплате</span>
                <div className="text-2xl font-black text-white flex items-baseline gap-1">
                  {pendingPayment?.item.price} <span className="text-sm font-normal text-muted-foreground">₽</span>
                </div>
              </div>

              <div className="bg-background/50 p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Номер карты</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={handleCopyCard}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="text-lg font-mono font-bold text-white tracking-wider">
                  {CARD_NUMBER}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  После перевода нажмите кнопку ниже. Проверка платежа может занять некоторое время.
                </p>
              </div>
              <Button 
                className="w-full h-12 rounded-xl font-bold text-md shadow-lg shadow-primary/20" 
                onClick={handleConfirmPayment}
                disabled={isSubmittingPayment}
              >
                {isSubmittingPayment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Я оплатил(а)
              </Button>
              <Button 
                variant="ghost" 
                className="w-full h-10 rounded-xl text-xs text-muted-foreground" 
                onClick={() => setPendingPayment(null)}
                disabled={isSubmittingPayment}
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
