
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useAuth, useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  LogOut, Settings2, Camera, ShieldCheck, Loader2, Fingerprint, Palette, 
  ChevronRight, Globe, Trash2, Mail, Phone, Lock, Image as ImageIcon,
  Info, HelpCircle, UserCheck, ShieldAlert, RefreshCw, KeyRound, Crown, FileText, Sun, Moon, Type
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/app-state';
import { isUserPremium, cn, compressImage, triggerHaptic } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useTranslations } from '@/hooks/use-translations';
import versions from '@/app/versions.json';

const NAME_COLORS = [
  'text-orange-500', 'text-blue-500', 'text-green-500', 
  'text-purple-500', 'text-red-500', 'text-pink-500', 'text-cyan-500'
];

export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslations();
  const { settingsTab, setSettingsTab, setIsLegalOpen, setIs2FAVerified } = useAppState();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<User>(userRef);

  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: '', username: '', bio: '', phone: '', email: '',
    appearance: 'dark' as 'light' | 'dark', theme: 'default',
    nameColor: 'text-orange-500', borderRadius: 24,
    bubbleStyle: 'default' as any, fontFamily: 'jakarta' as any,
    messageSize: 'medium' as any,
    isGhostMode: false, twoFactorEnabled: false, twoFactorPin: '', twoFactorPinLength: '6' as '4' | '6'
  });

  useEffect(() => {
    if (profile && open) {
      setForm({
        name: profile.name || '',
        username: (profile.username || '').replace('@', ''),
        bio: profile.bio || '',
        phone: profile.phone || '',
        email: profile.email || '',
        appearance: profile.settings?.appearance || 'dark',
        theme: profile.settings?.theme || 'default',
        nameColor: profile.settings?.nameColor || 'text-orange-500',
        borderRadius: profile.settings?.messageRadius ?? 24,
        bubbleStyle: profile.settings?.bubbleStyle || 'default',
        fontFamily: profile.settings?.fontFamily || 'jakarta',
        messageSize: profile.settings?.messageSize || 'medium',
        isGhostMode: !!profile.settings?.privacy?.isGhostMode,
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        twoFactorPinLength: profile.twoFactorPinLength || '6'
      });
      setAvatarPreview(profile.avatarUrl || null);
      setBgPreview(profile.settings?.chatBackground || null);
    }
  }, [profile, open]);

  const handleSave = async () => {
    if (!db || !user) return;
    setIsSaving(true);
    triggerHaptic();
    try {
      const usernameWithAt = '@' + form.username.trim().replace('@', '').toLowerCase();
      const updateData: any = {
        name: form.name.trim(),
        username: usernameWithAt,
        usernameLowercase: usernameWithAt,
        bio: form.bio.trim(),
        avatarUrl: avatarPreview,
        phone: form.phone.trim(),
        email: form.email.trim(),
        twoFactorEnabled: form.twoFactorEnabled,
        twoFactorPin: form.twoFactorPin,
        twoFactorPinLength: form.twoFactorPinLength,
        'settings.appearance': form.appearance,
        'settings.theme': form.theme,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.fontFamily': form.fontFamily,
        'settings.messageSize': form.messageSize,
        'settings.messageRadius': form.borderRadius,
        'settings.nameColor': form.nameColor,
        'settings.chatBackground': bgPreview,
        'settings.privacy.isGhostMode': form.isGhostMode,
      };

      await updateDoc(doc(db, 'users', user.uid), updateData);
      toast({ title: t('saved') });
      onOpenChange(false);
    } catch (e: any) { 
      toast({ title: t('error'), variant: "destructive" }); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    const ok = confirm("Выйти из этого узла?");
    if (ok) {
      triggerHaptic();
      setIs2FAVerified(false);
      await signOut(auth);
      onOpenChange(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string, 400, 0.7);
      setAvatarPreview(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleBgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string, 1200, 0.6);
      setBgPreview(compressed);
      toast({ title: "Обои выбраны", description: "Нажмите 'Записать изменения' для применения" });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0a0a0c]/98 backdrop-blur-[80px] border-white/10 p-0 overflow-hidden h-[85dvh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0 text-left bg-gradient-to-b from-primary/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-lg">
                 <Settings2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-2xl font-black italic uppercase text-white tracking-tighter">{t('settings.title')}</DialogTitle>
                <DialogDescription className="text-[9px] font-bold uppercase text-primary/60 mt-0.5 tracking-widest italic">Node Sync Active</DialogDescription>
              </div>
            </div>
            <button onClick={() => triggerHaptic()} className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">
               <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 mt-4">
            <TabsList className="grid grid-cols-4 bg-white/5 p-1 rounded-xl border border-white/5 shadow-inner">
              <TabsTrigger value="profile" className="text-[9px] font-black uppercase tracking-widest h-8">Аккаунт</TabsTrigger>
              <TabsTrigger value="privacy" className="text-[9px] font-black uppercase tracking-widest h-8">Защита</TabsTrigger>
              <TabsTrigger value="style" className="text-[9px] font-black uppercase tracking-widest h-8">Стиль</TabsTrigger>
              <TabsTrigger value="data" className="text-[9px] font-black uppercase tracking-widest h-8">Инфо</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 pb-20 space-y-8"> 
              <TabsContent value="profile" className="space-y-6 m-0 animate-in fade-in duration-300">
                 <div className="flex flex-col items-center gap-6">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                       <div className="h-32 w-32 rounded-full overflow-hidden border-[4px] border-[#0a0a0c] shadow-2xl relative bg-white/5">
                          <UserAvatar userId={user?.uid} manualAvatarUrl={avatarPreview} className="h-full w-full" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <Camera className="w-8 h-8 text-white" />
                          </div>
                       </div>
                       <div className="absolute bottom-1 right-1 bg-primary p-2.5 rounded-xl shadow-2xl z-20 border border-white/10"><RefreshCw className="w-4 h-4 text-white" /></div>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                    </div>
                    
                    <div className="w-full space-y-4">
                       <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4">
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">{t('settings.labels.name')}</Label>
                             <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-12 bg-black/40 border-white/10 rounded-xl font-bold" />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">{t('settings.labels.username')}</Label>
                             <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="h-12 bg-black/40 border-white/10 rounded-xl font-mono text-primary" />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">{t('settings.labels.bio')}</Label>
                             <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Био узла..." className="bg-black/40 border-white/10 rounded-xl h-24 text-sm" />
                          </div>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-8 m-0 animate-in fade-in duration-300">
                 {/* WALLPAPER & NAME COLOR */}
                 <div className="space-y-4">
                    <button 
                      onClick={() => bgInputRef.current?.click()}
                      className="w-full flex items-center justify-between p-5 bg-white/5 rounded-[1.8rem] border border-white/5 hover:bg-white/10 transition-all group"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                             <ImageIcon className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-[13px] font-black uppercase italic tracking-widest text-white">Изменить обои</span>
                       </div>
                       <div className="flex items-center gap-2">
                          {bgPreview && <div className="h-8 w-8 rounded-lg overflow-hidden border border-white/10"><img src={bgPreview} className="h-full w-full object-cover" /></div>}
                          <ChevronRight className="w-4 h-4 text-white/20" />
                       </div>
                    </button>
                    <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgChange} />

                    <div className="p-5 bg-white/5 rounded-[1.8rem] border border-white/5 space-y-5">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Palette className="w-5 h-5 text-primary" />
                             </div>
                             <span className="text-[13px] font-black uppercase italic tracking-widest text-white">Цвет имени</span>
                          </div>
                          <div className={cn("px-4 py-1.5 rounded-full bg-white/5 text-[10px] font-black uppercase italic", form.nameColor)}>{form.name || 'User'}</div>
                       </div>
                       <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                          {NAME_COLORS.map(color => (
                            <button 
                              key={color} 
                              onClick={() => setForm({...form, nameColor: color})}
                              className={cn(
                                "h-8 min-w-[32px] rounded-full border-2 transition-all",
                                form.nameColor === color ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60",
                                color.replace('text-', 'bg-')
                              )}
                            />
                          ))}
                       </div>
                    </div>
                 </div>

                 {/* COLOR THEMES */}
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-primary/60 ml-2 tracking-widest">Цветовая тема</h3>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                       {['default', 'event-horizon', 'neon', 'gold'].map(theme => (
                         <button 
                           key={theme} 
                           onClick={() => setForm({...form, theme})}
                           className={cn(
                             "aspect-[4/5] min-w-[100px] rounded-[1.8rem] border-2 flex flex-col items-center justify-center gap-3 transition-all",
                             form.theme === theme ? "border-primary bg-primary/10" : "border-white/5 bg-white/5 opacity-50"
                           )}
                         >
                           <div className={cn("w-10 h-10 rounded-full shadow-2xl", theme === 'default' ? 'bg-primary' : theme === 'event-horizon' ? 'bg-orange-600' : theme === 'neon' ? 'bg-purple-600' : 'bg-yellow-600')} />
                           <span className="text-[8px] font-black uppercase tracking-widest text-white">{theme}</span>
                         </button>
                       ))}
                    </div>
                 </div>

                 {/* MODE SWITCH */}
                 <div className="space-y-4">
                    <button 
                      onClick={() => setForm({...form, appearance: form.appearance === 'dark' ? 'light' : 'dark'})}
                      className="w-full flex items-center justify-between p-5 bg-white/5 rounded-[1.8rem] border border-white/5 hover:bg-white/10 transition-all"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                             {form.appearance === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                          </div>
                          <span className="text-[13px] font-black uppercase italic tracking-widest text-white">Переключить на {form.appearance === 'dark' ? 'дневную' : 'ночную'} тему</span>
                       </div>
                    </button>
                 </div>

                 {/* BORDER RADIUS */}
                 <div className="bg-white/5 p-6 rounded-[2.2rem] border border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                       <h3 className="text-[13px] font-black uppercase italic tracking-widest text-white">Углы блоков с сообщениями</h3>
                       <span className="text-sm font-black text-primary italic tabular-nums">{form.borderRadius}</span>
                    </div>
                    <Slider 
                      value={[form.borderRadius]} 
                      onValueChange={([v]) => setForm({...form, borderRadius: v})} 
                      max={40} 
                      min={0} 
                      step={1} 
                    />
                 </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-6 m-0 animate-in fade-in duration-300">
                 <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col">
                          <span className="text-sm font-black text-white uppercase italic">Двухфакторная защита</span>
                          <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Запрос PIN-кода</span>
                       </div>
                       <Switch checked={form.twoFactorEnabled} onCheckedChange={(v) => { triggerHaptic(); setForm({...form, twoFactorEnabled: v}); }} />
                    </div>

                    {form.twoFactorEnabled && (
                       <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                          <div className="space-y-1.5">
                             <Label className="text-[8px] font-black uppercase text-primary/60 ml-2 tracking-widest">Новый PIN-код</Label>
                             <Input 
                                type="password" 
                                value={form.twoFactorPin} 
                                onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '').slice(0, 6)})} 
                                className="h-12 bg-black/40 border-white/10 rounded-xl text-center text-xl tracking-[0.5em] font-black"
                                placeholder="••••••"
                             />
                          </div>
                       </div>
                    )}
                 </div>
                 
                 <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Видимость</h4>
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-white uppercase tracking-tight">Режим Призрака</span>
                       <Switch checked={form.isGhostMode} onCheckedChange={(v) => { triggerHaptic(); setForm({...form, isGhostMode: v}); }} />
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-6 m-0 animate-in fade-in duration-300">
                 <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 flex flex-col items-center text-center gap-6">
                    <UserAvatar userId={user?.uid} size={100} className="shadow-2xl" />
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">Nuxus Kernel</h3>
                       <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.4em]">Build {versions.build}</p>
                    </div>
                    <div className="w-full h-px bg-white/5" />
                    <Button variant="ghost" onClick={() => setIsLegalOpen(true)} className="w-full h-14 rounded-2xl bg-white/5 font-black uppercase text-[10px] tracking-widest text-primary gap-3 border border-white/5">
                       <FileText className="w-5 h-5" /> Правовые документы
                    </Button>
                 </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-white/5 bg-[#0a0a0c]/90 backdrop-blur-3xl shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-lg active:scale-90 transition-all" onClick={handleLogout}>
               <LogOut className="w-6 h-6" />
            </Button>
            <Button disabled={isSaving || isProfileLoading} className="flex-1 h-14 rounded-2xl font-black uppercase italic text-sm bg-primary text-white shadow-2xl shadow-primary/30 active:scale-95 transition-all border border-white/10" onClick={handleSave}>
              {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : t('settings.labels.save')}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
