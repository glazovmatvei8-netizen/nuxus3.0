
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  LogOut, Settings2, Camera, Star, ShieldCheck, Loader2, Fingerprint, Palette, 
  ChevronRight, Globe, Smartphone, Monitor, Trash2, Zap, Mail, Phone, Lock, 
  Eye, EyeOff, AlertTriangle, UserCheck, ShieldAlert, Key, Image as ImageIcon, Type, LayoutGrid
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { isUserPremium, cn } from '@/lib/utils';
import type { User, PrivacyOption } from '@/lib/types';
import versions from '@/app/versions.json';

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
  const [form, setForm] = useState({
    name: '', username: '', bio: '', avatarUrl: '', phone: '', email: '',
    appearance: 'dark' as 'light' | 'dark', theme: 'default',
    customPrimaryColor: '', chatBackground: '',
    bubbleStyle: 'default' as any, fontFamily: 'jakarta' as any,
    messageSize: 'medium' as any,
    isGhostMode: false, twoFactorEnabled: false, twoFactorPin: ''
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
        appearance: profile.settings?.appearance || 'dark',
        theme: profile.settings?.theme || 'default',
        customPrimaryColor: profile.settings?.customPrimaryColor || '',
        chatBackground: profile.settings?.chatBackground || '',
        bubbleStyle: profile.settings?.bubbleStyle || 'default',
        fontFamily: profile.settings?.fontFamily || 'jakarta',
        messageSize: profile.settings?.messageSize || 'medium',
        isGhostMode: !!profile.settings?.privacy?.isGhostMode,
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || ''
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
        'settings.customPrimaryColor': form.customPrimaryColor,
        'settings.chatBackground': form.chatBackground,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.fontFamily': form.fontFamily,
        'settings.messageSize': form.messageSize,
        'settings.privacy.isGhostMode': form.isGhostMode,
      });
      toast({ title: "Настройки синхронизированы" });
      onOpenChange(false);
    } catch (e: any) { toast({ title: "Ошибка записи", variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  const handleAnnihilate = async () => {
    if (!confirm("ВНИМАНИЕ: Это действие безвозвратно удалит ваш аккаунт из Ядра Nuxus. Продолжить?")) return;
    if (!db || !user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      signOut(auth!);
      toast({ title: "Узел аннигилирован" });
    } catch (e) { toast({ title: "Сбой протокола" }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0a0a0c]/98 backdrop-blur-[60px] border-white/10 p-0 overflow-hidden h-[90dvh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 text-left bg-gradient-to-b from-primary/10 to-transparent">
          <DialogTitle className="flex items-center gap-4 text-3xl font-black italic uppercase text-white tracking-tighter">
            <Settings2 className="w-8 h-8 text-primary" /> НАСТРОЙКИ
          </DialogTitle>
          <DialogDescription className="text-[10px] font-black uppercase text-primary/40 mt-1 tracking-widest">Центр управления Личностью v{versions.latestVersion}</DialogDescription>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 mt-4">
            <TabsList className="grid grid-cols-4 bg-white/5 p-1 rounded-2xl border border-white/5">
              <TabsTrigger value="profile" className="text-[9px] font-black uppercase tracking-widest">Профиль</TabsTrigger>
              <TabsTrigger value="privacy" className="text-[9px] font-black uppercase tracking-widest">Защита</TabsTrigger>
              <TabsTrigger value="style" className="text-[9px] font-black uppercase tracking-widest">Стиль</TabsTrigger>
              <TabsTrigger value="data" className="text-[9px] font-black uppercase tracking-widest">Инфо</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="pb-40"> 
              {/* PROFILE TAB */}
              <TabsContent value="profile" className="space-y-6 m-0 p-8">
                 <div className="flex flex-col items-center gap-8">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                       <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-40 w-40 border-[6px] border-primary/20 shadow-2xl" />
                       <div className="absolute bottom-2 right-2 bg-primary p-3 rounded-2xl shadow-2xl border-4 border-[#0a0a0c] group-hover:scale-110 transition-transform"><Camera className="w-5 h-5 text-white" /></div>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                    </div>
                    
                    <div className="w-full space-y-4">
                       <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-5 shadow-xl">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Отображаемое имя</Label>
                             <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-14 bg-black/40 border-white/5 rounded-2xl font-bold text-lg" />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Уникальный ID (@)</Label>
                             <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="h-14 bg-black/40 border-white/5 rounded-2xl font-mono text-primary" />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Био аккаунта</Label>
                             <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Расскажите о себе..." className="bg-black/40 border-white/5 rounded-[1.8rem] resize-none h-28 p-4" />
                          </div>
                       </div>

                       <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-5 shadow-xl">
                          <h4 className="text-[11px] font-black uppercase text-white/40 tracking-widest px-1 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Верификация</h4>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-white/20 ml-2">Телефон</Label>
                             <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+7 ..." className="h-12 bg-black/40 border-white/5 rounded-xl font-bold" />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-white/20 ml-2">Email</Label>
                             <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="mail@nuxus.app" className="h-12 bg-black/40 border-white/5 rounded-xl font-bold" />
                          </div>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              {/* PRIVACY TAB */}
              <TabsContent value="privacy" className="space-y-6 m-0 p-8">
                 <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-8 shadow-xl">
                    <div className="flex items-center justify-between group">
                       <div className="flex flex-col gap-1">
                          <span className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> Режим «Призрак»</span>
                          <span className="text-[10px] text-white/30 font-bold uppercase">Скрывает время последнего входа</span>
                       </div>
                       <Switch checked={form.isGhostMode} onCheckedChange={v => setForm({...form, isGhostMode: v})} />
                    </div>

                    <div className="h-px bg-white/5" />

                    <div className="space-y-5">
                       <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                             <span className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Облачный пароль (2FA)</span>
                             <span className="text-[10px] text-white/30 font-bold uppercase">PIN-код для защиты аккаунта</span>
                          </div>
                          <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                       </div>
                       {form.twoFactorEnabled && (
                         <Input 
                           type="password" 
                           placeholder="Введите 6 цифр" 
                           maxLength={6}
                           value={form.twoFactorPin} 
                           onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})}
                           className="h-12 bg-black/40 border-primary/20 rounded-xl text-center font-black tracking-[0.5em]" 
                         />
                       )}
                    </div>
                 </div>

                 <div className="bg-red-500/5 p-6 rounded-[2.5rem] border border-red-500/10 space-y-4">
                    <h4 className="text-[11px] font-black uppercase text-red-500/60 tracking-widest flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Опасная зона</h4>
                    <Button variant="ghost" onClick={handleAnnihilate} className="w-full h-12 bg-red-500/10 text-red-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500/20">Аннигилировать Аккаунт</Button>
                 </div>
              </TabsContent>

              {/* STYLE TAB */}
              <TabsContent value="style" className="space-y-6 m-0 p-8">
                 <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-8 shadow-xl">
                    <div className="space-y-4">
                       <Label className="text-[10px] font-black uppercase text-primary/60 ml-1 flex items-center gap-2"><Palette className="w-4 h-4" /> Акцент системы (HEX)</Label>
                       <div className="flex gap-4">
                          <Input value={form.customPrimaryColor} onChange={e => setForm({...form, customPrimaryColor: e.target.value})} placeholder="#A855F7" className="h-14 bg-black/40 border-white/10 font-mono text-center tracking-widest font-black text-lg" />
                          <div className="w-14 h-14 rounded-2xl shadow-2xl border border-white/10 shrink-0" style={{ backgroundColor: form.customPrimaryColor || 'hsl(var(--primary))' }} />
                       </div>
                    </div>

                    <div className="space-y-4">
                       <Label className="text-[10px] font-black uppercase text-primary/60 ml-1 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Фон чатов (URL)</Label>
                       <Input value={form.chatBackground} onChange={e => setForm({...form, chatBackground: e.target.value})} placeholder="https://..." className="h-12 bg-black/40 border-white/5 rounded-xl font-medium" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-white/40 ml-1 flex items-center gap-2"><LayoutGrid className="w-3 h-3" /> Пузыри</Label>
                          <Select value={form.bubbleStyle} onValueChange={v => setForm({...form, bubbleStyle: v})}>
                             <SelectTrigger className="bg-black/40 border-white/5 rounded-xl h-11 text-[11px] font-bold uppercase">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="bg-[#0a0a0c] border-white/10 rounded-xl">
                                <SelectItem value="default">Стандарт</SelectItem>
                                <SelectItem value="neon">Неон</SelectItem>
                                <SelectItem value="gold">Золото</SelectItem>
                                <SelectItem value="ocean">Океан</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-white/40 ml-1 flex items-center gap-2"><Type className="w-3 h-3" /> Шрифт</Label>
                          <Select value={form.fontFamily} onValueChange={v => setForm({...form, fontFamily: v})}>
                             <SelectTrigger className="bg-black/40 border-white/5 rounded-xl h-11 text-[11px] font-bold uppercase">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="bg-[#0a0a0c] border-white/10 rounded-xl">
                                <SelectItem value="jakarta">Jakarta</SelectItem>
                                <SelectItem value="inter">Inter</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              {/* DATA TAB */}
              <TabsContent value="data" className="space-y-6 m-0 p-8">
                 <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 flex flex-col items-center gap-6 text-center shadow-xl">
                    <div className="h-20 w-20 rounded-[2rem] bg-primary/10 flex items-center justify-center border border-primary/20"><Zap className="w-10 h-10 text-primary animate-pulse" /></div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Nuxus Kernel</h3>
                       <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Версия сборки {versions.latestVersion}</p>
                    </div>
                    <div className="w-full h-px bg-white/5" />
                    <div className="grid grid-cols-2 gap-3 w-full">
                       <Button variant="ghost" className="h-14 rounded-2xl bg-white/5 font-black uppercase text-[10px] tracking-widest border border-white/5 hover:bg-white/10">Поддержка</Button>
                       <Button variant="ghost" className="h-14 rounded-2xl bg-white/5 font-black uppercase text-[10px] tracking-widest border border-white/5 hover:bg-white/10">Legal</Button>
                    </div>
                 </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-[#0a0a0c] shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            <Button variant="ghost" className="h-16 w-16 rounded-[1.8rem] bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-90" onClick={() => signOut(auth!)}>
               <LogOut className="w-7 h-7" />
            </Button>
            <Button disabled={isSaving} className="flex-1 h-16 rounded-[1.8rem] font-black uppercase italic bg-primary text-white shadow-2xl shadow-primary/20 active:scale-95 group relative overflow-hidden transition-all border border-white/10" onClick={handleSave}>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : 'Синхронизировать'}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
