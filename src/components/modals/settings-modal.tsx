
"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  LogOut, Settings2, Camera, Lock, Fingerprint, Star, Zap, ShieldCheck, Loader2, Database, Palette, 
  Monitor, MessageSquare, ImageIcon, Smile, Plus, Check, RefreshCcw, Smartphone, PhoneCall, Eye, 
  Users, ShieldAlert, Ghost, Mail, Share2, FileText, Download, Search, MessageCircle, CheckCircle2, Calendar, Shield, Info, Globe, Paintbrush, ArrowRight, ShieldQuestion, Clock, Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, collection, query, limit, getDocs, where, addDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { cn, isUserPremium, isGlobalAdmin, formatDisplayName } from '@/lib/utils';
import type { User, PrivacyOption } from '@/lib/types';
import nuxusVersions from '@/app/versions.json';
import { format, addHours, isAfter, parseISO, differenceInSeconds } from 'date-fns';
import { ru } from 'date-fns/locale';
import { sendVerificationCode } from '@/ai/flows/send-verification-email-flow';

/**
 * SETTINGS MODAL V56.4.1 «FULL RESTORATION»
 * ВСЕ ФУНКЦИИ ОБЪЕДИНЕНЫ: ВЕРИФИКАЦИЯ + БИО + СТАТУС + ТЕЛЕФОН
 */
