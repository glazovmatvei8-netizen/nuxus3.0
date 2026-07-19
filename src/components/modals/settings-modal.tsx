
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
  LogOut, Settings2, Camera, Star, ShieldCheck, Loader2, Mail, PhoneCall, Sparkles, Check, CheckCircle2, Fingerprint, Palette, Archive, ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { isUserPremium, isGlobalAdmin, cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import { sendVerificationCode } from '@/ai/flows/send-verification-email-flow';

/**
 * SETTINGS MODAL V58.0.0 «TOTAL RESTORATION»
 * Исправлены ошибки cn, восстановлены Био, Статус и кнопка подтверждения телефона.
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

  const handlePhoneVerify = async () => {
    setIsVerifying(true);
    // Имитация процесса верификации для прототипа
    setTimeout(async () => {
      if (db && user) {
        await updateDoc(doc(db, 'users', user.uid), { phoneVerified: true });
        toast({ title: "Узел верифицирован", description: "Номер телефона подтвержден в Ядре." });
      }
      setIsVerifying(false);
    }, 1500);
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
        'settings.theme': form.theme,
        'settings.biometricEnabled': form.biometricEnabled,
        'settings.privacy.isGhostMode': form.privacy.isGhostMode
      });
      onOpenChange(false);
      toast({ title: "Конфигурация обновлена" });
    } catch (e: any) { toast({ title: "Сбой записи", description: e.message, variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/98 backdrop-blur-[50px] border-white/10 p-0 overflow-hidden h-[90dvh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 text-left">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black italic uppercase text-white">
            <Settings2 className="w-7 h-7 text-primary" /> КОНФИГУРАЦИЯ
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
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">ID Узла</Label>
                           <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-black/40 border-white/10 h-12 rounded-xl font-bold" />
                         </div>
                       </div>

                       <div className="space-y-1.5">
                         <div className="flex items-center justify-between px-1">
                            <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Телефон</Label>
                            {profile?.phoneVerified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                         </div>
                         <div className="flex gap-2">
                            <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-black/40 border-white/10 h-12 rounded-xl font-bold flex-1" />
                            {!profile?.phoneVerified && (
                              <Button onClick={handlePhoneVerify} disabled={isVerifying} className="h-12 px-4 rounded-xl bg-primary text-[9px] font-black uppercase shadow-lg shadow-primary/20">
                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                              </Button>
                            )}
                         </div>
                       </div>

                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">О себе (Био)</Label>
                         <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-black/40 border-white/10 rounded-2xl h-24 resize-none" placeholder="Спецификация вашего узла..." />
                       </div>

                       <div className="space-y-4">
                          <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Статус в сети</Label>
                          <div className="flex gap-3">
                             <Input value={form.statusEmoji} onChange={e => setForm({...form, statusEmoji: e.target.value})} className="w-16 h-12 bg-black/40 border-white/10 rounded-xl text-center text-xl" placeholder="🔥" />
                             <Input value={form.statusText} onChange={e => setForm({...form, statusText: e.target.value})} className="flex-1 h-12 bg-black/40 border-white/10 rounded-xl text-xs font-bold" placeholder="Текст статуса..." />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-6 m-0 p-8">
                 <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-xl"><Fingerprint className="w-5 h-5 text-primary" /></div>
                        <div className="flex flex-col text-left">
                           <span className="text-sm font-bold text-white uppercase italic">Ghost Mode</span>
                           <span className="text-[9px] text-primary/40 font-black uppercase tracking-widest">Полная инкогнито-связь</span>
                        </div>
                      </div>
                      <Switch checked={form.privacy.isGhostMode} onCheckedChange={v => setForm({...form, privacy: { ...form.privacy, isGhostMode: v }})} />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                       <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /><span className="text-[10px] font-black uppercase text-white tracking-widest">Безопасность</span></div>
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">Облачный пароль (2FA)</span>
                          <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                       </div>
                       {form.twoFactorEnabled && (
                         <Input type="password" value={form.twoFactorPin} onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})} placeholder="6-значный PIN" maxLength={6} className="bg-black/40 border-white/10 h-12 rounded-xl text-center tracking-[0.4em] font-black" />
                       )}
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-6 m-0 p-8">
                 <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-6 text-left">
                    <div className="flex items-center gap-2"><Palette className="w-4 h-4 text-primary" /><span className="text-[10px] font-black uppercase text-white tracking-widest">Оформление</span></div>
                    <div className="grid grid-cols-2 gap-3">
                       <button onClick={() => setForm({...form, appearance: 'dark'})} className={cn("p-4 rounded-2xl border transition-all text-center font-bold text-sm", form.appearance === 'dark' ? "bg-primary/20 border-primary text-primary" : "bg-black/40 border-white/10 text-white/40")}>Темная</button>
                       <button onClick={() => setForm({...form, appearance: 'light'})} className={cn("p-4 rounded-2xl border transition-all text-center font-bold text-sm", form.appearance === 'light' ? "bg-primary/20 border-primary text-primary" : "bg-black/40 border-white/10 text-white/40")}>Светлая</button>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-6 m-0 p-8">
                 <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-6 text-left">
                    <div className="flex items-center gap-2"><Archive className="w-4 h-4 text-primary" /><span className="text-[10px] font-black uppercase text-white tracking-widest">Данные и Кеш</span></div>
                    <Button variant="ghost" className="w-full justify-between h-12 bg-white/5 rounded-xl text-[10px] font-black uppercase px-4">Очистить историю сессий <ChevronRight className="w-3 h-3" /></Button>
                 </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-[#0a0a0c] shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <Button variant="ghost" className="h-16 w-16 rounded-[1.8rem] bg-red-500/10 text-red-500" onClick={() => signOut(auth)}><LogOut className="w-7 h-7" /></Button>
            <Button disabled={isSaving} className="flex-1 h-16 rounded-[1.8rem] font-black uppercase italic bg-primary text-white shadow-2xl active:scale-95 transition-all" onClick={handleSave}>
              {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : <><Check className="w-6 h-6 mr-3" /> Сохранить Сигнал</>}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
