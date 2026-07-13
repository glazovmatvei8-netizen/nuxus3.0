
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Monitor, MessageSquare, ImageIcon, Smile, Plus, Check, RefreshCcw, Smartphone, PhoneCall, Eye, 
  Users, ShieldAlert, Ghost, Mail, Share2, FileText, Download, Search, MessageCircle, CheckCircle2, Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, collection, query, limit, getDocs, where } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { cn, isUserPremium, isGlobalAdmin, formatDisplayName } from '@/lib/utils';
import type { User, PrivacyOption } from '@/lib/types';
import nuxusVersions from '@/app/versions.json';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * SETTINGS MODAL V47.0.0 (Absolute Restore)
 * Восстановлен премиальный раздел и информация о сроках.
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
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isRequestingArchive, setIsRequestingArchive] = useState(false);
  const [exceptionTarget, setExceptionTarget] = useState<string | null>(null);
  
  const isPremium = isUserPremium(profile);

  const [form, setForm] = useState({
    name: '', username: '', bio: '', statusEmoji: '', statusText: '', avatarUrl: '',
    phone: '', email: '',
    appearance: 'dark' as 'light' | 'dark', theme: 'default', customPrimaryColor: '',
    customAppIconUrl: '', bubbleStyle: 'default', chatBackground: '', messageSize: 'medium',
    twoFactorEnabled: false, twoFactorPin: '', biometricEnabled: false, 
    pwaNotificationsEnabled: false, isGhostMode: false,
    privacy: {
      phoneVisibility: 'everybody' as PrivacyOption,
      phoneWhitelist: [] as string[],
      lastSeenVisibility: 'everybody' as PrivacyOption,
      lastSeenWhitelist: [] as string[],
      profilePhotoVisibility: 'everybody' as PrivacyOption,
      profilePhotoWhitelist: [] as string[],
      forwardingVisibility: 'everybody' as PrivacyOption,
      forwardingWhitelist: [] as string[],
      whoCanCallMe: 'everybody' as PrivacyOption,
      callWhitelist: [] as string[],
      allowGroupsFrom: 'everybody' as PrivacyOption,
      groupsWhitelist: [] as string[],
      bioVisibility: 'everybody' as PrivacyOption,
      bioWhitelist: [] as string[],
      whoCanMessageMe: 'everybody' as PrivacyOption,
      messageWhitelist: [] as string[]
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
          phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'everybody',
          phoneWhitelist: profile.settings?.privacy?.phoneWhitelist || [],
          lastSeenVisibility: profile.settings?.privacy?.lastSeenVisibility || 'everybody',
          lastSeenWhitelist: profile.settings?.privacy?.lastSeenWhitelist || [],
          profilePhotoVisibility: profile.settings?.privacy?.profilePhotoVisibility || 'everybody',
          profilePhotoWhitelist: profile.settings?.privacy?.profilePhotoWhitelist || [],
          forwardingVisibility: profile.settings?.privacy?.forwardingVisibility || 'everybody',
          forwardingWhitelist: profile.settings?.privacy?.forwardingWhitelist || [],
          whoCanCallMe: profile.settings?.privacy?.whoCanCallMe || 'everybody',
          callWhitelist: profile.settings?.privacy?.callWhitelist || [],
          allowGroupsFrom: profile.settings?.privacy?.allowGroupsFrom || 'everybody',
          groupsWhitelist: profile.settings?.privacy?.groupsWhitelist || [],
          bioVisibility: profile.settings?.privacy?.bioVisibility || 'everybody',
          bioWhitelist: profile.settings?.privacy?.bioWhitelist || [],
          whoCanMessageMe: profile.settings?.privacy?.whoCanMessageMe || 'everybody',
          messageWhitelist: profile.settings?.privacy?.messageWhitelist || []
        }
      });
    }
  }, [profile, open]);

  const handleSave = async () => {
    if (!db || !user || !profile) return;
    const rawUsername = form.username.trim().replace('@', '');
    if (/[^a-zA-Z0-9_]/.test(rawUsername)) {
      toast({ title: "Ошибка ника", description: "Используйте только английские буквы и цифры.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const usernameWithAt = '@' + rawUsername;
      const targetLowercase = usernameWithAt.toLowerCase();

      if (targetLowercase !== profile.usernameLowercase) {
        const q = query(collection(db, 'users'), where('usernameLowercase', '==', targetLowercase), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          toast({ title: "ID занят", description: "Этот никнейм уже используется.", variant: "destructive" });
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
        'settings.customAppIconUrl': form.customAppIconUrl,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.chatBackground': form.chatBackground,
        'settings.biometricEnabled': form.biometricEnabled,
        'settings.privacy': { ...form.privacy, isGhostMode: form.isGhostMode }
      });
      onOpenChange(false);
      toast({ title: "Конфигурация обновлена" });
    } catch (e: any) { 
      toast({ title: "Ошибка", description: e.message, variant: "destructive" }); 
    }
    finally { setIsSaving(false); }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/98 backdrop-blur-[50px] border-white/10 p-0 overflow-hidden h-[90dvh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 relative overflow-hidden text-left">
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

          <ScrollArea className="flex-1">
            <div className="pb-40"> 
              <TabsContent value="profile" className="space-y-8 m-0 p-8">
                <div className="flex flex-col items-center gap-8">
                  <div className="relative group">
                    <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                    <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-2xl shadow-2xl hover:scale-110 transition-all z-20"><Camera className="w-4 h-4 text-white" /></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                  </div>
                  <div className="space-y-6 w-full text-left">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Идентификация</Label>
                        <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Никнейм</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-black text-xs">@</span>
                          <Input value={form.username} onChange={e => setForm({...form, username: e.target.value.replace(/[^a-zA-Z0-9_@]/g, '')})} className="bg-white/5 border-white/10 h-11 rounded-xl pl-7" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Smile className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[9px] font-black uppercase text-primary tracking-widest">Текущий Статус</span>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-14"><Input placeholder="🏠" maxLength={2} value={form.statusEmoji} onChange={e => setForm({...form, statusEmoji: e.target.value})} className="bg-black/40 border-white/10 h-12 rounded-xl text-center text-xl" /></div>
                        <Input placeholder="Чем занимаетесь?" value={form.statusText} onChange={e => setForm({...form, statusText: e.target.value})} className="bg-black/40 border-white/10 h-12 rounded-xl text-xs font-bold" />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="premium" className="space-y-8 m-0 p-8 pb-32 text-center">
                 {isPremium ? (
                   <div className="space-y-8">
                     <div className="bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 p-8 rounded-[3rem] border border-primary/20 text-center relative overflow-hidden shadow-2xl">
                        <Star className="w-16 h-16 text-accent fill-accent mx-auto mb-4 animate-pulse" />
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Elite Node Active</h3>
                        <div className="mt-6 flex items-center justify-center gap-3 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 mx-auto w-fit">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            До: {profile?.premiumUntil ? format(new Date(profile.premiumUntil), 'dd.MM.yyyy', { locale: ru }) : 'Бессрочно'}
                          </span>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-primary text-left ml-2">Разблокированные модули:</h4>
                        <div className="grid grid-cols-1 gap-2">
                          <PremiumBenefit label="Ghost Mode (Инкогнито)" icon={Ghost} active />
                          <PremiumBenefit label="Эксклюзивные 3D стикеры" icon={Smile} active />
                          <PremiumBenefit label="Приоритетная синхронизация" icon={ShieldCheck} active />
                          <PremiumBenefit label="Кастомные фоны чата" icon={ImageIcon} active />
                        </div>
                     </div>
                   </div>
                 ) : (
                   <div className="space-y-8">
                     <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 text-center space-y-6">
                       <Star className="w-12 h-12 text-white/10 mx-auto" />
                       <h3 className="text-xl font-black text-white uppercase italic">Nuxus Premium</h3>
                       <Button className="w-full h-14 bg-white text-black rounded-2xl font-black uppercase italic tracking-widest shadow-xl">Подключить Elite</Button>
                     </div>
                   </div>
                 )}
              </TabsContent>

              <TabsContent value="privacy" className="space-y-8 m-0 p-8 pb-32 text-left">
                <div className="bg-accent/5 p-6 rounded-[2.5rem] border border-accent/20 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-4 text-left">
                    <div className="bg-accent/10 p-3 rounded-xl"><Ghost className="w-6 h-6 text-accent" /></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white uppercase italic">Ghost Mode</span>
                      <span className="text-[8px] text-accent font-black uppercase tracking-widest">Полная невидимость</span>
                    </div>
                  </div>
                  <Switch checked={form.isGhostMode} onCheckedChange={v => setForm({ ...form, isGhostMode: v })} />
                </div>
                <div className="space-y-10 bg-white/[0.02] p-6 rounded-[2.5rem] border border-white/5">
                  <PrivacySection icon={Smartphone} label="Номер телефона" value={form.privacy.phoneVisibility} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, phoneVisibility: v}})} onManageExceptions={() => setExceptionTarget('phoneWhitelist')} />
                  <PrivacySection icon={Eye} label="Последний вход" value={form.privacy.lastSeenVisibility} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, lastSeenVisibility: v}})} onManageExceptions={() => setExceptionTarget('lastSeenWhitelist')} />
                  <PrivacySection icon={Camera} label="Фотографии профиля" value={form.privacy.profilePhotoVisibility} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, profilePhotoVisibility: v}})} onManageExceptions={() => setExceptionTarget('profilePhotoWhitelist')} />
                </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-[#0a0a0c] shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <Button variant="ghost" className="h-16 w-16 rounded-[1.8rem] bg-red-500/10 text-red-500" onClick={() => signOut(auth)}>
              <LogOut className="w-7 h-7" />
            </Button>
            <Button disabled={isSaving} className="flex-1 h-16 rounded-[1.8rem] font-black uppercase italic bg-primary text-white shadow-2xl active:scale-95 transition-all" onClick={handleSave}>
              {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : <><Check className="w-6 h-6 mr-3" /> Сохранить</>}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>

    <PrivacyExceptionModal 
      open={!!exceptionTarget} 
      onOpenChange={() => setExceptionTarget(null)} 
      title="Исключения"
      whitelist={form.privacy[exceptionTarget as keyof typeof form.privacy] as string[] || []}
      onUpdate={(newList: string[]) => setForm(prev => ({ ...prev, privacy: { ...prev.privacy, [exceptionTarget as string]: newList } }))}
    />
    </>
  );
}

