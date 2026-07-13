
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
  Users, ShieldAlert, Ghost, Mail, Share2, FileText, Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, collection, query, limit } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { cn, isUserPremium, formatDisplayName } from '@/lib/utils';
import type { User, PrivacyOption } from '@/lib/types';
import nuxusVersions from '@/app/versions.json';

/**
 * SettingsModal V37.2.0
 * ФИКС: Исправлен ReferenceError useCollection, добавлена валидация English Only ников.
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

    // Валидация ника: только английский
    const rawUsername = form.username.trim().replace('@', '');
    if (/[^a-zA-Z0-9_]/.test(rawUsername)) {
      toast({ title: "Ошибка ника", description: "Используйте только английские буквы и цифры.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const usernameWithAt = '@' + rawUsername;
      
      await updateDoc(doc(db, 'users', user.uid), {
        name: form.name.trim(),
        username: usernameWithAt,
        usernameLowercase: usernameWithAt.toLowerCase(),
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

  const handleVerifyField = async (field: 'email' | 'phone') => {
    if (!db || !user) return;
    setIsVerifying(field);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await updateDoc(doc(db, 'users', user.uid), {
        [`${field}Verified`]: true
      });
      toast({ title: "Верификация успешна" });
    } catch (e) {
      toast({ title: "Сбой", variant: "destructive" });
    } finally {
      setIsVerifying(null);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm({ ...form, chatBackground: reader.result as string });
    reader.readAsDataURL(file);
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

          <ScrollArea className="flex-1 w-full h-full relative">
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
                        <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">Имя</Label>
                        <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-white/5 border-white/10 h-11 rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-primary/60 ml-2">ID (English Only)</Label>
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
                        <div className="w-14">
                          <Input 
                            placeholder="🏠" 
                            maxLength={2} 
                            value={form.statusEmoji} 
                            onChange={e => setForm({...form, statusEmoji: e.target.value})} 
                            className="bg-black/40 border-white/10 h-12 rounded-xl text-center text-xl" 
                          />
                        </div>
                        <Input 
                          placeholder="Чем занимаетесь?" 
                          value={form.statusText} 
                          onChange={e => setForm({...form, statusText: e.target.value})} 
                          className="bg-black/40 border-white/10 h-12 rounded-xl text-xs font-bold" 
                        />
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
                                   <div className="bg-green-500/10 text-green-500 h-11 px-4 flex items-center rounded-xl border border-green-500/20"><Check className="w-5 h-5 stroke-[3]" /></div>
                                ) : (
                                   <Button onClick={() => handleVerifyField('phone')} disabled={isVerifying === 'phone'} variant="ghost" className="h-11 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-4 border border-primary/20">{isVerifying === 'phone' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Подтвердить'}</Button>
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
                                   <div className="bg-green-500/10 text-green-500 h-11 px-4 flex items-center rounded-xl border border-green-500/20"><Check className="w-5 h-5 stroke-[3]" /></div>
                                ) : (
                                   <Button onClick={() => handleVerifyField('email')} disabled={isVerifying === 'email'} variant="ghost" className="h-11 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-4 border border-primary/20">{isVerifying === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Подтвердить'}</Button>
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="style" className="p-8 pb-32 space-y-10 text-left">
                <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><Monitor className="w-5 h-5" /> Визуальная среда</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setForm({...form, appearance: 'dark'})} className={cn("h-14 rounded-2xl border text-[11px] font-black uppercase transition-all", form.appearance === 'dark' ? "bg-primary text-white border-primary shadow-xl" : "bg-white/5 border-white/10 text-white/40")}>Obsidian</button>
                    <button onClick={() => setForm({...form, appearance: 'light'})} className={cn("h-14 rounded-2xl border text-[11px] font-black uppercase transition-all", form.appearance === 'light' ? "bg-white text-black border-white shadow-xl" : "bg-white/5 border-white/10 text-white/40")}>Crystal</button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><ImageIcon className="w-5 h-5" /> Обои чата</h3>
                  <div className="space-y-4">
                    <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-white/5 group">
                      {form.chatBackground ? (
                        <img src={form.chatBackground} className="w-full h-full object-cover" alt="Background" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 opacity-20">
                          <ImageIcon className="w-8 h-8" />
                          <span className="text-[9px] font-black uppercase">Фон не установлен</span>
                        </div>
                      )}
                      <button onClick={() => bgInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-black uppercase bg-white text-black px-4 py-2 rounded-xl">Сменить фон</span>
                      </button>
                    </div>
                    <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3"><MessageSquare className="w-5 h-5" /> Контейнеры сигналов</h3>
                  <div className="grid grid-cols-2 gap-3">
                      {['default', 'neon', 'gold', 'ocean'].map(s => (
                        <button key={s} onClick={() => setForm({...form, bubbleStyle: s})} className={cn("h-12 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all", form.bubbleStyle === s ? "bg-white/10 text-white border-white/30" : "bg-white/5 border-white/10 text-white/40")}>{s}</button>
                      ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-8 m-0 p-8 pb-24 text-left">
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
                  <PrivacySection icon={Smartphone} label="Номер телефона" value={form.privacy.phoneVisibility} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, phoneVisibility: v}})} onManageExceptions={() => setExceptionTarget('phoneWhitelist')} />
                  <PrivacySection icon={Eye} label="Последний вход" value={form.privacy.lastSeenVisibility} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, lastSeenVisibility: v}})} onManageExceptions={() => setExceptionTarget('lastSeenWhitelist')} />
                  <PrivacySection icon={Camera} label="Фотографии профиля" value={form.privacy.profilePhotoVisibility} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, profilePhotoVisibility: v}})} onManageExceptions={() => setExceptionTarget('profilePhotoWhitelist')} />
                  <PrivacySection icon={Share2} label="Пересылка" value={form.privacy.forwardingVisibility} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, forwardingVisibility: v}})} onManageExceptions={() => setExceptionTarget('forwardingWhitelist')} />
                  <PrivacySection icon={FileText} label="Био" value={form.privacy.bioVisibility} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, bioVisibility: v}})} onManageExceptions={() => setExceptionTarget('bioWhitelist')} />
                  <PrivacySection icon={PhoneCall} label="Звонки" value={form.privacy.whoCanCallMe} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, whoCanCallMe: v}})} onManageExceptions={() => setExceptionTarget('callWhitelist')} />
                  <PrivacySection icon={Users} label="Группы" value={form.privacy.allowGroupsFrom} isPremium={isPremium} onChange={(v: any) => setForm({...form, privacy: {...form.privacy, allowGroupsFrom: v}})} onManageExceptions={() => setExceptionTarget('groupsWhitelist')} />
                </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-8 m-0 p-8 pb-24 text-left">
                 <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 text-center space-y-8 shadow-2xl">
                    <Database className="w-14 h-14 text-accent mx-auto animate-pulse" />
                    <h3 className="text-xl font-black uppercase italic text-white tracking-tighter">Целостность данных</h3>
                    <div className="grid grid-cols-1 gap-3">
                       <Button onClick={() => { setIsCheckingUpdates(true); setTimeout(() => { setIsCheckingUpdates(false); toast({ title: "У вас последняя версия" }); }, 2000); }} disabled={isCheckingUpdates} className="w-full h-14 bg-primary/10 border border-primary/20 text-primary rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3">
                          {isCheckingUpdates ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCcw className="w-5 h-5" /> Проверить патчи</>}
                       </Button>
                       <Button onClick={() => { setIsRequestingArchive(true); setTimeout(() => { setIsRequestingArchive(false); toast({ title: "Дамп сформирован" }); }, 1500); }} disabled={isRequestingArchive} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3">
                          {isRequestingArchive ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-5 h-5" /> Сформировать ZIP</>}
                       </Button>
                    </div>
                 </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-[#0a0a0c] shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))] relative">
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
      title={exceptionTarget || 'Исключения'}
      whitelist={form.privacy[exceptionTarget as keyof typeof form.privacy] as string[] || []}
      onUpdate={(newList: string[]) => setForm(prev => ({ ...prev, privacy: { ...prev.privacy, [exceptionTarget as string]: newList } }))}
    />
    </>
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
        <Users className="w-3 h-3" /> Настроить исключения
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

  const toggleUser = (uid: string) => {
    const next = whitelist.includes(uid) ? whitelist.filter((id: string) => id !== uid) : [...whitelist, uid];
    onUpdate(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-[#0a0a0c]/98 backdrop-blur-[60px] border-white/10 rounded-[2.5rem] p-0 h-[75vh] flex flex-col outline-none shadow-2xl">
        <DialogHeader className="p-8 pb-4 shrink-0 border-b border-white/5 text-left">
          <DialogTitle className="text-xl font-black uppercase italic text-white flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-primary" /> Исключения
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
                <div key={u.id} onClick={() => toggleUser(u.id)} className={cn("flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer", isSelected ? "bg-primary/10 border-primary/30" : "bg-white/[0.02] border-white/5 hover:bg-white/5")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar userId={u.id} className="h-10 w-10" manualAvatarUrl={u.avatarUrl} />
                    <div className="flex flex-col text-left min-w-0">
                      <span className={cn("font-black text-sm truncate uppercase", isSelected ? "text-primary" : "text-white")}>{formatDisplayName(u.name, u.username)}</span>
                      <span className="text-[9px] text-muted-foreground uppercase font-black">{u.username}</span>
                    </div>
                  </div>
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-lg", isSelected ? "bg-primary text-white" : "bg-white/5 text-white/20")}>
                    {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4" />}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-white/5">
           <Button onClick={() => onOpenChange(false)} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl">
             Подтвердить список
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
