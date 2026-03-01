
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
  LogOut, Palette, Loader2, Crown, Check, 
  Monitor, Sparkles, Globe, Settings2, Upload, Moon, Droplets, Type, ShieldCheck, Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut, updatePassword } from 'firebase/auth';
import { doc, collection, query, where, limit, getDocs, addDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';
import { generateAiAvatar } from '@/ai/flows/generate-ai-avatar-flow';
import { useTranslations } from '@/hooks/use-translations';

const PREMIUM_PLANS = [
  { id: '1m', name: '1 Month', price: 200, unit: 'months', amount: 1 },
  { id: '3m', name: '3 Months', price: 500, unit: 'months', amount: 3 },
  { id: '1y', name: '1 Year', price: 1500, unit: 'years', amount: 1 },
];

const LANGUAGES_LIST = [
  { id: 'ru', name: 'Русский' },
  { id: 'en', name: 'English' },
  { id: 'de', name: 'Deutsch' },
  { id: 'ua', name: 'Українська' },
  { id: 'tr', name: 'Türkçe' },
  { id: 'pl', name: 'Polski' },
  { id: 'es', name: 'Español' },
];

const CARD_NUMBER = "2204 1202 0495 4230";
const ADMIN_UID = 'vnctow46';

export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const [form, setForm] = useState({
    name: '',
    username: '',
    bio: '',
    avatarUrl: '',
    theme: 'default',
    messageSize: 'medium',
    language: 'ru',
    phoneVisibility: 'nobody',
    lastSeenVisibility: 'everybody',
    allowGroupsFrom: 'everybody',
    whoCanMessageMe: 'everybody',
  });

  const [passwordForm, setPasswordForm] = useState({
    new: '',
    confirm: ''
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<any>(null);

  useEffect(() => {
    if (profile && open) {
      setForm({
        name: profile.name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || '',
        theme: profile.settings?.theme || 'default',
        messageSize: profile.settings?.messageSize || 'medium',
        language: profile.settings?.language || 'ru',
        phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'nobody',
        lastSeenVisibility: profile.settings?.privacy?.lastSeenVisibility || 'everybody',
        allowGroupsFrom: profile.settings?.privacy?.allowGroupsFrom || 'everybody',
        whoCanMessageMe: profile.settings?.privacy?.whoCanMessageMe || 'everybody',
      });
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
        theme: form.theme,
        messageSize: form.messageSize,
        language: form.language,
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
    toast({ title: t('settings.labels.save') });
  };

  const handleChangePassword = async () => {
    if (!auth.currentUser || !passwordForm.new) return;
    if (passwordForm.new !== passwordForm.confirm) {
      toast({ title: "Пароли не совпадают", variant: "destructive" });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(auth.currentUser, passwordForm.new);
      toast({ title: "Пароль успешно обновлен" });
      setPasswordForm({ new: '', confirm: '' });
    } catch (e: any) {
      toast({ 
        title: "Ошибка обновления", 
        description: e.code === 'auth/requires-recent-login' 
          ? "Требуется свежий вход в систему. Перезайдите в аккаунт." 
          : "Ошибка смены пароля", 
        variant: "destructive" 
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm(prev => ({ ...prev, avatarUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleAiAvatar = async () => {
    if (!isUserPremium(profile)) return;
    setIsGeneratingAvatar(true);
    try {
      const { imageUrl } = await generateAiAvatar();
      setForm(prev => ({ ...prev, avatarUrl: imageUrl }));
      toast({ title: "Avatar Generated!" });
    } catch (e) {
      toast({ title: "AI Error", description: "Failed to create avatar", variant: "destructive" });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!pendingPayment || !db || !user || isSubmittingPayment) return;
    setIsSubmittingPayment(true);
    try {
      const adminId = ADMIN_UID;
      const chatQuery = query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid), where('username', '==', '@nuxus_bot'));
      const chatSnap = await getDocs(chatQuery);
      let chatId = chatSnap.empty ? (await addDoc(collection(db, 'chats'), { type: 'private', name: 'Nuxus Bot', username: '@nuxus_bot', participantIds: [user.uid, adminId], ownerId: adminId, createdAt: new Date().toISOString() })).id : chatSnap.docs[0].id;
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId, senderId: 'nuxus_bot', senderName: 'Nuxus', contentType: 'payment_request', sentAt: new Date().toISOString(),
        paymentData: { 
          type: 'premium', itemName: `Premium: ${pendingPayment.name}`, 
          targetUserId: user.uid, targetUserName: profile?.name || 'User',
          targetUserUsername: profile?.username || '@user',
          amount: pendingPayment.amount, unit: pendingPayment.unit, price: pendingPayment.price, status: 'pending' 
        }
      });
      toast({ title: "Запрос отправлен Nuxus Bot" });
      setPendingPayment(null);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-6 border-b border-border bg-muted/30 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold italic uppercase tracking-tighter">
            <Settings2 className="w-5 h-5 text-primary" /> {t('settings.title')}
          </DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-5 bg-muted/50 p-1 mx-6 mt-4 rounded-2xl shrink-0 border border-white/5">
            <TabsTrigger value="profile" className="text-[8px] uppercase font-black tracking-widest px-1">{t('settings.tabs.profile')}</TabsTrigger>
            <TabsTrigger value="appearance" className="text-[8px] uppercase font-black tracking-widest px-1">{t('settings.tabs.style')}</TabsTrigger>
            <TabsTrigger value="security" className="text-[8px] uppercase font-black tracking-widest px-1">Защита</TabsTrigger>
            <TabsTrigger value="language" className="text-[8px] uppercase font-black tracking-widest px-1">{t('settings.tabs.language')}</TabsTrigger>
            <TabsTrigger value="store" className="text-[8px] uppercase font-black tracking-widest px-1">{t('settings.tabs.prime')}</TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-1 px-6">
            <TabsContent value="profile" className="space-y-6 m-0 py-6">
              <div className="flex flex-col items-center gap-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"><Upload className="w-8 h-8 text-white" /></div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                {isUserPremium(profile) && (
                  <Button variant="outline" className="h-9 rounded-xl gap-2 text-xs border-primary/20 bg-primary/5 hover:bg-primary/10" onClick={handleAiAvatar} disabled={isGeneratingAvatar}>
                    {isGeneratingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-primary" />} {t('settings.labels.avatar')}
                  </Button>
                )}
                <div className="space-y-4 w-full">
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground ml-1">{t('settings.labels.name')}</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-muted/30 border-white/5 h-12 rounded-2xl" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground ml-1">{t('settings.labels.username')}</Label><Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-muted/30 border-white/5 h-12 rounded-2xl" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground ml-1">{t('settings.labels.bio')}</Label><Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-muted/30 border-white/5 rounded-2xl min-h-[80px]" /></div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="appearance" className="space-y-6 m-0 py-6">
              <div className="bg-muted/20 p-6 rounded-[2rem] border border-white/5 space-y-6">
                <div className="space-y-4">
                  <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-primary flex items-center gap-2"><Palette className="w-3.5 h-3.5" /> {t('settings.labels.theme')}</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {['default', 'midnight', 'ocean'].map(t_theme => (
                      <button key={t_theme} onClick={() => setForm({...form, theme: t_theme as any})} className={cn("flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all", form.theme === t_theme ? "bg-primary/20 border-primary text-primary" : "bg-black/20 border-white/5 text-muted-foreground hover:bg-black/40")}>
                        {t_theme === 'default' && <Monitor className="w-5 h-5" />}{t_theme === 'midnight' && <Moon className="w-5 h-5" />}{t_theme === 'ocean' && <Droplets className="w-5 h-5" />}
                        <span className="text-[9px] uppercase font-bold tracking-widest">{t_theme === 'default' ? 'Default' : t_theme === 'midnight' ? 'Midnight' : 'Ocean'}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-white/5"><Label className="text-[10px] uppercase font-black tracking-[0.2em] text-primary flex items-center gap-2"><Type className="w-3.5 h-3.5" /> {t('settings.labels.textSize')}</Label><Select value={form.messageSize} onValueChange={(v) => setForm({...form, messageSize: v as any})}><SelectTrigger className="h-12 rounded-2xl bg-black/20 border-white/5"><SelectValue /></SelectTrigger><SelectContent className="bg-card border-white/10 rounded-2xl"><SelectItem value="small">Small</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="large">Large</SelectItem></SelectContent></Select></div>
              </div>
            </TabsContent>
            <TabsContent value="security" className="space-y-6 m-0 py-6">
              <div className="bg-muted/20 p-6 rounded-[2rem] border border-white/5 space-y-6">
                <div className="space-y-4">
                  <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-primary flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Изменение пароля</Label>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Новый пароль</Label>
                      <Input type="password" placeholder="••••••••" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="bg-black/20 border-white/5 h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Повторите новый пароль</Label>
                      <Input type="password" placeholder="••••••••" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className="bg-black/20 border-white/5 h-11 rounded-xl" />
                    </div>
                    <Button onClick={handleChangePassword} disabled={isUpdatingPassword} className="w-full h-11 rounded-xl bg-primary/20 hover:bg-primary text-primary hover:text-white transition-all font-bold text-[10px] uppercase">
                      {isUpdatingPassword ? <Loader2 className="animate-spin w-4 h-4" /> : "Обновить пароль"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-accent flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" /> Приватность</Label>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Видимость телефона</Label><Select value={form.phoneVisibility} onValueChange={(v) => setForm({...form, phoneVisibility: v as any})}><SelectTrigger className="h-11 rounded-xl bg-black/20 border-white/5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="everybody">Все</SelectItem><SelectItem value="contacts">Контакты</SelectItem><SelectItem value="nobody">Никто</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Кто может писать</Label><Select value={form.whoCanMessageMe} onValueChange={(v) => setForm({...form, whoCanMessageMe: v as any})}><SelectTrigger className="h-11 rounded-xl bg-black/20 border-white/5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="everybody">Все</SelectItem><SelectItem value="premium">Только Prime</SelectItem></SelectContent></Select></div>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="language" className="space-y-6 m-0 py-6">
              <div className="bg-muted/20 p-6 rounded-[2rem] border border-white/5 space-y-4">
                <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-primary flex items-center gap-2">
                  <Globe className="w-4 h-4" /> {t('settings.tabs.language')}
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {LANGUAGES_LIST.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setForm({ ...form, language: lang.id })}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                        form.language === lang.id
                          ? "bg-primary/10 border-primary text-white"
                          : "bg-black/20 border-white/5 text-muted-foreground hover:bg-black/40"
                      )}
                    >
                      <span className="text-sm font-bold">{lang.name}</span>
                      {form.language === lang.id && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="store" className="space-y-6 m-0 py-6">
              <div className="relative p-6 rounded-[2rem] bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 overflow-hidden group">
                <Crown className="w-12 h-12 text-primary mb-4 relative z-10" />
                <h3 className="text-xl font-black text-white italic tracking-tighter mb-2 relative z-10">NUXUS PRIME</h3>
                <div className="space-y-3 relative z-10">{PREMIUM_PLANS.map(plan => (<button key={plan.id} onClick={() => setPendingPayment(plan)} className="w-full h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between px-6 hover:border-primary/50 transition-all"><span className="font-bold text-sm">{plan.name}</span><span className="font-black text-primary italic">{plan.price} ₽</span></button>))}</div>
              </div>
            </TabsContent>
          </ScrollArea>
          <div className="p-6 border-t border-white/5 bg-muted/20 shrink-0 flex gap-3">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shrink-0" onClick={() => signOut(auth)}><LogOut className="w-6 h-6" /></Button>
            <Button className="flex-1 h-14 rounded-2xl font-black uppercase tracking-[0.2em] italic bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs" onClick={handleSave}><Check className="w-5 h-5 mr-2" /> {t('settings.labels.save')}</Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
    <Dialog open={!!pendingPayment} onOpenChange={v => !v && setPendingPayment(null)}>
      <DialogContent className="max-sm bg-card border-primary/20 p-8 rounded-[3rem] text-center shadow-2xl">
        <Crown className="w-16 h-16 text-primary mx-auto mb-6 animate-float" />
        <h2 className="text-2xl font-black text-white italic tracking-tighter mb-2">Оплата Prime</h2>
        <div className="bg-black/40 p-6 rounded-3xl border border-white/10 mb-8 group cursor-pointer relative overflow-hidden" onClick={() => { navigator.clipboard.writeText(CARD_NUMBER.replace(/\s/g, '')); toast({ title: "Номер карты скопирован" }); }}>
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Номер карты</div>
          <div className="text-lg font-mono font-black text-white tracking-widest">{CARD_NUMBER}</div>
        </div>
        <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] bg-primary shadow-xl shadow-primary/30" onClick={handleConfirmPayment} disabled={isSubmittingPayment}>{isSubmittingPassword ? <Loader2 className="animate-spin w-6 h-6" /> : "Я оплатил"}</Button>
      </DialogContent>
    </Dialog>
    </>
  );
}
