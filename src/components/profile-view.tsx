
"use client"

import React, { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Pencil, Lock, Bookmark, ChevronRight, Star, Share2, Trophy, Zap, ShieldCheck, Palette, HelpCircle, Globe, Server, QrCode
} from 'lucide-react';
import { useAppState } from '@/lib/store';
import { formatDisplayName, cn, isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function ProfileView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIsSettingsOpen, setSettingsTab, setIsLegalOpen } = useAppState();
  const [isQrOpen, setIsQrOpen] = useState(false);
  
  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db!, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const copyRefLink = () => {
    if (!user) return;
    const link = `${window.location.origin}/?ref=${user.uid}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Инвайт-код скопирован!", description: "Отправьте его для расширения Ядра." });
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="px-4 pt-6 pb-4 flex items-center justify-between shrink-0">
        <Button variant="ghost" size="icon" className="text-foreground" onClick={copyRefLink}><Share2 className="w-6 h-6" /></Button>
        <div className="flex items-center gap-2">
          <UserAvatar userId={user?.uid} className="h-8 w-8" />
          <span className="font-bold text-foreground text-[17px] flex items-center gap-1.5">
            {formatDisplayName(profile?.name)} 
            {isUserPremium(profile) && <Star className="w-3.5 h-3.5 text-accent fill-accent" />}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="text-foreground" onClick={() => { setSettingsTab('profile'); setIsSettingsOpen(true); }}>
          <Pencil className="w-6 h-6" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 space-y-4 pb-24">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-primary/40 to-accent/40 rounded-[2rem] blur-md opacity-30 group-hover:opacity-60 transition-opacity" />
            <div className="relative bg-card border border-border p-6 rounded-[2rem] flex flex-col gap-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">Referral Program</span>
                    <span className="text-lg font-black italic text-foreground leading-none mt-1">{profile?.referralCount || 0}</span>
                  </div>
                </div>
                <Button onClick={copyRefLink} className="h-10 rounded-xl bg-primary text-white font-black uppercase text-[9px] tracking-widest px-4">Пригласить</Button>
              </div>
              <p className="text-[8px] text-muted-foreground uppercase font-bold leading-relaxed px-1">Приглашайте новых участников и получайте Premium-статус за каждые 5 активных аккаунтов.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border p-4 rounded-3xl flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all" onClick={() => setIsQrOpen(true)}>
              <QrCode className="w-5 h-5 text-accent mb-1" />
              <span className="text-[18px] font-black text-foreground italic">Signal QR</span>
              <span className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">Share Node</span>
            </div>
            <div className="bg-card border border-border p-4 rounded-3xl flex flex-col items-center justify-center gap-1">
              <ShieldCheck className="w-5 h-5 text-green-500 mb-1" />
              <span className="text-[18px] font-black text-foreground italic">QES 2.0</span>
              <span className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">Security Layer</span>
            </div>
          </div>

          <div className="bg-card rounded-[2rem] overflow-hidden divide-y divide-border border border-border">
            <SettingsItem icon={Lock} label="Защита Ядра (E2EE)" color="text-primary" onClick={() => { setSettingsTab('privacy'); setIsSettingsOpen(true); }} />
            <SettingsItem icon={Palette} label="Темы оформления" color="text-foreground" onClick={() => { setSettingsTab('appearance'); setIsSettingsOpen(true); }} />
            <SettingsItem icon={Bookmark} label="Избранное" color="text-foreground" onClick={() => {}} />
            <SettingsItem icon={HelpCircle} label="Помощь и FAQ" color="text-foreground" onClick={() => setIsLegalOpen(true)} />
          </div>

          <div className="pt-4 flex flex-col items-center gap-2">
            <p className="text-[11px] text-muted-foreground/40 uppercase font-black tracking-[0.2em]">Nuxus Kernel v2.5.0</p>
            <div className="flex gap-4 opacity-20">
              <Globe className="w-4 h-4" />
              <Server className="w-4 h-4" />
              <Lock className="w-4 h-4" />
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
              <div className="w-48 h-48 bg-[#0a0a0c] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 opacity-20" />
                <QrCode className="w-32 h-32 text-primary" strokeWidth={1.5} />
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
    <div onClick={onClick} className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-4">
        <Icon className={cn("w-6 h-6", color, "opacity-70 group-hover:opacity-100")} />
        <span className="text-foreground text-[16px] font-medium">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/30" />
    </div>
  );
}
