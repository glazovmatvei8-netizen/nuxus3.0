
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
import { useAuth, useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  LogOut, Settings2, Camera, ShieldCheck, Loader2, Fingerprint, Palette, 
  ChevronRight, Globe, Trash2, Mail, Phone, Lock, 
  Info, HelpCircle, UserCheck, ShieldAlert, ImageIcon, Type, LayoutGrid, MessageSquare, Headphones, KeyRound, RefreshCw, AlertTriangle, Sparkles, Crown, FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, addDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/app-state';
import { isUserPremium, cn, compressImage, triggerHaptic } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useTranslations } from '@/hooks/use-translations';
import versions from '@/app/versions.json';

const ADMIN_ID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

/**
 * SETTINGS MODAL V122.0 «AVATAR PERSISTENCE»
 * FIXED: Аватарка теперь корректно сжимается и сохраняется в Firestore.
 */
export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslations();
  const { settingsTab, setSettingsTab, setIsLegalOpen, setCurrentChatId, setActiveView } = useAppState();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<User>(userRef);

  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: '', username: '', bio: '', phone: '', email: '',
    appearance: 'dark' as 'light' | 'dark', theme: 'default',
    customPrimaryColor: '', chatBackground: '',
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
        customPrimaryColor: profile.settings?.customPrimaryColor || '',
        chatBackground: profile.settings?.chatBackground || '',
        bubbleStyle: profile.settings?.bubbleStyle || 'default',
        fontFamily: profile.settings?.fontFamily || 'jakarta',
        messageSize: profile.settings?.messageSize || 'medium',
        isGhostMode: !!profile.settings?.privacy?.isGhostMode,
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        twoFactorPinLength: profile.twoFactorPinLength || '6'
      });
      setAvatarPreview(profile.avatarUrl || null);
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
        'settings.customPrimaryColor': form.customPrimaryColor,
        'settings.chatBackground': form.chatBackground,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.fontFamily': form.fontFamily,
        'settings.messageSize': form.messageSize,
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Файл слишком большой", description: "Лимит 5МБ", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const compressed = await compressImage(base64, 512, 0.7);
      setAvatarPreview(compressed);
      toast({ title: "Превью готово", description: "Нажмите сохранить для применения." });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0a0a0c]/98 backdrop-blur-[80px] border-white/10 p-0 overflow-hidden h-[85dvh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0 text-left bg-gradient-to-b from-primary/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-lg">
               <Settings2 className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-2xl font-black italic uppercase text-white tracking-tighter">{t('settings.title')}</DialogTitle>
              <DialogDescription className="text-[9px] font-bold uppercase text-primary/60 mt-0.5 tracking-widest">Nuxus Kernel V122.0</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 mt-4">
            <TabsList className="grid grid-cols-4 bg-white/5 p-1 rounded-xl border border-white/5 shadow-inner">
              <TabsTrigger value="profile" className="text-[9px] font-black uppercase tracking-widest h-8">{t('settings.tabs.profile')}</TabsTrigger>
              <TabsTrigger value="privacy" className="text-[9px] font-black uppercase tracking-widest h-8">{t('settings.tabs.privacy')}</TabsTrigger>
              <TabsTrigger value="style" className="text-[9px] font-black uppercase tracking-widest h-8">{t('settings.tabs.style')}</TabsTrigger>
              <TabsTrigger value="data" className="text-[9px] font-black uppercase tracking-widest h-8">{t('settings.tabs.data')}</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 pb-20 space-y-6"> 
              <TabsContent value="profile" className="space-y-6 m-0">
                 <div className="flex flex-col items-center gap-6">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                       <div className="h-32 w-32 rounded-full overflow-hidden border-[4px] border-[#0a0a0c] shadow-2xl relative">
                          <UserAvatar userId={user?.uid} manualAvatarUrl={avatarPreview} className="h-full w-full" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                             <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Описание вашего узла..." className="bg-black/40 border-white/10 rounded-xl h-24 text-sm" />
                          </div>
                       </div>

                       <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2"><KeyRound className="w-3 h-3" /> Учетные данные</h4>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">Email</Label>
                             <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-12 bg-black/40 border-white/10 rounded-xl font-bold" />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">Номер телефона</Label>
                             <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="h-12 bg-black/40 border-white/10 rounded-xl font-bold" />
                          </div>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-6 m-0">
                 <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col">
                          <span className="text-sm font-black text-white uppercase italic">Двухфакторная защита</span>
                          <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">PIN-код при входе</span>
                       </div>
                       <Switch checked={form.twoFactorEnabled} onCheckedChange={(v) => setForm({...form, twoFactorEnabled: v})} />
                    </div>

                    {form.twoFactorEnabled && (
                       <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                          <div className="space-y-1.5">
                             <Label className="text-[8px] font-black uppercase text-primary/60 ml-2 tracking-widest">Ваш PIN-код</Label>
                             <Input 
                                type="password" 
                                value={form.twoFactorPin} 
                                onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '').slice(0, 6)})} 
                                className="h-12 bg-black/40 border-white/10 rounded-xl text-center text-xl tracking-[0.5em] font-black"
                                placeholder="••••••"
                             />
                          </div>
                          <div className="flex gap-2">
                             <Button variant="ghost" onClick={() => setForm({...form, twoFactorPinLength: '4'})} className={cn("flex-1 rounded-xl h-10 text-[9px] font-black uppercase", form.twoFactorPinLength === '4' ? "bg-primary text-white" : "bg-white/5 text-white/40")}>4 Цифры</Button>
                             <Button variant="ghost" onClick={() => setForm({...form, twoFactorPinLength: '6'})} className={cn("flex-1 rounded-xl h-10 text-[9px] font-black uppercase", form.twoFactorPinLength === '6' ? "bg-primary text-white" : "bg-white/5 text-white/40")}>6 Цифр</Button>
                          </div>
                       </div>
                    )}
                 </div>

                 <div className="bg-red-500/5 p-6 rounded-[2.5rem] border border-red-500/10 space-y-4">
                    <div className="flex items-center gap-3 text-red-500">
                       <ShieldAlert className="w-5 h-5" />
                       <span className="text-sm font-black uppercase italic">Зона риска</span>
                    </div>
                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest leading-relaxed">Удаление узла приведет к безвозвратной аннигиляции всех ваших данных и сообщений в Ядре.</p>
                    <Button variant="ghost" className="w-full h-12 bg-red-500/10 text-red-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all">Удалить аккаунт</Button>
                 </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-6 m-0">
                 <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-8">
                    <div className="space-y-4">
                       <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">Визуальный Пресет</Label>
                       <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => setForm({...form, theme: 'default'})} className={cn("h-14 rounded-2xl border transition-all text-[10px] font-black uppercase", form.theme === 'default' ? "border-primary bg-primary/10 text-white" : "border-white/5 bg-black/20 text-white/40")}>Standard</button>
                          <button onClick={() => setForm({...form, theme: 'event-horizon'})} className={cn("h-14 rounded-2xl border transition-all text-[10px] font-black uppercase", form.theme === 'event-horizon' ? "border-orange-500 bg-orange-500/10 text-white" : "border-white/5 bg-black/20 text-white/40")}>Event Horizon</button>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">Стиль Сообщений</Label>
                       <div className="grid grid-cols-2 gap-3">
                          {['default', 'neon', 'gold', 'ocean'].map(s => (
                             <button key={s} onClick={() => setForm({...form, bubbleStyle: s as any})} className={cn("h-12 rounded-xl border transition-all text-[9px] font-black uppercase", form.bubbleStyle === s ? "border-primary bg-primary/10 text-white" : "border-white/5 bg-black/20 text-white/40")}>{s}</button>
                          ))}
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-6 m-0">
                 <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center gap-6">
                    <div className="w-20 h-20 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center">
                       <ShieldCheck className="w-10 h-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Nuxus Kernel</h3>
                       <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.4em]">Build {versions.build}</p>
                    </div>
                    <div className="w-full h-px bg-white/5" />
                    <div className="grid grid-cols-2 w-full gap-4">
                       <div className="text-left">
                          <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Protocol</p>
                          <p className="text-xs font-black text-white italic">QES {versions.qesVersion}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Core Version</p>
                          <p className="text-xs font-black text-white italic">v{versions.latestVersion}</p>
                       </div>
                    </div>
                    <Button variant="ghost" onClick={() => setIsLegalOpen(true)} className="w-full h-12 rounded-xl bg-white/5 font-black uppercase text-[9px] tracking-widest text-primary gap-2">
                       <FileText className="w-4 h-4" /> Юридический узел
                    </Button>
                 </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-white/5 bg-[#0a0a0c]/90 backdrop-blur-3xl shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-lg active:scale-90 transition-all" onClick={() => signOut(auth!)}>
               <LogOut className="w-6 h-6" />
            </Button>
            <Button disabled={isSaving} className="flex-1 h-14 rounded-2xl font-black uppercase italic text-sm bg-primary text-white shadow-2xl shadow-primary/30 active:scale-95 transition-all border border-white/10" onClick={handleSave}>
              {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : t('settings.labels.save')}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
