
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
  LogOut, Settings2, Camera, Star, ShieldCheck, Loader2, CheckCircle2, Fingerprint, Palette, Archive, ChevronRight, X, Globe, Smartphone, Monitor, Trash2, MapPin, Activity, Zap, Mail, Phone, Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, collection, query, orderBy, deleteDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { isUserPremium, cn } from '@/lib/utils';
import type { User, Session } from '@/lib/types';

/**
 * SETTINGS CORE V5.8.0 «ELITE RESTORATION»
 */
export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { settingsTab, setSettingsTab } = useAppState();
  
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
    isGhostMode: false
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
        isGhostMode: !!profile.settings?.privacy?.isGhostMode
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
        'settings.privacy.isGhostMode': form.isGhostMode
      });
      toast({ title: "Узел синхронизирован V5.8.0" });
      onOpenChange(false);
    } catch (e: any) { 
      toast({ title: "Сбой записи", variant: "destructive" }); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const terminateSession = async (sessionId: string) => {
    if (!db || !user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'sessions', sessionId));
      toast({ title: "Сеанс аннигилирован" });
    } catch (e) { toast({ title: "Ошибка удаления", variant: "destructive" }); }
  };

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
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setForm({...form, avatarUrl: r.result as string}); r.readAsDataURL(f); } }} />
                  </div>

                  <div className="space-y-4 w-full text-left">
                    <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Имя</Label>
                           <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-black/40 border-white/10 h-11 rounded-xl font-bold" />
                         </div>
                         <div className="space-y-1.5">
                           <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">ID Узла</Label>
                           <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-black/40 border-white/10 h-11 rounded-xl font-bold" />
                         </div>
                       </div>
                       
                       <div className="space-y-3 pt-2 border-t border-white/5">
                          <div className="flex items-center gap-3">
                             <Mail className="w-4 h-4 text-primary/40" />
                             <Input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="bg-black/20 border-white/5 h-10 rounded-xl text-xs" />
                          </div>
                          <div className="flex items-center gap-3">
                             <Phone className="w-4 h-4 text-primary/40" />
                             <Input placeholder="Телефон" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-black/20 border-white/5 h-10 rounded-xl text-xs" />
                          </div>
                       </div>

                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">О себе</Label>
                         <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-black/40 border-white/10 rounded-2xl h-20 resize-none p-4 text-sm" placeholder="Спецификация узла..." />
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
                        <div className="flex flex-col"><span className="text-sm font-bold text-white uppercase italic">Ghost Mode</span></div>
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
              </TabsContent>

              <TabsContent value="style" className="space-y-6 m-0 p-8 text-left">
                 <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-8 shadow-inner">
                    <div className="space-y-4">
                       <Label className="text-[10px] font-black uppercase text-primary/60 ml-2 tracking-widest">Визуальный пакет пузырей</Label>
                       <div className="grid grid-cols-2 gap-3">
                          {['default', 'neon', 'gold', 'ocean'].map(s => (
                            <button 
                              key={s} 
                              onClick={() => setForm({...form, bubbleStyle: s as any})} 
                              className={cn(
                                "h-12 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                                form.bubbleStyle === s ? "border-primary bg-primary/10 text-primary" : "border-white/5 bg-black/40 text-white/30"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                       <Label className="text-[10px] font-black uppercase text-primary/60 ml-2 tracking-widest">Кастомизация Ядра</Label>
                       <div className="space-y-3">
                          <div className="space-y-1.5">
                            <span className="text-[8px] font-bold text-white/20 uppercase ml-2">Цвет HEX</span>
                            <Input placeholder="#A855F7" value={form.customPrimaryColor} onChange={e => setForm({...form, customPrimaryColor: e.target.value})} className="bg-black/40 border-white/5 h-10 rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <span className="text-[8px] font-bold text-white/20 uppercase ml-2">URL Фона чатов</span>
                            <Input placeholder="https://..." value={form.chatBackground} onChange={e => setForm({...form, chatBackground: e.target.value})} className="bg-black/40 border-white/5 h-10 rounded-xl" />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                       <Label className="text-[10px] font-black uppercase text-primary/60 ml-2 tracking-widest">Тема интерфейса</Label>
                       <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
                          <button onClick={() => setForm({...form, appearance: 'dark'})} className={cn("flex-1 h-9 rounded-xl text-[9px] font-black uppercase transition-all", form.appearance === 'dark' ? "bg-white/10 text-white" : "text-white/20")}>Dark</button>
                          <button onClick={() => setForm({...form, appearance: 'light'})} className={cn("flex-1 h-9 rounded-xl text-[9px] font-black uppercase transition-all", form.appearance === 'light' ? "bg-white/10 text-white" : "text-white/20")}>Light</button>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-8 m-0 p-8 text-left">
                 <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                       <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Активные сеансы</h3>
                       <Activity className="w-3 h-3 text-primary animate-pulse" />
                    </div>
                    <div className="space-y-3">
                       {sessions?.map(s => (
                         <div key={s.id} className="bg-white/5 p-4 rounded-[1.5rem] border border-white/5 flex items-center justify-between group transition-all hover:bg-white/[0.08]">
                            <div className="flex items-center gap-4">
                               <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                  {s.deviceName.includes('PC') || s.deviceName.includes('Mac') || s.deviceName.includes('Windows') ? <Monitor className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                               </div>
                               <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                     <span className="text-[12px] font-black text-white uppercase italic">{s.deviceName}</span>
                                     {s.id === localStorage.getItem('nuxus_session_id') && <span className="bg-green-500/20 text-green-500 text-[6px] px-2 py-0.5 rounded-full font-black uppercase">Текущий</span>}
                                  </div>
                                  <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">{s.ip} • {s.countryCode}</span>
                               </div>
                            </div>
                            {s.id !== localStorage.getItem('nuxus_session_id') && (
                              <button onClick={() => terminateSession(s.id)} className="h-8 w-8 flex items-center justify-center text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                         </div>
                       ))}
                    </div>
                 </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-[#0a0a0c] shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 active:scale-90 transition-all" onClick={() => signOut(auth)}>
               <LogOut className="w-6 h-6" />
            </Button>
            <Button disabled={isSaving} className="flex-1 h-14 rounded-2xl font-black uppercase italic bg-primary text-white shadow-2xl active:scale-95 transition-all group relative overflow-hidden" onClick={handleSave}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : 'Записать в Ядро'}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
