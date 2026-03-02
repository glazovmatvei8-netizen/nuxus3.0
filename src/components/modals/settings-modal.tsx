
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
  LogOut, Palette, Loader2, Crown, Check, 
  Monitor, Sparkles, Settings2, Moon, Droplets, ShieldCheck, Lock,
  Users, Share2, Star, Bell, BellOff, Info, Languages, Smartphone, Camera,
  Eye, UserCheck, MessageCircle, Share, PlusSquare, ShieldCheck as ShieldIcon, Zap,
  ExternalLink, MousePointerClick, Radio, ChevronRight, Terminal, Copy, Code2, Globe, Wifi, WifiOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useAppState } from '@/lib/store';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';
import { generateAiAvatar } from '@/ai/flows/generate-ai-avatar-flow';
import { useTranslations } from '@/hooks/use-translations';

const SSH_SCRIPT = `# Nuxus Ghost Tunnel v0.54.5
TARGET="studio-5946432351-bbd5e.web.app"
PORT=443
echo "Checking Core connectivity..."
if nc -zv $TARGET $PORT 2>&1 | grep -q 'succeeded'; then
  curl -Is https://$TARGET/ | head -n 1
else
  echo "Core Blocked. Check SSH Proxy."
fi`;

export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslations();
  const { settingsTab, setSettingsTab } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const [form, setForm] = useState({
    name: '',
    username: '',
    bio: '',
    avatarUrl: '',
    theme: 'default',
    messageSize: 'medium',
    language: 'ru',
    phoneVisibility: 'nobody',
    lastSeenVisibility: 'everybody',
    allowGroupsFrom: 'everybody',
    whoCanMessageMe: 'everybody',
    twoFactorEnabled: false,
    twoFactorPin: '',
    notifMessages: true,
    notifGroups: true,
    notifChannels: true,
    notifPreviews: true
  });

  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>('default');

  useEffect(() => {
    if (profile && open) {
      setForm({
        name: profile.name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || '',
        theme: profile.settings?.theme || 'default',
        messageSize: profile.settings?.messageSize || 'medium',
        language: profile.settings?.language || 'ru',
        phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'nobody',
        lastSeenVisibility: profile.settings?.privacy?.lastSeenVisibility || 'everybody',
        allowGroupsFrom: profile.settings?.privacy?.allowGroupsFrom || 'everybody',
        whoCanMessageMe: profile.settings?.privacy?.whoCanMessageMe || 'everybody',
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        notifMessages: profile.settings?.notifications?.messages ?? true,
        notifGroups: profile.settings?.notifications?.groups ?? true,
        notifChannels: profile.settings?.notifications?.channels ?? true,
        notifPreviews: profile.settings?.notifications?.previews ?? true
      });
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotifPermission(Notification.permission);
      }
    }
  }, [profile, open]);

  const handleSave = () => {
    if (!userRef) return;
    updateDocumentNonBlocking(userRef, {
      name: form.name,
      username: form.username.startsWith('@') ? form.username.toLowerCase() : '@' + form.username.toLowerCase(),
      bio: form.bio,
      avatarUrl: form.avatarUrl,
      twoFactorEnabled: form.twoFactorEnabled,
      twoFactorPin: form.twoFactorPin,
      settings: {
        ...profile?.settings,
        theme: form.theme,
        messageSize: form.messageSize,
        language: form.language,
        privacy: {
          ...profile?.settings?.privacy,
          phoneVisibility: form.phoneVisibility,
          lastSeenVisibility: form.lastSeenVisibility,
          allowGroupsFrom: form.allowGroupsFrom,
          whoCanMessageMe: form.whoCanMessageMe,
        },
        notifications: {
          messages: form.notifMessages,
          groups: form.notifGroups,
          channels: form.notifChannels,
          previews: form.notifPreviews
        }
      }
    });
    onOpenChange(false);
    toast({ title: "Настройки сохранены" });
  };

  const handleAiAvatar = async () => {
    if (!isUserPremium(profile)) return;
    setIsGeneratingAvatar(true);
    try {
      const { imageUrl } = await generateAiAvatar();
      setForm(prev => ({ ...prev, avatarUrl: imageUrl }));
      toast({ title: "Аватар готов!" });
    } catch (e) {} finally {
      setIsGeneratingAvatar(false);
    }
  };

  const copySsh = () => {
    navigator.clipboard.writeText(SSH_SCRIPT);
    toast({ title: "Скрипт скопирован", description: "Вставьте его в действие SSH в Командах" });
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0 bg-transparent">
          <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter text-white">
            <Settings2 className="w-5 h-5 text-primary" /> {t('settings.title')}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={(v) => setSettingsTab(v)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-5 bg-muted/50 p-1 mx-6 mt-4 rounded-2xl shrink-0 border border-white/5">
            <TabsTrigger value="profile" className="text-[8px] uppercase font-black tracking-widest px-1">Профиль</TabsTrigger>
            <TabsTrigger value="security" className="text-[8px] uppercase font-black tracking-widest px-1">Защита</TabsTrigger>
            <TabsTrigger value="appearance" className="text-[8px] uppercase font-black tracking-widest px-1">Увед.</TabsTrigger>
            <TabsTrigger value="referral" className="text-[8px] uppercase font-black tracking-widest px-1">Друзья</TabsTrigger>
            <TabsTrigger value="app" className="text-[8px] uppercase font-black tracking-widest px-1">Core</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-6">
            <TabsContent value="profile" className="space-y-6 m-0 py-6">
              <div className="flex flex-col items-center gap-8">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                </div>
                
                {isUserPremium(profile) && (
                  <Button variant="outline" className="h-10 rounded-2xl gap-2 text-[10px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 hover:bg-primary/10" onClick={handleAiAvatar} disabled={isGeneratingAvatar}>
                    {isGeneratingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-primary" />} Генерировать ИИ-аватар
                  </Button>
                )}

                <div className="space-y-5 w-full">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground ml-1">Имя пользователя</Label>
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-muted/30 border-white/5 h-12 rounded-2xl text-sm" placeholder="Введите имя" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground ml-1">Никнейм (@user)</Label>
                    <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-muted/30 border-white/5 h-12 rounded-2xl text-sm font-mono" placeholder="@username" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground ml-1">О себе</Label>
                    <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-muted/30 border-white/5 rounded-2xl min-h-[100px] text-sm resize-none" placeholder="Расскажите о себе..." />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-6 m-0 py-6">
              <div className="bg-muted/20 p-6 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-primary flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" /> Двухфакторная 2FA</Label>
                    <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                  </div>
                  {form.twoFactorEnabled && (
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Секретный PIN (6 цифр)</Label>
                      <Input type="password" maxLength={6} placeholder="Введите новый PIN" value={form.twoFactorPin} onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})} className="bg-black/20 border-white/5 h-12 rounded-xl text-center text-lg tracking-[0.3em] font-black" />
                    </div>
                  )}
                </div>

                <div className="space-y-5 pt-6 border-t border-white/5">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-accent flex items-center gap-2 mb-2"><Lock className="w-3.5 h-3.5" /> Конфиденциальность</Label>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Кто может писать мне</Label>
                      <Select value={form.whoCanMessageMe} onValueChange={(v) => setForm({...form, whoCanMessageMe: v as any})}>
                        <SelectTrigger className="h-11 rounded-xl bg-black/20 border-white/5 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-white"><SelectItem value="everybody">Все</SelectItem><SelectItem value="premium">Только Premium</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6 m-0 py-6">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground ml-4">УВЕДОМЛЕНИЯ О СООБЩЕНИЯХ</Label>
                  <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
                    <div className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center"><MessageCircle className="w-5 h-5 text-white" /></div><span className="text-[16px] font-medium text-white">Личные чаты</span></div><Switch checked={form.notifMessages} onCheckedChange={v => setForm({...form, notifMessages: v})} /></div>
                    <div className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div><span className="text-[16px] font-medium text-white">Группы</span></div><Switch checked={form.notifGroups} onCheckedChange={v => setForm({...form, notifGroups: v})} /></div>
                    <div className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-red-500 flex items-center justify-center"><Radio className="w-5 h-5 text-white" /></div><span className="text-[16px] font-medium text-white">Каналы</span></div><Switch checked={form.notifChannels} onCheckedChange={v => setForm({...form, notifChannels: v})} /></div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="app" className="py-6 space-y-6">
              <div className="text-center space-y-2 mb-4">
                <Smartphone className="w-12 h-12 text-primary mx-auto mb-2" />
                <h3 className="text-xl font-black uppercase italic text-white tracking-tighter">Nuxus Core v0.54.5</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Ghost Resilience Edition</p>
              </div>

              <div className="p-5 bg-primary/10 rounded-[2.5rem] border border-primary/20 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase text-white tracking-widest">Обход белых списков</span>
                </div>
                <div className="space-y-3 text-[11px] text-muted-foreground leading-relaxed">
                  <p>Если SSH недоступен, используйте системный DNS-профиль. Это позволит iPhone видеть Ядро даже при блокировках.</p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full h-10 rounded-xl text-[9px] font-bold uppercase border-white/10 gap-2" onClick={() => window.open('https://1.1.1.1/dns-query', '_blank')}>
                      <ExternalLink className="w-3.5 h-3.5" /> Скачать DNS профиль (1.1.1.1)
                    </Button>
                    <p className="text-[8px] italic opacity-60 text-center">Установите профиль в Настройки &rarr; Основные &rarr; VPN и управление устройством</p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-muted/10 rounded-[2.5rem] border border-white/5 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-4 h-4 text-accent" />
                  <span className="text-[10px] font-black uppercase text-white tracking-widest">Ghost Relay (SSH)</span>
                </div>
                <div className="space-y-3 text-[11px] text-muted-foreground leading-relaxed">
                  <div className="bg-black/40 p-3 rounded-xl border border-white/10 font-mono text-[9px] overflow-x-auto whitespace-pre relative group">
                    {SSH_SCRIPT}
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-white/5" onClick={copySsh}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/10 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase text-white">Пуш-уведомления</span>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full h-10 rounded-xl text-[9px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary"
                  onClick={requestNotificationPermission}
                >
                  {notifPermission === 'granted' ? 'Включены' : 'Включить пуш-уведомления'}
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>

          <div className="p-6 border-t border-white/5 bg-muted/20 shrink-0 flex gap-3">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shrink-0" onClick={() => signOut(auth)}><LogOut className="w-6 h-6" /></Button>
            <Button className="flex-1 h-14 rounded-2xl font-black uppercase tracking-[0.2em] italic bg-primary shadow-xl shadow-primary/20 text-xs text-white" onClick={handleSave}><Check className="w-5 h-5 mr-2" /> Сохранить</Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
