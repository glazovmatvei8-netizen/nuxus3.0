
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  LogOut, Palette, Loader2, CreditCard, Copy, Info, Type,
  ShieldCheck, Eye, Users, Crown, Settings2, Check, Wand2, HardDrive, Archive
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where, limit, getDocs, addDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ScrollArea } from '@/components/ui/scroll-area';
import { isUserPremium } from '@/lib/utils';
import { generateAiAvatar } from '@/ai/flows/generate-ai-avatar-flow';
import type { User } from '@/lib/types';

const BACKGROUNDS = [
  { name: 'Стандарт', value: 'default' },
  { name: 'Ночной город', value: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&q=80&w=800' },
  { name: 'Минимализм', value: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800' },
  { name: 'Абстракция', value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800' },
];

const PREMIUM_PLANS = [
  { id: '1m', name: '1 Месяц', price: 200, unit: 'months', amount: 1 },
  { id: '3m', name: '3 Месяца', price: 500, unit: 'months', amount: 3 },
  { id: '6m', name: '6 Месяцев', price: 900, unit: 'months', amount: 6 },
  { id: '1y', name: '1 Год', price: 1500, unit: 'years', amount: 1 },
];

const CARD_NUMBER = "2204 1202 0495 4230";
const ADMIN_PHONE = '+79513332147';
const ADMIN_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
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
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<any>(null);

  useEffect(() => {
    if (profile && !isInitialized.current) {
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
      });
      isInitialized.current = true;
    }
  }, [profile]);

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
      toast({ title: "Только для Premium", description: "Нейросети доступны владельцам Premium!" });
      return;
    }
    setIsGeneratingAvatar(true);
    try {
      const { imageUrl } = await generateAiAvatar();
      setForm({ ...form, avatarUrl: imageUrl });
      toast({ title: "Успех", description: "Аватар сгенерирован!" });
    } catch (e) {
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!pendingPayment || !db || !user || isSubmittingPayment) return;
    setIsSubmittingPayment(true);
    try {
      const adminQuery = query(collection(db, 'users'), where('phone', '==', ADMIN_PHONE), limit(1));
      const adminSnap = await getDocs(adminQuery);
      const adminId = adminSnap.empty ? ADMIN_UID : adminSnap.docs[0].id;

      const chatQuery = query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid), where('username', '==', '@nuxus_bot'));
      const chatSnap = await getDocs(chatQuery);
      let chatId = chatSnap.empty ? (await addDoc(collection(db, 'chats'), { type: 'private', name: 'Nuxus Bot', username: '@nuxus_bot', participantIds: [user.uid, adminId], ownerId: adminId, createdAt: new Date().toISOString() })).id : chatSnap.docs[0].id;

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId, senderId: 'nuxus_bot', senderName: 'Nuxus', contentType: 'payment_request', sentAt: new Date().toISOString(),
        paymentData: { type: 'premium', itemName: `Premium: ${pendingPayment.name}`, targetUserId: user.uid, amount: pendingPayment.amount, unit: pendingPayment.unit, price: pendingPayment.price, status: 'pending' }
      });
      toast({ title: "Заявка отправлена" });
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
            <Settings2 className="w-5 h-5 text-primary" /> Настройки Nuxus
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-4 bg-muted/50 p-1 mx-4 mt-4 rounded-xl shrink-0">
            <TabsTrigger value="profile" className="text-[10px] uppercase font-bold">Профиль</TabsTrigger>
            <TabsTrigger value="privacy" className="text-[10px] uppercase font-bold">Защита</TabsTrigger>
            <TabsTrigger value="store" className="text-[10px] uppercase font-bold">Premium</TabsTrigger>
            <TabsTrigger value="storage" className="text-[10px] uppercase font-bold">Данные</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="profile" className="p-6 space-y-6 m-0">
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative group">
                  <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-background" fallbackName={form.name} />
                  <button onClick={handleGenerateAiAvatar} disabled={isGeneratingAvatar} className="absolute bottom-0 right-0 bg-primary p-2 rounded-2xl border-4 border-background shadow-lg">
                    {isGeneratingAvatar ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Wand2 className="w-5 h-5 text-white" />}
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label className="text-xs uppercase font-bold">Имя</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-muted/30 border-none h-11 rounded-xl" /></div>
                <div className="space-y-1.5"><Label className="text-xs uppercase font-bold">Никнейм</Label><Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-muted/30 border-none h-11 rounded-xl" /></div>
                <div className="space-y-1.5"><Label className="text-xs uppercase font-bold">О себе</Label><Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-muted/30 border-none rounded-xl" /></div>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="p-6 space-y-4 m-0">
              <div className="bg-muted/20 p-5 rounded-2xl border border-border/20 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] flex items-center gap-2 uppercase font-bold"><Eye className="w-3 h-3" /> Номер телефона</Label>
                  <Input value={form.phoneVisibility} readOnly className="bg-muted/30" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] flex items-center gap-2 uppercase font-bold"><ShieldCheck className="w-3 h-3" /> Статус сети</Label>
                  <Input value={form.lastSeenVisibility} readOnly className="bg-muted/30" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="store" className="p-6 space-y-4 m-0">
              {PREMIUM_PLANS.map(plan => (
                <Button key={plan.id} variant="outline" className="w-full h-14 rounded-2xl flex justify-between px-6 border-primary/20" onClick={() => setPendingPayment(plan)}>
                  <span className="font-bold">{plan.name}</span>
                  <span className="font-black text-primary">{plan.price} ₽</span>
                </Button>
              ))}
            </TabsContent>

            <TabsContent value="storage" className="p-6 space-y-4 m-0">
              <div className="bg-muted/20 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><HardDrive className="w-5 h-5 text-primary" /><span className="text-sm font-bold">Кэш медиа</span></div>
                  <Button variant="ghost" size="sm">Очистить</Button>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>

          <div className="p-4 border-t border-border/20 bg-muted/20 shrink-0 flex gap-2">
            <Button variant="ghost" className="flex-1 h-12 rounded-xl text-destructive" onClick={() => signOut(auth)}><LogOut className="w-5 h-5" /></Button>
            <Button className="flex-[2] h-12 rounded-xl font-bold uppercase bg-primary" onClick={handleSave}><Check className="w-5 h-5 mr-2" /> Сохранить</Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>

    <Dialog open={!!pendingPayment} onOpenChange={v => !v && setPendingPayment(null)}>
      <DialogContent className="max-w-sm bg-card border-primary/20 p-8 rounded-[2.5rem] text-center">
        <h2 className="text-xl font-bold flex items-center gap-2 justify-center mb-6"><CreditCard className="w-6 h-6 text-primary" /> Оплата</h2>
        <div className="bg-background/50 p-5 rounded-3xl border mb-6">
          <p className="text-[10px] uppercase font-bold opacity-60">Карта для перевода</p>
          <div className="text-lg font-mono font-bold mt-2 flex items-center justify-center gap-2">
            {CARD_NUMBER} <Copy className="w-4 h-4 cursor-pointer" onClick={() => { navigator.clipboard.writeText(CARD_NUMBER.replace(/\s/g, '')); toast({ title: "Скопировано" }); }} />
          </div>
        </div>
        <Button className="w-full h-14 rounded-2xl font-black uppercase" onClick={handleConfirmPayment} disabled={isSubmittingPayment}>
          {isSubmittingPayment ? <Loader2 className="animate-spin" /> : "Я оплатил(а)"}
        </Button>
      </DialogContent>
    </Dialog>
    </>
  );
}
