"use client"

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Pencil, Lock, Bookmark, ChevronRight, Star, Share2, Trophy, Zap, ShieldCheck, Palette, HelpCircle, Globe, Server, QrCode, Crown, UserPlus, Fingerprint, Cpu, Shield
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
    toast({ title: "Link Synchronized", description: "Node ID copied to clipboard." });
  };

  const isPremium = isUserPremium(profile);
  const referralCount = profile?.referralCount || 0;

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
      {/* Immersive Header Backdrop V7.0 */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none z-0" />
      <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-primary/10 blur-[100px] animate-pulse" />

      <div className="px-8 pt-14 pb-6 flex items-center justify-between shrink-0 relative z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          className="obsidian-glass h-12 w-12 rounded-2xl text-white/80 hover:text-primary transition-all" 
          onClick={copyRefLink}
        >
          <Share2 className="w-6 h-6" />
        </Button>
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            <div className={cn(
              "absolute -inset-2 rounded-full blur-xl transition-all duration-700 opacity-40",
              isPremium ? "bg-primary animate-pulse" : "bg-white/10"
            )} />
            <UserAvatar 
              userId={user?.uid} 
              className={cn("h-16 w-16 border-[3px] obsidian-glass transition-all duration-700", isPremium ? "border-primary/50" : "border-white/10")} 
            />
          </div>
          <span className="font-black text-white text-[20px] flex items-center gap-2 italic tracking-tighter uppercase">
            {profile?.name ? formatDisplayName(profile.name) : 'SYNCING...'} 
            {isPremium && <Star className="w-4 h-4 text-accent fill-accent shadow-lg shadow-accent/50" />}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="obsidian-glass h-12 w-12 rounded-2xl text-white/80 hover:text-primary transition-all" 
          onClick={() => { setSettingsTab('profile'); setIsSettingsOpen(true); }}
        >
          <Pencil className="w-6 h-6" />
        </Button>
      </div>

      <ScrollArea className="flex-1 relative z-10">
        <div className="px-6 space-y-6 pb-40 pt-4 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          
          {/* Core Level Card V7.0 */}
          <div className="obsidian-glass p-8 rounded-[3rem] space-y-6 relative overflow-hidden group border-white/10 shadow-2xl">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
             <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/20 p-3 rounded-[1.4rem] border border-primary/20 shadow-lg">
                    <Cpu className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-primary/60 tracking-[0.4em] leading-none">Kernel Protocol</span>
                    <span className="text-2xl font-black text-white italic mt-1.5 tracking-tighter">ELITE NODE</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-white tabular-nums italic">{referralCount}</span>
                  <span className="text-[9px] font-black text-primary/40 uppercase block tracking-widest mt-1">Uplinks</span>
                </div>
             </div>
             
             <div className="space-y-3 relative z-10">
               <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden p-[1px]">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_15px_rgba(168,85,247,1)] transition-all duration-1500" 
                    style={{ width: `${Math.min(100, (referralCount / 10) * 100)}%` }} 
                  />
               </div>
               <div className="flex justify-between items-center px-1">
                 <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Growth Progress</span>
                 <span className="text-[8px] font-black text-primary uppercase tracking-[0.3em]">{Math.min(100, (referralCount / 10) * 100)}%</span>
               </div>
             </div>
             
             <Button onClick={copyRefLink} className="w-full h-14 obsidian-glass border-white/5 hover:border-primary/50 text-white rounded-[1.6rem] font-black uppercase text-[10px] tracking-[0.3em] transition-all group relative overflow-hidden">
               <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
               <Zap className="w-4 h-4 mr-3 text-primary animate-pulse" /> Transmit Node ID
             </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ActionCard icon={QrCode} label="Signal QR" sub="IDENTIFY" accent="text-accent" onClick={() => setIsQrOpen(true)} />
            <ActionCard icon={ShieldCheck} label="QES 7.0" sub="SECURED" accent="text-green-400" />
          </div>

          <div className="obsidian-glass rounded-[3.5rem] overflow-hidden divide-y divide-white/[0.04] border-white/10 shadow-2xl">
            <ProfileItem icon={Fingerprint} label="Security Core" color="text-primary" onClick={() => { setSettingsTab('privacy'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Palette} label="Interface Branding" color="text-white/80" onClick={() => { setSettingsTab('appearance'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Bookmark} label="Archive Data" color="text-white/80" onClick={() => {}} />
            <ProfileItem icon={HelpCircle} label="Technical Intel" color="text-white/80" onClick={() => setIsLegalOpen(true)} />
          </div>

          <div className="py-12 flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 obsidian-glass px-6 py-2 rounded-full border-white/5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.4em]">Node Synchronized V7.0</p>
            </div>
            <div className="flex gap-10 opacity-10">
              <Globe className="w-6 h-6" />
              <Server className="w-6 h-6" />
              <Shield className="w-6 h-6" />
            </div>
          </div>
        </div>
      </ScrollArea>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-xs obsidian-glass border-white/10 rounded-[3.5rem] p-10 text-center shadow-[0_0_100px_rgba(0,0,0,0.9)] outline-none">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black uppercase italic text-white tracking-tighter">Signal Hash</DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-black tracking-[0.4em] text-primary/60 mt-2">Node Encryption Key</DialogDescription>
          </DialogHeader>
          <div className="py-6 flex justify-center">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-[0_0_50px_rgba(168,85,247,0.4)] relative">
              <div className="absolute -inset-2 border-2 border-primary/20 rounded-[2.8rem] animate-pulse" />
              <div className="w-48 h-48 bg-white flex items-center justify-center relative overflow-hidden rounded-2xl">
                {inviteLink && (
                  <QRCodeSVG 
                    value={inviteLink} 
                    size={170}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: "https://i.ibb.co/sd2MqGz2/Icon.png",
                      x: undefined,
                      y: undefined,
                      height: 38,
                      width: 38,
                      excavate: true,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          <p className="text-[11px] font-bold text-white/50 uppercase px-4 leading-relaxed mt-6 tracking-tight">SCAN TO ESTABLISH NEURAL LINK</p>
          <Button variant="ghost" onClick={() => setIsQrOpen(false)} className="mt-8 w-full h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] text-primary hover:bg-primary/10">Terminate View</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionCard({ icon: Icon, label, sub, accent, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="obsidian-glass border-white/5 p-6 rounded-[2.8rem] flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all shadow-xl hover:bg-white/5 hover:border-white/20 group"
    >
      <Icon className={cn("w-8 h-8 mb-1 transition-transform duration-500 group-hover:scale-125", accent)} />
      <span className="text-[18px] font-black text-white italic tracking-tighter uppercase">{label}</span>
      <span className="text-[8px] uppercase font-black text-white/30 tracking-[0.4em]">{sub}</span>
    </div>
  );
}

function ProfileItem({ icon: Icon, label, color, onClick }: any) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/[0.04] transition-all group">
      <div className="flex items-center gap-5">
        <div className="bg-white/5 p-2.5 rounded-xl transition-all group-hover:bg-primary/10">
          <Icon className={cn("w-6 h-6", color, "opacity-60 group-hover:opacity-100 transition-opacity")} />
        </div>
        <span className="text-white text-[17px] font-black italic tracking-tight uppercase group-hover:translate-x-1 transition-transform">{label}</span>
      </div>
      <ChevronRight className="w-6 h-6 text-white/10 group-hover:text-primary transition-colors" />
    </div>
  );
}