
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
  Bell, Video, Mic, MonitorSmartphone, Key, Trash2, ShieldAlert, RefreshCw, Save, Zap, Moon, Sun, Monitor, Download, Share, Fingerprint, Sparkles, Wand2, Globe, Star, Ghost, Volume2, MessageSquare, Timer, Crown, Music, Type, VideoIcon, Rocket, Diamond
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { cn, isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';
import { generateAiAvatar } from '@/ai/flows/generate-ai-avatar-flow';

const THEMES = [
  { id: 'default', name: 'Nuxus Original', color: 'bg-[#8B5CF6]' },
  { id: 'ocean', name: 'Океан', color: 'bg-[#0EA5E9]' },
  { id: 'rainbow', name: 'Радужный', color: 'bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500' },
  { id: 'gold', name: 'Золотой Премиум', color: 'bg-[#EAB308]', premium: true },
  { id: 'emerald', name: 'Изумруд', color: 'bg-[#22C55E]' },
  { id: 'cyberpunk', name: 'Cyberpunk 2077', color: 'bg-[#FDE047]', premium: true },
  { id: 'nebula', name: 'Nebula Core', color: 'bg-[#D8B4FE]', premium: true },
];

const BUBBLE_STYLES = [
  { id: 'default', name: 'Классика', color: 'bg-primary' },
  { id: 'neon', name: 'Neon Flow', color: 'bg-gradient-to-tr from-cyan-500 to-purple-500', premium: true },
  { id: 'gold', name: 'Royal Gold', color: 'bg-gradient-to-tr from-yellow-400 to-orange-500', premium: true },
  { id: 'ocean', name: 'Deep Sea', color: 'bg-gradient-to-tr from-blue-400 to-emerald-400', premium: true },
];

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
  const [form, setForm] = useState({
    name: '',
    username: '',
    bio: '',
    avatarUrl: '',
    appearance: 'dark' as 'light' | 'dark',
    theme: 'default',
    bubbleStyle: 'default',
    twoFactorEnabled: false,
    twoFactorPin: '',
    chatBackground: '',
    chatBackgroundFit: 'cover' as 'cover' | 'contain',
    customAppIconUrl: '',
    statusEmoji: '',
    statusText: '',
    privacy: {
      phoneVisibility: 'everybody',
      lastSeenVisibility: 'everybody',
      allowGroupsFrom: 'everybody',
      whoCanMessageMe: 'everybody',
      isGhostMode: false
    }
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
        bubbleStyle: profile.settings?.bubbleStyle || 'default',
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        chatBackground: profile.settings?.chatBackground || '',
        chatBackgroundFit: profile.settings?.chatBackgroundFit || 'cover',
        customAppIconUrl: profile.settings?.customAppIconUrl || '',
        statusEmoji: profile.statusEmoji || '',
        statusText: profile.statusText || '',
        privacy: profile.settings?.privacy || {
          phoneVisibility: 'everybody',
          lastSeenVisibility: 'everybody',
          allowGroupsFrom: 'everybody',
          whoCanMessageMe: 'everybody',
          isGhostMode: false
        }
      });
    }
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
        statusEmoji: form.statusEmoji,
        statusText: form.statusText,
        'settings.appearance': form.appearance,
        'settings.theme': form.theme,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.chatBackground': form.chatBackground,
        'settings.chatBackgroundFit': form.chatBackgroundFit,
        'settings.customAppIconUrl': form.customAppIconUrl,
        'settings.privacy': form.privacy
      });
      onOpenChange(false);
      toast({ title: "Аккаунт обновлен" });
    } catch (e: any) {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    }
  };

  const handleAiAvatar = async () => {
    if (!isUserPremium(profile)) {
      toast({ title: "Premium функция", description: "Генерация ИИ-аватаров доступна только Premium пользователям.", variant: "destructive" });
      return;
    }
    setIsGeneratingAvatar(true);
    try {
      const { imageUrl } = await generateAiAvatar();
      setForm({ ...form, avatarUrl: imageUrl });
      toast({ title: "Аватар сгенерирован!" });
    } catch (e) {
      toast({ title: "Ошибка генерации", variant: "destructive" });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl outline-none">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter text-white">
            <Settings2 className="w-5 h-5 text-primary" /> Параметры v2.9
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="flex bg-muted/50 p-1 mx-6 mt-4 rounded-2xl shrink-0 overflow-x-auto scrollbar-hide">
            <TabsTrigger value="profile" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Профиль</TabsTrigger>
            <TabsTrigger value="appearance" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Стиль</TabsTrigger>
            <TabsTrigger value="privacy" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Защита</TabsTrigger>
            <TabsTrigger value="premium" className="flex-1 text-[9px] uppercase font-bold tracking-widest">Premium</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="profile" className="space-y-6 m-0 p-6 pb-20">
              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                  <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                  <div className="absolute -bottom-2 -right-2 flex gap-1">
                    <button onClick={() => fileInputRef.current?.click()} className="bg-primary p-2 rounded-xl border border-white/20 shadow-lg hover:scale-110 transition-transform">
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                    <button 
                      onClick={handleAiAvatar} 
                      disabled={isGeneratingAvatar}
                      className={cn(
                        "bg-accent p-2 rounded-xl border border-white/20 shadow-lg hover:scale-110 transition-transform",
                        isGeneratingAvatar && "animate-spin"
                      )}
                    >
                      <Sparkles className="w-4 h-4 text-black" />
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                </div>
                
                <div className="space-y-4 w-full text-left">
                  <div className="grid grid-cols-4 gap-2 items-end">
                    <div className="space-y-2 col-span-1">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Значок</Label>
                      <Input 
                        placeholder="🔥" 
                        value={form.statusEmoji} 
                        onChange={e => setForm({...form, statusEmoji: e.target.value})} 
                        className="bg-muted/30 border-white/5 h-12 rounded-2xl text-center text-lg" 
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2 col-span-3">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Текст статуса</Label>
                      <Input 
                        placeholder="Чем занимаетесь?" 
                        value={form.statusText} 
                        onChange={e => setForm({...form, statusText: e.target.value})} 
                        className="bg-muted/30 border-white/5 h-12 rounded-2xl" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Имя</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-muted/30 border-white/5 h-12 rounded-2xl" /></div>
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Никнейм</Label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span><Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-muted/30 border-white/5 h-12 rounded-2xl pl-8" /></div></div>
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">О себе</Label><Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-muted/30 border-white/5 rounded-2xl resize-none h-24" placeholder="Информация об аккаунте..." /></div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-8 m-0 p-6 pb-20">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2"><Monitor className="w-3 h-3" /> Режим интерфейса</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setForm({...form, appearance: 'dark'})} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all", form.appearance === 'dark' ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(168,85,247,0.2)]" : "bg-muted/20 border-white/5")}>
                    <Moon className={cn("w-6 h-6", form.appearance === 'dark' ? "text-primary" : "text-muted-foreground")} /><span className="text-[10px] font-black uppercase tracking-widest">Тёмная</span>
                  </button>
                  <button onClick={() => setForm({...form, appearance: 'light'})} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all", form.appearance === 'light' ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(168,85,247,0.2)]" : "bg-muted/20 border-white/5")}>
                    <Suspense fallback={<div className="w-6 h-6" />}><Sun className={cn("w-6 h-6", form.appearance === 'light' ? "text-primary" : "text-muted-foreground")} /></Suspense><span className="text-[10px] font-black uppercase tracking-widest">Светлая</span>
                  </button>
                </div>
              </div>

              {isUserPremium(profile) && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> Стиль пузырей сообщений (Premium)
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {BUBBLE_STYLES.map(style => (
                      <button 
                        key={style.id}
                        onClick={() => setForm({...form, bubbleStyle: style.id})}
                        className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all", form.bubbleStyle === style.id ? "bg-primary/10 border-primary" : "bg-white/5 border-white/5")}
                      >
                        <div className={cn("w-4 h-4 rounded-full", style.color)} />
                        <span className="text-[10px] font-bold text-white uppercase">{style.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isUserPremium(profile) && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> Свой фон чата (Premium)
                  </Label>
                  <Input 
                    placeholder="URL изображения (https://...)" 
                    value={form.chatBackground} 
                    onChange={e => setForm({...form, chatBackground: e.target.value})} 
                    className="bg-primary/5 border-primary/20 h-12 rounded-2xl text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setForm({...form, chatBackgroundFit: 'cover'})} className={cn("h-9 rounded-xl border text-[9px] font-black uppercase", form.chatBackgroundFit === 'cover' ? "bg-primary border-primary text-white" : "bg-white/5 border-white/5 text-muted-foreground")}>Заполнить</button>
                    <button onClick={() => setForm({...form, chatBackgroundFit: 'contain'})} className={cn("h-9 rounded-xl border text-[9px] font-black uppercase", form.chatBackgroundFit === 'contain' ? "bg-primary border-primary text-white" : "bg-white/5 border-white/5 text-muted-foreground")}>По центру</button>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-white/5">
                <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-2"><Paintbrush className="w-3 h-3" /> Цветовая схема</Label>
                <div className="grid grid-cols-1 gap-2">
                  {THEMES.map((theme) => {
                    const isPremiumTheme = theme.premium && !isUserPremium(profile);
                    return (
                      <button 
                        key={theme.id} 
                        disabled={isPremiumTheme}
                        onClick={() => setForm({ ...form, theme: theme.id as any })} 
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all", 
                          form.theme === theme.id ? "bg-primary/10 border-primary" : "bg-muted/20 border-white/5",
                          isPremiumTheme && "opacity-40 grayscale"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("w-6 h-6 rounded-full shadow-lg", theme.color)} />
                          <span className="text-sm font-bold text-foreground">{theme.name}</span>
                          {theme.premium && <Star className="w-3 h-3 text-accent fill-accent" />}
                        </div>
                        {form.theme === theme.id && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-2"><Smartphone className="w-3 h-3" /> Иконка приложения</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'v45', url: 'https://i.ibb.co/sd2MqGz2/Icon.png?v=45' },
                    { id: 'v7', url: 'https://i.ibb.co/sd2MqGz2/Icon.png?v=7' },
                    { id: 'classic', url: 'https://i.ibb.co/sd2MqGz2/Icon.png' }
                  ].map(icon => (
                    <button 
                      key={icon.id}
                      onClick={() => setForm({...form, customAppIconUrl: icon.url})}
                      className={cn("relative aspect-square rounded-2xl border-2 transition-all p-1", form.customAppIconUrl === icon.url ? "border-primary bg-primary/10" : "border-white/5 bg-white/5")}
                    >
                      <img src={icon.url} className="w-full h-full object-contain" alt={icon.id} />
                      {form.customAppIconUrl === icon.url && <div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5"><Check className="w-3 h-3 text-white" /></div>}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-6 m-0 p-6 pb-20">
              <div className="bg-primary/5 p-5 rounded-[2rem] border border-primary/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-xl"><Fingerprint className="w-5 h-5 text-primary" /></div>
                    <div className="flex flex-col text-left"><span className="text-xs font-bold text-white uppercase italic">Защита 2FA</span><span className="text-[8px] text-muted-foreground uppercase font-black">Двойной барьер доступа</span></div>
                  </div>
                  <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                </div>
                {form.twoFactorEnabled && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-[9px] uppercase font-black text-primary/60 ml-1">Установить 6-значный PIN</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••" 
                      maxLength={6} 
                      value={form.twoFactorPin}
                      onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})}
                      className="bg-black/20 border-primary/20 h-12 rounded-xl text-center text-xl tracking-[0.5em] font-black"
                    />
                  </div>
                )}
              </div>

              <div className="bg-black/20 p-5 rounded-[2rem] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/5 p-2 rounded-xl"><Ghost className="w-5 h-5 text-muted-foreground" /></div>
                    <div className="flex flex-col text-left"><span className="text-xs font-bold text-white uppercase">Режим Призрака</span><span className="text-[8px] text-muted-foreground uppercase font-black">Скрыть онлайн-статус (Premium)</span></div>
                  </div>
                  <Switch 
                    disabled={!isUserPremium(profile)}
                    checked={form.privacy.isGhostMode} 
                    onCheckedChange={v => setForm({...form, privacy: {...form.privacy, isGhostMode: v}})} 
                  />
                </div>
              </div>

              <div className="space-y-4 px-1 text-left">
                <PrivacySelect label="Кто видит номер" value={form.privacy.phoneVisibility} onChange={v => setForm({...form, privacy: {...form.privacy, phoneVisibility: v}})} icon={Smartphone} />
                <PrivacySelect label="Последний вход" value={form.privacy.lastSeenVisibility} onChange={v => setForm({...form, privacy: {...form.privacy, lastSeenVisibility: v}})} icon={Eye} />
                <PrivacySelect label="Добавление в группы" value={form.privacy.allowGroupsFrom} onChange={v => setForm({...form, privacy: {...form.privacy, allowGroupsFrom: v}})} icon={Users2} />
                <PrivacySelect label="Личные сообщения" value={form.privacy.whoCanMessageMe} onChange={v => setForm({...form, privacy: {...form.privacy, whoCanMessageMe: v}})} icon={MessageSquareLock} />
              </div>
            </TabsContent>

            <TabsContent value="premium" className="space-y-6 m-0 p-6 pb-20">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-accent rounded-[2rem] blur-md opacity-40 animate-pulse" />
                <div className="relative bg-[#0a0a0c] border border-white/10 p-6 rounded-[2rem] text-center overflow-hidden">
                  <Crown className="w-12 h-12 text-accent fill-accent mx-auto mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
                  <h3 className="text-xl font-black uppercase italic text-white tracking-tight">Nuxus Premium</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-black mt-2 leading-relaxed">
                    {isUserPremium(profile) 
                      ? `Активен до: ${new Date(profile!.premiumUntil!).toLocaleDateString()}` 
                      : 'Откройте полный потенциал Ядра'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pb-10">
                <PremiumFeature icon={VideoIcon} label="AI Video Animate" description="Анимируйте фото в 5-секундные кинематографичные ролики" />
                <PremiumFeature icon={Rocket} label="Dynamic Profile Aura" description="Пульсирующая энергия вокруг вашего узла в списках" />
                <PremiumFeature icon={Timer} label="Extended Story Life" description="Храните Моменты до 72 часов вместо суток" />
                <PremiumFeature icon={Zap} label="Ultra-HQ Signal" description="Удвоенный битрейт для голоса и видеосвязи" />
                <PremiumFeature icon={Diamond} label="Exclusive Badge System" description="Уникальные значки достижений рядом с вашим именем" />
                <PremiumFeature icon={Music} label="Neural Soundscapes" description="Фоновый эмбиент Ядра для глубокого погружения" />
                <PremiumFeature icon={Paintbrush} label="Custom Bubbles" description="Уникальные градиенты для ваших сообщений" />
                <PremiumFeature icon={Sparkles} label="AI Conversation Summary" description="Краткая сводка обсуждения в один клик" />
                <PremiumFeature icon={Ghost} label="Ghost Mode" description="Полная невидимость и скрытый онлайн-статус" />
                <PremiumFeature icon={Volume2} label="AI Voice Synthesis" description="Озвучка текстовых сообщений голосом ИИ" />
                <PremiumFeature icon={Wand2} label="ИИ Помощник" description="Черновики ответов и генерация аватаров" />
              </div>

              {!isUserPremium(profile) && (
                <Button className="w-full h-14 bg-accent text-black rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-accent/20">
                  Подключить за 500 NX
                </Button>
              )}
            </TabsContent>
          </ScrollArea>

          <div className="p-6 border-t border-white/5 bg-muted/20 shrink-0 flex gap-3">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all" onClick={() => signOut(auth)}> <LogOut className="w-6 h-6" /></Button>
            <Button className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" onClick={handleSave}><Check className="w-5 h-5 mr-2" /> Применить изменения</Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PrivacySelect({ label, value, onChange, icon: Icon }: any) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-muted-foreground/60" />
        <span className="text-xs font-bold text-white/80">{label}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[120px] h-9 text-[9px] font-bold uppercase bg-white/5 border-white/10 rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-white/10 rounded-xl">
          <SelectItem value="everybody" className="text-[10px] uppercase font-bold">Все</SelectItem>
          <SelectItem value="contacts" className="text-[10px] uppercase font-bold">Контакты</SelectItem>
          <SelectItem value="premium" className="text-[10px] uppercase font-bold">Premium</SelectItem>
          <SelectItem value="nobody" className="text-[10px] uppercase font-bold">Никто</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function PremiumFeature({ icon: Icon, label, description }: any) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
      <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20"><Icon className="w-4 h-4 text-primary" /></div>
      <div className="flex flex-col text-left">
        <span className="text-xs font-bold text-white uppercase">{label}</span>
        <span className="text-[9px] text-muted-foreground uppercase font-black">{description}</span>
      </div>
    </div>
  );
}
