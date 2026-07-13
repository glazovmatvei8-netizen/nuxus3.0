
"use client"

import React, { useState, useRef, useEffect } from 'react';
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
  Monitor, MessageSquare, ImageIcon, Info, Smile, Plus, Check, RefreshCcw, Smartphone, Laptop, PhoneCall, Eye, Users, ShieldAlert, Ghost
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, addDoc, collection, query, limit, getDocs, where } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { cn, isUserPremium, isGlobalAdmin } from '@/lib/utils';
import type { User, PrivacyOption } from '@/lib/types';
import nuxusVersions from '@/app/versions.json';

/**
 * SETTINGS MODAL V35.0.0 «PRIVACY ELITE»
 * Глобальное обновление раздела безопасности с Telegram-функциями.
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
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const isPremium = isUserPremium(profile);

  const [form, setForm] = useState({
    name: '', username: '', bio: '', statusEmoji: '', statusText: '', avatarUrl: '',
    phone: '', email: '',
    appearance: 'dark' as 'light' | 'dark', theme: 'default', customPrimaryColor: '',
    customAppIconUrl: '', bubbleStyle: 'default', chatBackground: '', messageSize: 'medium',
    twoFactorEnabled: false, twoFactorPin: '', biometricEnabled: false, 
    pwaNotificationsEnabled: false, isGhostMode: false,
    privacy: {
      whoCanMessageMe: 'everybody' as PrivacyOption,
      allowGroupsFrom: 'everybody' as PrivacyOption,
      phoneVisibility: 'contacts' as PrivacyOption,
      lastSeenVisibility: 'everybody' as PrivacyOption,
      whoCanCallMe: 'everybody' as PrivacyOption
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
          whoCanMessageMe: profile.settings?.privacy?.whoCanMessageMe || 'everybody',
          allowGroupsFrom: profile.settings?.privacy?.allowGroupsFrom || 'everybody',
          phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'contacts',
          lastSeenVisibility: profile.settings?.privacy?.lastSeenVisibility || 'everybody',
          whoCanCallMe: profile.settings?.privacy?.whoCanCallMe || 'everybody'
        }
      });
    }
  }, [profile, open]);

  const handleSave = async () => {
    if (!db || !user || !profile) return;
    setIsSaving(true);
    try {
      const usernameWithAt = '@' + form.username.trim().replace('@', '');
      
      // Update logic including all privacy fields
      await updateDoc(doc(db, 'users', user.uid), {
        name: form.name.trim(),
        username: usernameWithAt,
        bio: form.bio.trim(),
        statusEmoji: form.statusEmoji.trim(),
        statusText: form.statusText.trim(),
        avatarUrl: form.avatarUrl,
        phone: form.phone.trim(),
        email: form.email.trim(),
        twoFactorEnabled: form.twoFactorEnabled,
        twoFactorPin: form.twoFactorPin,
        'settings.appearance': form.appearance,
        'settings.theme': form.theme,
        'settings.customPrimaryColor': form.customPrimaryColor,
        'settings.customAppIconUrl': form.customAppIconUrl,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.chatBackground': form.chatBackground,
        'settings.biometricEnabled': form.biometricEnabled,
        'settings.privacy': { ...form.privacy, isGhostMode: form.isGhostMode }
      });
      onOpenChange(false);
      toast({ title: "Конфигурация обновлена" });
    } catch (e: any) { toast({ title: "Ошибка", variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  const handleLinkBiometrics = async () => {
    if (typeof window === 'undefined' || !window.PublicKeyCredential || !user) {
      toast({ title: "Ошибка", description: "Hardware API недоступен", variant: "destructive" });
      return;
    }
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
        toast({ title: "Face ID привязан" });
      }
    } catch (e) { toast({ title: "Сбой биометрии", variant: "destructive" }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/98 backdrop-blur-[60px] border-white/10 p-0 overflow-hidden h-[90dvh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
          <DialogTitle className="flex items-center gap-3 text-2xl font-black italic uppercase text-white relative z-10">
            <Settings2 className="w-7 h-7 text-primary" /> Параметры v{nuxusVersions.latestVersion}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 mt-4">
            <TabsList className="grid grid-cols-5 bg-white/5 p-1 rounded-2xl border border-white/5">
              <TabsTrigger value="profile" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Узел</TabsTrigger>
              <TabsTrigger value="style" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Стиль</TabsTrigger>
              <TabsTrigger value="premium" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary"><Star className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="privacy" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Защита</TabsTrigger>
              <TabsTrigger value="data" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Ядро</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 w-full h-full relative">
            <div className="pb-40"> 
              <TabsContent value="profile" className="space-y-8 m-0 p-8">
                {/* Admin Master Key */}
                {(profile?.id === 'GCvLucN8CjNcdaxPO2vmpZ84hNl1' || profile?.phone === '79508781529') && (
                  <Button onClick={() => updateDoc(doc(db!, 'users', user!.uid), { isPremium: true, phoneVerified: true })} className="w-full bg-green-500/20 text-green-500 border border-green-500/30 font-black uppercase text-[10px] tracking-[0.2em] mb-4">
                    MASTER KEY: VERIFY NODE
                  </Button>
                )}

                <div className="flex flex-col items-center gap-8">
                  <div className="relative group">
                    <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                    <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-2xl shadow-2xl hover:scale-110 transition-all"><Camera className="w-4 h-4 text-white" /></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                  </div>
                  
                  <div className="space-y-6 w-full">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Имя</Label>
                        <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">ID</Label>
                        <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl" />
                      </div>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Спецификация</Label>
                       <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-white/5 border-white/10 rounded-xl min-h-[80px]" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-10 m-0 p-8">
                <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><Monitor className="w-5 h-5" /> Визуальная среда</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setForm({...form, appearance: 'dark'})} className={cn("h-14 rounded-2xl border text-[11px] font-black uppercase transition-all", form.appearance === 'dark' ? "bg-primary text-white border-primary shadow-xl shadow-primary/20" : "bg-white/5 border-white/10 text-white/40")}>Obsidian</button>
                    <button onClick={() => setForm({...form, appearance: 'light'})} className={cn("h-14 rounded-2xl border text-[11px] font-black uppercase transition-all", form.appearance === 'light' ? "bg-white text-black border-white shadow-xl" : "bg-white/5 border-white/10 text-white/40")}>Crystal</button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase text-primary tracking-widest flex items-center gap-3"><ImageIcon className="w-5 h-5" /> Обои чата (HQ)</h3>
                  <div className="space-y-4">
                     <div 
                      className="w-full aspect-video rounded-[2.2rem] border border-white/10 bg-white/5 flex items-center justify-center relative overflow-hidden group cursor-pointer"
                      onClick={() => bgInputRef.current?.click()}
                    >
                       {form.chatBackground ? <img src={form.chatBackground} className="w-full h-full object-cover opacity-100" alt="Chat BG" /> : <Plus className="w-10 h-10 text-white/10" />}
                       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <span className="text-[10px] font-black uppercase bg-primary text-white px-4 py-2 rounded-xl shadow-2xl">Сменить фон</span>
                       </div>
                       <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, chatBackground: r.result as string}); r.readAsDataURL(f); } }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Кастомная иконка (URL)</Label>
                      <Input placeholder="URL иконки .png" value={form.customAppIconUrl} onChange={e => setForm({...form, customAppIconUrl: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl text-xs font-mono" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><MessageSquare className="w-5 h-5" /> Контейнеры сигналов</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {['default', 'neon', 'gold', 'ocean'].map(style => (
                      <button key={style} onClick={() => setForm({...form, bubbleStyle: style as any})} className={cn("h-12 rounded-xl border text-[10px] font-black uppercase transition-all", form.bubbleStyle === style ? "bg-white/10 border-white/30 text-white shadow-xl" : "bg-white/5 border-white/10 text-white/40")}>{style}</button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-8 m-0 p-8">
                {/* Stealth Header */}
                <div className="bg-accent/5 p-6 rounded-[2.5rem] border border-accent/20 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-4 text-left">
                    <div className="bg-accent/10 p-3 rounded-xl shadow-inner"><Ghost className="w-6 h-6 text-accent" /></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white uppercase italic">Ghost Mode</span>
                      <span className="text-[8px] text-accent font-black uppercase tracking-widest">Полная невидимость</span>
                    </div>
                  </div>
                  <Switch checked={form.isGhostMode} onCheckedChange={v => setForm({ ...form, isGhostMode: v })} />
                </div>

                <div className="space-y-6 bg-white/[0.02] p-6 rounded-[2.5rem] border border-white/5">
                  <h3 className="text-[11px] font-black uppercase text-primary tracking-widest px-2 mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Конфиденциальность
                  </h3>
                  
                  <PrivacySelect icon={Smartphone} label="Номер телефона" value={form.privacy.phoneVisibility} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, phoneVisibility: v}})} />
                  <PrivacySelect icon={Eye} label="Последний вход" value={form.privacy.lastSeenVisibility} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, lastSeenVisibility: v}})} />
                  <PrivacySelect icon={PhoneCall} label="Входящие вызовы" value={form.privacy.whoCanCallMe} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, whoCanCallMe: v}})} />
                  <PrivacySelect icon={Users} label="Приглашения в группы" value={form.privacy.allowGroupsFrom} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, allowGroupsFrom: v}})} />
                  <PrivacySelect icon={MessageSquare} label="Личные сообщения" value={form.privacy.whoCanMessageMe} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, whoCanMessageMe: v}})} />
                </div>

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
                        <div className="flex flex-col text-left"><span className="text-sm font-bold text-white uppercase italic">Face ID Link</span><span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Secure Enclave</span></div>
                        <Switch checked={form.biometricEnabled} onCheckedChange={v => { if(!v) setForm({...form, biometricEnabled: false}); else handleLinkBiometrics(); }} />
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-8 m-0 p-8 pb-24">
                <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 text-center space-y-8 shadow-2xl">
                  <RefreshCcw className={cn("w-14 h-14 text-primary mx-auto", isCheckingUpdates && "animate-spin")} />
                  <Button onClick={() => { setIsCheckingUpdates(true); setTimeout(() => { setIsCheckingUpdates(false); toast({ title: "Патч не обнаружен", description: "Используется актуальный протокол QES." }); }, 1500); }} disabled={isCheckingUpdates} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 shadow-lg">
                    Проверить наличие патчей
                  </Button>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-[#0a0a0c] shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))] relative">
            <Button variant="ghost" className="h-16 w-16 rounded-[1.8rem] bg-red-500/10 text-red-500 hover:bg-red-500/20" onClick={() => signOut(auth)}>
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

function PrivacySelect({ icon: Icon, label, value, isPremium, onChange }: any) {
  return (
    <div className="flex flex-col gap-3 group/item">
      <div className="flex items-center gap-3">
        <Icon className="w-3.5 h-3.5 text-primary/40 group-hover/item:text-primary transition-colors" />
        <span className="text-[9px] font-black uppercase text-white/60 tracking-widest">{label}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl text-[10px] font-black uppercase focus:border-primary/40 transition-all">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0c]/95 backdrop-blur-3xl border-white/10 rounded-2xl shadow-2xl">
          <SelectItem value="everybody" className="text-[10px] font-black uppercase">Все узлы</SelectItem>
          <SelectItem value="contacts" className="text-[10px] font-black uppercase flex items-center gap-2">
            Только контакты {!isPremium && <span className="ml-2 opacity-50">★</span>}
          </SelectItem>
          {isPremium ? (
            <SelectItem value="premium" className="text-[10px] font-black uppercase text-accent">
               Elite Nodes Only ★
            </SelectItem>
          ) : (
            <SelectItem value="premium" disabled className="text-[10px] font-black uppercase opacity-40">
               Premium Only ★
            </SelectItem>
          )}
          <SelectItem value="nobody" className="text-[10px] font-black uppercase text-red-400">Никто</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
