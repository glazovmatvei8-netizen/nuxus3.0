
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
  LogOut, Settings2, Camera, Lock, Fingerprint, Sparkles, Star, Zap, ShieldCheck, Loader2, Database, Download, Check, Palette, 
  Monitor, Layout, Type, MessageSquare, Paintbrush, Smile, Bell, Ghost, ImageIcon, Calendar, CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, addDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { cn, isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';
import nuxusVersions from '@/app/versions.json';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { settingsTab, setSettingsTab } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db!, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const [isLinkingBiometrics, setIsLinkingBiometrics] = useState(false);
  const [isRequestingArchive, setIsRequestingArchive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    username: '',
    bio: '',
    statusEmoji: '',
    statusText: '',
    avatarUrl: '',
    appearance: 'dark' as 'light' | 'dark',
    theme: 'default',
    customPrimaryColor: '',
    bubbleStyle: 'default',
    chatBackground: '',
    messageSize: 'medium',
    twoFactorEnabled: false,
    twoFactorPin: '',
    biometricEnabled: false,
    pwaNotificationsEnabled: false,
    isGhostMode: false
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
        appearance: profile.settings?.appearance || 'dark',
        theme: profile.settings?.theme || 'default',
        customPrimaryColor: profile.settings?.customPrimaryColor || '',
        bubbleStyle: profile.settings?.bubbleStyle || 'default',
        chatBackground: profile.settings?.chatBackground || '',
        messageSize: profile.settings?.messageSize || 'medium',
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        biometricEnabled: !!profile.settings?.biometricEnabled,
        pwaNotificationsEnabled: !!profile.settings?.pwaNotificationsEnabled,
        isGhostMode: !!profile.settings?.privacy?.isGhostMode
      });
    }
  }, [profile, open]);

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
          toast({ title: "ID занят", description: "Этот никнейм уже используется другим узлом.", variant: "destructive" });
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
        twoFactorEnabled: form.twoFactorEnabled,
        twoFactorPin: form.twoFactorPin,
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
      toast({ title: "Конфигурация сохранена" });
    } catch (e: any) {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkBiometrics = async () => {
    if (typeof window === 'undefined' || !window.PublicKeyCredential || !user) {
      toast({ title: "Ошибка", description: "Hardware API недоступен", variant: "destructive" });
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
        toast({ title: "Face ID привязан к узлу" });
      }
    } catch (e: any) {
      setForm({ ...form, biometricEnabled: false });
      toast({ title: "Сбой биометрии", variant: "destructive" });
    } finally { setIsLinkingBiometrics(false); }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm({ ...form, chatBackground: reader.result as string });
    reader.readAsDataURL(file);
  };

  const isPremium = isUserPremium(profile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/95 backdrop-blur-[60px] border-white/10 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,1)] outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 text-left">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black italic uppercase tracking-tighter text-white">
            <Settings2 className="w-7 h-7 text-primary" /> Параметры v{nuxusVersions.latestVersion}
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
                  <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-40 w-40 border-4 border-primary/20 shadow-2xl relative z-10" fallbackName={form.name} />
                  <div className="absolute -bottom-2 -right-2 flex gap-2 z-20">
                    <button onClick={() => fileInputRef.current?.click()} className="bg-primary p-3 rounded-2xl shadow-2xl hover:scale-110 active:scale-90 transition-all"><Camera className="w-5 h-5 text-white" /></button>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                </div>
                
                <div className="space-y-6 w-full text-left">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black ml-2 text-primary/60">Идентификация</Label>
                      <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-xl font-bold text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black ml-2 text-primary/60">Никнейм</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-xs">@</span>
                        <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-xl pl-8 font-bold text-xs" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Smile className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[9px] font-black uppercase text-primary tracking-widest">Текущий Статус</span>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-14">
                        <Input 
                          placeholder="🏠" 
                          maxLength={2} 
                          value={form.statusEmoji} 
                          onChange={e => setForm({...form, statusEmoji: e.target.value})} 
                          className="bg-black/40 border-white/10 h-12 rounded-xl text-center text-xl" 
                        />
                      </div>
                      <Input 
                        placeholder="Чем занимаетесь?" 
                        value={form.statusText} 
                        onChange={e => setForm({...form, statusText: e.target.value})} 
                        className="bg-black/40 border-white/10 h-12 rounded-xl text-xs font-bold" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black ml-2 text-primary/60">Спецификация (О себе)</Label>
                    <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-white/5 border-white/10 rounded-2xl min-h-[80px] font-medium text-xs leading-relaxed" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="style" className="space-y-10 m-0 p-8 pb-24">
              <div className="space-y-6">
                <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><Monitor className="w-5 h-5" /> Визуальная среда</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setForm({...form, appearance: 'dark'})} className={cn("h-14 rounded-2xl border flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all", form.appearance === 'dark' ? "bg-primary text-white border-primary shadow-xl shadow-primary/20" : "bg-white/5 border-white/10 text-white/40")}>Obsidian</button>
                  <button onClick={() => setForm({...form, appearance: 'light'})} className={cn("h-14 rounded-2xl border flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all", form.appearance === 'light' ? "bg-white text-black border-white shadow-xl" : "bg-white/5 border-white/10 text-white/40")}>Crystal</button>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><ImageIcon className="w-5 h-5" /> Обои чата</h3>
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-white/5 group">
                    {form.chatBackground ? (
                      <img src={form.chatBackground} className="w-full h-full object-cover opacity-60" alt="Background" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 opacity-20">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-[9px] font-black uppercase">Фон не установлен</span>
                      </div>
                    )}
                    <button 
                      onClick={() => bgInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="text-[10px] font-black uppercase bg-white text-black px-4 py-2 rounded-xl">Сменить фон</span>
                    </button>
                  </div>
                  <Input 
                    placeholder="URL изображения фона..." 
                    value={form.chatBackground} 
                    onChange={e => setForm({...form, chatBackground: e.target.value})}
                    className="bg-white/5 border-white/10 h-11 rounded-xl text-xs font-mono"
                  />
                  <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
                </div>
              </div>

              {isPremium && (
                <div className="space-y-6 bg-primary/5 p-6 rounded-[2.5rem] border border-primary/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><Paintbrush className="w-5 h-5" /> HEX Резонанс</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                       <div className="h-14 w-14 rounded-2xl border border-white/10 shrink-0 shadow-inner" style={{ backgroundColor: form.customPrimaryColor || 'hsl(var(--primary))' }} />
                       <Input placeholder="#A855F7" value={form.customPrimaryColor} onChange={e => setForm({...form, customPrimaryColor: e.target.value.toUpperCase()})} className="bg-black/40 border-white/10 h-14 rounded-2xl text-center font-mono text-lg tracking-widest" />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><MessageSquare className="w-5 h-5" /> Контейнеры сигналов</h3>
                <div className="grid grid-cols-2 gap-3">
                    {['default', 'neon', 'gold', 'ocean'].map(s => (
                      <button key={s} onClick={() => setForm({...form, bubbleStyle: s})} className={cn("h-12 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all", form.bubbleStyle === s ? "bg-white/10 text-white border-white/30 shadow-2xl" : "bg-white/5 border-white/10 text-white/40")}>{s}</button>
                    ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="premium" className="space-y-8 m-0 p-8 pb-24">
               {isPremium ? (
                 <div className="space-y-8">
                   <div className="bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 p-8 rounded-[3rem] border border-primary/20 text-center relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 p-4"><Zap className="w-12 h-12 text-accent/20 rotate-12" /></div>
                      <Star className="w-16 h-16 text-accent fill-accent mx-auto mb-4 animate-pulse shadow-accent" />
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Elite Node Active</h3>
                      <div className="mt-6 flex items-center justify-center gap-3 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 mx-auto w-fit">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                          До: {profile?.premiumUntil ? format(new Date(profile.premiumUntil), 'dd.MM.yyyy', { locale: ru }) : 'Бессрочно'}
                        </span>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-primary ml-2">Разблокированные модули:</h4>
                      <div className="grid grid-cols-1 gap-2">
                        <PremiumBenefit label="Ghost Mode (Инкогнито)" icon={Ghost} active />
                        <PremiumBenefit label="Эксклюзивные 3D стикеры" icon={Smile} active />
                        <PremiumBenefit label="Приоритетная синхронизация" icon={ShieldCheck} active />
                        <PremiumBenefit label="Кастомные фоны чата" icon={ImageIcon} active />
                      </div>
                   </div>
                 </div>
               ) : (
                 <div className="space-y-8">
                   <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 text-center space-y-6">
                     <Star className="w-12 h-12 text-white/10 mx-auto" />
                     <div className="space-y-2">
                        <h3 className="text-xl font-black text-white uppercase italic">Nuxus Premium</h3>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-relaxed">Разблокируйте полный потенциал Ядра</p>
                     </div>
                     <Button className="w-full h-14 bg-white text-black rounded-2xl font-black uppercase italic tracking-widest shadow-xl">Подключить Elite</Button>
                   </div>

                   <div className="space-y-4 opacity-50">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40 ml-2">Что дает статус:</h4>
                      <div className="grid grid-cols-1 gap-2">
                        <PremiumBenefit label="Режим Призрака (Скрыть онлайн)" icon={Ghost} />
                        <PremiumBenefit label="Кастомные цвета и фоны" icon={Palette} />
                        <PremiumBenefit label="Эксклюзивные 3D артефакты" icon={Zap} />
                      </div>
                   </div>
                 </div>
               )}
            </TabsContent>

            <TabsContent value="privacy" className="space-y-8 m-0 p-8 pb-24">
              {isPremium && (
                <div className="bg-accent/5 p-6 rounded-[2.5rem] border border-accent/20 flex items-center justify-between shadow-lg mb-4">
                  <div className="flex items-center gap-4 text-left">
                    <div className="bg-accent/10 p-3 rounded-xl"><Ghost className="w-6 h-6 text-accent" /></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white uppercase italic">Ghost Mode</span>
                      <span className="text-[8px] text-accent font-black uppercase tracking-widest">Полная невидимость</span>
                    </div>
                  </div>
                  <Switch checked={form.isGhostMode} onCheckedChange={v => setForm({ ...form, isGhostMode: v })} />
                </div>
              )}

              <div className="bg-primary/5 p-8 rounded-[3rem] border border-primary/10 space-y-8 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="bg-primary/20 p-4 rounded-2xl shadow-xl"><Fingerprint className="w-8 h-8 text-primary" /></div>
                    <div className="flex flex-col text-left"><span className="text-lg font-black text-white uppercase italic">Система 2FA</span><span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Quantum Barrier</span></div>
                  </div>
                  <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                </div>
                {form.twoFactorEnabled && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black text-primary/60 ml-3">Доступ-код Ядра</Label>
                      <Input type="password" placeholder="••••••" maxLength={6} value={form.twoFactorPin} onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})} className="bg-black/60 border-primary/30 h-16 rounded-2xl text-center text-3xl tracking-[0.6em] font-black" />
                    </div>
                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <div className="flex flex-col text-left"><span className="text-sm font-bold text-white uppercase italic">Hardware ID</span><span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Secure Enclave Link</span></div>
                      <Switch checked={form.biometricEnabled} onCheckedChange={v => { if(!v) setForm({...form, biometricEnabled: false}); else handleLinkBiometrics(); }} />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="bg-accent/10 p-3 rounded-xl"><Bell className="w-5 h-5 text-accent" /></div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-bold text-white uppercase italic">Уведомления PWA</span>
                      <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">Сигналы в фоне</span>
                    </div>
                  </div>
                  <Switch checked={form.pwaNotificationsEnabled} onCheckedChange={(enabled) => {
                    if (enabled) {
                      Notification.requestPermission().then(p => {
                        if (p === 'granted') setForm({ ...form, pwaNotificationsEnabled: true });
                        else toast({ title: "Доступ к уведомлениям отклонен", variant: "destructive" });
                      });
                    } else {
                      setForm({ ...form, pwaNotificationsEnabled: false });
                    }
                  }} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="data" className="space-y-8 m-0 p-8 pb-24">
               <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 text-center space-y-8 shadow-2xl">
                  <Database className="w-14 h-14 text-accent mx-auto animate-pulse" />
                  <div className="space-y-3">
                    <h3 className="text-xl font-black uppercase italic text-white tracking-tighter">Целостность данных</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] leading-relaxed">Запросите полный квантовый дамп вашего узла.</p>
                  </div>
                  <Button onClick={async () => {
                    setIsRequestingArchive(true);
                    try {
                      await addDoc(collection(db!, 'archiveRequests'), { userId: user?.uid, userName: profile?.name, status: 'pending', createdAt: new Date().toISOString() });
                      toast({ title: "Сигнал отправлен" });
                    } finally { setIsRequestingArchive(false); }
                  }} disabled={isRequestingArchive} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 hover:bg-white/10 transition-all">
                    {isRequestingArchive ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Download className="w-5 h-5" /> Сформировать ZIP</>}
                  </Button>
               </div>
            </TabsContent>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-white/[0.02] shrink-0 flex gap-4">
            <Button variant="ghost" className="h-16 w-16 rounded-[1.8rem] bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all shadow-xl" onClick={() => signOut(auth)}><LogOut className="w-7 h-7" /></Button>
            <Button disabled={isSaving} className="flex-1 h-16 rounded-[1.8rem] font-black uppercase italic tracking-widest bg-primary text-white shadow-2xl shadow-primary/30 active:scale-95 transition-all group overflow-hidden" onClick={handleSave}>
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
