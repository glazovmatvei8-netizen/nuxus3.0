
"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  Users, ShieldAlert, Ghost, Mail, Share2, FileText, Download, Search, MessageCircle, CheckCircle2, Calendar, Shield, Info, Globe, Paintbrush, ArrowRight, ShieldQuestion, Clock, Sparkles, Wand2, Link as LinkIcon
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
 * SETTINGS MODAL V56.9.1 «SDK SYNC FIX»
 * ИСПРАВЛЕНО: Кнопка VK Link инициализируется только при доступности SDK.
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
    }
  }, [profile, open]);

  const handleVkLink = () => {
    const VKID = (window as any).VKIDSDK;
    if (!VKID) {
      toast({ title: "SDK VK еще не готов", description: "Попробуйте снова через секунду", variant: "destructive" });
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

      VKID.Auth.login()
        .then(async (data: any) => {
          if (!db || !user) return;
          const vId = data.user_id || data.id;
          await updateDoc(doc(db, 'users', user.uid), { vkId: vId });
          toast({ title: "VK ID Привязан", description: "Теперь вы можете входить через этот аккаунт." });
        })
        .catch((err: any) => {
          console.error("VK Link Error:", err);
          toast({ title: "Сбой привязки VK", variant: "destructive" });
        });
    } catch (e) {
      toast({ title: "Ошибка инициализации", variant: "destructive" });
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
        toast({ title: "Почта обновлена" });
      } finally {
        setIsVerifying(false);
      }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/98 backdrop-blur-[50px] border-white/10 p-0 overflow-hidden h-[90dvh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 relative overflow-hidden text-left">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
          <DialogTitle className="flex items-center gap-3 text-2xl font-black italic uppercase text-white relative z-10">
            <Settings2 className="w-7 h-7 text-primary" /> ПАРАМЕТРЫ ЯДРА
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 mt-4">
            <TabsList className="grid grid-cols-5 bg-white/5 p-1 rounded-2xl border border-white/5 shadow-inner">
              <TabsTrigger value="profile" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Узел</TabsTrigger>
              <TabsTrigger value="style" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Стиль</TabsTrigger>
              <TabsTrigger value="premium" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary"><Star className="w-3" /></TabsTrigger>
              <TabsTrigger value="privacy" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Защита</TabsTrigger>
              <TabsTrigger value="data" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Ядро</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="pb-40"> 
              <TabsContent value="profile" className="space-y-8 m-0 p-8">
                <div className="flex flex-col items-center gap-8">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl relative z-20" fallbackName={form.name} />
                    <div className="absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-2xl shadow-2xl z-30 border-2 border-[#0a0a0c]">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                  </div>

                  <div className="space-y-6 w-full text-left">
                    <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 space-y-4">
                       <div className="flex items-center gap-2"><LinkIcon className="w-4 h-4 text-primary" /><span className="text-[10px] font-black uppercase text-white tracking-widest">Связанные аккаунты</span></div>
                       <div className="flex flex-col gap-3">
                          <button 
                            type="button"
                            onClick={handleVkLink}
                            className="flex items-center justify-center gap-3 bg-[#0077ff] hover:bg-[#0066dd] text-white rounded-xl px-6 py-3 font-bold transition-all shadow-lg active:scale-95"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.598-.19 1.365 1.26 2.18 1.817.615.422 1.083.33 1.083.33l2.177-.03s1.14-.071.6-.972c-.044-.073-.314-.66-1.617-1.866-1.364-1.26-1.183-1.055.462-3.23.998-1.332 1.397-2.144 1.272-2.493-.12-.333-.862-.244-.862-.244l-2.45.015s-.182-.025-.316.056c-.132.08-.217.267-.217.267s-.39 1.037-.91 1.92c-1.094 1.84-1.532 1.937-1.713 1.82-.42-.27-.315-1.087-.315-1.666 0-1.812.275-2.568-.536-2.764-.27-.065-.467-.108-1.155-.115-.882-.01-1.63.003-2.054.21-.282.14-.498.45-.366.468.164.023.535.1.732.365.254.34.245 1.103.245 1.103s.146 2.13-.34 2.395c-.334.183-.792-.19-1.775-1.896-.504-.87-.886-1.83-.886-1.83s-.074-.18-.206-.276c-.16-.12-.384-.157-.384-.157l-2.33.015s-.35.01-.478.162c-.115.137-.008.42-.008.42s1.834 4.286 3.91 6.45c1.903 1.984 4.067 1.85 4.067 1.85h.98z"/>
                            </svg>
                            <span className="uppercase text-[9px] tracking-widest font-black">{profile?.vkId ? 'Обновить VK Link' : 'Привязать VK ID'}</span>
                          </button>
                       </div>
                    </div>

                    <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 space-y-4">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /><span className="text-[10px] font-black uppercase text-white tracking-widest">Электронная почта</span></div>
                         {profile?.emailVerified ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <ShieldAlert className="w-4 h-4 text-red-500" />}
                       </div>
                       <div className="flex gap-2">
                         <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="bg-black/40 border-white/10 h-12 rounded-xl text-sm" placeholder="Email..." />
                         {!profile?.emailVerified && <Button onClick={() => handleSendEmailCode(form.email, 'verifying_new')} className="h-12 w-12 rounded-xl bg-primary shrink-0"><Check className="w-5 h-5 text-white" /></Button>}
                       </div>
                       {(verifyStep === 'verifying_new') && (
                         <div className="space-y-4 animate-in fade-in zoom-in-95">
                           <Input value={inputCode} onChange={e => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="bg-black/60 border-primary/40 h-14 rounded-2xl text-center text-2xl tracking-[0.4em] font-black" />
                           <Button onClick={handleConfirmCode} className="w-full h-11 bg-primary rounded-xl font-black uppercase text-[10px]">Подтвердить</Button>
                         </div>
                       )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Имя</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl font-bold" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Никнейм</Label><Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl font-bold" /></div>
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
