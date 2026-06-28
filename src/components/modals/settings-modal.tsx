
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
  LogOut, Palette, Check, Settings2, Camera, Lock, Image as ImageIcon, 
  Paintbrush, Shield, Monitor, Fingerprint, Sparkles, Star, Ghost, Type, PenTool, Zap, Diamond, Crown, Sun, Moon, MessageSquare, ShieldCheck, Loader2, Cpu
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { cn, isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';
import { generateAiAvatar } from '@/ai/flows/generate-ai-avatar-flow';

const THEMES = [
  { id: 'default', name: 'Nuxus Оригинал', color: 'bg-[#8B5CF6]' },
  { id: 'ocean', name: 'Океан', color: 'bg-[#0EA5E9]' },
  { id: 'rainbow', name: 'Радужный', color: 'bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500' },
  { id: 'gold', name: 'Золотой Премиум', color: 'bg-[#EAB308]', premium: true },
  { id: 'emerald', name: 'Изумруд', color: 'bg-[#22C55E]' },
  { id: 'cyberpunk', name: 'Киберпанк 2077', color: 'bg-[#FDE047]', premium: true },
  { id: 'nebula', name: 'Туманность', color: 'bg-[#D8B4FE]', premium: true },
];

export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { settingsTab, setSettingsTab } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db!, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isLinkingBiometrics, setIsLinkingBiometrics] = useState(false);
  const [form, setForm] = useState({
    name: '',
    username: '',
    bio: '',
    avatarUrl: '',
    appearance: 'dark' as 'light' | 'dark',
    theme: 'default',
    bubbleStyle: 'default',
    twoFactorEnabled: false,
    twoFactorPin: '',
    chatBackground: '',
    chatBackgroundFit: 'cover' as 'cover' | 'contain',
    customAppIconUrl: '',
    customPrimaryColor: '',
    statusEmoji: '',
    statusText: '',
    biometricEnabled: false,
    privacy: {
      phoneVisibility: 'everybody',
      lastSeenVisibility: 'everybody',
      allowGroupsFrom: 'everybody',
      whoCanMessageMe: 'everybody',
      isGhostMode: false
    } as any,
    interfaceOverrides: {} as any
  });

  useEffect(() => {
    if (profile && open) {
      setForm({
        name: profile.name || '',
        username: (profile.username || '').replace('@', ''),
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || '',
        appearance: profile.settings?.appearance || 'dark',
        theme: profile.settings?.theme || 'default',
        bubbleStyle: profile.settings?.bubbleStyle || 'default',
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        chatBackground: profile.settings?.chatBackground || '',
        chatBackgroundFit: profile.settings?.chatBackgroundFit || 'cover',
        customAppIconUrl: profile.settings?.customAppIconUrl || '',
        customPrimaryColor: profile.settings?.customPrimaryColor || '',
        statusEmoji: profile.statusEmoji || '',
        statusText: profile.statusText || '',
        biometricEnabled: !!profile.settings?.biometricEnabled,
        privacy: profile.settings?.privacy || {
          phoneVisibility: 'everybody',
          lastSeenVisibility: 'everybody',
          allowGroupsFrom: 'everybody',
          whoCanMessageMe: 'everybody',
          isGhostMode: false
        },
        interfaceOverrides: profile.settings?.interfaceOverrides || {}
      });
    }
  }, [profile, open]);

  const handleSave = async () => {
    if (!db || !user) return;
    try {
      await updateDoc(doc(db!, 'users', user.uid), {
        name: form.name,
        username: '@' + form.username.toLowerCase(),
        bio: form.bio,
        avatarUrl: form.avatarUrl,
        twoFactorEnabled: form.twoFactorEnabled,
        twoFactorPin: form.twoFactorPin,
        statusEmoji: form.statusEmoji,
        statusText: form.statusText,
        'settings.appearance': form.appearance,
        'settings.theme': form.theme,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.chatBackground': form.chatBackground,
        'settings.chatBackgroundFit': form.chatBackgroundFit,
        'settings.customAppIconUrl': form.customAppIconUrl,
        'settings.customPrimaryColor': form.customPrimaryColor,
        'settings.privacy': form.privacy,
        'settings.interfaceOverrides': form.interfaceOverrides,
        'settings.biometricEnabled': form.biometricEnabled
      });
      onOpenChange(false);
      toast({ title: "Ядро обновлено V12.2" });
    } catch (e: any) {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    }
  };

  /**
   * КРИТИЧЕСКИЙ ФИКС V12.2: FACE ID БЕЗ ICLOUD
   * residentKey: "discouraged" заставляет iOS сохранять ключ только локально.
   */
  const handleLinkBiometrics = async () => {
    if (typeof window === 'undefined' || !window.PublicKeyCredential || !user) {
      toast({ title: "Ошибка", description: "Устройство не поддерживает биометрию", variant: "destructive" });
      return;
    }
    
    setIsLinkingBiometrics(true);
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const encoder = new TextEncoder();
      const userIdBuffer = encoder.encode(user.uid);

      const options: any = {
        publicKey: {
          challenge,
          rp: { name: "Nuxus Kernel", id: window.location.hostname },
          user: {
            id: userIdBuffer,
            name: user.uid,
            displayName: profile?.name || "Агент Nuxus",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: { 
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "discouraged", // ПРИНУДИТЕЛЬНОЕ ОТКЛЮЧЕНИЕ ICLOUD
            requireResidentKey: false
          },
          attestation: "none",
          timeout: 60000,
        }
      };

      const credential = await navigator.credentials.create(options) as any;
      if (credential) {
        const rawId = new Uint8Array(credential.rawId);
        const base64Id = window.btoa(String.fromCharCode(...rawId));
        
        localStorage.setItem('nuxus_biometric_id', base64Id);
        setForm({ ...form, biometricEnabled: true });
        toast({ title: "Локальная связь активна", description: "Face ID привязан без iCloud." });
      }
    } catch (e: any) {
      console.error("Nuxus Biometric Error:", e);
      toast({ title: "Связь прервана", description: "Убедитесь, что Face ID настроен в системе.", variant: "destructive" });
    } finally {
      setIsLinkingBiometrics(false);
    }
  };

  const isPremium = isUserPremium(profile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c] border-white/10 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl outline-none">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter text-white">
            <Settings2 className="w-5 h-5 text-primary" /> Параметры V12.2
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="flex bg-white/5 p-1 mx-6 mt-4 rounded-2xl shrink-0 overflow-x-auto scrollbar-hide">
            <TabsTrigger value="profile" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Профиль</TabsTrigger>
            <TabsTrigger value="appearance" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Стиль</TabsTrigger>
            <TabsTrigger value="privacy" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Защита</TabsTrigger>
            <TabsTrigger value="interface" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Инфо</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="profile" className="space-y-6 m-0 p-6 pb-20">
              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                  <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                  <div className="absolute -bottom-2 -right-2 flex gap-1">
                    <button onClick={() => fileInputRef.current?.click()} className="bg-primary p-2 rounded-xl border border-white/20 shadow-lg hover:scale-110 transition-transform">
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={async () => {
                      if (!isPremium) {
                        toast({ title: "Нужен статус Premium", variant: "destructive" });
                        return;
                      }
                      setIsGeneratingAvatar(true);
                      try {
                        const { imageUrl } = await generateAiAvatar();
                        setForm({...form, avatarUrl: imageUrl});
                      } finally { setIsGeneratingAvatar(false); }
                    }} disabled={isGeneratingAvatar} className={cn("bg-accent p-2 rounded-xl border border-white/20 shadow-lg hover:scale-110 transition-transform", isGeneratingAvatar && "animate-spin")}>
                      <Sparkles className="w-4 h-4 text-black" />
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                </div>
                
                <div className="space-y-4 w-full text-left">
                  <div className="grid grid-cols-4 gap-2 items-end">
                    <div className="space-y-2 col-span-1">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Значок</Label>
                      <Input placeholder="🔥" value={form.statusEmoji} onChange={e => setForm({...form, statusEmoji: e.target.value})} className="bg-white/5 border-white/5 h-12 rounded-2xl text-center text-lg" maxLength={2} />
                    </div>
                    <div className="space-y-2 col-span-3">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Статус</Label>
                      <Input placeholder="Ваш текущий статус..." value={form.statusText} onChange={e => setForm({...form, statusText: e.target.value})} className="bg-white/5 border-white/5 h-12 rounded-2xl" />
                    </div>
                  </div>
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Имя</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-white/5 border-white/5 h-12 rounded-2xl" /></div>
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Никнейм</Label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span><Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-white/5 border-white/5 h-12 rounded-2xl pl-8" /></div></div>
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">О себе</Label><Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-white/5 border-white/5 rounded-2xl resize-none h-24 text-xs" /></div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-8 m-0 p-6 pb-20">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2"><Monitor className="w-3 h-3" /> Тема</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setForm({...form, appearance: 'dark'})} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all", form.appearance === 'dark' ? "bg-primary/10 border-primary shadow-lg" : "bg-white/5 border-white/5")}>
                    <Moon className={cn("w-6 h-6", form.appearance === 'dark' ? "text-primary" : "text-muted-foreground")} /><span className="text-[10px] font-black uppercase">Тёмная</span>
                  </button>
                  <button onClick={() => setForm({...form, appearance: 'light'})} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all", form.appearance === 'light' ? "bg-primary/10 border-primary shadow-lg" : "bg-white/5 border-white/5")}>
                    <Sun className={cn("w-6 h-6", form.appearance === 'light' ? "text-primary" : "text-muted-foreground")} /><span className="text-[10px] font-black uppercase">Светлая</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-white/5">
                <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-2"><Paintbrush className="w-3 h-3" /> Палитра Ядра</Label>
                <div className="grid grid-cols-1 gap-2">
                  {THEMES.map((theme) => {
                    const isPremiumTheme = theme.premium && !isPremium;
                    return (
                      <button key={theme.id} disabled={isPremiumTheme} onClick={() => setForm({ ...form, theme: theme.id })} className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all", form.theme === theme.id ? "bg-primary/10 border-primary" : "bg-white/5 border-white/5", isPremiumTheme && "opacity-40")}>
                        <div className="flex items-center gap-3"><div className={cn("w-6 h-6 rounded-full", theme.color)} /><span className="text-sm font-bold text-white">{theme.name}</span>{theme.premium && <Star className="w-3 h-3 text-accent fill-accent" />}</div>
                        {form.theme === theme.id && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-6 m-0 p-6 pb-20">
              <div className="bg-primary/5 p-6 rounded-[2.5rem] border border-primary/10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-3 rounded-2xl"><Fingerprint className="w-6 h-6 text-primary" /></div>
                    <div className="flex flex-col text-left"><span className="text-sm font-black text-white uppercase italic">Защита 2FA</span><span className="text-[8px] text-muted-foreground uppercase font-black">Двойной барьер доступа</span></div>
                  </div>
                  <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                </div>
                
                {form.twoFactorEnabled && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase font-black text-primary/60 ml-2">Системный PIN-код</Label>
                      <Input type="password" placeholder="••••••" maxLength={6} value={form.twoFactorPin} onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})} className="bg-black/40 border-primary/20 h-14 rounded-2xl text-center text-2xl tracking-[0.5em] font-black" />
                    </div>

                    <div className="h-px bg-white/5 mx-2" />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col text-left"><span className="text-xs font-bold text-white uppercase">FaceID / TouchID</span><span className="text-[8px] text-muted-foreground uppercase font-bold">Биометрия (Без iCloud)</span></div>
                        <Switch checked={form.biometricEnabled} onCheckedChange={v => { if(!v) setForm({...form, biometricEnabled: false}); else handleLinkBiometrics(); }} />
                      </div>
                      
                      {!form.biometricEnabled && (
                        <Button 
                          variant="outline" 
                          className="w-full h-12 rounded-xl border-dashed border-primary/40 bg-primary/5 text-primary font-black uppercase text-[10px] tracking-widest gap-2"
                          onClick={handleLinkBiometrics}
                          disabled={isLinkingBiometrics}
                        >
                          {isLinkingBiometrics ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Привязать Face ID</>}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4"><div className="bg-white/5 p-3 rounded-2xl"><Ghost className="w-6 h-6 text-muted-foreground" /></div><div className="flex flex-col text-left"><span className="text-sm font-black text-white uppercase italic">Режим Призрака</span><span className="text-[8px] text-muted-foreground uppercase font-black">Скрытие онлайн-статуса</span></div></div>
                  <Switch disabled={!isPremium} checked={form.privacy.isGhostMode} onCheckedChange={v => setForm({...form, privacy: {...form.privacy, isGhostMode: v}})} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="interface" className="space-y-6 m-0 p-6 pb-20">
               <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/10 text-center space-y-4">
                  <Zap className="w-10 h-10 text-primary mx-auto animate-pulse" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-black uppercase italic text-white">Nuxus Kernel V12.2</h3>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest leading-relaxed">
                      Ядро полностью синхронизировано.<br/>Локальные модули (No-Cloud) активны.
                    </p>
                  </div>
               </div>
            </TabsContent>
          </ScrollArea>

          <div className="p-6 border-t border-white/5 bg-white/[0.02] shrink-0 flex gap-3">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all" onClick={() => signOut(auth)}> <LogOut className="w-6 h-6" /></Button>
            <Button className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest bg-primary text-white shadow-xl shadow-primary/20 transition-all active:scale-95" onClick={handleSave}><Check className="w-5 h-5 mr-2" /> Сохранить</Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