function PremiumBenefit({ label, icon: Icon, active }: any) {
  return (
    <div className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all", active ? "bg-primary/10 border-primary/20" : "bg-white/5 border-white/5")}>
      <div className="flex items-center gap-3">
        <Icon className={cn("w-4 h-4", active ? "text-accent" : "text-white/20")} />
        <span className={cn("text-[11px] font-bold uppercase", active ? "text-white" : "text-white/40")}>{label}</span>
      </div>
      {active && <CheckCircle2 className="w-4 h-4 text-green-500" />}
    </div>
  );
}

function PrivacySection({ icon: Icon, label, value, isPremium, onChange, onManageExceptions }: any) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Icon className="w-3.5 h-3.5 text-primary/40" />
        <span className="text-[9px] font-black uppercase text-white/60 tracking-widest">{label}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl text-[10px] font-black uppercase">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0c]/95 backdrop-blur-3xl border-white/10 rounded-2xl shadow-2xl">
          <SelectItem value="everybody" className="text-[10px] font-black uppercase">Все узлы</SelectItem>
          <SelectItem value="contacts" className="text-[10px] font-black uppercase">Только контакты</SelectItem>
          <SelectItem value="premium" disabled={!isPremium} className="text-[10px] font-black uppercase text-accent">Elite Only ★</SelectItem>
          <SelectItem value="nobody" className="text-[10px] font-black uppercase text-red-400">Никто</SelectItem>
        </SelectContent>
      </Select>
      <button onClick={onManageExceptions} className="text-[8px] font-black uppercase text-primary/60 hover:text-primary transition-colors flex items-center gap-1.5 ml-1">
        <Users className="w-3 h-3" /> Исключения
      </button>
    </div>
  );
}

