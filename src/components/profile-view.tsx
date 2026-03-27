
"use client"

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Pencil, Lock, Bookmark, ChevronRight, Star, Share2, Trophy, Zap, ShieldCheck, Palette, HelpCircle, Globe, Server, QrCode, Crown, Rocket, Sparkles
} from 'lucide-react';
import { useAppState } from '@/lib/store';
import { formatDisplayName, cn, isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';

export default function ProfileView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIsSettingsOpen, setSettingsTab, setIsLegalOpen } = useAppState();
  const [isQrOpen, setIsQrOpen] = useState(false);
  
  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db!, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const inviteLink = useMemo(() => {
    if (typeof window === 'undefined' || !user) return '';
    return `${window.location.origin}/?ref=${user.uid}`;
  }, [user]);

  const copyRefLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast({ title: "Инвайт-код скопирован!", description: "Отправьте его для расширения Ядра." });
  };

  const isPremium = isUserPremium(profile);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Premium Background Glow */}
      {isPremium && (
        <div className="absolute top-0 left-0 right-0 h-64 bg-primary/10 blur-[100px] pointer-events-none z-0" />
      )}

      <div className="px-4 pt-6 pb-4 flex items-center justify-between shrink-0 relative z-10">
        <Button variant="ghost" size="icon" className="text-foreground" onClick={copyRefLink}><Share2 className="w-6 h-6" /></Button>
        <div className="flex items-center gap-2">
          <div className={cn("relative", isPremium && "animate-pulse")}>
            <UserAvatar userId={user?.uid} className={cn("h-8 w-8", isPremium && "border-primary/40")} />
            {isPremium && <div className="absolute -inset-1 border border-primary/20 rounded-full animate-ping" />}
          </div>
          <span className="font-bold text-foreground text-[17px] flex items-center gap-1.5 italic">
            {profile?.name ? formatDisplayName(profile.name) : 'Синхронизация...'} 
            {isPremium && <Star className="w-3.5 h-3.5 text-accent fill-accent" />}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="text-foreground" onClick={() => { setSettingsTab('profile'); setIsSettingsOpen(true); }}>
          <Pencil className="w-6 h-6" />
        </Button>
      </div>

      <ScrollArea className="flex-1 relative z-10">
        <div className="px-4 space-y-4 pb-24">
          
          {/* Premium Status Section */}
          <div 
            className="relative group cursor-pointer"
            onClick={() => { setSettingsTab('premium'); setIsSettingsOpen(true); }}
          >
            <div className={cn(
              "absolute -inset-1 bg-gradient-to-tr rounded-[2.5rem] blur-md opacity-20 group-hover:opacity-40 transition-opacity",
              isPremium ? "from-primary to-accent" : "from-white/10 to-white/5"
            )} />
            <div className="relative bg-card border border-white/5 p-6 rounded-[2.5rem] flex flex-col gap-4 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
                    isPremium ? "bg-primary/20 border-primary/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]" : "bg-white/5 border-white/10"
                  )}>
                    {isPremium ? <Crown className="w-6 h-6 text-accent animate-float" /> : <Trophy className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em] leading-none",
                      isPremium ? "text-primary" : "text-muted-foreground"
                    )}>
                      {isPremium ? 'Active Premium' : 'Kernel Level'}
                    </span>
                    <span className="text-xl font-black italic text-foreground leading-none mt-1">
                      {isPremium ? 'Elite Node' : 'Base Signal'}
                    </span>
                  </div>
                </div>
                <Button className={cn(
                  "h-10 rounded-xl font-black uppercase text-[9px] tracking-widest px-6 shadow-xl",
                  isPremium ? "bg-accent text-black" : "bg-primary text-white"
                )}>
                  {isPremium ? 'Active' : 'Get Pro'}
                </Button>
              </div>
              
              {isPremium && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Badge icon={Sparkles} label="AI Video" />
                  <Badge icon={Rocket} label="HQ Signal" />
                  <Badge icon={ShieldCheck} label="Vault" />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-white/5 p-5 rounded-[2rem] flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shadow-lg hover:bg-white/5" onClick={() => setIsQrOpen(true)}>
              <QrCode className="w-6 h-6 text-accent mb-1" />
              <span className="text-[18px] font-black text-foreground italic">Signal QR</span>
              <span className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">Share Node</span>
            </div>
            <div className="bg-card border border-white/5 p-5 rounded-[2rem] flex flex-col items-center justify-center gap-1 shadow-lg">
              <ShieldCheck className="w-6 h-6 text-green-500 mb-1" />
              <span className="text-[18px] font-black text-foreground italic">QES 2.0</span>
              <span className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">Security Layer</span>
            </div>
          </div>

          <div className="bg-card rounded-[2.5rem] overflow-hidden divide-y divide-white/[0.03] border border-white/5 shadow-2xl">
            <SettingsItem icon={Lock} label="Защита Ядра (E2EE)" color="text-primary" onClick={() => { setSettingsTab('privacy'); setIsSettingsOpen(true); }} />
            <SettingsItem icon={Palette} label="Темы оформления" color="text-foreground" onClick={() => { setSettingsTab('appearance'); setIsSettingsOpen(true); }} />
            <SettingsItem icon={Bookmark} label="Избранное" color="text-foreground" onClick={() => {}} />
            <SettingsItem icon={HelpCircle} label="Помощь и FAQ" color="text-foreground" onClick={() => setIsLegalOpen(true)} />
          </div>

          <div className="pt-8 flex flex-col items-center gap-3">
            <p className="text-[11px] text-muted-foreground/20 uppercase font-black tracking-[0.4em]">Nuxus Kernel v2.9</p>
            <div className="flex gap-6 opacity-10">
              <Globe className="w-5 h-5" />
              <Server className="w-5 h-5" />
              <Lock className="w-5 h-5" />
            </div>
          </div>
        </div>
      </ScrollArea>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-xs bg-card border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic text-white tracking-tighter">Signal Link</DialogTitle>
            <DialogDescription className="text-[9px] uppercase font-black tracking-[0.3em] text-primary/60">Node Identification</DialogDescription>
          </DialogHeader>
          <div className="py-8 flex justify-center">
            <div className="bg-white p-4 rounded-3xl shadow-[0_0_30px_rgba(168,85,247,0.3)]">
              <div className="w-48 h-48 bg-white flex items-center justify-center relative overflow-hidden rounded-2xl">
                {inviteLink && (
                  <QRCodeSVG 
                    value={inviteLink} 
                    size={160}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: "https://i.ibb.co/sd2MqGz2/Icon.png",
                      x: undefined,
                      y: undefined,
                      height: 34,
                      width: 34,
                      excavate: true,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          <p className="text-[10px] font-bold text-white/60 uppercase px-4 leading-relaxed">Сканируйте этот код, чтобы мгновенно подключиться к этому аккаунту.</p>
          <Button variant="ghost" onClick={() => setIsQrOpen(false)} className="mt-4 w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary">Закрыть</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsItem({ icon: Icon, label, color, onClick }: any) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.03] transition-all group">
      <div className="flex items-center gap-4">
        <Icon className={cn("w-6 h-6", color, "opacity-60 group-hover:opacity-100 transition-opacity")} />
        <span className="text-foreground text-[16px] font-bold italic tracking-tight group-hover:translate-x-1 transition-transform">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/20 group-hover:text-primary transition-colors" />
    </div>
  );
}

function Badge({ icon: Icon, label }: any) {
  return (
    <div className="bg-white/5 px-2 py-1.5 rounded-xl flex items-center justify-center gap-1.5 border border-white/5">
      <Icon className="w-3 h-3 text-primary" />
      <span className="text-[8px] font-black uppercase text-white/60 tracking-wider">{label}</span>
    </div>
  );
}
