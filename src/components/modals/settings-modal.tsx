
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
  LogOut, Palette, Check, Settings2, Camera, Lock, Image as ImageIcon, 
  Paintbrush, Shield, UserCircle, Layout, Smile, FileText, ChevronRight,
  ShieldCheck, Eye, Users2, MessageSquareLock, Upload, Smartphone, Share2, Trophy,
  Bell, Video, Mic, MonitorSmartphone, Key, Trash2, ShieldAlert, RefreshCw, Save, Zap, Moon, Sun, Monitor
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut, updatePassword } from 'firebase/auth';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';

const THEMES = [
  { id: 'default', name: 'Nuxus Original', color: 'bg-[#8B5CF6]' },
  { id: 'ocean', name: 'Океан', color: 'bg-[#0EA5E9]' },
  { id: 'rainbow', name: 'Радужный', color: 'bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500' },
  { id: 'gold', name: 'Золотой Премиум', color: 'bg-[#EAB308]' },
  { id: 'emerald', name: 'Изумруд', color: 'bg-[#22C55E]' },
];

export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { settingsTab, setSettingsTab } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db!, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const [perms, setPerms] = useState({ notifications: 'default', camera: 'default', mic: 'default' });
  const [newPassword, setNewPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPerms({
        notifications: typeof Notification !== 'undefined' ? Notification.permission : 'default',
        camera: 'Разрешено',
        mic: 'Разрешено'
      });
    }
  }, [open]);

  const [form, setForm] = useState({
    name: '',
    username: '',
    bio: '',
    avatarUrl: '',
    appearance: 'dark' as 'light' | 'dark',
    theme: 'default',
    chatBackground: '',
    chatBackgroundFit: 'cover' as 'cover' | 'contain',
    twoFactorEnabled: false,
    twoFactorPin: '',
    privacy: {
      phoneVisibility: 'everybody',
      lastSeenVisibility: 'everybody',
      allowGroupsFrom: 'everybody',
      whoCanMessageMe: 'everybody'
    }
  });

  const isInitialized = useRef(false);

  useEffect(() => {
    if (profile && open && !isInitialized.current) {
      setForm({
        name: profile.name || '',
        username: (profile.username || '').replace('@', ''),
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || '',
        appearance: profile.settings?.appearance || 'dark',
        theme: profile.settings?.theme || 'default',
        chatBackground: profile.settings?.chatBackground || '',
        chatBackgroundFit: profile.settings?.chatBackgroundFit || 'cover',
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        privacy: {
          phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'everybody',
          lastSeenVisibility: profile.settings?.privacy?.lastSeenVisibility || 'everybody',
          allowGroupsFrom: profile.settings?.privacy?.allowGroupsFrom || 'everybody',
          whoCanMessageMe: profile.settings?.privacy?.whoCanMessageMe || 'everybody'
        }
      });
      isInitialized.current = true;
    }
    if (!open) isInitialized.current = false;
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
        'settings.appearance': form.appearance,
        'settings.theme': form.theme,
        'settings.chatBackground': form.chatBackground,
        'settings.chatBackgroundFit': form.chatBackgroundFit,
        'settings.privacy': form.privacy
      });
      onOpenChange(false);
      toast({ title: "Ядро обновлено" });
    } catch (e: any) {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (!auth.currentUser || !newPassword || newPassword.length < 6) {
      toast({ title: "Минимум 6 символов", variant: "destructive" });
      return;
    }
    setIsPasswordLoading(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      toast({ title: "Пароль успешно изменен" });
      setNewPassword('');
    } catch (e: any) {
      toast({ title: "Ошибка системы", description: e.message, variant: "destructive" });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter text-white">
            <Settings2 className="w-5 h-5 text-primary" /> Параметры Узла
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="flex bg-muted/50 p-1 mx-6 mt-4 rounded-2xl shrink-0 overflow-x-auto scrollbar-hide">
            <TabsTrigger value="profile" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Профиль</TabsTrigger>
            <TabsTrigger value="system" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Система</TabsTrigger>
            <TabsTrigger value="appearance" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Стиль</TabsTrigger>
            <TabsTrigger value="privacy" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Приватность</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-6">
            <TabsContent value="profile" className="space-y-6 m-0 py-6">
              <div className="flex flex-col items-center gap-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                </div>
                
                <div className="space-y-4 w-full">
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black">Имя</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-muted/30 border-white/5 h-12 rounded-2xl" /></div>
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black">Никнейм</Label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span><Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-muted/30 border-white/5 h-12 rounded-2xl pl-8" /></div></div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-8 m-0 py-6">
              {/* Тема (Light/Dark) */}
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                  <Monitor className="w-3 h-3" /> Режим интерфейса
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setForm({...form, appearance: 'dark'})}
                    className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all", form.appearance === 'dark' ? 'bg-primary/10 border-primary' : 'bg-muted/20 border-white/5')}
                  >
                    <Moon className={cn("w-6 h-6", form.appearance === 'dark' ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Тёмная</span>
                  </button>
                  <button 
                    onClick={() => setForm({...form, appearance: 'light'})}
                    className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all", form.appearance === 'light' ? 'bg-primary/10 border-primary' : 'bg-muted/20 border-white/5')}
                  >
                    <Sun className={cn("w-6 h-6", form.appearance === 'light' ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Светлая</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-2"><Paintbrush className="w-3 h-3" /> Цветовая схема</Label>
                <div className="grid grid-cols-1 gap-2">
                  {THEMES.map((theme) => (
                    <button key={theme.id} onClick={() => setForm({ ...form, theme: theme.id as any })} className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all", form.theme === theme.id ? 'bg-primary/10 border-primary' : 'bg-muted/20 border-white/5')}>
                      <div className="flex items-center gap-3"><div className={cn("w-6 h-6 rounded-full", theme.color)} /><span className="text-sm font-bold text-foreground">{theme.name}</span></div>
                      {form.theme === theme.id && <Check className="w-5 h-5 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="system" className="space-y-6 m-0 py-6">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                  <ShieldAlert className="w-4 h-4" /> Security Center
                </h3>
                <div className="bg-muted/20 p-4 rounded-[1.8rem] border border-white/5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] uppercase font-black text-foreground/40 ml-1">Новый пароль</Label>
                    <div className="flex gap-2">
                      <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-black/20 border-white/10 h-11 rounded-xl" />
                      <Button size="icon" onClick={handleChangePassword} disabled={isPasswordLoading} className="h-11 w-11 rounded-xl bg-primary"><Save className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>

          <div className="p-6 border-t border-white/5 bg-muted/20 shrink-0 flex gap-3">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive" onClick={() => signOut(auth)}> <LogOut className="w-6 h-6" /></Button>
            <Button className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest bg-primary shadow-lg shadow-primary/20" onClick={handleSave}><Check className="w-5 h-5 mr-2" /> Применить</Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
    </>
  );
}
