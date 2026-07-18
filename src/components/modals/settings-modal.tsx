
"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  LogOut, Settings2, Camera, Star, ShieldCheck, Loader2, Link as LinkIcon, Mail, PhoneCall, Sparkles, Check, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, collection, query, limit, getDocs, where } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { isUserPremium } from '@/lib/utils';
import type { User, PrivacyOption } from '@/lib/types';
import { sendVerificationCode } from '@/ai/flows/send-verification-email-flow';

/**
 * SETTINGS MODAL V56.9.3 «FULL RESTORATION»
 * ВОССТАНОВЛЕНО: Био, Статус, Телефон.
 */
export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { settingsTab, setSettingsTab } = useAppState();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const [isSaving, setIsSaving] = useState(false);
  const [verifyStep, setVerifyStep] = useState<'idle' | 'verifying_new'>('idle');
  const [emailToVerify, setEmailToVerify] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [activeCode, setActiveCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [form, setForm] = useState({
    name: '', username: '', bio: '', statusEmoji: '', statusText: '', avatarUrl: '',
    phone: '', email: '',
    appearance: 'dark' as 'light' | 'dark', theme: 'default',
    twoFactorEnabled: false, twoFactorPin: '', biometricEnabled: false,
    privacy: { isGhostMode: false }
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
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        biometricEnabled: !!profile.settings?.biometricEnabled,
        privacy: { isGhostMode: !!profile.settings?.privacy?.isGhostMode }
      });
    }
  }, [profile, open]);

  const handleVkLink = async () => {
    const VKID = (window as any).VKIDSDK;
    if (!VKID) {
      toast({ title: "VK SDK еще грузится", variant: "destructive" });
      return;
    }
    try {
      VKID.Config.init({
        app: 54684553,
        redirectUrl: 'https://nuxus.fun',
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: '', 
      });
      const data = await VKID.Auth.login();
      if (!db || !user) return;
      const vId = data.user_id || data.id;
      await updateDoc(doc(db, 'users', user.uid), { vkId: vId });
      toast({ title: "VK ID Привязан" });
    } catch (e) {
      toast({ title: "Сбой привязки VK", variant: "destructive" });
    }
  };

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
        toast({ title: "Код отправлен" });
      }
    } catch (e) { toast({ title: "Сбой ИИ", variant: "destructive" }); }
    finally { setIsVerifying(false); }
  };

  const handleConfirmCode = async () => {
    if (inputCode !== activeCode) {
      toast({ title: "Неверный код", variant: "destructive" });
      return;
    }
    if (!db || !user) return;
    setIsVerifying(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { email: emailToVerify, emailVerified: true });
      setVerifyStep('idle');
      setForm({ ...form, email: emailToVerify });
      toast({ title: "Почта обновлена" });
    } finally { setIsVerifying(false); }
  };

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
        statusEmoji: form.statusEmoji.trim(),
        statusText: form.statusText.trim(),
        avatarUrl: form.avatarUrl,
        phone: form.phone.trim(),
        twoFactorEnabled: form.twoFactorEnabled,
        twoFactorPin: form.twoFactorPin,
        'settings.appearance': form.appearance,
        'settings.biometricEnabled': form.biometricEnabled,
        'settings.privacy.isGhostMode': form.privacy.isGhostMode
      });
      onOpenChange(false);
      toast({ title: "Узел синхронизирован" });
    } catch (e: any) { toast({ title: "Ошибка", description: e.message, variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/98 backdrop-blur-[50px] border-white/10 p-0 overflow-hidden h-[90dvh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 relative overflow-hidden text-left">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black italic uppercase text-white relative z-10">
            <Settings2 className="w-7 h-7 text-primary" /> ПАРАМЕТРЫ ЯДРА
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
              <TabsContent value="profile" className="space-y-8 m-0 p-8">
                <div className="flex flex-col items-center gap-8">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                    <div className="absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-2xl shadow-2xl border-2 border-[#0a0a0c]"><Camera className="w-4 h-4 text-white" /></div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                  </div>

                  <div className="space-y-6 w-full text-left">
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-6">
                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Имя</Label>
                           <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-black/40 border-white/10 h-12 rounded-xl font-bold" />
                         </div>
                         <div className="space-y-1.5">
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Никнейм</Label>
                           <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-black/40 border-white/10 h-12 rounded-xl font-bold" />
                         </div>
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Телефон</Label>
                         <div className="relative">
                           <PhoneCall className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                           <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-black/40 border-white/10 h-12 rounded-xl pl-11 font-bold" />
                         </div>
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">О себе (Био)</Label>
                         <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-black/40 border-white/10 rounded-2xl h-24 resize-none" placeholder="Расскажите о себе..." />
                       </div>
                    </div>

                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4">
                       <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-accent" /><span className="text-[10px] font-black uppercase text-white tracking-widest">Цифровой Статус</span></div>
                       <div className="flex gap-3">
                          <Input value={form.statusEmoji} onChange={e => setForm({...form, statusEmoji: e.target.value})} className="w-16 h-12 bg-black/40 border-white/10 rounded-xl text-center text-xl" placeholder="🔥" />
                          <Input value={form.statusText} onChange={e => setForm({...form, statusText: e.target.value})} className="flex-1 h-12 bg-black/40 border-white/10 rounded-xl text-xs font-bold" placeholder="Текст статуса..." />
                       </div>
                    </div>

                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-6">
                       <div className="space-y-4">
                          <div className="flex items-center gap-2"><LinkIcon className="w-4 h-4 text-primary" /><span className="text-[10px] font-black uppercase text-white tracking-widest">Связанные аккаунты</span></div>
                          <button type="button" onClick={handleVkLink} className="w-full flex items-center justify-center gap-3 bg-[#0077ff] hover:bg-[#0066dd] text-white rounded-xl py-3 font-bold transition-all shadow-lg active:scale-95">
                            <span className="uppercase text-[9px] tracking-widest font-black">{profile?.vkId ? 'Обновить VK Link' : 'Привязать VK ID'}</span>
                          </button>
                       </div>
                       <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /><span className="text-[10px] font-black uppercase text-white tracking-widest">Электронная почта</span></div>
                            {profile?.emailVerified ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <ShieldAlert className="w-4 h-4 text-red-500" />}
                          </div>
                          <div className="flex gap-2">
                            <Input value={form.email} onChange={e => setEmailToVerify(e.target.value)} className="bg-black/40 border-white/10 h-12 rounded-xl text-sm" placeholder="Email..." />
                            {!profile?.emailVerified && <Button onClick={() => handleSendEmailCode(emailToVerify, 'verifying_new')} className="h-12 w-12 rounded-xl bg-primary shrink-0"><Check className="w-5 h-5 text-white" /></Button>}
                          </div>
                          {verifyStep === 'verifying_new' && (
                            <div className="space-y-4"><Input value={inputCode} onChange={e => setInputCode(e.target.value)} placeholder="000000" className="bg-black/60 border-primary/40 h-14 rounded-2xl text-center text-2xl tracking-[0.4em] font-black" /><Button onClick={handleConfirmCode} className="w-full h-11 bg-primary rounded-xl font-black uppercase text-[10px]">Подтвердить</Button></div>
                          )}
                       </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-[#0a0a0c] shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <Button variant="ghost" className="h-16 w-16 rounded-[1.8rem] bg-red-500/10 text-red-500" onClick={() => signOut(auth)}><LogOut className="w-7 h-7" /></Button>
            <Button disabled={isSaving} className="flex-1 h-16 rounded-[1.8rem] font-black uppercase italic bg-primary text-white shadow-2xl active:scale-95 transition-all" onClick={handleSave}>{isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : <><Check className="w-6 h-6 mr-3" /> Сохранить</>}</Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
