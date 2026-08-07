
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  LogOut, Settings2, Camera, Star, ShieldCheck, Loader2, Fingerprint, Palette, 
  ChevronRight, Globe, Smartphone, Monitor, Trash2, Zap, Mail, Phone, Lock, 
  Eye, EyeOff, AlertTriangle, UserCheck, ShieldAlert, QrCode, Key, Image as ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { isUserPremium, cn } from '@/lib/utils';
import type { User, PrivacyOption } from '@/lib/types';
import { QRCodeSVG } from 'qrcode.react';
import { authenticator } from 'otplib';

/**
 * SETTINGS MODAL V6.5.2 «STABLE RESOLUTION»
 * ИСПРАВЛЕНО: Корректный импорт хуков через Firebase Barrel.
 */
export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { settingsTab, setSettingsTab } = useAppState();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<User>(userRef);

  const [isSaving, setIsSaving] = useState(false);
  const [confirmValue, setConfirmValue] = useState('');
  
  // TOTP State
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [totpInput, setTotpInput] = useState('');

  const [form, setForm] = useState({
    name: '', username: '', bio: '', avatarUrl: '', phone: '', email: '',
    twoFactorEnabled: false, twoFactorPin: '', biometricEnabled: false,
    appearance: 'dark' as 'light' | 'dark', theme: 'default',
    bubbleStyle: 'default', chatBackground: '', customPrimaryColor: '', customAppIconUrl: '',
    isGhostMode: false,
    phoneVisibility: 'contacts' as PrivacyOption,
    lastSeenVisibility: 'everybody' as PrivacyOption,
    allowGroupsFrom: 'everybody' as PrivacyOption,
    totpEnabled: false
  });

  useEffect(() => {
    if (profile && open) {
      setForm({
        name: profile.name || '',
        username: (profile.username || '').replace('@', ''),
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || '',
        phone: profile.phone || '',
        email: profile.email || '',
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        biometricEnabled: !!profile.settings?.biometricEnabled,
        appearance: profile.settings?.appearance || 'dark',
        theme: profile.settings?.theme || 'default',
        bubbleStyle: profile.settings?.bubbleStyle || 'default',
        chatBackground: profile.settings?.chatBackground || '',
        customPrimaryColor: profile.settings?.customPrimaryColor || '',
        customAppIconUrl: profile.settings?.customAppIconUrl || '',
        isGhostMode: !!profile.settings?.privacy?.isGhostMode,
        phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'contacts',
        lastSeenVisibility: profile.settings?.privacy?.lastSeenVisibility || 'everybody',
        allowGroupsFrom: profile.settings?.privacy?.allowGroupsFrom || 'everybody',
        totpEnabled: !!profile.totpEnabled
      });
    }
  }, [profile, open]);

  const handleSave = async () => {
    if (!db || !user) return;
    setIsSaving(true);
    try {
      const usernameWithAt = '@' + form.username.trim().replace('@', '');
      await updateDoc(doc(db, 'users', user.uid), {
        name: form.name.trim(),
        username: usernameWithAt,
        usernameLowercase: usernameWithAt.toLowerCase(),
        bio: form.bio.trim(),
        avatarUrl: form.avatarUrl,
        phone: form.phone.trim(),
        email: form.email.trim(),
        twoFactorEnabled: form.twoFactorEnabled,
        twoFactorPin: form.twoFactorPin,
        'settings.appearance': form.appearance,
        'settings.theme': form.theme,
        'settings.biometricEnabled': form.biometricEnabled,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.chatBackground': form.chatBackground,
        'settings.customPrimaryColor': form.customPrimaryColor,
        'settings.customAppIconUrl': form.customAppIconUrl,
        'settings.privacy.isGhostMode': form.isGhostMode,
        'settings.privacy.phoneVisibility': form.phoneVisibility,
        'settings.privacy.lastSeenVisibility': form.lastSeenVisibility,
        'settings.privacy.allowGroupsFrom': form.allowGroupsFrom
      });
      toast({ title: "Конфигурация обновлена" });
      onOpenChange(false);
    } catch (e: any) { toast({ title: "Сбой записи", variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  const initTotp = () => {
    const secret = authenticator.generateSecret();
    setTotpSecret(secret);
    setShowTotpSetup(true);
  };

  const verifyTotp = async () => {
    if (authenticator.check(totpInput, totpSecret)) {
      await updateDoc(doc(db!, 'users', user!.uid), {
        totpEnabled: true,
        totpSecret: totpSecret
      });
      toast({ title: "Двухфакторная защита активна" });
      setShowTotpSetup(false);
      setForm(prev => ({ ...prev, totpEnabled: true }));
    } else {
      toast({ title: "Неверный код", variant: "destructive" });
    }
  };

  const disableTotp = async () => {
    if (confirm('Вы уверены, что хотите отключить Облачный Код?')) {
      await updateDoc(doc(db!, 'users', user!.uid), { totpEnabled: false, totpSecret: '' });
      setForm(prev => ({ ...prev, totpEnabled: false }));
      toast({ title: "Защита ослаблена" });
    }
  };

  const otpAuthUrl = `otpauth://totp/Nuxus:${form.username}?secret=${totpSecret}&issuer=NuxusChat`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/98 backdrop-blur-[60px] border-white/10 p-0 overflow-hidden h-[90dvh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 text-left bg-gradient-to-b from-primary/10 to-transparent">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black italic uppercase text-white">
            <Settings2 className="w-7 h-7 text-primary" /> КОНФИГУРАЦИЯ
          </DialogTitle>
          <DialogDescription className="text-[9px] font-black uppercase text-primary/40 mt-1">Nuxus Kernel V6.5.1</DialogDescription>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 mt-4">
            <TabsList className="grid grid-cols-4 bg-white/5 p-1 rounded-2xl border border-white/5">
              <TabsTrigger value="profile" className="text-[9px] font-black uppercase tracking-widest">Узел</TabsTrigger>
              <TabsTrigger value="privacy" className="text-[9px] font-black uppercase tracking-widest">Защита</TabsTrigger>
              <TabsTrigger value="style" className="text-[9px] font-black uppercase tracking-widest">Стиль</TabsTrigger>
              <TabsTrigger value="data" className="text-[9px] font-black uppercase tracking-widest">Инфо</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="pb-40"> 
              <TabsContent value="profile" className="space-y-6 m-0 p-8">
                 <div className="flex flex-col items-center gap-6">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                       <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" />
                       <div className="absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-2xl shadow-2xl border-2 border-[#0a0a0c]"><Camera className="w-4 h-4 text-white" /></div>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                    </div>
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4 w-full">
                       <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Имя в сети</Label>
                          <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Имя" className="h-12 bg-black/40 border-white/5 rounded-xl font-bold" />
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Уникальный ID</Label>
                          <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="nick" className="h-12 bg-black/40 border-white/5 rounded-xl font-bold" />
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Спецификация</Label>
                          <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Опишите функции вашего узла..." className="bg-black/40 border-white/5 rounded-2xl resize-none h-24" />
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-6 m-0 p-8">
                 <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-8 shadow-xl">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-lg"><Key className="w-6 h-6 text-primary" /></div>
                          <div className="flex flex-col">
                             <span className="text-sm font-black text-white uppercase italic">Облачный Код (TOTP)</span>
                             <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Google Auth / iOS Passwords</span>
                          </div>
                       </div>
                       {form.totpEnabled ? (
                         <Button variant="ghost" onClick={disableTotp} className="h-9 px-4 rounded-xl bg-red-500/10 text-red-500 text-[8px] font-black uppercase border border-red-500/20">Отключить</Button>
                       ) : (
                         <Button onClick={initTotp} className="h-9 px-4 rounded-xl bg-primary text-white text-[8px] font-black uppercase shadow-lg shadow-primary/20">Включить</Button>
                       )}
                    </div>

                    {showTotpSetup && (
                      <div className="bg-black/40 p-6 rounded-[2rem] border border-primary/20 space-y-6 animate-in zoom-in-95 duration-500">
                         <div className="bg-white p-4 rounded-2xl mx-auto w-fit shadow-2xl relative overflow-hidden">
                            <QRCodeSVG value={otpAuthUrl} size={160} />
                            <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                         </div>
                         <div className="text-center space-y-2">
                            <p className="text-[10px] text-white/60 font-black uppercase tracking-tight italic">Отсканируйте код или введите ключ:</p>
                            <code className="text-primary font-black text-xs block bg-white/5 py-3 rounded-lg border border-white/5">{totpSecret}</code>
                         </div>
                         <div className="flex gap-2">
                            <Input placeholder="000000" maxLength={6} value={totpInput} onChange={e => setTotpInput(e.target.value.replace(/\D/g, ''))} className="h-12 bg-black/40 border-white/10 text-center text-xl tracking-[0.5em] font-black focus:border-primary/50" />
                            <Button onClick={verifyTotp} className="h-12 bg-primary px-6 rounded-xl font-black uppercase text-[10px] shadow-xl">Verify</Button>
                      </div>
                      </div>
                    )}
                 </div>

                 <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-6 shadow-xl">
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-white uppercase italic">Ghost Mode</span>
                          <span className="text-[8px] text-white/20 font-black uppercase">Полная невидимость статуса</span>
                       </div>
                       <Switch checked={form.isGhostMode} onCheckedChange={v => setForm({...form, isGhostMode: v})} />
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-white uppercase italic">Face ID / Biometric</span>
                          <span className="text-[8px] text-white/20 font-black uppercase">Защита нативного входа</span>
                       </div>
                       <Switch checked={form.biometricEnabled} onCheckedChange={v => setForm({...form, biometricEnabled: v})} />
                    </div>
                    <div className="space-y-4 pt-4 border-t border-white/5">
                       <PrivacySelector label="Видимость номера" value={form.phoneVisibility} onChange={v => setForm({...form, phoneVisibility: v})} />
                       <PrivacySelector label="Последний вход" value={form.lastSeenVisibility} onChange={v => setForm({...form, lastSeenVisibility: v})} />
                       <PrivacySelector label="Интеграция в группы" value={form.allowGroupsFrom} onChange={v => setForm({...form, allowGroupsFrom: v})} />
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-6 m-0 p-8">
                 <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-8 shadow-xl">
                    <div className="space-y-3">
                       <Label className="text-[9px] font-black uppercase text-primary/60 ml-1 flex items-center gap-2">
                         <Palette className="w-3 h-3" /> Цвет акцента (HEX)
                       </Label>
                       <div className="flex gap-3">
                          <Input value={form.customPrimaryColor} onChange={e => setForm({...form, customPrimaryColor: e.target.value})} placeholder="#A855F7" className="h-12 bg-black/40 border-white/10 font-mono text-center tracking-widest font-black" />
                          <div className="w-12 h-12 rounded-2xl shadow-2xl border border-white/10 shrink-0 relative overflow-hidden" style={{ backgroundColor: form.customPrimaryColor || 'hsl(var(--primary))' }}>
                             <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <Label className="text-[9px] font-black uppercase text-primary/60 ml-1 flex items-center gap-2">
                         <ImageIcon className="w-3 h-3" /> Фон чата (URL)
                       </Label>
                       <Input value={form.chatBackground} onChange={e => setForm({...form, chatBackground: e.target.value})} placeholder="https://unsplash.com/photo-..." className="h-12 bg-black/40 border-white/10 rounded-xl" />
                    </div>

                    <div className="space-y-3">
                       <Label className="text-[9px] font-black uppercase text-primary/60 ml-1 flex items-center gap-2">
                         <Smartphone className="w-3 h-3" /> Кастомная иконка (URL)
                       </Label>
                       <Input value={form.customAppIconUrl} onChange={e => setForm({...form, customAppIconUrl: e.target.value})} placeholder="https://i.ibb.co/..." className="h-12 bg-black/40 border-white/10 rounded-xl" />
                    </div>

                    <div className="space-y-3">
                       <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Пакет пузырей</Label>
                       <div className="grid grid-cols-2 gap-2">
                          {['default', 'neon', 'gold', 'ocean'].map(s => (
                            <button key={s} onClick={() => setForm({...form, bubbleStyle: s as any})} className={cn("h-12 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all shadow-md", form.bubbleStyle === s ? "border-primary bg-primary/20 text-primary scale-105" : "border-white/5 bg-black/40 text-white/30 hover:bg-white/5")}>{s}</button>
                          ))}
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-8 m-0 p-8">
                 <div className="bg-red-500/5 p-8 rounded-[2.5rem] border border-red-500/20 space-y-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                       <AlertTriangle className="w-32 h-32 text-red-500" />
                    </div>
                    <div className="flex items-center gap-3 text-red-500 relative z-10">
                       <ShieldAlert className="w-8 h-8 animate-pulse" />
                       <h4 className="text-xl font-black uppercase italic tracking-tighter">Annihilate Node</h4>
                    </div>
                    <p className="text-[10px] text-red-500/60 font-bold uppercase leading-relaxed relative z-10">
                       Это действие необратимо. Весь контент, ключи шифрования и баланс NX будут стерты из Ядра навсегда.
                    </p>
                    <div className="space-y-3 relative z-10">
                       <Label className="text-[8px] font-black uppercase text-red-500/40 ml-2">Введите УНИЧТОЖИТЬ для подтверждения</Label>
                       <Input value={confirmValue} onChange={e => setConfirmValue(e.target.value)} className="h-12 bg-black/60 border-red-500/30 text-center font-black text-red-500 tracking-[0.2em]" placeholder="CONFIRM" />
                    </div>
                    <Button disabled={confirmValue !== 'УНИЧТОЖИТЬ'} onClick={() => {}} className="w-full h-14 bg-red-600 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl relative z-10 active:scale-95 transition-all">Аннигилировать Узел</Button>
                 </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-[#0a0a0c] shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all" onClick={() => signOut(auth!)}>
               <LogOut className="w-6 h-6" />
            </Button>
            <Button disabled={isSaving} className="flex-1 h-14 rounded-2xl font-black uppercase italic bg-primary text-white shadow-2xl shadow-primary/20 active:scale-95 group relative overflow-hidden transition-all" onClick={handleSave}>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : 'Записать в Ядро'}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PrivacySelector({ label, value, onChange }: { label: string, value: PrivacyOption, onChange: (v: PrivacyOption) => void }) {
  const options: PrivacyOption[] = ['everybody', 'contacts', 'premium', 'nobody'];
  const labels: Record<string, string> = { everybody: 'Все', contacts: 'Узлы', nobody: 'Никто' };
  return (
    <div className="space-y-2">
       <span className="text-[9px] font-black uppercase text-white/60 ml-1 tracking-widest italic">{label}</span>
       <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5 shadow-inner">
          {options.map(opt => (
            <button key={opt} onClick={() => onChange(opt)} className={cn("flex-1 py-2.5 rounded-lg text-[8px] font-black uppercase transition-all", value === opt ? "bg-primary text-white shadow-lg" : "text-white/20 hover:text-white/40")}>{labels[opt]}</button>
          ))}
       </div>
    </div>
  )
}
