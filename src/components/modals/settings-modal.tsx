
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
  LogOut, User as UserIcon, LayoutGrid, Palette, Loader2, Sparkles, Wand2, AtSign, Settings2, Check, 
  ShieldCheck, Lock, UserX, Crown, Bell, ShoppingBag, CreditCard, Copy, Info, Type
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where, limit, getDocs, addDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { generateAiAvatar } from '@/ai/flows/generate-ai-avatar-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDisplayName, isUserPremium, cn } from '@/lib/utils';
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
  const avatarInputRef = useRef<HTMLInputElement>(null);
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

  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
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
          name: 'Nuxus',
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
        content: `📦 Пользователь оплатил: ${itemName}`,
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
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-border/40 p-0 overflow-hidden h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl">
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
                      <Crown className="w-5 h-5" /> Подписки Nuxus Premium
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
                    <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-28 w-28 border-4 border-background" fallbackName={form.name} />
                    <div className="text-center px-4">
                      <h3 className="font-bold text-xl flex items-center justify-center gap-2">{form.name || 'Пользователь'}</h3>
                      <p className="text-sm text-muted-foreground">{form.username}</p>
                    </div>
                  </div>

                  <div className="p-4 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Имя</Label>
                        <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-muted/30 border-none h-11 rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Никнейм</Label>
                        <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-muted/30 border-none h-11 rounded-xl" />
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 cursor-pointer" onClick={() => setShowStore(true)}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Crown className={cn("w-5 h-5", isPremium ? "text-accent" : "text-muted-foreground")} />
                          <span className="font-bold text-sm">Nuxus Premium</span>
                        </div>
                        {isPremium && <Check className="text-accent w-5 h-5" />}
                      </div>
                      {!isPremium && <Button variant="outline" className="w-full h-9 rounded-xl text-xs font-bold">Купить подписку</Button>}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-2"><Type className="w-3 h-3" /> Размер текста</Label>
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
                        <Label className="text-xs">Фон чатов</Label>
                        <Select value={form.chatBackground} onValueChange={(val) => setForm({...form, chatBackground: val})}>
                          <SelectTrigger className="bg-background/50 border-none rounded-xl h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {BACKGROUNDS.map(bg => <SelectItem key={bg.value} value={bg.value}>{bg.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="pt-4 pb-12">
                      <Button variant="ghost" className="w-full h-11 rounded-xl text-destructive hover:bg-destructive/10 justify-start gap-3" onClick={() => signOut(auth)}>
                        <LogOut className="w-5 h-5" /> <span className="font-bold">Выйти</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>

          {!showStore && (
            <div className="p-4 border-t border-border/20 bg-muted/20">
              <Button className="w-full h-12 rounded-xl font-bold" onClick={handleSave}><Check className="w-5 h-5 mr-2" /> Применить</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingPayment} onOpenChange={(val) => !val && setPendingPayment(null)}>
        <DialogContent className="max-w-sm bg-card/98 backdrop-blur-2xl border-primary/20 p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="p-6 bg-primary/10 border-b border-white/5">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <CreditCard className="w-6 h-6 text-primary" /> Оплата заказа
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="bg-background/50 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Реквизиты (ЮMoney)</span>
              <div className="text-lg font-mono font-bold text-white tracking-wider flex items-center justify-between mt-1">
                {CARD_NUMBER}
                <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(CARD_NUMBER.replace(/\s/g, '')); toast({ title: "Копировано" }); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">После перевода {pendingPayment?.item.price} ₽ нажмите кнопку ниже для подтверждения.</p>
              </div>
              <Button className="w-full h-12 rounded-xl font-bold" onClick={handleConfirmPayment} disabled={isSubmittingPayment}>
                {isSubmittingPayment && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Я оплатил(а)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
