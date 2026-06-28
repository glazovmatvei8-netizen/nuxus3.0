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
  LogOut, Settings2, Camera, Lock, Fingerprint, Sparkles, Star, Zap, ShieldCheck, Loader2, Database, Download, Check, Palette
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
 * ПАРАМЕТРЫ V15.0 «Data Sovereignty»
 * Оптимизированный Face ID (локальный режим без принудительного iCloud).
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
        'settings.biometricEnabled': form.biometricEnabled
      });
      onOpenChange(false);
      toast({ title: "Ядро обновлено V15.0" });
    } catch (e: any) {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    }
  };

  /**
   * ПРИВЯЗКА FACE ID В ЛОКАЛЬНОМ РЕЖИМЕ
   * residentKey: "discouraged" предотвращает принудительное включение iCloud Keychain.
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

      const options: any = {
        publicKey: {
          challenge,
          rp: { name: "Nuxus Local", id: window.location.hostname },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: user.uid,
            displayName: profile?.name || "User",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: { 
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "discouraged", 
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
        toast({ title: "Связь установлена", description: "Face ID привязан локально к этому узлу." });
      }
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        toast({ 
          title: "Связь заблокирована", 
          description: "Для работы Face ID установите код-пароль в настройках устройства.", 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Сбой биометрии", description: "Убедитесь, что Face ID активен в системе.", variant: "destructive" });
      }
    } finally {
      setIsLinkingBiometrics(false);
    }
  };

  const handleRequestArchive = async () => {
    if (!db || !user || !profile) return;
    setIsRequestingArchive(true);
    try {
      await addDoc(collection(db, 'archiveRequests'), {
        userId: user.uid,
        userName: profile.name,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast({ title: "Запрос отправлен", description: "ZIP-архив будет собран Администратором в ближайшее время." });
    } catch (e) {
      toast({ title: "Ошибка запроса", variant: "destructive" });
    } finally {
      setIsRequestingArchive(false);
    }
  };

  const isPremium = isUserPremium(profile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c] border-white/10 p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl outline-none">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter text-white">
            <Settings2 className="w-5 h-5 text-primary" /> Параметры V15.0
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="flex bg-white/5 p-1 mx-6 mt-4 rounded-2xl shrink-0">
            <TabsTrigger value="profile" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Профиль</TabsTrigger>
            <TabsTrigger value="privacy" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Защита</TabsTrigger>
            <TabsTrigger value="interface" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Инфо</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="profile" className="space-y-6 m-0 p-6 pb-20">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                  <div className="absolute -bottom-2 -right-2 flex gap-1">
                    <button onClick={() => fileInputRef.current?.click()} className="bg-primary p-2 rounded-xl shadow-lg hover:scale-110 transition-transform"><Camera className="w-4 h-4 text-white" /></button>
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
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black ml-1">Био</Label><Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-white/5 border-white/10 rounded-2xl min-h-[100px]" placeholder="О себе..." /></div>
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
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase font-black text-primary/60 ml-2">Системный PIN-код</Label>
                      <Input type="password" placeholder="••••••" maxLength={6} value={form.twoFactorPin} onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})} className="bg-black/40 border-primary/20 h-14 rounded-2xl text-center text-2xl tracking-[0.5em] font-black" />
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex flex-col text-left"><span className="text-xs font-bold text-white uppercase">FaceID (Локально)</span><span className="text-[8px] text-muted-foreground uppercase font-bold">Без iCloud Keychain</span></div>
                      <Switch checked={form.biometricEnabled} onCheckedChange={v => { if(!v) setForm({...form, biometricEnabled: false}); else handleLinkBiometrics(); }} />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="interface" className="space-y-6 m-0 p-6 pb-20">
               <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/10 text-center space-y-6">
                  <Zap className="w-10 h-10 text-primary mx-auto animate-pulse" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-black uppercase italic text-white">Nuxus Kernel V15.0</h3>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest leading-relaxed">Система ZIP-архивации полностью активирована.</p>
                  </div>
                  <div className="pt-4 border-t border-white/5 space-y-4">
                     <Database className="w-6 h-6 text-accent mx-auto" />
                     <p className="text-[8px] text-muted-foreground uppercase font-bold leading-relaxed px-4">Запросите полный ZIP-архив профиля с папками сообщений, историй и личных данных.</p>
                     <Button onClick={handleRequestArchive} disabled={isRequestingArchive} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2">
                        {isRequestingArchive ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4" /> Запросить ZIP-пакет</>}
                     </Button>
                  </div>
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