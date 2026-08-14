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
  LogOut, Settings2, Camera, ShieldCheck, Loader2, Fingerprint, Palette, 
  ChevronRight, Globe, Trash2, Mail, Phone, Lock, 
  Info, HelpCircle, UserCheck, ShieldAlert, ImageIcon, Type, LayoutGrid, MessageSquare, Headphones
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, deleteDoc, addDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { isUserPremium, cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import versions from '@/app/versions.json';

/**
 * SETTINGS MODAL V52.0 «STABILITY & EXPANSION»
 * UPDATED: More themes, support button, and improved style settings.
 */
export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { settingsTab, setSettingsTab, setIsLegalOpen, setCurrentChatId, setActiveView } = useAppState();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<User>(userRef);

  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', username: '', bio: '', avatarUrl: '', phone: '', email: '',
    appearance: 'dark' as 'light' | 'dark', theme: 'default',
    customPrimaryColor: '', chatBackground: '',
    bubbleStyle: 'default' as any, fontFamily: 'jakarta' as any,
    messageSize: 'medium' as any,
    isGhostMode: false, twoFactorEnabled: false, twoFactorPin: ''
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
        appearance: profile.settings?.appearance || 'dark',
        theme: profile.settings?.theme || 'default',
        customPrimaryColor: profile.settings?.customPrimaryColor || '',
        chatBackground: profile.settings?.chatBackground || '',
        bubbleStyle: profile.settings?.bubbleStyle || 'default',
        fontFamily: profile.settings?.fontFamily || 'jakarta',
        messageSize: profile.settings?.messageSize || 'medium',
        isGhostMode: !!profile.settings?.privacy?.isGhostMode,
        twoFactorEnabled: !!profile.twoFactorEnabled,
        twoFactorPin: profile.twoFactorPin || ''
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
        'settings.customPrimaryColor': form.customPrimaryColor,
        'settings.chatBackground': form.chatBackground,
        'settings.bubbleStyle': form.bubbleStyle,
        'settings.fontFamily': form.fontFamily,
        'settings.messageSize': form.messageSize,
        'settings.privacy.isGhostMode': form.isGhostMode,
      });
      toast({ title: "Настройки синхронизированы" });
      onOpenChange(false);
    } catch (e: any) { toast({ title: "Ошибка сохранения", variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  const openSupport = async () => {
    if (!db || !user) return;
    const supportNodeId = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1'; // Admin Node as Support
    try {
      const q = query(collection(db, 'chats'), where('type', '==', 'private'), where('participantIds', 'array-contains', user.uid));
      const snap = await getDocs(q);
      const existing = snap.docs.find(d => d.data().participantIds.includes(supportNodeId));
      
      if (existing) {
        setCurrentChatId(existing.id);
      } else {
        const newChat = await addDoc(collection(db, 'chats'), {
          type: 'private',
          participantIds: [user.uid, supportNodeId],
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          name: "Поддержка Nuxus",
          username: "@support",
          metadata: {
            [user.uid]: { name: profile?.name || 'Node', username: profile?.username || '?' },
            [supportNodeId]: { name: "Поддержка Nuxus", username: "@support", isPremium: true }
          }
        });
        setCurrentChatId(newChat.id);
      }
      onOpenChange(false);
      setActiveView('chats');
      toast({ title: "Связь с Оператором установлена" });
    } catch (e) {
      toast({ title: "Сбой связи с Поддержкой", variant: "destructive" });
    }
  };

  const handleAnnihilate = async () => {
    if (!confirm("ВНИМАНИЕ: Это действие безвозвратно удалит ваш аккаунт. Продолжить?")) return;
    if (!db || !user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      signOut(auth!);
      toast({ title: "Аккаунт аннигилирован" });
    } catch (e) { toast({ title: "Ошибка протокола" }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0a0a0c]/98 backdrop-blur-[80px] border-white/10 p-0 overflow-hidden h-[85dvh] flex flex-col rounded-[2.5rem] shadow-2xl outline-none">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0 text-left bg-gradient-to-b from-primary/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20">
               <Settings2 className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-2xl font-black italic uppercase text-white tracking-tighter">Контроль</DialogTitle>
              <DialogDescription className="text-[9px] font-bold uppercase text-primary/60 mt-0.5 tracking-widest">Nuxus Core V{versions.latestVersion}</DialogDescription>
            </div>
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
            <div className="p-6 pb-20 space-y-6"> 
              <TabsContent value="profile" className="space-y-6 m-0">
                 <div className="flex flex-col items-center gap-6">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                       <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-32 w-32 border-[4px] border-[#0a0a0c] shadow-xl relative z-10" />
                       <div className="absolute bottom-1 right-1 bg-primary p-2.5 rounded-xl shadow-2xl z-20"><Camera className="w-4 h-4 text-white" /></div>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                    </div>
                    
                    <div className="w-full space-y-4">
                       <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4">
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">Полное имя</Label>
                             <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-12 bg-black/40 border-white/10 rounded-xl font-bold text-base" />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">Никнейм (@)</Label>
                             <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="h-12 bg-black/40 border-white/10 rounded-xl font-mono text-primary" />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 tracking-widest">О себе</Label>
                             <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Расскажите о себе..." className="bg-black/40 border-white/10 rounded-xl h-24 p-4 text-sm" />
                          </div>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-6 m-0">
                 <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-8">
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col gap-1">
                          <span className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> Ghost Mode</span>
                          <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest ml-6">Скрыть статус в сети</span>
                       </div>
                       <Switch checked={form.isGhostMode} onCheckedChange={v => setForm({...form, isGhostMode: v})} />
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                             <span className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Код защиты</span>
                             <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest ml-6">Дополнительный PIN</span>
                          </div>
                          <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                       </div>
                       {form.twoFactorEnabled && (
                         <Input 
                           type="password" 
                           placeholder="6 цифр" 
                           maxLength={6}
                           value={form.twoFactorPin} 
                           onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})}
                           className="h-14 bg-black/60 border-primary/40 rounded-xl text-center font-black tracking-[0.6em] text-2xl" 
                         />
                       )}
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-6 m-0">
                 <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-8">
                    <div className="space-y-3">
                       <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 flex items-center gap-2 tracking-widest"><Palette className="w-4 h-4" /> Акцентный цвет (HEX)</Label>
                       <div className="flex gap-4">
                          <Input value={form.customPrimaryColor} onChange={e => setForm({...form, customPrimaryColor: e.target.value})} placeholder="#A855F7" className="h-12 bg-black/40 border-white/10 font-mono text-center tracking-[0.1em] font-bold rounded-xl flex-1" />
                          <div className="w-12 h-12 rounded-xl shadow-xl border-2 border-[#0a0a0c] shrink-0" style={{ backgroundColor: form.customPrimaryColor || 'hsl(var(--primary))' }} />
                       </div>
                    </div>

                    <div className="space-y-3">
                       <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 flex items-center gap-2 tracking-widest"><ImageIcon className="w-4 h-4" /> Фон чата (URL)</Label>
                       <Input value={form.chatBackground} onChange={e => setForm({...form, chatBackground: e.target.value})} placeholder="https://..." className="h-12 bg-black/40 border-white/10 rounded-xl px-4 text-xs" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-white/40 ml-2 flex items-center gap-2 tracking-widest"><LayoutGrid className="w-3.5 h-3.5" /> Тема</Label>
                          <Select value={form.theme} onValueChange={v => setForm({...form, theme: v})}>
                             <SelectTrigger className="bg-black/40 border-white/10 rounded-xl h-11 text-[9px] font-black uppercase tracking-widest">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="bg-[#0a0a0c]/98 border-white/10 rounded-xl">
                                <SelectItem value="default" className="text-[9px] font-bold uppercase tracking-widest">Nuxus Classic</SelectItem>
                                <SelectItem value="glass" className="text-[9px] font-bold uppercase tracking-widest">Infinite Glass</SelectItem>
                                <SelectItem value="midnight" className="text-[9px] font-bold uppercase tracking-widest">Midnight Void</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-white/40 ml-2 flex items-center gap-2 tracking-widest"><Type className="w-3.5 h-3.5" /> Шрифт</Label>
                          <Select value={form.fontFamily} onValueChange={v => setForm({...form, fontFamily: v})}>
                             <SelectTrigger className="bg-black/40 border-white/10 rounded-xl h-11 text-[9px] font-black uppercase tracking-widest">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="bg-[#0a0a0c]/98 border-white/10 rounded-xl">
                                <SelectItem value="jakarta" className="text-[9px] font-bold uppercase tracking-widest">Jakarta</SelectItem>
                                <SelectItem value="inter" className="text-[9px] font-bold uppercase tracking-widest">Inter</SelectItem>
                                <SelectItem value="system" className="text-[9px] font-bold uppercase tracking-widest">System</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <Label className="text-[9px] font-black uppercase text-white/40 ml-2 tracking-widest">Стиль пузырей</Label>
                       <div className="grid grid-cols-4 gap-2">
                          {['default', 'neon', 'gold', 'ocean'].map(s => (
                            <button 
                              key={s} 
                              onClick={() => setForm({...form, bubbleStyle: s})}
                              className={cn("h-10 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all", form.bubbleStyle === s ? "bg-primary border-primary text-white" : "bg-black/40 border-white/5 text-white/20")}
                            >
                               {s}
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-6 m-0">
                 <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-6 text-center shadow-xl backdrop-blur-xl relative overflow-hidden">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20"><Info className="w-8 h-8 text-primary animate-pulse" /></div>
                    <div className="space-y-1">
                       <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Nuxus Kernel</h3>
                       <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Версия {versions.latestVersion} • {versions.build}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 w-full">
                       <Button onClick={openSupport} className="h-14 rounded-2xl bg-white/5 border border-white/10 font-black uppercase text-[10px] tracking-widest gap-3 shadow-xl hover:bg-primary/10 hover:border-primary/20 transition-all">
                          <MessageSquare className="w-5 h-5 text-primary" /> Поддержка Nuxus
                       </Button>
                       <div className="grid grid-cols-2 gap-3">
                          <Button variant="ghost" onClick={() => setIsLegalOpen(true)} className="h-12 rounded-xl bg-white/5 font-black uppercase text-[8px] tracking-widest gap-2"><HelpCircle className="w-3 h-3 text-primary" /> Право</Button>
                          <Button variant="ghost" className="h-12 rounded-xl bg-red-500/10 text-red-500 font-black uppercase text-[8px] tracking-widest gap-2" onClick={handleAnnihilate}><Trash2 className="w-3 h-3" /> Стереть</Button>
                       </div>
                    </div>
                 </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-white/5 bg-[#0a0a0c]/80 backdrop-blur-3xl shrink-0 flex gap-4 z-[100] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-lg" onClick={() => signOut(auth!)}>
               <LogOut className="w-6 h-6" />
            </Button>
            <Button disabled={isSaving} className="flex-1 h-14 rounded-2xl font-black uppercase italic text-sm bg-primary text-white shadow-[0_15px_40px_rgba(var(--primary),0.4)]" onClick={handleSave}>
              {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : 'Синхронизировать'}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}