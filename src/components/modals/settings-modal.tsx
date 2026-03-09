
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
  Paintbrush, Move, Maximize, Shield, UserCircle, Layout, Smile, FileText, ChevronRight,
  ShieldCheck, Eye, Users2, MessageSquareLock, Upload, Trash2, Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import { LegalModal } from './legal-modal';

const THEMES = [
  { id: 'default', name: 'Nuxus Original', color: 'bg-[#8B5CF6]' },
  { id: 'ocean', name: 'Океан', color: 'bg-[#0EA5E9]' },
  { id: 'rainbow', name: 'Радужный', color: 'bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500' },
  { id: 'gold', name: 'Золотой Квант', color: 'bg-[#EAB308]' },
  { id: 'emerald', name: 'Изумруд', color: 'bg-[#22C55E]' },
];

const EMOJI_STATUSES = ['💎', '⚡️', '🦾', '🔥', '👑', '🌌', '👾', '✨', '💤', '🎯'];

export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { settingsTab, setSettingsTab } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const [legalModal, setLegalModal] = useState<{ open: boolean, type: 'privacy' | 'terms' }>({ open: false, type: 'privacy' });

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
    customAppIconUrl: '',
    twoFactorEnabled: false,
    twoFactorPin: '',
    privacy: {
      phoneVisibility: 'everybody',
      lastSeenVisibility: 'everybody',
      allowGroupsFrom: 'everybody',
      whoCanMessageMe: 'everybody'
    },
    notifications: {
      messages: true,
      groups: true,
      channels: true,
      previews: true
    },
    navVisibility: {
      contacts: true,
      calls: true,
      archive: true
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
        customAppIconUrl: profile.settings?.customAppIconUrl || '',
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        privacy: {
          phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'everybody',
          lastSeenVisibility: profile.settings?.privacy?.lastSeenVisibility || 'everybody',
          allowGroupsFrom: profile.settings?.privacy?.allowGroupsFrom || 'everybody',
          whoCanMessageMe: profile.settings?.privacy?.whoCanMessageMe || 'everybody'
        },
        notifications: {
          messages: profile.settings?.notifications?.messages !== false,
          groups: profile.settings?.notifications?.groups !== false,
          channels: profile.settings?.notifications?.channels !== false,
          previews: profile.settings?.notifications?.previews !== false
        },
        navVisibility: {
          contacts: profile.settings?.navVisibility?.contacts !== false,
          calls: profile.settings?.navVisibility?.calls !== false,
          archive: profile.settings?.navVisibility?.archive !== false
        }
      });
      isInitialized.current = true;
    }
    
    if (!open) isInitialized.current = false;
  }, [profile, open]);

  const handleSave = async () => {
    if (!db || !user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
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
        'settings.customAppIconUrl': form.customAppIconUrl,
        'settings.privacy': form.privacy,
        'settings.notifications': form.notifications,
        'settings.navVisibility': form.navVisibility
      });
      onOpenChange(false);
      toast({ title: "Ядро обновлено", description: "Конфигурация синхронизирована успешно" });
    } catch (e: any) {
      toast({ title: "Ошибка сохранения", description: e.message, variant: "destructive" });
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, chatBackground: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, customAppIconUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
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
          <DialogDescription className="sr-only">Персонализация профиля и безопасности</DialogDescription>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="flex bg-muted/50 p-1 mx-6 mt-4 rounded-2xl shrink-0 overflow-x-auto scrollbar-hide">
            <TabsTrigger value="profile" className="flex-1 text-[9px] uppercase font-bold tracking-widest whitespace-nowrap">Профиль</TabsTrigger>
            <TabsTrigger value="appearance" className="flex-1 text-[9px] uppercase font-bold tracking-widest whitespace-nowrap">Стиль</TabsTrigger>
            <TabsTrigger value="privacy" className="flex-1 text-[9px] uppercase font-bold tracking-widest whitespace-nowrap">Приватность</TabsTrigger>
            <TabsTrigger value="security" className="flex-1 text-[9px] uppercase font-bold tracking-widest whitespace-nowrap">Защита</TabsTrigger>
            <TabsTrigger value="interface" className="flex-1 text-[9px] uppercase font-bold tracking-widest whitespace-nowrap">Вид</TabsTrigger>
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

                <div className="w-full bg-muted/20 p-4 rounded-2xl border border-white/5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-primary flex items-center gap-2">
                      <Smile className="w-3 h-3" /> Статус
                    </Label>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      <button onClick={() => setForm({...form, statusEmoji: ''})} className={cn("h-10 min-w-[40px] rounded-xl flex items-center justify-center bg-black/20 border border-white/5", !form.statusEmoji && "border-primary bg-primary/10")}><Smile className="w-4 h-4 opacity-40" /></button>
                      {EMOJI_STATUSES.map(emoji => (
                        <button key={emoji} onClick={() => setForm({...form, statusEmoji: emoji})} className={cn("h-10 min-w-[40px] rounded-xl flex items-center justify-center text-lg bg-black/20 border border-white/5", form.statusEmoji === emoji && "border-primary bg-primary/10")}>{emoji}</button>
                      ))}
                    </div>
                    <Input placeholder="Ваше состояние..." value={form.statusText} onChange={e => setForm({...form, statusText: e.target.value})} className="bg-black/20 border-white/5 h-10 rounded-xl text-xs" />
                  </div>
                </div>
                
                <div className="space-y-4 w-full">
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black ml-1">Имя</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-muted/30 border-white/5 h-12 rounded-2xl" /></div>
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black ml-1">Никнейм</Label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span><Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-muted/30 border-white/5 h-12 rounded-2xl pl-8" /></div></div>
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black ml-1">О себе</Label><Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-muted/30 border-white/5 rounded-2xl min-h-[80px]" /></div>
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

              {/* НОВАЯ ФУНКЦИЯ: Кастомная иконка приложения */}
              <div className="space-y-4 border-t border-white/5 pt-6">
                <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-2"><Smartphone className="w-3 h-3" /> Иконка приложения</Label>
                <p className="text-[9px] text-muted-foreground uppercase leading-relaxed font-bold">Измените иконку Nuxus на рабочем столе вашего телефона.</p>
                
                <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-2xl border border-white/5">
                  <div className="relative h-16 w-16 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-black/40">
                    <img src={form.customAppIconUrl || 'https://i.ibb.co/sd2MqGz2/Icon.png'} alt="App Icon" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => iconInputRef.current?.click()} className="h-9 rounded-xl text-[9px] uppercase font-black tracking-widest border-white/10 bg-white/5">
                      <Upload className="w-3 h-3 mr-2" /> Выбрать фото
                    </Button>
                    {form.customAppIconUrl && (
                      <Button variant="ghost" size="sm" onClick={() => setForm({...form, customAppIconUrl: ''})} className="h-8 rounded-xl text-[9px] uppercase font-black text-destructive">
                        Сбросить
                      </Button>
                    )}
                  </div>
                  <input type="file" ref={iconInputRef} className="hidden" accept="image/*" onChange={handleIconUpload} />
                </div>
              </div>

              <div className="space-y-4 border-t border-white/5 pt-6">
                <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Фон чата</Label>
                
                <div className="space-y-4">
                  {form.chatBackground ? (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group">
                      <img src={form.chatBackground} alt="Background Preview" className={cn("w-full h-full", form.chatBackgroundFit === 'contain' ? 'object-contain' : 'object-cover')} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                        <Button variant="destructive" size="sm" onClick={() => setForm(prev => ({ ...prev, chatBackground: '' }))} className="h-8 text-[10px] uppercase font-black tracking-widest"><Trash2 className="w-3 h-3 mr-1" /> Удалить</Button>
                        <Button variant="secondary" size="sm" onClick={() => bgInputRef.current?.click()} className="h-8 text-[10px] uppercase font-black tracking-widest"><Upload className="w-3 h-3 mr-1" /> Заменить</Button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => bgInputRef.current?.click()}
                      className="w-full aspect-video rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all text-muted-foreground"
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Выбрать изображение</span>
                    </button>
                  )}
                  <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />

                  {form.chatBackground && (
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setForm(prev => ({ ...prev, chatBackgroundFit: 'cover' }))}
                        className={cn("p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all", form.chatBackgroundFit === 'cover' ? "bg-primary/10 border-primary text-primary" : "bg-white/5 border-white/5 text-muted-foreground")}
                      >
                        Заполнение
                      </button>
                      <button 
                        onClick={() => setForm(prev => ({ ...prev, chatBackgroundFit: 'contain' }))}
                        className={cn("p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all", form.chatBackgroundFit === 'contain' ? "bg-primary/10 border-primary text-primary" : "bg-white/5 border-white/5 text-muted-foreground")}
                      >
                        Вписать
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-6 m-0 py-6">
              <div className="space-y-6 bg-muted/20 p-6 rounded-[2.5rem] border border-white/5">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-black text-primary flex items-center gap-2">
                    <Eye className="w-3 h-3" /> Видимость номера
                  </Label>
                  <Select value={form.privacy.phoneVisibility} onValueChange={v => setForm({...form, privacy: {...form.privacy, phoneVisibility: v as any}})}>
                    <SelectTrigger className="bg-black/20 border-white/5 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-white/10 rounded-xl">
                      <SelectItem value="everybody">Все пользователи</SelectItem>
                      <SelectItem value="contacts">Только контакты</SelectItem>
                      <SelectItem value="nobody">Никто</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-black text-primary flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" /> Последняя активность
                  </Label>
                  <Select value={form.privacy.lastSeenVisibility} onValueChange={v => setForm({...form, privacy: {...form.privacy, lastSeenVisibility: v as any}})}>
                    <SelectTrigger className="bg-black/20 border-white/5 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-white/10 rounded-xl">
                      <SelectItem value="everybody">Показывать всем</SelectItem>
                      <SelectItem value="nobody">Скрыть от всех</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-black text-primary flex items-center gap-2">
                    <Users2 className="w-3 h-3" /> Кто может добавлять в группы
                  </Label>
                  <Select value={form.privacy.allowGroupsFrom} onValueChange={v => setForm({...form, privacy: {...form.privacy, allowGroupsFrom: v as any}})}>
                    <SelectTrigger className="bg-black/20 border-white/5 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-white/10 rounded-xl">
                      <SelectItem value="everybody">Все</SelectItem>
                      <SelectItem value="contacts">Только контакты</SelectItem>
                      <SelectItem value="premium">Только Premium</SelectItem>
                      <SelectItem value="nobody">Никто</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-black text-primary flex items-center gap-2">
                    <MessageSquareLock className="w-3 h-3" /> Кто может писать мне
                  </Label>
                  <Select value={form.privacy.whoCanMessageMe} onValueChange={v => setForm({...form, privacy: {...form.privacy, whoCanMessageMe: v as any}})}>
                    <SelectTrigger className="bg-black/20 border-white/5 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-white/10 rounded-xl">
                      <SelectItem value="everybody">Все</SelectItem>
                      <SelectItem value="premium">Только Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Юридические данные</Label>
                <div className="bg-muted/20 rounded-2xl border border-white/5 overflow-hidden">
                  <button onClick={() => setLegalModal({ open: true, type: 'terms' })} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all text-left">
                    <span className="text-xs font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Условия использования</span>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </button>
                  <div className="h-px bg-white/5 w-full" />
                  <button onClick={() => setLegalModal({ open: true, type: 'privacy' })} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all text-left">
                    <span className="text-xs font-bold text-white flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Конфиденциальность</span>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-6 m-0 py-6">
              <div className="bg-muted/20 p-6 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-black text-white uppercase tracking-wider">Облачный пароль (2FA)</span>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Дополнительная защита при входе</span>
                  </div>
                  <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                </div>

                {form.twoFactorEnabled && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <Label className="text-[10px] uppercase font-black text-primary ml-1">Установить 6-значный PIN</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••" 
                      maxLength={6} 
                      value={form.twoFactorPin} 
                      onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})} 
                      className="bg-black/40 border-white/10 h-12 rounded-xl text-center text-xl tracking-[0.5em] font-black" 
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="interface" className="space-y-6 m-0 py-6">
              <div className="bg-muted/20 p-6 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="flex items-center gap-2 mb-2"><Layout className="w-4 h-4 text-primary" /><Label className="text-[10px] uppercase font-black text-white">Нижняя навигация</Label></div>
                <div className="space-y-4">
                  {[
                    { id: 'contacts', label: 'Раздел Контакты' },
                    { id: 'calls', label: 'Раздел Звонки' },
                    { id: 'archive', label: 'Раздел Архив' }
                  ].map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider">{item.label}</span>
                      <Switch checked={(form.navVisibility as any)[item.id]} onCheckedChange={v => setForm({...form, navVisibility: {...form.navVisibility, [item.id]: v}})} />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </ScrollArea>

          <div className="p-6 border-t border-white/5 bg-muted/20 shrink-0 flex gap-3">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive" onClick={() => signOut(auth)}><LogOut className="w-6 h-6" /></Button>
            <Button className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest bg-primary shadow-lg shadow-primary/20" onClick={handleSave}><Check className="w-5 h-5 mr-2" /> Применить изменения</Button>
          </div>
        </Tabs>
      </DialogContent>

      <LegalModal 
        open={legalModal.open} 
        onOpenChange={(o) => setLegalModal({ ...legalModal, open: o })} 
        type={legalModal.type} 
      />
    </Dialog>
    </>
  );
}
