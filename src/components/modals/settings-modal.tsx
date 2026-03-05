
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
  ExternalLink, MousePointerClick, Radio, ChevronRight, Terminal, Copy, Code2, Globe, Wifi, WifiOff, Smile,
  Image as ImageIcon, Paintbrush, Crop, Maximize, Move
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { isUserPremium, cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useTranslations } from '@/hooks/use-translations';

const THEMES = [
  { id: 'default', name: 'Nuxus Original', color: 'bg-[#8B5CF6]' },
  { id: 'ocean', name: 'Океан', color: 'bg-[#0EA5E9]' },
  { id: 'rainbow', name: 'Радужный', color: 'bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500' },
  { id: 'gold', name: 'Золотой Квант', color: 'bg-[#EAB308]' },
  { id: 'emerald', name: 'Изумруд', color: 'bg-[#22C55E]' },
];

export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslations();
  const { settingsTab, setSettingsTab } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

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
    language: 'ru',
    twoFactorEnabled: false,
    twoFactorPin: '',
    notifMessages: true,
    notifGroups: true,
    notifChannels: true,
    notifPreviews: true
  });

  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [isBgPlacementOpen, setIsBgPlacementOpen] = useState(false);

  useEffect(() => {
    if (profile && open) {
      setForm({
        name: profile.name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || '',
        statusEmoji: profile.statusEmoji || '',
        statusText: profile.statusText || '',
        theme: profile.settings?.theme || 'default',
        chatBackground: profile.settings?.chatBackground || '',
        chatBackgroundFit: profile.settings?.chatBackgroundFit || 'cover',
        language: profile.settings?.language || 'ru',
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        notifMessages: profile.settings?.notifications?.messages ?? true,
        notifGroups: profile.settings?.notifications?.groups ?? true,
        notifChannels: profile.settings?.notifications?.channels ?? true,
        notifPreviews: profile.settings?.notifications?.previews ?? true
      });
    }
  }, [profile, open]);

  const handleSave = () => {
    if (!userRef) return;
    updateDocumentNonBlocking(userRef, {
      name: form.name,
      username: form.username.startsWith('@') ? form.username.toLowerCase() : '@' + form.username.toLowerCase(),
      bio: form.bio,
      avatarUrl: form.avatarUrl,
      statusEmoji: form.statusEmoji,
      statusText: form.statusText,
      twoFactorEnabled: form.twoFactorEnabled,
      twoFactorPin: form.twoFactorPin,
      settings: {
        ...profile?.settings,
        theme: form.theme,
        chatBackground: form.chatBackground,
        chatBackgroundFit: form.chatBackgroundFit,
        language: form.language,
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

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBgPreview(reader.result as string);
        setIsBgPlacementOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const finalizeBackground = (fit: 'cover' | 'contain') => {
    if (bgPreview && userRef) {
      setForm({ ...form, chatBackground: bgPreview, chatBackgroundFit: fit });
      setBgPreview(null);
      setIsBgPlacementOpen(false);
      
      // Instant save to cloud
      updateDocumentNonBlocking(userRef, {
        settings: {
          ...profile?.settings,
          chatBackground: bgPreview,
          chatBackgroundFit: fit
        }
      });
      toast({ title: "Фон установлен и синхронизирован" });
    }
  };

  return (
    <>
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
            <TabsTrigger value="appearance" className="text-[8px] uppercase font-black tracking-widest px-1">Стиль</TabsTrigger>
            <TabsTrigger value="security" className="text-[8px] uppercase font-black tracking-widest px-1">Защита</TabsTrigger>
            <TabsTrigger value="referral" className="text-[8px] uppercase font-black tracking-widest px-1">Друзья</TabsTrigger>
            <TabsTrigger value="app" className="text-[8px] uppercase font-black tracking-widest px-1">Core</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-6">
            <TabsContent value="profile" className="space-y-6 m-0 py-6">
              <div className="flex flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setSettingsTab('appearance')}
                    className="h-10 px-6 rounded-full bg-primary/10 border-primary/20 text-primary font-black uppercase italic tracking-widest text-[10px] hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/10"
                  >
                    <Paintbrush className="w-3.5 h-3.5 mr-2" /> Оформление
                  </Button>
                </div>
                
                <div className="space-y-5 w-full">
                  <div className="flex gap-2">
                    <div className="w-16 space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground ml-1">Статус</Label>
                      <Input value={form.statusEmoji} onChange={e => setForm({...form, statusEmoji: e.target.value})} className="bg-muted/30 border-white/5 h-12 rounded-2xl text-center text-xl" placeholder="😊" maxLength={2} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground ml-1">Текст статуса</Label>
                      <Input value={form.statusText} onChange={e => setForm({...form, statusText: e.target.value})} className="bg-muted/30 border-white/5 h-12 rounded-2xl text-sm" placeholder="Что происходит?" maxLength={40} />
                    </div>
                  </div>

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

            <TabsContent value="appearance" className="space-y-8 m-0 py-6">
              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                  <Paintbrush className="w-3 h-3" /> Тема оформления
                </Label>
                <div className="grid grid-cols-1 gap-3">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setForm({ ...form, theme: theme.id as any })}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                        form.theme === theme.id 
                          ? 'bg-primary/10 border-primary shadow-lg' 
                          : 'bg-muted/20 border-white/5 hover:bg-muted/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full border border-white/20", theme.color)} />
                        <span className="text-sm font-bold text-white">{theme.name}</span>
                      </div>
                      {form.theme === theme.id && <Check className="w-5 h-5 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                  <ImageIcon className="w-3 h-3" /> Фон чатов
                </Label>
                <div className="bg-muted/20 p-6 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-4">
                  {form.chatBackground ? (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 group">
                      <img 
                        src={form.chatBackground} 
                        className={cn("w-full h-full", form.chatBackgroundFit === 'cover' ? 'object-cover' : 'object-contain')} 
                        alt="Background preview" 
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm gap-2">
                        <Button variant="outline" size="sm" className="h-8 rounded-xl text-[9px] uppercase font-bold" onClick={() => setIsBgPlacementOpen(true)}>Настроить</Button>
                        <Button variant="destructive" size="sm" className="h-8 rounded-xl text-[9px] uppercase font-bold" onClick={() => { setForm({ ...form, chatBackground: '' }); if (userRef) updateDocumentNonBlocking(userRef, { 'settings.chatBackground': '' }); }}>Удалить</Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => bgInputRef.current?.click()}
                      className="w-full aspect-video rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-all"
                    >
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Выбрать из галереи</span>
                    </div>
                  )}
                  <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBackgroundUpload} />
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
              </div>
            </TabsContent>

            <TabsContent value="app" className="py-6 space-y-6">
              <div className="text-center space-y-2 mb-4">
                <Smartphone className="w-12 h-12 text-primary mx-auto mb-2" />
                <h3 className="text-xl font-black uppercase italic text-white tracking-tighter">Nuxus Core v0.57.0</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Organization Update</p>
              </div>

              <div className="p-5 bg-primary/10 rounded-[2.5rem] border border-primary/20 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase text-white tracking-widest">Обход белых списков (DoH)</span>
                </div>
                <div className="space-y-3 text-[11px] text-muted-foreground leading-relaxed">
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full h-10 rounded-xl text-[9px] font-bold uppercase border-white/10 gap-2" onClick={() => window.open('https://1.1.1.1/dns-query', '_blank')}>
                      <ExternalLink className="w-3.5 h-3.5" /> Скачать DNS профиль (1.1.1.1)
                    </Button>
                    <p className="text-[8px] italic opacity-60 text-center">Установите профиль в Настройки &rarr; Основные &rarr; VPN и управление устройством</p>
                  </div>
                </div>
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

    <Dialog open={isBgPlacementOpen} onOpenChange={setIsBgPlacementOpen}>
      <DialogContent className="max-sm bg-card border-border rounded-[2.5rem] p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-2">
            <Move className="w-5 h-5 text-primary" /> Установка фона
          </DialogTitle>
          <DialogDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
            Как разместить изображение в чатах?
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/5 relative">
            <img 
              src={bgPreview || form.chatBackground} 
              className={cn("w-full h-full transition-all duration-500", bgPreview ? "opacity-100" : "opacity-50")} 
              style={{ objectFit: 'contain' }}
              alt="Preview"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
               <div className="w-24 h-1 bg-primary/40 rounded-full mb-1" />
               <div className="w-32 h-1 bg-primary/20 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button 
              variant="outline" 
              className="h-14 rounded-2xl border-primary/20 hover:bg-primary/10 flex justify-between px-6 group"
              onClick={() => finalizeBackground('cover')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <Move className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[11px] font-black uppercase italic">Заполнить всё</span>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Растянуть на весь экран</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-primary/40" />
            </Button>

            <Button 
              variant="outline" 
              className="h-14 rounded-2xl border-accent/20 hover:bg-accent/10 flex justify-between px-6 group"
              onClick={() => finalizeBackground('contain')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-xl group-hover:bg-accent/20 transition-colors">
                  <Maximize className="w-4 h-4 text-accent" />
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[11px] font-black uppercase italic">Вписать полностью</span>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Без потери качества и обрезки</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-accent/40" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" className="w-full text-[10px] font-black uppercase opacity-40" onClick={() => { setBgPreview(null); setIsBgPlacementOpen(false); }}>Отмена</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
