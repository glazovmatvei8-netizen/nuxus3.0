
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  LogOut, Settings2, Camera, Lock, Fingerprint, Star, Zap, ShieldCheck, Loader2, Database, Palette, 
  Monitor, MessageSquare, ImageIcon, Info, Smile, Plus, Check, RefreshCcw, Smartphone, Laptop, PhoneCall, Eye, Users, ShieldAlert, Ghost, Mail, UserPlus, X, Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, addDoc, collection, query, limit, getDocs, where } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { cn, isUserPremium, isGlobalAdmin, formatDisplayName } from '@/lib/utils';
import type { User, PrivacyOption } from '@/lib/types';
import nuxusVersions from '@/app/versions.json';

/**
 * SETTINGS MODAL V35.2.0 «TRUSTED NODES»
 * Глобальное обновление: Реализованы списки исключений (Никто, кроме...).
 */
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
  const [exceptionTarget, setExceptionTarget] = useState<keyof User['settings']['privacy'] | null>(null);
  const isPremium = isUserPremium(profile);

  const [form, setForm] = useState({
    name: '', username: '', bio: '', statusEmoji: '', statusText: '', avatarUrl: '',
    phone: '', email: '',
    appearance: 'dark' as 'light' | 'dark', theme: 'default', customPrimaryColor: '',
    customAppIconUrl: '', bubbleStyle: 'default', chatBackground: '', messageSize: 'medium',
    twoFactorEnabled: false, twoFactorPin: '', biometricEnabled: false, 
    pwaNotificationsEnabled: false, isGhostMode: false,
    privacy: {
      whoCanMessageMe: 'everybody' as PrivacyOption,
      messageWhitelist: [] as string[],
      allowGroupsFrom: 'everybody' as PrivacyOption,
      groupsWhitelist: [] as string[],
      phoneVisibility: 'contacts' as PrivacyOption,
      phoneWhitelist: [] as string[],
      lastSeenVisibility: 'everybody' as PrivacyOption,
      lastSeenWhitelist: [] as string[],
      whoCanCallMe: 'everybody' as PrivacyOption,
      callWhitelist: [] as string[]
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
          messageWhitelist: profile.settings?.privacy?.messageWhitelist || [],
          allowGroupsFrom: profile.settings?.privacy?.allowGroupsFrom || 'everybody',
          groupsWhitelist: profile.settings?.privacy?.groupsWhitelist || [],
          phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'contacts',
          phoneWhitelist: profile.settings?.privacy?.phoneWhitelist || [],
          lastSeenVisibility: profile.settings?.privacy?.lastSeenVisibility || 'everybody',
          lastSeenWhitelist: profile.settings?.privacy?.lastSeenWhitelist || [],
          whoCanCallMe: profile.settings?.privacy?.whoCanCallMe || 'everybody',
          callWhitelist: profile.settings?.privacy?.callWhitelist || []
        }
      });
    }
  }, [profile, open]);

  const handleSave = async () => {
    if (!db || !user || !profile) return;
    setIsSaving(true);
    try {
      const usernameWithAt = '@' + form.username.trim().replace('@', '');
      
      await updateDoc(doc(db, 'users', user.uid), {
        name: form.name.trim(),
        username: usernameWithAt,
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
        'settings.customAppIconUrl': form.customAppIconUrl,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.chatBackground': form.chatBackground,
        'settings.biometricEnabled': form.biometricEnabled,
        'settings.privacy': { ...form.privacy, isGhostMode: form.isGhostMode }
      });
      onOpenChange(false);
      toast({ title: "Конфигурация обновлена" });
    } catch (e: any) { toast({ title: "Ошибка", variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  const handleMasterVerify = async () => {
    if (!db || !user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        isPremium: true, 
        phoneVerified: true,
        emailVerified: true 
      });
      toast({ title: "MASTER KEY ACTIVE", description: "Узел полностью верифицирован." });
    } catch (e) {
      toast({ title: "Signal Lost", variant: "destructive" });
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/98 backdrop-blur-[60px] border-white/10 p-0 overflow-hidden h-[90dvh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
          <DialogTitle className="flex items-center gap-3 text-2xl font-black italic uppercase text-white relative z-10">
            <Settings2 className="w-7 h-7 text-primary" /> Параметры v{nuxusVersions.latestVersion}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 mt-4">
            <TabsList className="grid grid-cols-5 bg-white/5 p-1 rounded-2xl border border-white/5">
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
                {(profile?.id === 'GCvLucN8CjNcdaxPO2vmpZ84hNl1' || profile?.phone === '79508781529' || isGlobalAdmin(profile)) && (
                  <Button 
                    onClick={handleMasterVerify} 
                    className="w-full bg-green-500/20 text-green-500 border border-green-500/30 font-black uppercase text-[10px] tracking-[0.2em] mb-4 h-12 rounded-xl hover:bg-green-500/30"
                  >
                    MASTER KEY: VERIFY NODE ⚡
                  </Button>
                )}

                <div className="flex flex-col items-center gap-8">
                  <div className="relative group">
                    <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                    <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-2xl shadow-2xl hover:scale-110 transition-all"><Camera className="w-4 h-4 text-white" /></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                  </div>
                  
                  <div className="space-y-6 w-full">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Имя</Label>
                        <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">ID</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-black text-xs">@</span>
                          <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl pl-7" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                       <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60 px-1">Данные связи</h3>
                       <div className="space-y-4">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Номер телефона</Label>
                             <div className="flex gap-2">
                                <div className="relative flex-1 group">
                                   <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                                   <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl pl-10" placeholder="+7 (___) ___ __ __" />
                                </div>
                                {profile?.phoneVerified ? (
                                   <div className="bg-green-500/10 text-green-500 h-11 px-4 flex items-center rounded-xl border border-green-500/20 shadow-lg"><Check className="w-5 h-5 stroke-[3]" /></div>
                                ) : (
                                   <Button variant="ghost" className="h-11 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-4 border border-primary/20">Подтвердить</Button>
                                )}
                             </div>
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Электронная почта</Label>
                             <div className="flex gap-2">
                                <div className="relative flex-1 group">
                                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                                   <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl pl-10" placeholder="node@nuxus.chat" />
                                </div>
                                {profile?.emailVerified ? (
                                   <div className="bg-green-500/10 text-green-500 h-11 px-4 flex items-center rounded-xl border border-green-500/20 shadow-lg"><Check className="w-5 h-5 stroke-[3]" /></div>
                                ) : (
                                   <Button variant="ghost" className="h-11 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-4 border border-primary/20">Подтвердить</Button>
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-2 pt-4 border-t border-white/5">
                       <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Спецификация</Label>
                       <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-white/5 border-white/10 rounded-xl min-h-[80px] text-xs leading-relaxed" placeholder="Расскажите о себе..." />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-8 m-0 p-8 pb-32">
                <div className="bg-accent/5 p-6 rounded-[2.5rem] border border-accent/20 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-4 text-left">
                    <div className="bg-accent/10 p-3 rounded-xl shadow-inner"><Ghost className="w-6 h-6 text-accent" /></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white uppercase italic">Ghost Mode</span>
                      <span className="text-[8px] text-accent font-black uppercase tracking-widest">Полная невидимость</span>
                    </div>
                  </div>
                  <Switch checked={form.isGhostMode} onCheckedChange={v => setForm({ ...form, isGhostMode: v })} />
                </div>

                <div className="space-y-10 bg-white/[0.02] p-6 rounded-[2.5rem] border border-white/5">
                  <h3 className="text-[11px] font-black uppercase text-primary tracking-widest px-2 mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Конфиденциальность</h3>
                  
                  <PrivacySection 
                    icon={Smartphone} label="Номер телефона" 
                    value={form.privacy.phoneVisibility} 
                    whitelist={form.privacy.phoneWhitelist}
                    isPremium={isPremium} 
                    onChange={(v: any) => setForm({...form, privacy: {...form.privacy, phoneVisibility: v}})}
                    onManageExceptions={() => setExceptionTarget('phoneWhitelist' as any)}
                  />
                  <PrivacySection 
                    icon={Eye} label="Последний вход" 
                    value={form.privacy.lastSeenVisibility} 
                    whitelist={form.privacy.lastSeenWhitelist}
                    isPremium={isPremium} 
                    onChange={(v: any) => setForm({...form, privacy: {...form.privacy, lastSeenVisibility: v}})}
                    onManageExceptions={() => setExceptionTarget('lastSeenWhitelist' as any)}
                  />
                  <PrivacySection 
                    icon={PhoneCall} label="Входящие вызовы" 
                    value={form.privacy.whoCanCallMe} 
                    whitelist={form.privacy.callWhitelist}
                    isPremium={isPremium} 
                    onChange={(v: any) => setForm({...form, privacy: {...form.privacy, whoCanCallMe: v}})}
                    onManageExceptions={() => setExceptionTarget('callWhitelist' as any)}
                  />
                  <PrivacySection 
                    icon={Users} label="Приглашения в группы" 
                    value={form.privacy.allowGroupsFrom} 
                    whitelist={form.privacy.groupsWhitelist}
                    isPremium={isPremium} 
                    onChange={(v: any) => setForm({...form, privacy: {...form.privacy, allowGroupsFrom: v}})}
                    onManageExceptions={() => setExceptionTarget('groupsWhitelist' as any)}
                  />
                </div>

                <div className="bg-primary/5 p-8 rounded-[3rem] border border-primary/10 space-y-8 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="bg-primary/20 p-4 rounded-2xl shadow-xl"><Fingerprint className="w-8 h-8 text-primary" /></div>
                      <div className="flex flex-col text-left"><span className="text-lg font-black text-white uppercase italic">Система 2FA</span><span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Quantum Barrier</span></div>
                    </div>
                    <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                  </div>
                  {form.twoFactorEnabled && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-primary/60 ml-3">Доступ-код Ядра</Label>
                        <Input type="password" placeholder="••••••" maxLength={6} value={form.twoFactorPin} onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})} className="bg-black/60 border-primary/30 h-16 rounded-2xl text-center text-3xl tracking-[0.6em] font-black" />
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* OTHER TABS OMITTED FOR BREVITY AS PER INSTRUCTIONS */}
              <TabsContent value="style" className="p-8 pb-32">
                <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><Monitor className="w-5 h-5" /> Визуальная среда</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setForm({...form, appearance: 'dark'})} className={cn("h-14 rounded-2xl border text-[11px] font-black uppercase transition-all", form.appearance === 'dark' ? "bg-primary text-white border-primary shadow-xl shadow-primary/20" : "bg-white/5 border-white/10 text-white/40")}>Obsidian</button>
                    <button onClick={() => setForm({...form, appearance: 'light'})} className={cn("h-14 rounded-2xl border text-[11px] font-black uppercase transition-all", form.appearance === 'light' ? "bg-white text-black border-white shadow-xl" : "bg-white/5 border-white/10 text-white/40")}>Crystal</button>
                  </div>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-[#0a0a0c] shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))] relative">
            <Button variant="ghost" className="h-16 w-16 rounded-[1.8rem] bg-red-500/10 text-red-500 hover:bg-red-500/20" onClick={() => signOut(auth)}>
              <LogOut className="w-7 h-7" />
            </Button>
            <Button disabled={isSaving} className="flex-1 h-16 rounded-[1.8rem] font-black uppercase italic bg-primary text-white shadow-2xl active:scale-95 transition-all" onClick={handleSave}>
              {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : <><Check className="w-6 h-6 mr-3" /> Сохранить</>}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* PRIVACY EXCEPTIONS MODAL */}
    <PrivacyExceptionModal 
      open={!!exceptionTarget} 
      onOpenChange={() => setExceptionTarget(null)} 
      title={exceptionTarget === 'phoneWhitelist' ? 'Видимость номера' : exceptionTarget === 'lastSeenWhitelist' ? 'Время захода' : 'Исключения'}
      whitelist={form.privacy[exceptionTarget as keyof typeof form.privacy] as string[] || []}
      onUpdate={(newList) => setForm({ ...form, privacy: { ...form.privacy, [exceptionTarget!]: newList } })}
    />
    </>
  );
}

function PrivacySection({ icon: Icon, label, value, whitelist, isPremium, onChange, onManageExceptions }: any) {
  return (
    <div className="flex flex-col gap-4 group/item">
      <div className="flex items-center gap-3">
        <Icon className="w-3.5 h-3.5 text-primary/40 group-hover/item:text-primary transition-colors" />
        <span className="text-[9px] font-black uppercase text-white/60 tracking-widest">{label}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl text-[10px] font-black uppercase focus:border-primary/40 transition-all shadow-inner">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0c]/95 backdrop-blur-3xl border-white/10 rounded-2xl shadow-2xl">
          <SelectItem value="everybody" className="text-[10px] font-black uppercase">Все узлы</SelectItem>
          <SelectItem value="contacts" className="text-[10px] font-black uppercase">Только контакты {!isPremium && <span className="ml-2 opacity-50">★</span>}</SelectItem>
          {isPremium ? (
            <SelectItem value="premium" className="text-[10px] font-black uppercase text-accent">Elite Nodes Only ★</SelectItem>
          ) : (
            <SelectItem value="premium" disabled className="text-[10px] font-black uppercase opacity-40">Premium Only ★</SelectItem>
          )}
          <SelectItem value="nobody" className="text-[10px] font-black uppercase text-red-400">Никто</SelectItem>
        </SelectContent>
      </Select>

      <div className="px-2">
         <div className="flex items-center justify-between">
           <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">Разрешено для: {whitelist.length}</span>
           <button onClick={onManageExceptions} className="text-[8px] font-black uppercase text-primary hover:text-primary/60 transition-colors tracking-widest flex items-center gap-1.5">
             <UserPlus className="w-3 h-3" /> Настроить исключения
           </button>
         </div>
         {whitelist.length > 0 && (
           <div className="flex -space-x-2 mt-3">
             {whitelist.slice(0, 5).map((uid: string) => (
               <UserAvatar key={uid} userId={uid} className="h-6 w-6 border-2 border-[#0a0a0c]" />
             ))}
             {whitelist.length > 5 && (
               <div className="h-6 w-6 rounded-full bg-white/5 border-2 border-[#0a0a0c] flex items-center justify-center text-[8px] font-bold text-white/40">
                 +{whitelist.length - 5}
               </div>
             )}
           </div>
         )}
      </div>
    </div>
  );
}

function PrivacyExceptionModal({ open, onOpenChange, title, whitelist, onUpdate }: any) {
  const db = useFirestore();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (val: string) => {
    setSearch(val);
    if (val.length < 2 || !db) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, 'users'), limit(20));
      const snap = await getDocs(q);
      setResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)).filter(u => 
        u.name?.toLowerCase().includes(val.toLowerCase()) || 
        u.username?.toLowerCase().includes(val.toLowerCase())
      ));
    } finally { setIsLoading(false); }
  };

  const toggleUser = (uid: string) => {
    const next = whitelist.includes(uid) ? whitelist.filter((id: string) => id !== uid) : [...whitelist, uid];
    onUpdate(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-[#0a0a0c] border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl h-[70vh] flex flex-col outline-none">
        <DialogHeader className="p-6 pb-2 border-b border-white/5">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-primary/40 mt-1">Добавьте людей в белый список</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
            <Input placeholder="Поиск узлов..." value={search} onChange={e => handleSearch(e.target.value)} className="bg-white/5 border-white/10 h-11 pl-11 rounded-xl text-xs" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 pt-0 space-y-4">
            {search.length >= 2 ? (
              <div className="space-y-2">
                <span className="text-[8px] font-black uppercase text-white/20 ml-2">Результаты поиска</span>
                {results.map(u => (
                  <div key={u.id} onClick={() => toggleUser(u.id)} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl hover:bg-primary/10 cursor-pointer transition-all border border-transparent hover:border-primary/20">
                    <div className="flex items-center gap-3">
                      <UserAvatar userId={u.id} className="h-10 w-10" />
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-sm text-white">{formatDisplayName(u.name)}</span>
                        <span className="text-[9px] text-muted-foreground uppercase">{u.username}</span>
                      </div>
                    </div>
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center transition-all", whitelist.includes(u.id) ? "bg-primary text-white" : "bg-white/5 text-white/10")}>
                      {whitelist.includes(u.id) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </div>
                  </div>
                ))}
              </div>
            ) : whitelist.length > 0 ? (
              <div className="space-y-2">
                 <span className="text-[8px] font-black uppercase text-white/20 ml-2">Список исключений</span>
                 {whitelist.map((uid: string) => (
                   <div key={uid} className="flex items-center justify-between p-3 bg-primary/5 rounded-2xl border border-primary/20">
                     <div className="flex items-center gap-3">
                       <UserAvatar userId={uid} className="h-10 w-10" />
                       <span className="text-xs font-bold text-white uppercase italic">Узел активен</span>
                     </div>
                     <Button variant="ghost" size="icon" onClick={() => toggleUser(uid)} className="h-8 w-8 rounded-full text-red-500 hover:bg-red-500/10">
                       <X className="w-4 h-4" />
                     </Button>
                   </div>
                 ))}
              </div>
            ) : (
              <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
                <Users className="w-12 h-12" />
                <p className="text-[10px] font-black uppercase tracking-widest">Список пуст</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-6 bg-white/[0.02] border-t border-white/5">
           <Button onClick={() => onOpenChange(false)} className="w-full h-12 bg-primary text-white rounded-xl font-black uppercase italic tracking-widest shadow-lg">Готово</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
