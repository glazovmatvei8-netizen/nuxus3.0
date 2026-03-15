
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
  Bell, Video, Mic, MonitorSmartphone, Key, Trash2, ShieldAlert, RefreshCw, Save, Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut, updatePassword } from 'firebase/auth';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import { LegalModal } from './legal-modal';

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

  const [legalModal, setLegalModal] = useState<{ open: boolean, type: 'privacy' | 'terms' }>({ open: false, type: 'privacy' });
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
    statusEmoji: '',
    statusText: '',
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
        statusEmoji: profile.statusEmoji || '',
        statusText: profile.statusText || '',
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
        statusEmoji: form.statusEmoji,
        statusText: form.statusText,
        twoFactorEnabled: form.twoFactorEnabled,
        twoFactorPin: form.twoFactorPin,
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
      console.error("Pass Update Fail:", e);
      if (e.code === 'auth/requires-recent-login') {
        toast({ title: "Ошибка безопасности", description: "Перезайдите в аккаунт для смены пароля.", variant: "destructive" });
      } else {
        toast({ title: "Ошибка системы", description: e.message, variant: "destructive" });
      }
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleSelfDestruct = async () => {
    if (!db || !user) return;
    if (confirm('ВНИМАНИЕ: Это полностью удалит ваш узел (профиль) из Ядра навсегда. Вы уверены?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid));
        await signOut(auth);
        toast({ title: "Узел уничтожен", description: "Данные стерты навсегда." });
      } catch (e: any) {
        toast({ title: "Ошибка удаления", description: e.message, variant: "destructive" });
      }
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

            <TabsContent value="system" className="space-y-6 m-0 py-6">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                  <ShieldAlert className="w-4 h-4" /> Security Center (Auth)
                </h3>
                <div className="bg-muted/20 p-4 rounded-[1.8rem] border border-white/5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] uppercase font-black text-white/40 ml-1">Новый пароль аккаунта</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="bg-black/40 border-white/10 h-11 rounded-xl"
                      />
                      <Button 
                        size="icon" 
                        onClick={handleChangePassword} 
                        disabled={isPasswordLoading}
                        className="h-11 w-11 rounded-xl bg-primary shadow-lg"
                      >
                        {isPasswordLoading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-[7px] text-muted-foreground uppercase font-bold px-1">Минимум 6 символов. Не требует ввода старого пароля.</p>
                  </div>
                </div>

                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1 pt-2">
                  <MonitorSmartphone className="w-4 h-4" /> Доступы устройства (iOS/System)
                </h3>
                
                <div className="bg-muted/20 rounded-[1.8rem] border border-white/5 divide-y divide-white/[0.03] overflow-hidden">
                  <PermissionRow icon={Bell} label="Уведомления" status={perms.notifications} color="text-blue-400" />
                  <PermissionRow icon={Video} label="Камера" status={perms.camera} color="text-green-400" />
                  <PermissionRow icon={Mic} label="Микрофон" status={perms.mic} color="text-green-400" />
                </div>

                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1 pt-4">
                  <Key className="w-4 h-4" /> Сессия Ядра
                </h3>
                <div className="bg-muted/20 p-4 rounded-[1.8rem] border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/60 font-bold uppercase">Устройство</span>
                    <span className="text-[10px] font-black text-white italic">Node Session</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/60 font-bold uppercase">IP Сигнал</span>
                    <span className="text-[10px] font-black text-cyan-400">{profile?.lastIp || 'Shielded'}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-8 m-0 py-6">
              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-2"><Paintbrush className="w-3 h-3" /> Цветовая схема</Label>
                <div className="grid grid-cols-1 gap-2">
                  {THEMES.map((theme) => (
                    <button key={theme.id} onClick={() => setForm({ ...form, theme: theme.id as any })} className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all", form.theme === theme.id ? 'bg-primary/10 border-primary' : 'bg-muted/20 border-white/5')}>
                      <div className="flex items-center gap-3"><div className={cn("w-6 h-6 rounded-full", theme.color)} /><span className="text-sm font-bold text-white">{theme.name}</span></div>
                      {form.theme === theme.id && <Check className="w-5 h-5 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" /> Обои чата
                </Label>
                <div 
                  className="relative h-32 w-full rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-all overflow-hidden bg-muted/10"
                  onClick={() => bgInputRef.current?.click()}
                >
                  {form.chatBackground ? (
                    <>
                      <img src={form.chatBackground} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="Background preview" />
                      <div className="relative z-10 flex flex-col items-center gap-1">
                        <Upload className="w-5 h-5 text-primary" />
                        <span className="text-[10px] font-bold uppercase">Изменить фон</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-white/20" />
                      <span className="text-[10px] font-bold uppercase text-white/40">Выбрать изображение</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={bgInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if(f) {
                        const r = new FileReader();
                        r.onloadend = () => setForm({...form, chatBackground: r.result as string});
                        r.readAsDataURL(f);
                      }
                    }} 
                  />
                </div>
                {form.chatBackground && (
                  <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1 h-10 rounded-xl text-[9px] font-black uppercase bg-red-500/10 text-red-500 hover:bg-red-500/20" onClick={() => setForm({...form, chatBackground: ''})}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Удалить
                    </Button>
                    <Select value={form.chatBackgroundFit} onValueChange={(v: any) => setForm({...form, chatBackgroundFit: v})}>
                      <SelectTrigger className="flex-1 bg-muted/20 border-white/5 h-10 rounded-xl text-[9px] font-bold uppercase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-white/10 rounded-xl">
                        <SelectItem value="cover" className="text-[9px] font-bold uppercase">Заполнение</SelectItem>
                        <SelectItem value="contain" className="text-[9px] font-bold uppercase">Вписать</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-6 m-0 py-6">
              <div className="space-y-6 bg-muted/20 p-6 rounded-[2.5rem] border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-black text-white uppercase tracking-wider">Premium PIN (2FA)</span>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Защита при входе</span>
                  </div>
                  <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                </div>
                {form.twoFactorEnabled && (
                  <Input type="password" placeholder="••••••" maxLength={6} value={form.twoFactorPin} onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})} className="bg-black/40 border-white/10 h-12 rounded-xl text-center text-xl tracking-[0.5em] font-black" />
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-destructive flex items-center gap-2 px-1">
                  <ShieldAlert className="w-4 h-4" /> Danger Zone
                </h3>
                <Button 
                  variant="ghost" 
                  onClick={handleSelfDestruct}
                  className="w-full h-14 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-[1.8rem] font-black uppercase italic tracking-widest gap-2"
                >
                  <Zap className="w-4 h-4" /> Самоуничтожение Узла
                </Button>
                <p className="text-[7px] text-center text-muted-foreground uppercase font-bold px-6 leading-relaxed">
                  Все ваши данные будут стерты из Ядра навсегда. Это действие необратимо.
                </p>
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

function PermissionRow({ icon: Icon, label, status, color }: { icon: any, label: string, status: string, color: string }) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-3">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-xs font-bold text-white uppercase">{label}</span>
      </div>
      <span className={cn("text-[9px] font-black uppercase tracking-widest", status === 'granted' || status === 'Разрешено' ? "text-green-500" : "text-muted-foreground")}>
        {status === 'granted' ? 'Активно' : status}
      </span>
    </div>
  );
}
