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
  Monitor, Layout, Type, MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { cn, isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';
import { generateAiAvatar } from '@/ai/flows/generate-ai-avatar-flow';

/**
 * ПАРАМЕТРЫ V17.0 «STRICT LOCAL»
 * Исправлено: Полное отключение residentKey для обхода iCloud Keychain.
 */
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
  const [isRequestingArchive, setIsRequestingArchive] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    username: '',
    bio: '',
    avatarUrl: '',
    appearance: 'dark' as 'light' | 'dark',
    theme: 'default',
    customPrimaryColor: '',
    bubbleStyle: 'default',
    messageSize: 'medium',
    twoFactorEnabled: false,
    twoFactorPin: '',
    biometricEnabled: false
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
        customPrimaryColor: profile.settings?.customPrimaryColor || '',
        bubbleStyle: profile.settings?.bubbleStyle || 'default',
        messageSize: profile.settings?.messageSize || 'medium',
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        biometricEnabled: !!profile.settings?.biometricEnabled
      });
    }
  }, [profile, open]);

  const handleSave = async () => {
    if (!db || !user) return;
    try {
      const cleanUsername = form.username.trim().replace('@', '').toLowerCase();
      await updateDoc(doc(db!, 'users', user.uid), {
        name: form.name.trim(),
        username: '@' + cleanUsername,
        bio: form.bio.trim(),
        avatarUrl: form.avatarUrl,
        twoFactorEnabled: form.twoFactorEnabled,
        twoFactorPin: form.twoFactorPin,
        'settings.appearance': form.appearance,
        'settings.theme': form.theme,
        'settings.customPrimaryColor': form.customPrimaryColor,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.messageSize': form.messageSize,
        'settings.biometricEnabled': form.biometricEnabled
      });
      onOpenChange(false);
      toast({ title: "Ядро обновлено V17.0" });
    } catch (e: any) {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    }
  };

  /**
   * КРИТИЧЕСКИЙ ФИКС V17.0: Отказ от Resident Keys.
   * Это заставляет iOS использовать локальный Secure Enclave и НЕ просить iCloud Keychain.
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
      const userHandle = window.crypto.getRandomValues(new Uint8Array(16));

      // ПАРАМЕТРЫ ДЛЯ ОБХОДА ICLOUD (V17.0)
      const options: any = {
        publicKey: {
          challenge,
          rp: { name: "Nuxus Kernel", id: window.location.hostname },
          user: { id: userHandle, name: user.uid, displayName: profile?.name || "Agent" },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: { 
            authenticatorAttachment: "platform",
            userVerification: "required",
            // НЕ запрашиваем residentKey и discoverableCredential - это убирает окно iCloud
            residentKey: "discouraged"
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
        toast({ title: "Локальный Face ID привязан" });
      }
    } catch (e: any) {
      console.error("Biometric Link Error:", e);
      // Если пользователь отменил или iCloud всё равно мешает
      if (e.name === 'NotAllowedError') {
        toast({ title: "Доступ отменен", description: "Используйте PIN-код.", variant: "destructive" });
      } else {
        toast({ title: "Сбой биометрии", variant: "destructive" });
      }
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
            <Settings2 className="w-5 h-5 text-primary" /> Параметры V17.0
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="grid grid-cols-4 bg-white/5 p-1 mx-6 mt-4 rounded-2xl shrink-0">
            <TabsTrigger value="profile" className="text-[8px] uppercase font-bold tracking-widest">Профиль</TabsTrigger>
            <TabsTrigger value="style" className="text-[8px] uppercase font-bold tracking-widest">Стиль</TabsTrigger>
            <TabsTrigger value="privacy" className="text-[8px] uppercase font-bold tracking-widest">Защита</TabsTrigger>
            <TabsTrigger value="data" className="text-[8px] uppercase font-bold tracking-widest">Данные</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="profile" className="space-y-6 m-0 p-6 pb-20">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                  <div className="absolute -bottom-2 -right-2 flex gap-1">
                    <button onClick={() => fileInputRef.current?.click()} className="bg-primary p-2 rounded-xl shadow-lg"><Camera className="w-4 h-4 text-white" /></button>
                    {isPremium && (
                      <button onClick={async () => {
                        setIsGeneratingAvatar(true);
                        try {
                          const { imageUrl } = await generateAiAvatar();
                          setForm({...form, avatarUrl: imageUrl});
                        } finally { setIsGeneratingAvatar(false); }
                      }} className={cn("bg-accent p-2 rounded-xl shadow-lg", isGeneratingAvatar && "animate-spin")}><Sparkles className="w-4 h-4 text-black" /></button>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                </div>
                
                <div className="space-y-4 w-full text-left">
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black ml-1">Имя</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-2xl" /></div>
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black ml-1">Никнейм</Label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span><Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-2xl pl-8" /></div></div>
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black ml-1">Био</Label><Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-white/5 border-white/10 rounded-2xl min-h-[80px]" /></div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="style" className="space-y-8 m-0 p-6 pb-20">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2"><Monitor className="w-3.5 h-3.5" /> Внешний вид</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setForm({...form, appearance: 'dark'})} className={cn("h-12 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all", form.appearance === 'dark' ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white/5 border-white/10 text-white/40")}>Тёмная</button>
                  <button onClick={() => setForm({...form, appearance: 'light'})} className={cn("h-12 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all", form.appearance === 'light' ? "bg-white text-black border-white shadow-lg" : "bg-white/5 border-white/10 text-white/40")}>Светлая</button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2"><Palette className="w-3.5 h-3.5" /> Цветовая схема</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['default', 'ocean', 'gold', 'cyberpunk'].map(t => (
                    <button key={t} onClick={() => setForm({...form, theme: t})} className={cn("h-10 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all", form.theme === t ? "bg-primary/20 text-primary border-primary" : "bg-white/5 border-white/10 text-white/40")}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                 <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> Стиль пузырей</h3>
                 <div className="grid grid-cols-2 gap-2">
                    {['default', 'neon', 'gold', 'ocean'].map(s => (
                      <button key={s} onClick={() => setForm({...form, bubbleStyle: s})} className={cn("h-10 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all", form.bubbleStyle === s ? "bg-white/10 text-white border-white/30 shadow-lg" : "bg-white/5 border-white/10 text-white/40")}>{s}</button>
                    ))}
                 </div>
              </div>

              <div className="space-y-4">
                 <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2"><Type className="w-3.5 h-3.5" /> Размер шрифта</h3>
                 <div className="flex gap-2">
                    {['small', 'medium', 'large'].map(sz => (
                      <button key={sz} onClick={() => setForm({...form, messageSize: sz})} className={cn("flex-1 h-10 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all", form.messageSize === sz ? "bg-white/10 text-white border-white/30" : "bg-white/5 border-white/10 text-white/40")}>{sz}</button>
                    ))}
                 </div>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-6 m-0 p-6 pb-20">
              <div className="bg-primary/5 p-6 rounded-[2.5rem] border border-primary/10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-3 rounded-2xl"><Fingerprint className="w-6 h-6 text-primary" /></div>
                    <div className="flex flex-col text-left"><span className="text-sm font-black text-white uppercase italic">Защита 2FA</span><span className="text-[8px] text-muted-foreground uppercase font-black">Двойной барьер</span></div>
                  </div>
                  <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                </div>
                
                {form.twoFactorEnabled && (
                  <div className="space-y-4">
                    <Label className="text-[9px] uppercase font-black text-primary/60 ml-2">Системный PIN-код</Label>
                    <Input type="password" placeholder="••••••" maxLength={6} value={form.twoFactorPin} onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})} className="bg-black/40 border-primary/20 h-14 rounded-2xl text-center text-2xl tracking-[0.5em] font-black" />
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex flex-col text-left"><span className="text-xs font-bold text-white uppercase">FaceID (Локально)</span><span className="text-[8px] text-muted-foreground uppercase font-bold">Чип Secure Enclave</span></div>
                      <Switch checked={form.biometricEnabled} onCheckedChange={v => { if(!v) setForm({...form, biometricEnabled: false}); else handleLinkBiometrics(); }} />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="data" className="space-y-6 m-0 p-6 pb-20">
               <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/10 text-center space-y-6">
                  <Database className="w-10 h-10 text-accent mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-black uppercase italic text-white">Управление данными</h3>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest leading-relaxed">Запросите полный ZIP-архив вашего узла. Мы подготовим сообщения, профиль и истории в одном пакете.</p>
                  </div>
                  <Button onClick={async () => {
                    setIsRequestingArchive(true);
                    try {
                      await addDoc(collection(db!, 'archiveRequests'), { userId: user?.uid, userName: profile?.name, status: 'pending', createdAt: new Date().toISOString() });
                      toast({ title: "Запрос отправлен" });
                    } finally { setIsRequestingArchive(false); }
                  }} disabled={isRequestingArchive} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2">
                    {isRequestingArchive ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4" /> Запросить ZIP-пакет</>}
                  </Button>
               </div>
            </TabsContent>
          </ScrollArea>

          <div className="p-6 border-t border-white/5 bg-white/[0.02] shrink-0 flex gap-3">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-500" onClick={() => signOut(auth)}><LogOut className="w-6 h-6" /></Button>
            <Button className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest bg-primary text-white shadow-xl shadow-primary/30" onClick={handleSave}><Check className="w-5 h-5 mr-2" /> Сохранить</Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}