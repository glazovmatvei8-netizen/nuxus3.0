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
  Info, HelpCircle, UserCheck, ShieldAlert, ImageIcon, Type, LayoutGrid
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppState } from '@/lib/store';
import { isUserPremium, cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import versions from '@/app/versions.json';

export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { settingsTab, setSettingsTab, setIsLegalOpen } = useAppState();
  
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
      toast({ title: "Settings synced" });
      onOpenChange(false);
    } catch (e: any) { toast({ title: "Save error", variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  const handleAnnihilate = async () => {
    if (!confirm("DANGER: This will permanently delete your account. Continue?")) return;
    if (!db || !user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      signOut(auth!);
      toast({ title: "Account annihilated" });
    } catch (e) { toast({ title: "Protocol fault" }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0a0a0c]/98 backdrop-blur-[80px] border-white/10 p-0 overflow-hidden h-[90dvh] flex flex-col rounded-[3.5rem] shadow-2xl outline-none">
        <DialogHeader className="p-8 border-b border-white/5 shrink-0 text-left bg-gradient-to-b from-primary/20 to-transparent">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-[2rem] bg-primary/20 flex items-center justify-center border border-primary/20">
               <Settings2 className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-3xl font-black italic uppercase text-white tracking-tighter">Settings</DialogTitle>
              <DialogDescription className="text-[10px] font-black uppercase text-primary/60 mt-1 tracking-[0.3em]">Nuxus Control V{versions.latestVersion}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-8 mt-6">
            <TabsList className="grid grid-cols-4 bg-white/5 p-1.5 rounded-2xl border border-white/5 shadow-inner">
              <TabsTrigger value="profile" className="text-[9px] font-black uppercase tracking-widest">Account</TabsTrigger>
              <TabsTrigger value="privacy" className="text-[9px] font-black uppercase tracking-widest">Security</TabsTrigger>
              <TabsTrigger value="style" className="text-[9px] font-black uppercase tracking-widest">Style</TabsTrigger>
              <TabsTrigger value="data" className="text-[9px] font-black uppercase tracking-widest">Info</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8 pb-40 space-y-8"> 
              <TabsContent value="profile" className="space-y-8 m-0">
                 <div className="flex flex-col items-center gap-8">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                       <UserAvatar userId={user?.uid} manualAvatarUrl={form.avatarUrl} className="h-44 w-44 border-[8px] border-[#0a0a0c] shadow-2xl relative z-10" />
                       <div className="absolute bottom-2 right-2 bg-primary p-3.5 rounded-[1.5rem] shadow-2xl z-20"><Camera className="w-5 h-5 text-white" /></div>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                    </div>
                    
                    <div className="w-full space-y-5">
                       <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 space-y-6">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-primary/60 ml-2 tracking-widest">Full Name</Label>
                             <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-14 bg-black/40 border-white/10 rounded-2xl font-black italic text-lg" />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-primary/60 ml-2 tracking-widest">Username (@)</Label>
                             <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="h-14 bg-black/40 border-white/10 rounded-2xl font-mono text-primary" />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-primary/60 ml-2 tracking-widest">Bio</Label>
                             <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Tell something about yourself..." className="bg-black/40 border-white/10 rounded-[2rem] h-32 p-5" />
                          </div>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-8 m-0">
                 <div className="bg-white/5 p-8 rounded-[3.5rem] border border-white/5 space-y-10">
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col gap-1.5">
                          <span className="text-base font-black text-white uppercase tracking-tight flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-green-500" /> Ghost Mode</span>
                          <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest ml-8">Hide online status</span>
                       </div>
                       <Switch checked={form.isGhostMode} onCheckedChange={v => setForm({...form, isGhostMode: v})} />
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-1.5">
                             <span className="text-base font-black text-white uppercase tracking-tight flex items-center gap-3"><Lock className="w-5 h-5 text-primary" /> 2FA Code</span>
                             <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest ml-8">Additional security PIN</span>
                          </div>
                          <Switch checked={form.twoFactorEnabled} onCheckedChange={v => setForm({...form, twoFactorEnabled: v})} />
                       </div>
                       {form.twoFactorEnabled && (
                         <Input 
                           type="password" 
                           placeholder="Enter 6 digits" 
                           maxLength={6}
                           value={form.twoFactorPin} 
                           onChange={e => setForm({...form, twoFactorPin: e.target.value.replace(/\D/g, '')})}
                           className="h-16 bg-black/60 border-primary/40 rounded-2xl text-center font-black tracking-[0.8em] text-3xl" 
                         />
                       )}
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-8 m-0">
                 <div className="bg-white/5 p-8 rounded-[3.5rem] border border-white/5 space-y-10">
                    <div className="space-y-4">
                       <Label className="text-[10px] font-black uppercase text-primary/60 ml-2 flex items-center gap-3 tracking-widest"><Palette className="w-5 h-5" /> Accent Color (HEX)</Label>
                       <div className="flex gap-5">
                          <Input value={form.customPrimaryColor} onChange={e => setForm({...form, customPrimaryColor: e.target.value})} placeholder="#A855F7" className="h-16 bg-black/40 border-white/10 font-mono text-center tracking-[0.2em] font-black text-xl rounded-2xl flex-1" />
                          <div className="w-16 h-16 rounded-[1.5rem] shadow-2xl border-4 border-[#0a0a0c] shrink-0" style={{ backgroundColor: form.customPrimaryColor || 'hsl(var(--primary))' }} />
                       </div>
                    </div>

                    <div className="space-y-4">
                       <Label className="text-[10px] font-black uppercase text-primary/60 ml-2 flex items-center gap-3 tracking-widest"><ImageIcon className="w-5 h-5" /> Chat Background (URL)</Label>
                       <Input value={form.chatBackground} onChange={e => setForm({...form, chatBackground: e.target.value})} placeholder="https://..." className="h-14 bg-black/40 border-white/10 rounded-2xl px-6" />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-white/40 ml-2 flex items-center gap-3 tracking-widest"><LayoutGrid className="w-4 h-4" /> Bubbles</Label>
                          <Select value={form.bubbleStyle} onValueChange={v => setForm({...form, bubbleStyle: v})}>
                             <SelectTrigger className="bg-black/40 border-white/10 rounded-2xl h-14 text-[11px] font-black uppercase tracking-widest">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="bg-[#0a0a0c]/98 border-white/10 rounded-2xl">
                                <SelectItem value="default" className="text-[10px] font-bold uppercase tracking-widest">Default</SelectItem>
                                <SelectItem value="neon" className="text-[10px] font-bold uppercase tracking-widest">Neon</SelectItem>
                                <SelectItem value="gold" className="text-[10px] font-bold uppercase tracking-widest">Gold</SelectItem>
                                <SelectItem value="ocean" className="text-[10px] font-bold uppercase tracking-widest">Ocean</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-white/40 ml-2 flex items-center gap-3 tracking-widest"><Type className="w-4 h-4" /> Font</Label>
                          <Select value={form.fontFamily} onValueChange={v => setForm({...form, fontFamily: v})}>
                             <SelectTrigger className="bg-black/40 border-white/10 rounded-2xl h-14 text-[11px] font-black uppercase tracking-widest">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="bg-[#0a0a0c]/98 border-white/10 rounded-2xl">
                                <SelectItem value="jakarta" className="text-[10px] font-bold uppercase tracking-widest">Jakarta</SelectItem>
                                <SelectItem value="inter" className="text-[10px] font-bold uppercase tracking-widest">Inter</SelectItem>
                                <SelectItem value="system" className="text-[10px] font-bold uppercase tracking-widest">System</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-8 m-0">
                 <div className="bg-white/5 p-10 rounded-[4rem] border border-white/5 flex flex-col items-center gap-8 text-center shadow-2xl backdrop-blur-xl relative overflow-hidden">
                    <div className="h-24 w-24 rounded-[2.5rem] bg-primary/10 flex items-center justify-center border border-primary/20"><Info className="w-10 h-10 text-primary animate-pulse" /></div>
                    <div className="space-y-3">
                       <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Nuxus Kernel</h3>
                       <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.5em]">Version {versions.latestVersion}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full">
                       <Button variant="ghost" onClick={() => setIsLegalOpen(true)} className="h-16 rounded-[1.5rem] bg-white/5 font-black uppercase text-[10px] tracking-widest gap-2"><HelpCircle className="w-4 h-4 text-primary" /> Legal</Button>
                       <Button variant="ghost" className="h-16 rounded-[1.5rem] bg-red-500/10 text-red-500 font-black uppercase text-[10px] tracking-widest gap-2" onClick={handleAnnihilate}><Trash2 className="w-4 h-4" /> Annihilate</Button>
                    </div>
                 </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-white/5 bg-[#0a0a0c]/80 backdrop-blur-3xl shrink-0 flex gap-5 z-[100] pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-[0_-20px_100px_rgba(0,0,0,0.8)]">
            <Button variant="ghost" className="h-20 w-20 rounded-[2.2rem] bg-red-500/10 text-red-500 border border-red-500/20" onClick={() => signOut(auth!)}>
               <LogOut className="w-8 h-8" />
            </Button>
            <Button disabled={isSaving} className="flex-1 h-20 rounded-[2.2rem] font-black uppercase italic text-lg bg-primary text-white shadow-[0_20px_50px_rgba(var(--primary),0.4)]" onClick={handleSave}>
              {isSaving ? <Loader2 className="animate-spin w-8 h-8" /> : 'Sync System'}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
