"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  LogOut, Settings2, Camera, Lock, Fingerprint, Star, Zap, ShieldCheck, Loader2, Database, Download, Check, Palette, 
  Monitor, MessageSquare, ImageIcon, Calendar, Phone, Mail, 
  RefreshCcw, Smartphone, Laptop, Info, Smile, Plus, User as UserIcon, Eye, UserX, Users, PhoneCall
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, collection, query, limit, getDocs, where, addDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { cn, isUserPremium, isGlobalAdmin } from '@/lib/utils';
import type { User } from '@/lib/types';
import nuxusVersions from '@/app/versions.json';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { settingsTab, setSettingsTab } = useAppState();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  const [form, setForm] = useState({
    name: '', username: '', bio: '', statusEmoji: '', statusText: '', avatarUrl: '',
    phone: '', email: '',
    appearance: 'dark' as 'light' | 'dark', theme: 'default', customPrimaryColor: '',
    customAppIconUrl: '', bubbleStyle: 'default', chatBackground: '', messageSize: 'medium',
    twoFactorEnabled: false, twoFactorPin: '', biometricEnabled: false, 
    pwaNotificationsEnabled: false, isGhostMode: false,
    privacy: {
      whoCanMessageMe: 'everybody' as any,
      allowGroupsFrom: 'everybody' as any,
      phoneVisibility: 'contacts' as any,
      lastSeenVisibility: 'everybody' as any,
      whoCanCallMe: 'everybody' as any
    }
  });

  useEffect(() => {
    if (profile && open) {
      setForm({
        name: profile.name || '',
        username: (profile.username || '').replace('@', ''),
        bio: profile.bio || '',
        statusEmoji: profile.statusEmoji || '',
        statusText: profile.statusText || '',
        avatarUrl: profile.avatarUrl || '',
        phone: profile.phone || '',
        email: profile.email || '',
        appearance: profile.settings?.appearance || 'dark',
        theme: profile.settings?.theme || 'default',
        customPrimaryColor: profile.settings?.customPrimaryColor || '',
        customAppIconUrl: profile.settings?.customAppIconUrl || '',
        bubbleStyle: profile.settings?.bubbleStyle || 'default',
        chatBackground: profile.settings?.chatBackground || '',
        messageSize: profile.settings?.messageSize || 'medium',
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        biometricEnabled: !!profile.settings?.biometricEnabled,
        pwaNotificationsEnabled: !!profile.settings?.pwaNotificationsEnabled,
        isGhostMode: !!profile.settings?.privacy?.isGhostMode,
        privacy: {
          whoCanMessageMe: profile.settings?.privacy?.whoCanMessageMe || 'everybody',
          allowGroupsFrom: profile.settings?.privacy?.allowGroupsFrom || 'everybody',
          phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'contacts',
          lastSeenVisibility: profile.settings?.privacy?.lastSeenVisibility || 'everybody',
          whoCanCallMe: (profile.settings?.privacy as any)?.whoCanCallMe || 'everybody'
        }
      });
    }
  }, [profile, open]);

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm({ ...form, chatBackground: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleAdminForceVerify = async () => {
    if (!db || !user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { phoneVerified: true });
      toast({ title: "Узел верифицирован 🛡️" });
    } catch (e) {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!db || !user || !profile) return;
    setIsSaving(true);
    try {
      const usernameWithAt = '@' + form.username.trim().replace('@', '');
      const targetLowercase = usernameWithAt.toLowerCase();

      if (targetLowercase !== profile.usernameLowercase) {
        const q = query(collection(db, 'users'), where('usernameLowercase', '==', targetLowercase), limit(1));
        const checkSnap = await getDocs(q);
        if (!checkSnap.empty) {
          toast({ title: "ID занят", variant: "destructive" });
          setIsSaving(false);
          return;
        }
      }

      await updateDoc(doc(db, 'users', user.uid), {
        name: form.name.trim(),
        username: usernameWithAt,
        usernameLowercase: targetLowercase,
        bio: form.bio.trim(),
        statusEmoji: form.statusEmoji.trim(),
        statusText: form.statusText.trim(),
        avatarUrl: form.avatarUrl,
        phone: form.phone.trim(),
        email: form.email.trim(),
        twoFactorEnabled: form.twoFactorEnabled,
        twoFactorPin: form.twoFactorPin,
        'settings.appearance': form.appearance,
        'settings.theme': form.theme,
        'settings.customPrimaryColor': form.customPrimaryColor,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.chatBackground': form.chatBackground,
        'settings.messageSize': form.messageSize,
        'settings.biometricEnabled': form.biometricEnabled,
        'settings.pwaNotificationsEnabled': form.pwaNotificationsEnabled,
        'settings.privacy': {
          ...form.privacy,
          isGhostMode: form.isGhostMode
        }
      });
      onOpenChange(false);
      toast({ title: "Ядро обновлено" });
    } catch (e: any) {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/98 backdrop-blur-[60px] border-white/10 p-0 overflow-hidden h-[90dvh] flex flex-col rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,1)] outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 text-left relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
          <DialogTitle className="flex items-center gap-3 text-2xl font-black italic uppercase tracking-tighter text-white relative z-10">
            <Settings2 className="w-7 h-7 text-primary" /> Параметры v{nuxusVersions.latestVersion}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 mt-4">
            <TabsList className="grid grid-cols-5 bg-white/5 p-1 rounded-2xl shrink-0 border border-white/5">
              <TabsTrigger value="profile" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Узел</TabsTrigger>
              <TabsTrigger value="style" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Стиль</TabsTrigger>
              <TabsTrigger value="premium" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary"><Star className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="privacy" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Защита</TabsTrigger>
              <TabsTrigger value="data" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-primary">Ядро</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 w-full h-full relative">
            <div className="pb-40"> 
              <TabsContent value="profile" className="space-y-8 m-0 p-8">
                {isGlobalAdmin(profile) && (
                  <Button onClick={handleAdminForceVerify} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase italic tracking-widest gap-2 shadow-2xl border border-white/10 mb-6">
                    <ShieldCheck className="w-6 h-6" /> [ADMIN] FORCE VERIFY OK
                  </Button>
                )}

                <div className="flex flex-col items-center gap-8">
                  <div className="relative group">
                    <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl relative z-10" fallbackName={form.name} />
                    <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-2xl shadow-2xl z-20 active:scale-90 transition-all"><Camera className="w-4 h-4 text-white" /></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                  </div>
                  
                  <div className="space-y-6 w-full text-left">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Имя Оператора</Label>
                        <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">ID Узла</Label>
                        <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl font-bold" />
                      </div>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Спецификация (О себе)</Label>
                       <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-white/5 border-white/10 rounded-xl min-h-[80px] text-xs leading-relaxed" />
                    </div>

                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-4">
                      <div className="flex items-center gap-2 mb-1"><Smile className="w-3.5 h-3.5 text-primary" /><span className="text-[9px] font-black uppercase text-primary">Пульс Статуса</span></div>
                      <div className="flex gap-3">
                        <div className="w-14"><Input placeholder="🏠" value={form.statusEmoji} onChange={e => setForm({...form, statusEmoji: e.target.value})} className="bg-black/40 border-white/10 h-11 rounded-xl text-center text-lg" /></div>
                        <Input placeholder="Ваш статус в Ядре..." value={form.statusText} onChange={e => setForm({...form, statusText: e.target.value})} className="bg-black/40 border-white/10 h-11 rounded-xl text-xs font-bold" />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-10 m-0 p-8">
                <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><Monitor className="w-5 h-5" /> Визуальная среда</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setForm({...form, appearance: 'dark'})} className={cn("h-14 rounded-2xl border flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all", form.appearance === 'dark' ? "bg-primary text-white border-primary shadow-xl" : "bg-white/5 border-white/10 text-white/40")}>Obsidian</button>
                    <button onClick={() => setForm({...form, appearance: 'light'})} className={cn("h-14 rounded-2xl border flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all", form.appearance === 'light' ? "bg-white text-black border-white shadow-xl" : "bg-white/5 border-white/10 text-white/40")}>Crystal</button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase text-primary tracking-widest flex items-center gap-3"><MessageSquare className="w-5 h-5" /> Контейнеры сигналов</h3>
                  <div className="grid grid-cols-2 gap-3">
                      {['default', 'neon', 'gold', 'ocean'].map(s => (
                        <button key={s} onClick={() => setForm({...form, bubbleStyle: s as any})} className={cn("h-12 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all", form.bubbleStyle === s ? "bg-white/10 text-white border-white/30 shadow-2xl" : "bg-white/5 border-white/10 text-white/40")}>{s.toUpperCase()}</button>
                      ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase text-primary tracking-widest flex items-center gap-3"><ImageIcon className="w-5 h-5" /> Обои чата</h3>
                  <div 
                    className="w-full aspect-video rounded-[2.2rem] border border-white/10 bg-white/5 flex items-center justify-center relative overflow-hidden group cursor-pointer"
                    onClick={() => bgInputRef.current?.click()}
                  >
                     {form.chatBackground ? <img src={form.chatBackground} className="w-full h-full object-cover" alt="Chat BG" /> : <Plus className="w-10 h-10 text-white/10" />}
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <span className="text-[10px] font-black uppercase bg-primary text-white px-4 py-2 rounded-xl">Выбрать фото</span>
                     </div>
                     <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-10 m-0 p-8">
                 <div className="space-y-6">
                    <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><Lock className="w-5 h-5" /> Конфиденциальность</h3>
                    
                    <div className="space-y-6 bg-white/[0.02] p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
                       <PrivacySelect 
                         icon={MessageSquare} 
                         label="Кто может писать мне" 
                         value={form.privacy.whoCanMessageMe} 
                         onChange={(v: any) => setForm({...form, privacy: {...form.privacy, whoCanMessageMe: v}})}
                       />
                       <PrivacySelect 
                         icon={Users} 
                         label="Добавление в группы" 
                         value={form.privacy.allowGroupsFrom} 
                         onChange={(v: any) => setForm({...form, privacy: {...form.privacy, allowGroupsFrom: v}})}
                       />
                       <PrivacySelect 
                         icon={PhoneCall} 
                         label="Кто может звонить" 
                         value={form.privacy.whoCanCallMe} 
                         onChange={(v: any) => setForm({...form, privacy: {...form.privacy, whoCanCallMe: v}})}
                       />
                       <PrivacySelect 
                         icon={Eye} 
                         label="Видимость онлайна" 
                         value={form.privacy.lastSeenVisibility} 
                         onChange={(v: any) => setForm({...form, privacy: {...form.privacy, lastSeenVisibility: v}})}
                       />
                    </div>
                 </div>

                 <div className="bg-primary/5 p-8 rounded-[3rem] border border-primary/10 space-y-8 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5"><div className="bg-primary/20 p-4 rounded-2xl shadow-xl"><Fingerprint className="w-8 h-8 text-primary" /></div><div className="flex flex-col text-left"><span className="text-lg font-black text-white uppercase italic">Система 2FA</span><span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Quantum Barrier</span></div></div><Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                  </div>
                  {form.twoFactorEnabled && (
                    <Input type="password" placeholder="••••••" maxLength={6} value={form.twoFactorPin} onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})} className="bg-black/60 border-primary/30 h-16 rounded-2xl text-center text-3xl tracking-[0.6em] font-black" />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-6 m-0 p-8">
                <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 text-center space-y-8 shadow-2xl">
                  <RefreshCcw className={cn("w-14 h-14 text-primary mx-auto", isCheckingUpdates && "animate-spin")} />
                  <div className="space-y-3">
                    <h3 className="text-xl font-black uppercase italic text-white tracking-tighter">Обновление Ядра</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] leading-relaxed">Проверьте наличие новых патчей безопасности и функций.</p>
                  </div>
                  <Button onClick={() => { setIsCheckingUpdates(true); setTimeout(() => { setIsCheckingUpdates(false); toast({ title: "Патч не обнаружен", description: "Используется актуальный протокол QES." }); }, 1500); }} disabled={isCheckingUpdates} className="w-full h-14 bg-primary text-white border border-primary/20 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 shadow-xl active:scale-95 transition-all">
                    {isCheckingUpdates ? <Loader2 className="w-5 h-5 animate-spin" /> : <><RefreshCcw className="w-5 h-5" /> Проверить наличие патчей</>}
                  </Button>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-[#0a0a0c] shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))] relative">
            <Button variant="ghost" className="h-16 w-16 rounded-[1.8rem] bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-xl" onClick={() => signOut(auth)}>
              <LogOut className="w-7 h-7" />
            </Button>
            <Button disabled={isSaving} className="flex-1 h-16 rounded-[1.8rem] font-black uppercase italic tracking-widest bg-primary text-white shadow-2xl shadow-primary/30 active:scale-95 transition-all" onClick={handleSave}>
              {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : <><Check className="w-6 h-6 mr-3" /> Сохранить</>}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PrivacySelect({ icon: Icon, label, value, onChange }: any) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-primary/40" />
        <span className="text-[9px] font-black uppercase text-white/60 tracking-widest">{label}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0c] border-white/10 rounded-xl">
          <SelectItem value="everybody" className="text-[10px] font-black uppercase tracking-widest">Все узлы</SelectItem>
          <SelectItem value="contacts" className="text-[10px] font-black uppercase tracking-widest">Только контакты</SelectItem>
          <SelectItem value="premium" className="text-[10px] font-black uppercase tracking-widest">Premium узлы</SelectItem>
          <SelectItem value="nobody" className="text-[10px] font-black uppercase tracking-widest">Никто</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
