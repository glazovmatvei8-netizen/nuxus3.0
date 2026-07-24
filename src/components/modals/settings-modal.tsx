
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { UserAvatar } from '@/components/user-avatar';
import { 
  LogOut, Settings2, Camera, Star, ShieldCheck, Loader2, CheckCircle2, Fingerprint, Palette, Archive, ChevronRight, X, Globe, Smartphone, Monitor, Trash2, MapPin, Activity, Zap, Mail, Phone, Lock, Eye, EyeOff, AlertTriangle, UserCheck, ShieldAlert, FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, updateDoc, collection, query, orderBy, deleteDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { isUserPremium, cn } from '@/lib/utils';
import type { User, Session, PrivacyOption } from '@/lib/types';

/**
 * SETTINGS CORE V5.8.0 «PRIVACY & VERIFICATION»
 */
export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { settingsTab, setSettingsTab, setIsLegalOpen } = useAppState();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const sessionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'sessions'), orderBy('lastActive', 'desc'));
  }, [db, user]);
  const { data: sessions } = useCollection<Session>(sessionsQuery);

  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', username: '', bio: '', avatarUrl: '', phone: '', email: '',
    twoFactorEnabled: false, twoFactorPin: '', biometricEnabled: false,
    appearance: 'dark' as 'light' | 'dark', theme: 'default',
    bubbleStyle: 'default', chatBackground: '', customPrimaryColor: '', customAppIconUrl: '',
    isGhostMode: false,
    phoneVisibility: 'contacts' as PrivacyOption,
    lastSeenVisibility: 'everybody' as PrivacyOption,
    allowGroupsFrom: 'everybody' as PrivacyOption
  });

  useEffect(() => {
    if (profile && open) {
      setForm({
        name: profile.name || '',
        username: (profile.username || '').replace('@', ''),
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || '',
        phone: profile.phone || '',
        email: profile.email || '',
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || '',
        biometricEnabled: !!profile.settings?.biometricEnabled,
        appearance: profile.settings?.appearance || 'dark',
        theme: profile.settings?.theme || 'default',
        bubbleStyle: profile.settings?.bubbleStyle || 'default',
        chatBackground: profile.settings?.chatBackground || '',
        customPrimaryColor: profile.settings?.customPrimaryColor || '',
        customAppIconUrl: profile.settings?.customAppIconUrl || '',
        isGhostMode: !!profile.settings?.privacy?.isGhostMode,
        phoneVisibility: profile.settings?.privacy?.phoneVisibility || 'contacts',
        lastSeenVisibility: profile.settings?.privacy?.lastSeenVisibility || 'everybody',
        allowGroupsFrom: profile.settings?.privacy?.allowGroupsFrom || 'everybody'
      });
    }
  }, [profile, open]);

  const handleSave = async () => {
    if (!db || !user) return;
    setIsSaving(true);
    try {
      const usernameWithAt = '@' + form.username.trim().replace('@', '');
      await updateDoc(doc(db, 'users', user.uid), {
        name: form.name.trim(),
        username: usernameWithAt,
        usernameLowercase: usernameWithAt.toLowerCase(),
        bio: form.bio.trim(),
        avatarUrl: form.avatarUrl,
        phone: form.phone.trim(),
        email: form.email.trim(),
        twoFactorEnabled: form.twoFactorEnabled,
        twoFactorPin: form.twoFactorPin,
        'settings.appearance': form.appearance,
        'settings.theme': form.theme,
        'settings.biometricEnabled': form.biometricEnabled,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.chatBackground': form.chatBackground,
        'settings.customPrimaryColor': form.customPrimaryColor,
        'settings.customAppIconUrl': form.customAppIconUrl,
        'settings.privacy.isGhostMode': form.isGhostMode,
        'settings.privacy.phoneVisibility': form.phoneVisibility,
        'settings.privacy.lastSeenVisibility': form.lastSeenVisibility,
        'settings.privacy.allowGroupsFrom': form.allowGroupsFrom
      });
      toast({ title: "Узел синхронизирован" });
      onOpenChange(false);
    } catch (e: any) { 
      toast({ title: "Сбой записи", variant: "destructive" }); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const verifyEmail = () => toast({ title: "Запрос отправлен", description: "Проверьте почту для подтверждения узла." });
  const verifyPhone = () => toast({ title: "Запрос SMS", description: "Код подтверждения отправлен на ваш номер." });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0c]/98 backdrop-blur-[60px] border-white/10 p-0 overflow-hidden h-[90dvh] flex flex-col rounded-[3rem] shadow-2xl outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 text-left bg-gradient-to-b from-primary/10 to-transparent">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black italic uppercase text-white">
            <Settings2 className="w-7 h-7 text-primary" /> КОНФИГУРАЦИЯ
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 mt-4">
            <TabsList className="grid grid-cols-4 bg-white/5 p-1 rounded-2xl border border-white/5">
              <TabsTrigger value="profile" className="text-[9px] font-black uppercase tracking-widest">Узел</TabsTrigger>
              <TabsTrigger value="privacy" className="text-[9px] font-black uppercase tracking-widest">Защита</TabsTrigger>
              <TabsTrigger value="style" className="text-[9px] font-black uppercase tracking-widest">Стиль</TabsTrigger>
              <TabsTrigger value="data" className="text-[9px] font-black uppercase tracking-widest">Инфо</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="pb-40"> 
              <TabsContent value="profile" className="space-y-6 m-0 p-8">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-4 border-primary/20 shadow-2xl" fallbackName={form.name} />
                    <div className="absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-2xl shadow-2xl border-2 border-[#0a0a0c]"><Camera className="w-4 h-4 text-white" /></div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                  </div>

                  <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 space-y-6 w-full">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Имя</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-black/40 border-white/10 h-11 rounded-xl font-bold" /></div>
                        <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-primary/60 ml-2">ID Узла</Label><Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-black/40 border-white/10 h-11 rounded-xl font-bold" /></div>
                     </div>
                     
                     <div className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Электронная почта</Label>
                           <div className="flex gap-2">
                             <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="bg-black/20 border-white/5 h-11 rounded-xl text-xs flex-1" />
                             {!profile?.emailVerified && <Button variant="ghost" onClick={verifyEmail} className="h-11 rounded-xl bg-primary/10 text-primary text-[8px] font-black uppercase px-4">Подтвердить</Button>}
                           </div>
                        </div>
                        <div className="space-y-1.5">
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Номер телефона</Label>
                           <div className="flex gap-2">
                             <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-black/20 border-white/5 h-11 rounded-xl text-xs flex-1" />
                             {!profile?.phoneVerified && <Button variant="ghost" onClick={verifyPhone} className="h-11 rounded-xl bg-primary/10 text-primary text-[8px] font-black uppercase px-4">Подтвердить</Button>}
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-6 m-0 p-8 text-left">
                 <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-xl"><Fingerprint className="w-5 h-5 text-primary" /></div>
                        <span className="text-sm font-bold text-white uppercase italic">Ghost Mode</span>
                      </div>
                      <Switch checked={form.isGhostMode} onCheckedChange={v => setForm({...form, isGhostMode: v})} />
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-white/5">
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white uppercase tracking-tight">Облачный пароль (2FA)</span>
                          <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                       </div>
                       {form.twoFactorEnabled && (
                         <Input type="password" value={form.twoFactorPin} onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})} placeholder="6-значный PIN" maxLength={6} className="bg-black/40 border-white/10 h-12 rounded-xl text-center tracking-[0.4em] font-black text-primary" />
                       )}
                    </div>
                 </div>

                 <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-6">
                    <div className="flex items-center gap-3 mb-2"><ShieldCheck className="w-4 h-4 text-primary" /><span className="text-[10px] font-black uppercase tracking-widest text-white/40">Видимость Узла</span></div>
                    
                    <PrivacySelector label="Номер телефона" value={form.phoneVisibility} onChange={v => setForm({...form, phoneVisibility: v})} />
                    <PrivacySelector label="Последний вход" value={form.lastSeenVisibility} onChange={v => setForm({...form, lastSeenVisibility: v})} />
                    <PrivacySelector label="Добавление в группы" value={form.allowGroupsFrom} onChange={v => setForm({...form, allowGroupsFrom: v})} />
                 </div>

                 <button onClick={() => setIsLegalOpen(true)} className="w-full flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                    <div className="flex items-center gap-3">
                       <FileText className="w-4 h-4 text-primary" />
                       <span className="text-[11px] font-black text-white uppercase tracking-widest">Политика конфиденциальности</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-20" />
                 </button>
              </TabsContent>

              <TabsContent value="style" className="space-y-6 m-0 p-8 text-left">
                 <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-8">
                    <div className="space-y-4">
                       <Label className="text-[10px] font-black uppercase text-primary/60 ml-2 tracking-widest">Пакет пузырей</Label>
                       <div className="grid grid-cols-2 gap-3">
                          {['default', 'neon', 'gold', 'ocean'].map(s => (
                            <button key={s} onClick={() => setForm({...form, bubbleStyle: s as any})} className={cn("h-12 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all", form.bubbleStyle === s ? "border-primary bg-primary/10 text-primary" : "border-white/5 bg-black/40 text-white/30")}>{s}</button>
                          ))}
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-8 m-0 p-8 text-left">
                 <div className="space-y-6">
                    <div className="flex items-center justify-between px-1"><h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Сеансы</h3><Activity className="w-3 h-3 text-primary animate-pulse" /></div>
                    <div className="space-y-3">
                       {sessions?.map(s => (
                         <div key={s.id} className="bg-white/5 p-4 rounded-[1.5rem] border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">{s.deviceName.includes('PC') ? <Monitor className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}</div>
                               <div className="flex flex-col"><span className="text-[12px] font-black text-white uppercase">{s.deviceName}</span><span className="text-[8px] text-muted-foreground font-black uppercase">{s.ip} • {s.countryCode}</span></div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-[#0a0a0c] shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20" onClick={() => signOut(auth)}><LogOut className="w-6 h-6" /></Button>
            <Button disabled={isSaving} className="flex-1 h-14 rounded-2xl font-black uppercase italic bg-primary text-white shadow-2xl active:scale-95 group relative overflow-hidden" onClick={handleSave}>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : 'Записать в Ядро'}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PrivacySelector({ label, value, onChange }: { label: string, value: PrivacyOption, onChange: (v: PrivacyOption) => void }) {
  const options: PrivacyOption[] = ['everybody', 'contacts', 'nobody'];
  const labels: Record<string, string> = { everybody: 'Все', contacts: 'Контакты', nobody: 'Никто' };

  return (
    <div className="space-y-2">
       <span className="text-[9px] font-black uppercase text-white/60 ml-1">{label}</span>
       <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
          {options.map(opt => (
            <button key={opt} onClick={() => onChange(opt)} className={cn("flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all", value === opt ? "bg-primary text-white" : "text-white/20")}>{labels[opt]}</button>
          ))}
       </div>
    </div>
  )
}
