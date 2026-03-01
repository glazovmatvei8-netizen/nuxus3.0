
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  LogOut, Palette, Loader2, Crown, Check, 
  Monitor, Sparkles, Globe, Settings2, Upload, Moon, Droplets, ShieldCheck, Lock,
  Users, Share2, Star, Bell, BellOff, Info, Languages, Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
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

const CARD_NUMBER = "2204 1202 0495 4230";

const LANGUAGES = [
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'pl', name: 'Polski' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'ua', name: 'Українська' },
  { code: 'zh', name: '简体中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ar', name: 'العربية' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'th', name: 'ไทย' },
];

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
    twoFactorEnabled: false,
    twoFactorPin: ''
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [notifPermission, setNotifPermission] = useState<string>('default');

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
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || ''
      });
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotifPermission(Notification.permission);
      }
    }
  }, [profile, open]);

  const handleSave = () => {
    if (!userRef) return;
    updateDocumentNonBlocking(userRef, {
      name: form.name,
      username: form.username.startsWith('@') ? form.username.toLowerCase() : '@' + form.username.toLowerCase(),
      bio: form.bio,
      avatarUrl: form.avatarUrl,
      twoFactorEnabled: form.twoFactorEnabled,
      twoFactorPin: form.twoFactorPin,
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

  const requestNotifs = async () => {
    if (!('Notification' in window)) {
      toast({ variant: 'destructive', title: "Не поддерживается", description: "Ваше устройство не поддерживает уведомления." });
      return;
    }
    
    if (Notification.permission === 'denied') {
      toast({ 
        variant: 'destructive', 
        title: "Доступ заблокирован", 
        description: "Разрешите уведомления в настройках браузера или системы." 
      });
      return;
    }

    const res = await Notification.requestPermission();
    setNotifPermission(res);
    if (res === 'granted') {
      toast({ title: "Уведомления включены!" });
    } else {
      toast({ variant: 'destructive', title: "Доступ отклонен" });
    }
  };

  const handleAiAvatar = async () => {
    if (!isUserPremium(profile)) return;
    setIsGeneratingAvatar(true);
    try {
      const { imageUrl } = await generateAiAvatar();
      setForm(prev => ({ ...prev, avatarUrl: imageUrl }));
      toast({ title: "Аватар готов!" });
    } catch (e) {
      toast({ title: "Ошибка AI", variant: "destructive" });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const copyReferralLink = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}?ref=${user?.uid}` : '';
    navigator.clipboard.writeText(url);
    toast({ title: "Ссылка скопирована!" });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0 bg-transparent">
          <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter">
            <Settings2 className="w-5 h-5 text-primary" /> {t('settings.title')}
          </DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-5 bg-muted/50 p-1 mx-6 mt-4 rounded-2xl shrink-0 border border-white/5">
            <TabsTrigger value="profile" className="text-[8px] uppercase font-black tracking-widest px-1">{t('settings.tabs.profile')}</TabsTrigger>
            <TabsTrigger value="appearance" className="text-[8px] uppercase font-black tracking-widest px-1">{t('settings.tabs.style')}</TabsTrigger>
            <TabsTrigger value="security" className="text-[8px] uppercase font-black tracking-widest px-1">Защита</TabsTrigger>
            <TabsTrigger value="referral" className="text-[8px] uppercase font-black tracking-widest px-1">Друзья</TabsTrigger>
            <TabsTrigger value="store" className="text-[8px] uppercase font-black tracking-widest px-1">{t('settings.tabs.prime')}</TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-1 px-6">
            <TabsContent value="profile" className="space-y-6 m-0 py-6">
              <div className="flex flex-col items-center gap-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"><Upload className="w-8 h-8 text-white" /></div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
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
                  <Label className="text-[10px] uppercase font-black tracking-widest text-primary flex items-center gap-2"><Bell className="w-3.5 h-3.5" /> Уведомления</Label>
                  <Button variant="outline" className={cn("w-full h-14 rounded-2xl gap-3 border-white/5 shadow-inner transition-all", notifPermission === 'granted' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-black/20')} onClick={requestNotifs}>
                    {notifPermission === 'granted' ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
                    <div className="flex flex-col items-start leading-none text-left">
                      <span className="text-[10px] font-black uppercase tracking-widest">{notifPermission === 'granted' ? 'Активны' : 'Включить Пуши'}</span>
                      <span className="text-[8px] opacity-60 uppercase mt-1">Звук + Визуальные</span>
                    </div>
                  </Button>
                  
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-white">Мобильные тела</p>
                      <p className="text-[9px] text-muted-foreground uppercase leading-relaxed font-bold">
                        На iPhone/Android: Нажмите «Поделиться» &rarr; «На экран Домой». Только так уведомления будут приходить в фоне.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-accent flex items-center gap-2"><Languages className="w-3.5 h-3.5" /> {t('settings.labels.language')}</Label>
                  <Select value={form.language} onValueChange={(v) => setForm({...form, language: v})}>
                    <SelectTrigger className="h-12 rounded-2xl bg-black/20 border-white/5 font-bold text-xs">
                      <SelectValue placeholder="Выберите язык" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl bg-card border-white/10">
                      {LANGUAGES.map(lang => (
                        <SelectItem key={lang.code} value={lang.code} className="text-xs font-bold uppercase">{lang.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-primary flex items-center gap-2"><Palette className="w-3.5 h-3.5" /> Тема оформления</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {['default', 'midnight', 'ocean'].map(t_theme => (
                      <button key={t_theme} onClick={() => setForm({...form, theme: t_theme as any})} className={cn("flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all", form.theme === t_theme ? "bg-primary/20 border-primary text-primary" : "bg-black/20 border-white/5 text-muted-foreground")}>
                        {t_theme === 'default' ? <Monitor className="w-5 h-5" /> : t_theme === 'midnight' ? <Moon className="w-5 h-5" /> : <Droplets className="w-5 h-5" />}
                        <span className="text-[9px] font-black uppercase">{t_theme}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="security" className="space-y-6 m-0 py-6">
              <div className="bg-muted/20 p-6 rounded-[2rem] border border-white/5 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-primary flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" /> Двухфакторная 2FA</Label>
                    <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                  </div>
                  {form.twoFactorEnabled && (
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Секретный PIN (6 цифр)</Label>
                      <Input type="password" maxLength={6} placeholder="Введите новый PIN" value={form.twoFactorPin} onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})} className="bg-black/20 border-white/5 h-12 rounded-xl text-center text-lg tracking-[0.3em] font-black" />
                    </div>
                  )}
                </div>
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-accent flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Приватность</Label>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Видимость телефона</Label>
                      <Select value={form.phoneVisibility} onValueChange={(v) => setForm({...form, phoneVisibility: v as any})}><SelectTrigger className="h-11 rounded-xl bg-black/20 border-white/5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="everybody">Все</SelectItem><SelectItem value="contacts">Контакты</SelectItem><SelectItem value="nobody">Никто</SelectItem></SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Приглашения в группы</Label>
                      <Select value={form.allowGroupsFrom} onValueChange={(v) => setForm({...form, allowGroupsFrom: v as any})}><SelectTrigger className="h-11 rounded-xl bg-black/20 border-white/5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="everybody">Все</SelectItem><SelectItem value="contacts">Контакты</SelectItem><SelectItem value="premium">Premium</SelectItem><SelectItem value="nobody">Никто</SelectItem></SelectContent></Select>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="referral" className="py-6">
              <div className="bg-muted/20 p-6 rounded-[2rem] border border-white/5 space-y-6">
                <div className="text-center space-y-2">
                  <div className="bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-2"><Users className="w-8 h-8 text-primary" /></div>
                  <h3 className="text-lg font-black uppercase italic text-white tracking-tighter">Пригласи 5 друзей</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">Получи месяц Premium за каждых 5 новых пользователей</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-muted-foreground">Прогресс</span><span className="text-primary">{profile?.referralCount || 0} / 5</span></div>
                  <Progress value={((profile?.referralCount || 0) % 5) * 20} className="h-2" />
                </div>
                <Button onClick={copyReferralLink} className="w-full h-12 rounded-2xl bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all font-black uppercase text-[10px] tracking-widest"><Share2 className="w-4 h-4 mr-2" /> Поделиться ссылкой</Button>
              </div>
            </TabsContent>
            <TabsContent value="store" className="py-6">
              <div className="relative p-6 rounded-[2rem] bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 overflow-hidden text-center">
                <Crown className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-black text-white italic tracking-tighter mb-4 uppercase">NUXUS PRIME</h3>
                <div className="space-y-2">
                  {PREMIUM_PLANS.map(plan => (
                    <button key={plan.id} onClick={() => setPendingPayment(plan)} className="w-full h-14 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between px-6 hover:border-primary transition-all">
                      <span className="font-bold text-xs uppercase">{plan.name}</span>
                      <span className="font-black text-primary italic">{plan.price} ₽</span>
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
          <div className="p-6 border-t border-white/5 bg-muted/20 shrink-0 flex gap-3">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shrink-0" onClick={() => signOut(auth)}><LogOut className="w-6 h-6" /></Button>
            <Button className="flex-1 h-14 rounded-2xl font-black uppercase tracking-[0.2em] italic bg-primary shadow-xl shadow-primary/20 text-xs" onClick={handleSave}><Check className="w-5 h-5 mr-2" /> {t('settings.labels.save')}</Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
    <Dialog open={!!pendingPayment} onOpenChange={v => !v && setPendingPayment(null)}>
      <DialogContent className="max-sm bg-card border-primary/20 p-8 rounded-[3rem] text-center shadow-2xl">
        <Crown className="w-16 h-16 text-primary mx-auto mb-6 animate-float" />
        <h2 className="text-2xl font-black text-white italic tracking-tighter mb-2">Оплата Prime</h2>
        <div className="bg-black/40 p-6 rounded-3xl border border-white/10 mb-8 cursor-pointer" onClick={() => { navigator.clipboard.writeText(CARD_NUMBER.replace(/\s/g, '')); toast({ title: "Карта скопирована" }); }}>
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Номер карты</div>
          <div className="text-lg font-mono font-black text-white tracking-widest">{CARD_NUMBER}</div>
        </div>
        <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] bg-primary shadow-xl shadow-primary/30" onClick={() => { toast({ title: "Запрос отправлен" }); setPendingPayment(null); }} disabled={isSubmittingPayment}>Я оплатил</Button>
      </DialogContent>
    </Dialog>
    </>
  );
}