function PrivacyExceptionModal({ open, onOpenChange, title, whitelist, onUpdate }: any) {
  const db = useFirestore();
  const { user } = useUser();
  const [search, setSearch] = useState('');

  const allUsersQuery = useMemoFirebase(() => (!db ? null : query(collection(db, 'users'), limit(100))), [db]);
  const { data: allUsers } = useCollection<User>(allUsersQuery);

  const filteredUsers = (allUsers || []).filter(u => {
    const searchVal = search.toLowerCase();
    return (u.name?.toLowerCase().includes(searchVal) || u.username?.toLowerCase().includes(searchVal)) && u.id !== user?.uid;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-[#0a0a0c]/98 backdrop-blur-[60px] border-white/10 rounded-[2.5rem] p-0 h-[75vh] flex flex-col outline-none shadow-2xl">
        <DialogHeader className="p-8 pb-4 shrink-0 border-b border-white/5 text-left">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-primary" /> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4 shrink-0">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
            <Input placeholder="Поиск узлов..." value={search} onChange={e => setSearch(e.target.value)} className="bg-white/5 border-white/10 h-11 rounded-xl pl-9 text-xs" />
          </div>
        </div>
        <ScrollArea className="flex-1 px-4">
          <div className="p-2 space-y-2 pb-10">
            {filteredUsers.map(u => {
              const isSelected = whitelist.includes(u.id);
              return (
                <div key={u.id} onClick={() => onUpdate(isSelected ? whitelist.filter((id: string) => id !== u.id) : [...whitelist, u.id])} className={cn("flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer", isSelected ? "bg-primary/10 border-primary/30" : "bg-white/[0.02] border-white/5")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar userId={u.id} className="h-10 w-10" manualAvatarUrl={u.avatarUrl} />
                    <div className="flex flex-col text-left min-w-0">
                      <span className={cn("font-black text-sm truncate uppercase", isSelected ? "text-primary" : "text-white")}>{formatDisplayName(u.name, u.username)}</span>
                      <span className="text-[9px] text-muted-foreground uppercase font-black">{u.username}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="p-6 border-t border-white/5"><Button onClick={() => onOpenChange(false)} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl">Confirm</Button></div>
      </DialogContent>
    </Dialog>
  );
}
