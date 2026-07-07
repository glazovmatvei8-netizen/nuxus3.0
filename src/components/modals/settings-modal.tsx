
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  LogOut, Settings2, Camera, Lock, Fingerprint, Star, Zap, ShieldCheck, Loader2, Database, Download, Check, Palette, 
  Monitor, MessageSquare, Paintbrush, Smile, Bell, Ghost, ImageIcon, Calendar, CheckCircle2, Phone, Mail, 
  ChevronRight, RefreshCcw, Eye, EyeOff, ShieldX, Plus, Laptop, Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  signOut, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  verifyBeforeUpdateEmail
} from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { cn, isUserPremium, formatLastSeen } from '@/lib/utils';
import type { User, Session } from '@/lib/types';
import nuxusVersions from '@/app/versions.json';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * SETTINGS MODAL V32.2.0 «ZERO FRICTION HUB»
 * Прямое подтверждение Phone/Email. Изменен лейбл на "Основная почта".
 * Исправлена ошибка auth/requires-recent-login.
 */
export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { settingsTab, setSettingsTab } = useAppState();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db!, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const sessionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'sessions'), orderBy('lastActive', 'desc'));
  }, [db, user]);
  const { data: sessions, isLoading: isSessionsLoading } = useCollection<Session>(sessionsQuery);

  const currentSessionId = typeof window !== 'undefined' ? localStorage.getItem('nuxus_session_id') : null;

  const [isSaving, setIsSaving] = useState(false);
  const [isLinkingBiometrics, setIsLinkingBiometrics] = useState(false);
  const [showCloudPass, setShowCloudPass] = useState(false);

  // Verification State
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'idle' | 'code'>('idle');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  const [form, setForm] = useState({
    name: '', username: '', bio: '', statusEmoji: '', statusText: '', avatarUrl: '',
    phone: '', email: '',
    appearance: 'dark' as 'light' | 'dark', theme: 'default', customPrimaryColor: '',
    customAppIconUrl: '', bubbleStyle: 'default', chatBackground: '', messageSize: 'medium',
    twoFactorEnabled: false, twoFactorPin: '', cloudPasswordEnabled: false, cloudPassword: '',
    biometricEnabled: false, pwaNotificationsEnabled: false, isGhostMode: false
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
        customAppIconUrl: profile.settings?.customAppIconUrl || 'https://i.ibb.co/sd2MqGz2/Icon.png',
        bubbleStyle: profile.settings?.bubbleStyle || 'default',
        chatBackground: profile.settings?.chatBackground || '',
        messageSize: profile.settings?.messageSize || 'medium',
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        cloudPasswordEnabled: !!profile.cloudPasswordEnabled,
        cloudPassword: profile.cloudPassword || '',
        biometricEnabled: !!profile.settings?.biometricEnabled,
        pwaNotificationsEnabled: !!profile.settings?.pwaNotificationsEnabled,
        isGhostMode: !!profile.settings?.privacy?.isGhostMode
      });
    }
  }, [profile, open]);

  const initRecaptcha = () => {
    if (!auth || typeof window === 'undefined') return null;
    try {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
      }
      // SILENT RECAPTCHA: Абсолютно невидимая, вынесена за пределы экрана
      recaptchaRef.current = new RecaptchaVerifier(auth, 'silent-recaptcha-anchor', {
        size: 'invisible'
      });
      return recaptchaRef.current;
    } catch (e) {
      console.warn("Nuxus Security: Silent init error", e);
      return null;
    }
  };

  const handleSendPhoneVerification = async () => {
    if (!form.phone || !auth) return;
    setIsVerifyingPhone(true);
    try {
      const verifier = initRecaptcha();
      if (!verifier) throw new Error("Security Engine offline");
      const finalPhone = form.phone.startsWith('+') ? form.phone : '+' + form.phone;
      const result = await signInWithPhoneNumber(auth, finalPhone, verifier);
      setConfirmationResult(result);
      setPhoneStep('code');
      toast({ title: "Сигнал отправлен", description: "SMS летит на ваш узел." });
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/requires-recent-login') {
        toast({ title: "Сессия устарела", description: "Пожалуйста, перезапустите вход в Ядро для подтверждения номера.", variant: "destructive" });
      } else {
        toast({ title: "Сбой шлюза", description: "Попробуйте позже.", variant: "destructive" });
      }
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!confirmationResult || !verificationCode) return;
    setIsVerifyingPhone(true);
    try {
      await confirmationResult.confirm(verificationCode);
      if (user) {
        await updateDoc(doc(db!, 'users', user.uid), { phoneVerified: true });
        toast({ title: "Номер подтвержден 🛡️" });
        setPhoneStep('idle');
      }
    } catch (e) {
      toast({ title: "Неверный код", variant: "destructive" });
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleSendEmailVerification = async () => {
    if (!form.email || !auth?.currentUser) return;
    setIsVerifyingEmail(true);
    try {
      await verifyBeforeUpdateEmail(auth.currentUser, form.email.trim());
      toast({ title: "Письмо отправлено", description: "Проверьте почту для подтверждения сигнала." });
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/requires-recent-login') {
        toast({ title: "Нужен перезаход", description: "Для привязки основной почты требуется свежая авторизация. Выйдите и войдите снова.", variant: "destructive" });
      } else {
        toast({ title: "Сбой почты", description: e.message, variant: "destructive" });
      }
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm({ ...form, chatBackground: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleLinkBiometrics = async () => {
    if (typeof window === 'undefined' || !window.PublicKeyCredential || !user) {
      toast({ title: "Hardware Error", description: "Биометрия недоступна", variant: "destructive" });
      return;
    }
    setIsLinkingBiometrics(true);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userHandle = crypto.getRandomValues(new Uint8Array(16));
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Nuxus Kernel", id: window.location.hostname },
          user: { id: userHandle, name: user.uid, displayName: profile?.name || "Node" },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged", requireResidentKey: false },
          attestation: "none"
        }
      }) as any;
      if (credential) {
        const base64Id = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        localStorage.setItem('nuxus_biometric_id', base64Id);
        setForm({ ...form, biometricEnabled: true });
        toast({ title: "Face ID синхронизирован" });
      }
    } catch (e: any) {
      setForm({ ...form, biometricEnabled: false });
      toast({ title: "Сбой биометрии", variant: "destructive" });
    } finally { setIsLinkingBiometrics(false); }
  };

  const handleSave = async () => {
    if (!db || !user || !profile) return;
    setIsSaving(true);
    try {
      const originalUsername = form.username.trim().replace('@', '');
      const usernameWithAt = '@' + originalUsername;
      const targetLowercase = usernameWithAt.toLowerCase();

      if (targetLowercase !== profile.usernameLowercase) {
        const q = query(collection(db!, 'users'), where('usernameLowercase', '==', targetLowercase), limit(1));
        const checkSnap = await getDocs(q);
        if (!checkSnap.empty) {
          toast({ title: "ID занят", variant: "destructive" });
          setIsSaving(false);
          return;
        }
      }

      await updateDoc(doc(db!, 'users', user.uid), {
        name: form.name.trim(),
        username: usernameWithAt,
        usernameLowercase: targetLowercase,
        bio: form.bio.trim(),
        statusEmoji: form.statusEmoji.trim(),
        statusText: form.statusText.trim(),
        avatarUrl: form.avatarUrl,
        phone: form.phone.trim(),
        email: form.email.trim(),
        twoFactorEnabled: form.twoFactorEnabled,
        twoFactorPin: form.twoFactorPin,
        cloudPasswordEnabled: form.cloudPasswordEnabled,
        cloudPassword: form.cloudPassword,
        'settings.appearance': form.appearance,
        'settings.theme': form.theme,
        'settings.customPrimaryColor': form.customPrimaryColor,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.chatBackground': form.chatBackground,
        'settings.messageSize': form.messageSize,
        'settings.biometricEnabled': form.biometricEnabled,
        'settings.pwaNotificationsEnabled': form.pwaNotificationsEnabled,
        'settings.privacy.isGhostMode': form.isGhostMode
      });
      onOpenChange(false);
      toast({ title: "Ядро обновлено" });
    } finally { setIsSaving(false); }
  };

  const handleTerminateSession = (sid: string) => {
    if (!db || !user) return;
    deleteDocumentNonBlocking(doc(db, 'users', user.uid, 'sessions', sid));
    toast({ title: "Узел отключен" });
  };

  const handleTerminateAllOther = () => {
    if (!db || !user || !sessions || !currentSessionId) return;
    if (confirm('Завершить все остальные сеансы доступа?')) {
      sessions.forEach(s => {
        if (s.id !== currentSessionId) {
          deleteDocumentNonBlocking(doc(db, 'users', user.uid, 'sessions', s.id));
        }
      });
      toast({ title: "Лишние узлы аннигилированы" });
    }
  };

  const isPremium = isUserPremium(profile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/95 backdrop-blur-[60px] border-white/10 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,1)] outline-none">
        {/* SILENT RECAPTCHA ANCHOR - ВЫНЕСЕНА ДАЛЕКО ЗА ПРЕДЕЛЫ */}
        <div id="silent-recaptcha-anchor" className="fixed -left-[10000px] top-0 opacity-0 pointer-events-none -z-[5000]"></div>
        
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 text-left relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
          <DialogTitle className="flex items-center gap-3 text-2xl font-black italic uppercase tracking-tighter text-white relative z-10">
            <Settings2 className="w-7 h-7 text-primary" /> Параметры
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 mt-4">
            <TabsList className="grid grid-cols-5 bg-white/5 p-1 rounded-2xl shrink-0 border border-white/5">
              <TabsTrigger value="profile" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Узел</TabsTrigger>
              <TabsTrigger value="style" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Стиль</TabsTrigger>
              <TabsTrigger value="premium" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary"><Star className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="privacy" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Защита</TabsTrigger>
              <TabsTrigger value="data" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Ядро</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <TabsContent value="profile" className="space-y-8 m-0 p-8 pb-24">
              <div className="flex flex-col items-center gap-8">
                <div className="relative group">
                  <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl relative z-10" fallbackName={form.name} />
                  <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-2xl shadow-2xl z-20 active:scale-90 transition-all"><Camera className="w-4 h-4 text-white" /></button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                </div>
                
                <div className="space-y-6 w-full text-left">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Оператор</Label>
                      <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">ID Узла</Label>
                      <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl font-bold" />
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Мобильный узел</Label>
                      <div className="flex gap-2">
                         <div className="relative flex-1">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                            <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl pl-9 text-xs" placeholder="+7..." />
                         </div>
                         {profile?.phoneVerified ? (
                           <div className="h-11 px-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-green-500">
                             <ShieldCheck className="w-4 h-4" />
                             <span className="text-[8px] font-black uppercase">OK</span>
                           </div>
                         ) : phoneStep === 'idle' ? (
                           <Button onClick={handleSendPhoneVerification} disabled={isVerifyingPhone} className="h-11 rounded-xl px-4 bg-primary text-[9px] font-black uppercase">Подтвердить</Button>
                         ) : (
                           <div className="flex gap-1">
                              <Input maxLength={6} placeholder="Код" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} className="w-20 h-11 bg-white/5 border-primary/40 text-center text-xs font-black" />
                              <Button onClick={handleVerifyPhoneCode} className="h-11 px-3 bg-accent text-black rounded-xl"><Check className="w-4 h-4" /></Button>
                           </div>
                         )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Основная почта</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                           <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                           <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl pl-9 text-xs" placeholder="email@example.com" />
                        </div>
                        <Button onClick={handleSendEmailVerification} disabled={isVerifyingEmail || !form.email} className="h-11 rounded-xl px-4 bg-white/5 border border-white/10 text-[9px] font-black uppercase hover:bg-primary/20">Привязать</Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-4">
                    <div className="flex items-center gap-2 mb-1"><Smile className="w-3.5 h-3.5 text-primary" /><span className="text-[9px] font-black uppercase text-primary">Статус</span></div>
                    <div className="flex gap-3">
                      <div className="w-14"><Input placeholder="🏠" value={form.statusEmoji} onChange={e => setForm({...form, statusEmoji: e.target.value})} className="bg-black/40 border-white/10 h-11 rounded-xl text-center text-lg" /></div>
                      <Input placeholder="Ваш статус в Ядре..." value={form.statusText} onChange={e => setForm({...form, statusText: e.target.value})} className="bg-black/40 border-white/10 h-11 rounded-xl text-xs font-bold" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Спецификация (Био)</Label>
                    <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-white/5 border-white/10 rounded-xl min-h-[80px] text-xs leading-relaxed" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="style" className="space-y-10 m-0 p-8 pb-24">
              <div className="space-y-6">
                <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><Monitor className="w-5 h-5" /> Визуальная среда</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setForm({...form, appearance: 'dark'})} className={cn("h-14 rounded-2xl border flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all", form.appearance === 'dark' ? "bg-primary text-white border-primary shadow-xl" : "bg-white/5 border-white/10 text-white/40")}>Obsidian</button>
                  <button onClick={() => setForm({...form, appearance: 'light'})} className={cn("h-14 rounded-2xl border flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all", form.appearance === 'light' ? "bg-white text-black border-white shadow-xl" : "bg-white/5 border-white/10 text-white/40")}>Crystal</button>
                </div>
              </div>

              {isPremium && (
                <div className="bg-primary/5 p-6 rounded-[2.5rem] border border-primary/10 space-y-6">
                   <h3 className="text-[11px] font-black uppercase text-primary tracking-widest flex items-center gap-3"><Paintbrush className="w-5 h-5" /> HEX Резонанс</h3>
                   <div className="flex gap-4">
                      <div className="h-16 w-16 rounded-2xl border-2 border-white/10 shrink-0" style={{ backgroundColor: form.customPrimaryColor || 'hsl(var(--primary))' }} />
                      <Input placeholder="#A855F7" value={form.customPrimaryColor} onChange={e => setForm({...form, customPrimaryColor: e.target.value.toUpperCase()})} className="bg-black/40 border-white/10 h-16 rounded-2xl text-center font-mono text-xl font-black" />
                   </div>
                </div>
              )}

              <div className="space-y-6">
                <h3 className="text-[11px] font-black uppercase text-primary tracking-widest flex items-center gap-3"><ImageIcon className="w-5 h-5" /> Обои чата</h3>
                <div 
                  className="w-full aspect-video rounded-[2.2rem] border border-white/10 bg-white/5 flex items-center justify-center relative overflow-hidden group cursor-pointer"
                  onClick={() => bgInputRef.current?.click()}
                >
                   {form.chatBackground ? <img src={form.chatBackground} className="w-full h-full object-cover" alt="Chat Background" /> : <Plus className="w-10 h-10 text-white/10" />}
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <span className="text-[10px] font-black uppercase bg-primary text-white px-4 py-2 rounded-xl">Выбрать фото</span>
                   </div>
                   <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-8 m-0 p-8 pb-24">
              <div className="bg-primary/5 p-8 rounded-[3rem] border border-primary/10 space-y-8 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5"><div className="bg-primary/20 p-4 rounded-2xl shadow-xl"><Fingerprint className="w-8 h-8 text-primary" /></div><div className="flex flex-col text-left"><span className="text-lg font-black text-white uppercase italic">Система 2FA</span><span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Quantum Barrier</span></div></div><Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                </div>
                {form.twoFactorEnabled && (
                  <div className="space-y-6">
                    <Input type="password" placeholder="••••••" maxLength={6} value={form.twoFactorPin} onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})} className="bg-black/60 border-primary/30 h-16 rounded-2xl text-center text-3xl tracking-[0.6em] font-black" />
                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <div className="flex flex-col text-left"><span className="text-sm font-bold text-white uppercase italic">Hardware ID</span><span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Face ID / Biometrics</span></div>
                      <Switch checked={form.biometricEnabled} onCheckedChange={v => { if(!v) setForm({...form, biometricEnabled: false}); else handleLinkBiometrics(); }} />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-accent/5 p-8 rounded-[3rem] border border-accent/20 space-y-8 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5"><div className="bg-accent/20 p-4 rounded-2xl shadow-xl"><Lock className="w-8 h-8 text-accent" /></div><div className="flex flex-col text-left"><span className="text-lg font-black text-white uppercase italic">Облачный пароль</span><span className="text-[9px] text-accent/60 uppercase font-black tracking-widest">Master Password</span></div></div>
                  <Switch checked={form.cloudPasswordEnabled} onCheckedChange={v => setForm({...form, cloudPasswordEnabled: v})} />
                </div>
                {form.cloudPasswordEnabled && (
                  <div className="relative">
                    <Input type={showCloudPass ? "text" : "password"} placeholder="Мастер-код" value={form.cloudPassword} onChange={e => setForm({...form, cloudPassword: e.target.value})} className="bg-black/60 border-accent/30 h-14 rounded-2xl text-center font-bold pr-12" />
                    <button type="button" onClick={() => setShowCloudPass(!showCloudPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white">
                      {showCloudPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="data" className="space-y-6 m-0 p-8 pb-24">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[11px] font-black uppercase text-primary tracking-widest flex items-center gap-3">
                    <Smartphone className="w-5 h-5" /> Активные узлы
                  </h3>
                  <Button variant="ghost" onClick={handleTerminateAllOther} className="h-8 rounded-lg text-[8px] font-black uppercase text-red-400 bg-red-400/10 hover:bg-red-400/20">Аннигилировать остальные</Button>
                </div>

                <div className="space-y-3">
                  {isSessionsLoading ? (
                    <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : sessions?.map(s => {
                    const isCurrent = s.id === currentSessionId;
                    return (
                      <div key={s.id} className={cn(
                        "p-5 rounded-[1.8rem] border flex items-center justify-between gap-4 transition-all shadow-lg",
                        isCurrent ? "bg-primary/5 border-primary/20" : "bg-white/[0.02] border-white/5"
                      )}>
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                            isCurrent ? "bg-primary/20" : "bg-white/5"
                          )}>
                             {s.deviceName?.includes("PC") || s.deviceName?.includes("macOS") ? <Laptop className={cn("w-6 h-6", isCurrent ? "text-primary" : "text-white/20")} /> : <Smartphone className={cn("w-6 h-6", isCurrent ? "text-primary" : "text-white/20")} />}
                          </div>
                          <div className="flex flex-col text-left min-w-0">
                            <span className="text-sm font-black text-white italic truncate uppercase tracking-tight">{s.deviceName}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{s.browser} • {s.ip}</span>
                            </div>
                            <span className="text-[8px] text-muted-foreground/60 uppercase font-black mt-1">
                              {isCurrent ? <span className="text-green-500">В сети</span> : formatLastSeen(s.lastActive)}
                            </span>
                          </div>
                        </div>
                        {!isCurrent && (
                          <Button variant="ghost" size="icon" onClick={() => handleTerminateSession(s.id)} className="h-10 w-10 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20">
                            <ShieldX className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-white/[0.02] shrink-0 flex gap-4">
            <Button variant="ghost" className="h-16 w-16 rounded-[1.8rem] bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-xl" onClick={() => signOut(auth)}><LogOut className="w-7 h-7" /></Button>
            <Button disabled={isSaving} className="flex-1 h-16 rounded-[1.8rem] font-black uppercase italic tracking-widest bg-primary text-white shadow-2xl active:scale-95 transition-all" onClick={handleSave}>
              {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : <><Check className="w-6 h-6 mr-3" /> Сохранить</>}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PremiumBenefit({ label, icon: Icon, active }: any) {
  return (
    <div className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all", active ? "bg-primary/10 border-primary/20" : "bg-white/5 border-white/5")}>
      <div className="flex items-center gap-3">
        <Icon className={cn("w-4 h-4", active ? "text-accent" : "text-white/20")} />
        <span className={cn("text-[11px] font-bold uppercase", active ? "text-white" : "text-white/40")}>{label}</span>
      </div>
      {active && <CheckCircle2 className="w-4 h-4 text-green-500" />}
    </div>
  );
}
