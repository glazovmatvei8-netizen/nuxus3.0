
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
  Info, HelpCircle, UserCheck, ShieldAlert, RefreshCw, KeyRound, Crown, FileText, Sun, Moon, Type, LayoutGrid, Zap, Calendar, Star, Sparkles, CheckCircle2, MessageCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/app-state';
import { isUserPremium, cn, compressImage, triggerHaptic } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useTranslations } from '@/hooks/use-translations';
import versions from '@/app/versions.json';
import { addDays, format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const NAME_COLORS = [
  'text-orange-500', 'text-blue-500', 'text-green-500', 
  'text-purple-500', 'text-red-500', 'text-pink-500', 'text-cyan-500'
];

const BUBBLE_STYLES = [
  { id: 'default', name: 'Original', desc: 'Классика Ядра' },
  { id: 'neon', name: 'Neon Pulse', desc: 'Эффект свечения' },
  { id: 'gold', name: 'Royal Gold', desc: 'Элитный градиент' },
  { id: 'ocean', name: 'Deep Ocean', desc: 'Стеклянный блюр' }
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
    name: '', username: '', bio: '', phone: '', email: '', birthday: '', statusText: '',
    appearance: 'dark' as 'light' | 'dark', theme: 'default',
    nameColor: 'text-orange-500', borderRadius: 24,
    bubbleStyle: 'default', messageSize: 'medium',
    isGhostMode: false, isEnergySaving: false, twoFactorEnabled: false, twoFactorPin: '', twoFactorPinLength: '6' as '4' | '6',
    autoRenew: false
  });

  useEffect(() => {
    if (profile && open) {
      setForm({
        name: profile.name || '',
        username: (profile.username || '').replace('@', ''),
        bio: profile.bio || '',
        birthday: profile.birthday || '',
        phone: profile.phone || '',
        email: profile.email || '',
        statusText: profile.settings?.statusText || '',
        appearance: profile.settings?.appearance || 'dark',
        theme: profile.settings?.theme || 'default',
        nameColor: profile.settings?.nameColor || 'text-orange-500',
        borderRadius: profile.settings?.messageRadius ?? 24,
        bubbleStyle: profile.settings?.bubbleStyle || 'default',
        messageSize: profile.settings?.messageSize || 'medium',
        isGhostMode: !!profile.settings?.privacy?.isGhostMode,
        isEnergySaving: !!profile.settings?.privacy?.isEnergySaving,
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        twoFactorPinLength: profile.twoFactorPinLength || '6',
        autoRenew: !!profile.autoRenew
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
        birthday: form.birthday,
        avatarUrl: avatarPreview,
        twoFactorEnabled: form.twoFactorEnabled,
        twoFactorPin: form.twoFactorPin,
        'settings.statusText': form.statusText.trim(),
        'settings.appearance': form.appearance,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.messageRadius': form.borderRadius,
        'settings.nameColor': form.nameColor,
        'settings.chatBackground': bgPreview,
        'settings.privacy.isGhostMode': form.isGhostMode,
        'settings.privacy.isEnergySaving': form.isEnergySaving,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0a0a0c]/98 backdrop-blur-[80px] border-white/10 p-0 overflow-hidden h-[85dvh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0 text-left bg-gradient-to-b from-primary/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-lg">
               <Settings2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-2xl font-black italic uppercase text-white tracking-tighter">Настройки Ядра</DialogTitle>
              <DialogDescription className="text-[9px] font-bold uppercase text-primary/60 mt-0.5 tracking-widest italic">V187 Mobile Hybrid</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 mt-4">
            <TabsList className="grid grid-cols-4 bg-white/5 p-1 rounded-xl border border-white/5 shadow-inner">
              <TabsTrigger value="profile" className="text-[8px] font-black uppercase tracking-tight h-8">Профиль</TabsTrigger>
              <TabsTrigger value="privacy" className="text-[8px] font-black uppercase tracking-tight h-8">Защита</TabsTrigger>
              <TabsTrigger value="style" className="text-[8px] font-black uppercase tracking-tight h-8">Стиль</TabsTrigger>
              <TabsTrigger value="data" className="text-[8px] font-black uppercase tracking-tight h-8">Инфо</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 pb-20 space-y-8"> 
              <TabsContent value="profile" className="space-y-6 m-0 animate-in fade-in duration-300">
                 <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                    <div className="flex flex-col items-center mb-4">
                       <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          <UserAvatar userId={user?.uid} manualAvatarUrl={avatarPreview} className="h-24 w-24 border-4 border-primary/20 shadow-2xl" />
                          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera className="w-6 h-6" /></div>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setAvatarPreview(reader.result as string);
                                reader.readAsDataURL(file);
                             }
                          }} />
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">Отображаемое имя</Label>
                       <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-12 bg-black/40 border-white/10 rounded-xl font-bold" />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">Био (О себе)</Label>
                       <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-black/40 border-white/10 rounded-xl" />
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-8 m-0 animate-in fade-in duration-300">
                 <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-6">
                    <div className="flex items-center gap-3">
                       <Palette className="w-5 h-5 text-primary" />
                       <h3 className="text-sm font-black uppercase italic tracking-widest">Визуальный Код</h3>
                    </div>
                    
                    <div className="space-y-4">
                       <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">Стиль облачков</Label>
                       <div className="grid grid-cols-2 gap-3">
                          {BUBBLE_STYLES.map(s => (
                            <button key={s.id} onClick={() => setForm({...form, bubbleStyle: s.id})} className={cn(
                              "p-4 rounded-2xl border text-left transition-all",
                              form.bubbleStyle === s.id ? "bg-primary/10 border-primary shadow-lg" : "bg-black/40 border-white/5 opacity-60"
                            )}>
                               <p className="text-[11px] font-black uppercase text-white">{s.name}</p>
                               <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">{s.desc}</p>
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex justify-between items-center px-1">
                          <Label className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Скругление сообщений</Label>
                          <span className="text-[10px] font-black text-primary italic">{form.borderRadius}px</span>
                       </div>
                       <Slider value={[form.borderRadius]} onValueChange={([v]) => setForm({...form, borderRadius: v})} max={40} min={0} step={2} />
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-6 m-0 animate-in fade-in duration-300">
                 <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col">
                          <span className="text-sm font-black text-white uppercase italic">PIN-код защиты</span>
                          <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest leading-none">Двухфакторный шлюз</span>
                       </div>
                       <Switch checked={form.twoFactorEnabled} onCheckedChange={(v) => { triggerHaptic(); setForm({...form, twoFactorEnabled: v}); }} />
                    </div>
                    {form.twoFactorEnabled && (
                       <Input type="password" value={form.twoFactorPin} onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '').slice(0, 6)})} className="h-12 bg-black/40 border-white/10 rounded-xl text-center text-xl tracking-[0.5em] font-black" placeholder="••••••" />
                    )}
                 </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-6 m-0 animate-in fade-in duration-300">
                 <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 flex flex-col items-center text-center gap-6">
                    <NuxusLogo size={80} className="shadow-2xl" />
                    <div className="space-y-2">
                       <h3 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">Nuxus Kernel</h3>
                       <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.4em]">Node Protocol V187.0</p>
                    </div>
                    <Button variant="ghost" onClick={() => setIsLegalOpen(true)} className="w-full h-12 rounded-xl bg-white/5 font-black uppercase text-[9px] tracking-widest text-primary gap-3 border border-white/5">
                       <FileText className="w-4 h-4" /> Правовые документы
                    </Button>
                    <Button variant="ghost" className="w-full h-12 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-black uppercase text-[9px] tracking-widest gap-3" onClick={() => { triggerHaptic(); signOut(auth!).then(() => onOpenChange(false)); }}>
                       <LogOut className="w-4 h-4" /> Отключить узел
                    </Button>
                 </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-white/5 bg-[#0a0a0c]/90 backdrop-blur-3xl shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <Button disabled={isSaving} className="flex-1 h-14 rounded-2xl font-black uppercase italic text-sm bg-primary text-white shadow-2xl shadow-primary/30 active:scale-95 transition-all border border-white/10" onClick={handleSave}>
              {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : "Записать изменения"}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
