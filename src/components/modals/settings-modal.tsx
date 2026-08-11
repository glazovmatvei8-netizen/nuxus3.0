
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

/**
 * SETTINGS MODAL V31.0 «CENTRAL COMMAND»
 * Внедрена привязка номера/почты и фикс DialogTitle.
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
  const [form, setForm] = useState({
    name: '', username: '', bio: '', avatarUrl: '', phone: '', email: '',
    appearance: 'dark' as 'light' | 'dark', theme: 'default',
    customPrimaryColor: '', customAppIconUrl: '',
    phoneVisibility: 'contacts' as PrivacyOption,
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
        customAppIconUrl: profile.settings?.customAppIconUrl || '',
        phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'contacts',
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
        'settings.appearance': form.appearance,
        'settings.theme': form.theme,
        'settings.customPrimaryColor': form.customPrimaryColor,
        'settings.customAppIconUrl': form.customAppIconUrl,
        'settings.privacy.phoneVisibility': form.phoneVisibility,
      });
      toast({ title: "Настройки сохранены" });
      onOpenChange(false);
    } catch (e: any) { toast({ title: "Сбой записи", variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/98 backdrop-blur-[60px] border-white/10 p-0 overflow-hidden h-[90dvh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 text-left bg-gradient-to-b from-primary/10 to-transparent">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black italic uppercase text-white">
            <Settings2 className="w-7 h-7 text-primary" /> НАСТРОЙКИ
          </DialogTitle>
          <DialogDescription className="text-[9px] font-black uppercase text-primary/40 mt-1">Центр управления аккаунтом</DialogDescription>
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
              <TabsContent value="profile" className="space-y-6 m-0 p-8">
                 <div className="flex flex-col items-center gap-6">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                       <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" />
                       <div className="absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-2xl shadow-2xl border-2 border-[#0a0a0c]"><Camera className="w-4 h-4 text-white" /></div>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                    </div>
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4 w-full">
                       <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Имя</Label>
                          <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-12 bg-black/40 border-white/5 rounded-xl font-bold" />
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">ID (@)</Label>
                          <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="h-12 bg-black/40 border-white/5 rounded-xl font-bold" />
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">О себе</Label>
                          <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-black/40 border-white/5 rounded-2xl resize-none h-24" />
                       </div>
                    </div>

                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4 w-full">
                       <h4 className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Привязка данных</h4>
                       <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-white/40 ml-2">Телефон</Label>
                          <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+7 ..." className="h-12 bg-black/40 border-white/5 rounded-xl font-bold" />
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-white/40 ml-2">Email</Label>
                          <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="example@mail.com" className="h-12 bg-black/40 border-white/5 rounded-xl font-bold" />
                       </div>
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
              {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : 'Сохранить изменения'}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