export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { settingsTab, setSettingsTab } = useAppState();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const [isSaving, setIsSaving] = useState(false);
  
  // VERIFICATION STATE
  const [verifyStep, setVerifyStep] = useState<'idle' | 'verifying_old' | 'entering_new' | 'verifying_new'>('idle');
  const [emailToVerify, setEmailToVerify] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [activeCode, setActiveCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const isPremium = useMemo(() => isUserPremium(profile), [profile]);

  const [form, setForm] = useState({
    name: '', username: '', bio: '', statusEmoji: '', statusText: '', avatarUrl: '',
    phone: '', email: '',
    appearance: 'dark' as 'light' | 'dark', theme: 'default', customPrimaryColor: '',
    customAppIconUrl: '', bubbleStyle: 'default', chatBackground: '', messageSize: 'medium',
    twoFactorEnabled: false, twoFactorPin: '', biometricEnabled: false, 
    pwaNotificationsEnabled: false, isGhostMode: false,
    privacy: {
      phoneVisibility: 'everybody' as PrivacyOption,
      phoneWhitelist: [] as string[],
      lastSeenVisibility: 'everybody' as PrivacyOption,
      lastSeenWhitelist: [] as string[],
      profilePhotoVisibility: 'everybody' as PrivacyOption,
      profilePhotoWhitelist: [] as string[],
      forwardingVisibility: 'everybody' as PrivacyOption,
      forwardingWhitelist: [] as string[],
      whoCanCallMe: 'everybody' as PrivacyOption,
      callWhitelist: [] as string[],
      allowGroupsFrom: 'everybody' as PrivacyOption,
      groupsWhitelist: [] as string[],
      bioVisibility: 'everybody' as PrivacyOption,
      bioWhitelist: [] as string[],
      whoCanMessageMe: 'everybody' as PrivacyOption,
      messageWhitelist: [] as string[]
    }
  });

  useEffect(() => {
    if (profile && open) {
      setForm({
        name: profile.name || '',
        username: (profile.username || '').replace('@', ''),
        bio: profile.bio || '',
        statusEmoji: profile.statusEmoji || '',
        statusText: profile.statusText || '',
        avatarUrl: profile.avatarUrl || '',
        phone: profile.phone || '',
        email: profile.email || '',
        appearance: profile.settings?.appearance || 'dark',
        theme: profile.settings?.theme || 'default',
        customPrimaryColor: profile.settings?.customPrimaryColor || '',
        customAppIconUrl: profile.settings?.customAppIconUrl || '',
        bubbleStyle: profile.settings?.bubbleStyle || 'default',
        chatBackground: profile.settings?.chatBackground || '',
        messageSize: profile.settings?.messageSize || 'medium',
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        biometricEnabled: !!profile.settings?.biometricEnabled,
        pwaNotificationsEnabled: !!profile.settings?.pwaNotificationsEnabled,
        isGhostMode: !!profile.settings?.privacy?.isGhostMode,
        privacy: {
          phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'everybody',
          phoneWhitelist: profile.settings?.privacy?.phoneWhitelist || [],
          lastSeenVisibility: profile.settings?.privacy?.lastSeenVisibility || 'everybody',
          lastSeenWhitelist: profile.settings?.privacy?.lastSeenWhitelist || [],
          profilePhotoVisibility: profile.settings?.privacy?.profilePhotoVisibility || 'everybody',
          profilePhotoWhitelist: profile.settings?.privacy?.profilePhotoWhitelist || [],
          forwardingVisibility: profile.settings?.privacy?.forwardingVisibility || 'everybody',
          forwardingWhitelist: profile.settings?.privacy?.forwardingWhitelist || [],
          whoCanCallMe: profile.settings?.privacy?.whoCanCallMe || 'everybody',
          callWhitelist: profile.settings?.privacy?.callWhitelist || [],
          allowGroupsFrom: profile.settings?.privacy?.allowGroupsFrom || 'everybody',
          groupsWhitelist: profile.settings?.privacy?.groupsWhitelist || [],
          bioVisibility: profile.settings?.privacy?.bioVisibility || 'everybody',
          bioWhitelist: profile.settings?.privacy?.bioWhitelist || [],
          whoCanMessageMe: profile.settings?.privacy?.whoCanMessageMe || 'everybody',
          messageWhitelist: profile.settings?.privacy?.messageWhitelist || []
        }
      });

      if (profile.emailLastChangedAt) {
        const checkLock = () => {
          const lockEnd = addHours(parseISO(profile.emailLastChangedAt!), 24);
          const diff = differenceInSeconds(lockEnd, new Date());
          if (diff > 0) setTimeRemaining(diff);
          else setTimeRemaining(null);
        };
        checkLock();
        const interval = setInterval(checkLock, 60000);
        return () => clearInterval(interval);
      }
    }
  }, [profile, open]);

  const handleSendEmailCode = async (targetEmail: string, step: typeof verifyStep) => {
    if (!targetEmail || !targetEmail.includes('@')) {
      toast({ title: "Ошибка", description: "Некорректная почта.", variant: "destructive" });
      return;
    }
    setIsVerifying(true);
    try {
      const { success, code } = await sendVerificationCode({ email: targetEmail, userName: form.name });
      if (success) {
        setActiveCode(code);
        setVerifyStep(step);
        toast({ title: "Код отправлен", description: "Проверьте входящие (6 цифр)." });
      }
    } catch (e) {
      toast({ title: "Сбой ИИ", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmCode = async () => {
    if (inputCode !== activeCode) {
      toast({ title: "Неверный код", variant: "destructive" });
      return;
    }

    if (verifyStep === 'verifying_old') {
      setVerifyStep('entering_new');
      setInputCode('');
      setActiveCode('');
    } else if (verifyStep === 'verifying_new') {
      if (!db || !user) return;
      setIsVerifying(true);
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          email: emailToVerify,
          emailVerified: true,
          emailLastChangedAt: new Date().toISOString()
        });
        setVerifyStep('idle');
        setForm({ ...form, email: emailToVerify });
        toast({ title: "Почта подтверждена" });
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const requestPhoneVerification = async () => {
    if (!db || !user || !profile) return;
    try {
      await addDoc(collection(db, 'topUpRequests'), {
        userId: user.uid,
        userName: profile.name,
        amount: 0,
        type: 'phone_verification',
        phone: form.phone,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast({ title: "Запрос отправлен", description: "Администратор проверит ваш номер." });
    } catch (e) {
      toast({ title: "Ошибка отправки" });
    }
  };

  const handleSave = async () => {
    if (!db || !user || !profile) return;
    setIsSaving(true);
    try {
      const usernameWithAt = '@' + form.username.trim().replace('@', '');
      const targetLowercase = usernameWithAt.toLowerCase();

      await updateDoc(doc(db, 'users', user.uid), {
        name: form.name.trim(),
        username: usernameWithAt,
        usernameLowercase: targetLowercase,
        bio: form.bio.trim(),
        statusEmoji: form.statusEmoji.trim(),
        statusText: form.statusText.trim(),
        avatarUrl: form.avatarUrl,
        phone: form.phone.trim(),
        twoFactorEnabled: form.twoFactorEnabled,
        twoFactorPin: form.twoFactorPin,
        'settings.appearance': form.appearance,
        'settings.theme': form.theme,
        'settings.customPrimaryColor': form.customPrimaryColor,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.chatBackground': form.chatBackground,
        'settings.biometricEnabled': form.biometricEnabled,
        'settings.privacy': { ...form.privacy, isGhostMode: form.isGhostMode }
      });
      onOpenChange(false);
      toast({ title: "Конфигурация сохранена" });
    } catch (e: any) { 
      toast({ title: "Ошибка", description: e.message, variant: "destructive" }); 
    }
    finally { setIsSaving(false); }
  };

  const formatLockTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}ч ${mins}м`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/98 backdrop-blur-[50px] border-white/10 p-0 overflow-hidden h-[90dvh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 relative overflow-hidden text-left">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
          <DialogTitle className="flex items-center gap-3 text-2xl font-black italic uppercase text-white relative z-10">
            <Settings2 className="w-7 h-7 text-primary" /> ПАРАМЕТРЫ V56.4.1
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 mt-4">
            <TabsList className="grid grid-cols-5 bg-white/5 p-1 rounded-2xl border border-white/5 shadow-inner">
              <TabsTrigger value="profile" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Узел</TabsTrigger>
              <TabsTrigger value="style" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Стиль</TabsTrigger>
              <TabsTrigger value="premium" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary"><Star className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="privacy" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Защита</TabsTrigger>
              <TabsTrigger value="data" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Ядро</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="pb-40"> 
              <TabsContent value="profile" className="space-y-8 m-0 p-8">
                <div className="flex flex-col items-center gap-8">
                  <div className="relative group">
                    <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                    <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-2xl shadow-2xl hover:scale-110 transition-all z-20"><Camera className="w-4 h-4 text-white" /></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                  </div>

                  <div className="space-y-6 w-full text-left">
                    {/* EMAIL VERIFICATION BLOCK */}
                    <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 space-y-4">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Mail className="w-4 h-4 text-primary" />
                           <span className="text-[10px] font-black uppercase text-white tracking-widest">Электронная почта</span>
                         </div>
                         {profile?.emailVerified ? (
                           <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                             <CheckCircle2 className="w-3 h-3 text-green-500" />
                             <span className="text-[8px] font-black uppercase text-green-500">ОК</span>
                           </div>
                         ) : (
                           <div className="flex items-center gap-1.5 bg-red-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                             <ShieldAlert className="w-3 h-3 text-red-500" />
                             <span className="text-[8px] font-black uppercase text-red-500">НЕТ</span>
                           </div>
                         )}
                       </div>

                       {verifyStep === 'idle' && (
                         <div className="space-y-3">
                           <Input 
                             value={form.email || ''} 
                             readOnly={!!profile?.emailVerified}
                             disabled={!!timeRemaining}
                             placeholder="Введите вашу почту..."
                             className="bg-black/40 border-white/10 h-12 rounded-xl text-sm" 
                           />
                           {timeRemaining ? (
                             <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-center gap-3">
                               <Clock className="w-4 h-4 text-primary animate-pulse" />
                               <span className="text-[10px] font-black uppercase text-primary tracking-widest">Замок: {formatLockTime(timeRemaining)}</span>
                             </div>
                           ) : profile?.emailVerified ? (
                             <Button onClick={() => handleSendEmailCode(profile.email!, 'verifying_old')} className="w-full h-11 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase text-[9px] tracking-widest">
                               Изменить почту
                             </Button>
                           ) : (
                             <Button onClick={() => handleSendEmailCode(form.email, 'verifying_new')} disabled={isVerifying || !form.email} className="w-full h-12 bg-primary text-white rounded-xl font-black uppercase italic tracking-widest shadow-lg">
                               {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Подтвердить"}
                             </Button>
                           )}
                         </div>
                       )}

                       {(verifyStep === 'verifying_old' || verifyStep === 'verifying_new') && (
                         <div className="space-y-4 animate-in fade-in zoom-in-95">
                           <div className="text-center space-y-1">
                             <p className="text-[9px] font-bold text-white/40 uppercase">Введите код из почты</p>
                             <p className="text-[10px] font-black text-primary uppercase italic truncate">{verifyStep === 'verifying_old' ? profile?.email : emailToVerify}</p>
                           </div>
                           <Input 
                             value={inputCode} 
                             onChange={e => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                             placeholder="000000"
                             className="bg-black/60 border-primary/40 h-14 rounded-2xl text-center text-2xl tracking-[0.4em] font-black"
                           />
                           <div className="flex gap-2">
                             <Button onClick={() => setVerifyStep('idle')} variant="ghost" className="flex-1 h-11 text-[9px] font-black uppercase">Отмена</Button>
                             <Button onClick={handleConfirmCode} disabled={inputCode.length !== 6 || isVerifying} className="flex-2 h-11 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest">
                               {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Далее"}
                             </Button>
                           </div>
                         </div>
                       )}

                       {verifyStep === 'entering_new' && (
                         <div className="space-y-4 animate-in slide-in-from-right-4">
                           <p className="text-[9px] font-black uppercase text-primary text-center">Введите новый адрес</p>
                           <Input 
                             value={emailToVerify}
                             onChange={e => setEmailToVerify(e.target.value)}
                             placeholder="new_email@example.com"
                             className="bg-black/40 border-primary/20 h-12 rounded-xl text-center"
                           />
                           <Button onClick={() => handleSendEmailCode(emailToVerify, 'verifying_new')} disabled={!emailToVerify.includes('@') || isVerifying} className="w-full h-12 bg-primary text-white rounded-xl font-black uppercase italic tracking-widest">
                             {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Получить код"}
                           </Button>
                         </div>
                       )}
                    </div>

                    {/* PHONE VERIFICATION BLOCK */}
                    <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 space-y-4">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Smartphone className="w-4 h-4 text-primary" />
                           <span className="text-[10px] font-black uppercase text-white tracking-widest">Номер телефона</span>
                         </div>
                         {profile?.phoneVerified ? (
                           <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                             <CheckCircle2 className="w-3 h-3 text-green-500" />
                             <span className="text-[8px] font-black uppercase text-green-500">ОК</span>
                           </div>
                         ) : (
                           <div className="flex items-center gap-1.5 bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                             <ShieldQuestion className="w-3 h-3 text-accent" />
                             <span className="text-[8px] font-black uppercase text-accent">WAIT</span>
                           </div>
                         )}
                       </div>
                       <div className="flex gap-2">
                         <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-black/40 border-white/10 h-12 rounded-xl text-sm" placeholder="+7..." />
                         {!profile?.phoneVerified && (
                           <Button onClick={requestPhoneVerification} className="h-12 w-12 rounded-xl bg-primary shrink-0 shadow-lg">
                             <ShieldCheck className="w-5 h-5 text-white" />
                           </Button>
                         )}
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Имя Оператора</Label>
                        <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Никнейм</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-black text-xs">@</span>
                          <Input value={form.username} onChange={e => setForm({...form, username: e.target.value.replace(/[^a-zA-Z0-9_@]/g, '')})} className="bg-white/5 border-white/10 h-11 rounded-xl pl-7 font-bold" />
                        </div>
                      </div>
                    </div>

                    {/* STATUS BLOCK */}
                    <div className="bg-primary/5 p-5 rounded-[2rem] border border-primary/10 space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Smile className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black uppercase text-primary tracking-widest">Текущий Статус</span>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-16">
                          <Input 
                            placeholder="🏠" 
                            maxLength={2} 
                            value={form.statusEmoji} 
                            onChange={e => setForm({...form, statusEmoji: e.target.value})} 
                            className="bg-black/40 border-white/10 h-14 rounded-2xl text-center text-xl shadow-inner" 
                          />
                        </div>
                        <div className="flex-1 relative">
                           <Input 
                             placeholder="Чем занимаетесь?" 
                             value={form.statusText} 
                             onChange={e => setForm({...form, statusText: e.target.value})} 
                             className="bg-black/40 border-white/10 h-14 rounded-2xl text-xs font-bold pl-4 pr-10" 
                           />
                           <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
                        </div>
                      </div>
                    </div>

                    {/* BIO BLOCK */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-primary/60 ml-2 tracking-widest">Спецификация (О себе)</Label>
                      <Textarea 
                        placeholder="Краткая информация о вашем узле..."
                        value={form.bio} 
                        onChange={e => setForm({...form, bio: e.target.value})} 
                        className="bg-white/5 border-white/10 rounded-[1.5rem] min-h-[100px] font-medium text-xs leading-relaxed p-4 focus:border-primary/40 transition-all" 
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-10 m-0 p-8">
                 <div className="space-y-6">
                    <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><Palette className="w-5 h-5" /> Визуальная среда</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setForm({...form, appearance: 'dark'})} className={cn("h-14 rounded-2xl border flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all", form.appearance === 'dark' ? "bg-primary text-white border-primary shadow-xl shadow-primary/20" : "bg-white/5 border-white/10 text-white/40")}>Obsidian</button>
                      <button onClick={() => setForm({...form, appearance: 'light'})} className={cn("h-14 rounded-2xl border flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all", form.appearance === 'light' ? "bg-white text-black border-white shadow-xl" : "bg-white/5 border-white/10 text-white/40")}>Crystal</button>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><ImageIcon className="w-5 h-5" /> Обои чата</h3>
                    <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-white/5 group shadow-2xl">
                      {form.chatBackground ? <img src={form.chatBackground} className="w-full h-full object-cover" alt="BG" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><ImageIcon className="w-10 h-10" /></div>}
                      <button onClick={() => bgInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-black uppercase text-[10px] text-white">Выбрать из Ядра</button>
                    </div>
                    <input type="file" ref={bgInputRef} hidden accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, chatBackground: r.result as string}); r.readAsDataURL(f); } }} />
                 </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-8 m-0 p-8 text-left">
                <div className="bg-primary/5 p-6 rounded-[2.5rem] border border-primary/20 space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <Fingerprint className="w-5 h-5 text-primary" />
                    <span className="text-[11px] font-black uppercase text-white tracking-widest">Безопасность Ядра</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/60 uppercase">Двухфакторный PIN</span>
                    <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                  </div>
                  {form.twoFactorEnabled && (
                    <Input type="password" placeholder="••••••" maxLength={6} value={form.twoFactorPin} onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})} className="h-14 bg-black/40 border-primary/30 rounded-2xl text-center text-3xl tracking-[0.4em] font-black" />
                  )}
                </div>

                <div className="space-y-8 bg-white/[0.02] p-6 rounded-[2.5rem] border border-white/5">
                   <h3 className="text-[11px] font-black uppercase text-primary/60 tracking-widest mb-4 flex items-center gap-2"><Shield className="w-4 h-4" /> Конфиденциальность</h3>
                   <PrivacySection icon={Smartphone} label="Номер телефона" value={form.privacy.phoneVisibility} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, phoneVisibility: v}})} />
                   <PrivacySection icon={Eye} label="Последний вход" value={form.privacy.lastSeenVisibility} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, lastSeenVisibility: v}})} />
                   <PrivacySection icon={Camera} label="Фото профиля" value={form.privacy.profilePhotoVisibility} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, profilePhotoVisibility: v}})} />
                </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-8 m-0 p-8 pb-24">
                 <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 text-center space-y-8 shadow-2xl">
                    <Database className="w-14 h-14 text-accent mx-auto animate-pulse" />
                    <div className="space-y-3">
                      <h3 className="text-xl font-black uppercase italic text-white tracking-tighter">Целостность данных</h3>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] leading-relaxed">Запросите полный квантовый дамп вашего узла.</p>
                    </div>
                    <Button onClick={() => {}} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 hover:bg-white/10 transition-all">
                      <Download className="w-5 h-5" /> Сформировать ZIP
                    </Button>
                 </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-[#0a0a0c] shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <Button variant="ghost" className="h-16 w-16 rounded-[1.8rem] bg-red-500/10 text-red-500" onClick={() => signOut(auth)}>
              <LogOut className="w-7 h-7" />
            </Button>
            <Button disabled={isSaving} className="flex-1 h-16 rounded-[1.8rem] font-black uppercase italic bg-primary text-white shadow-2xl active:scale-95 transition-all" onClick={handleSave}>
              {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : <><Check className="w-6 h-6 mr-3" /> Сохранить</>}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PrivacySection({ icon: Icon, label, value, isPremium, onChange }: any) {
  return (
    <div className="flex flex-col gap-4 border-b border-white/[0.03] pb-6 last:border-0 last:pb-0">
      <div className="flex items-center gap-3">
        <Icon className="w-3.5 h-3.5 text-primary/40" />
        <span className="text-[9px] font-black uppercase text-white/60 tracking-widest">{label}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl text-[10px] font-black uppercase">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0c]/95 backdrop-blur-3xl border-white/10 rounded-2xl shadow-2xl">
          <SelectItem value="everybody" className="text-[10px] font-black uppercase">Все узлы</SelectItem>
          <SelectItem value="contacts" className="text-[10px] font-black uppercase">Только контакты</SelectItem>
          <SelectItem value="premium" disabled={!isPremium} className="text-[10px] font-black uppercase text-accent">Elite Only ★</SelectItem>
          <SelectItem value="nobody" className="text-[10px] font-black uppercase text-red-400">Никто</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
