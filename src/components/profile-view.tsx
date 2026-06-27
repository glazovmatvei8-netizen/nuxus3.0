"use client"

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Pencil, Bookmark, ChevronRight, Star, Share2, Zap, HelpCircle, Globe, Server, QrCode, Fingerprint, Cpu, Shield
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
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none z-0" />

      <div className="px-6 pt-10 pb-4 flex items-center justify-between shrink-0 relative z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          className="obsidian-glass h-10 w-10 rounded-xl text-white/60 hover:text-primary transition-all" 
          onClick={copyRefLink}
        >
          <Share2 className="w-5 h-5" />
        </Button>
        <div className="flex flex-col items-center gap-2">
          <div className="relative group">
            <UserAvatar 
              userId={user?.uid} 
              className={cn("h-14 w-14 border-2 obsidian-glass transition-all duration-700", isPremium ? "border-primary/40 shadow-lg shadow-primary/10" : "border-white/5")} 
            />
          </div>
          <span className="font-black text-white text-[17px] flex items-center gap-1.5 italic tracking-tighter uppercase">
            {profile?.name ? formatDisplayName(profile.name) : 'SYNCING...'} 
            {isPremium && <Star className="w-3.5 h-3.5 text-accent fill-accent" />}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="obsidian-glass h-10 w-10 rounded-xl text-white/60 hover:text-primary transition-all" 
          onClick={() => { setSettingsTab('profile'); setIsSettingsOpen(true); }}
        >
          <Pencil className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 relative z-10">
        <div className="px-6 space-y-4 pb-32 pt-2 animate-in fade-in duration-700">
          
          {/* Core Level Card V7.6 (Compact) */}
          <div className="obsidian-glass p-6 rounded-[2rem] space-y-5 relative overflow-hidden group border-white/5 shadow-xl">
             <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/10">
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-primary/50 tracking-widest leading-none">Kernel Protocol</span>
                    <span className="text-xl font-black text-white italic mt-1 tracking-tighter">ELITE NODE</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-white italic tabular-nums">{referralCount}</span>
                  <span className="text-[8px] font-black text-primary/40 uppercase block tracking-widest">Uplinks</span>
                </div>
             </div>
             
             <div className="space-y-2 relative z-10">
               <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_10px_rgba(168,85,247,0.8)] transition-all duration-1500" 
                    style={{ width: `${Math.min(100, (referralCount / 10) * 100)}%` }} 
                  />
               </div>
               <div className="flex justify-between items-center px-1">
                 <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Growth</span>
                 <span className="text-[7px] font-black text-primary uppercase tracking-widest">{Math.min(100, (referralCount / 10) * 100)}%</span>
               </div>
             </div>
             
             <Button onClick={copyRefLink} className="w-full h-11 obsidian-glass border-white/5 hover:border-primary/50 text-white rounded-xl font-black uppercase text-[8px] tracking-widest transition-all group">
               <Zap className="w-3 h-3 mr-2 text-primary" /> Transmit Node ID
             </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ActionCard icon={QrCode} label="Signal QR" sub="IDENTIFY" accent="text-accent" onClick={() => setIsQrOpen(true)} />
            <ActionCard icon={ShieldCheck} label="QES 7.6" sub="SECURED" accent="text-green-400" />
          </div>

          <div className="obsidian-glass rounded-[2rem] overflow-hidden divide-y divide-white/[0.03] border-white/5 shadow-xl">
            <ProfileItem icon={Fingerprint} label="Security Core" color="text-primary" onClick={() => { setSettingsTab('privacy'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Palette} label="Branding" color="text-white/60" onClick={() => { setSettingsTab('appearance'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Bookmark} label="Archive" color="text-white/60" onClick={() => {}} />
            <ProfileItem icon={HelpCircle} label="Intel" color="text-white/60" onClick={() => setIsLegalOpen(true)} />
          </div>

          <div className="py-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 obsidian-glass px-4 py-1.5 rounded-full border-white/5">
              <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[8px] text-white/20 uppercase font-black tracking-widest">Node Synchronized V7.6</p>
            </div>
            <div className="flex gap-8 opacity-5">
              <Globe className="w-5 h-5" />
              <Server className="w-5 h-5" />
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </div>
      </ScrollArea>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-xs obsidian-glass border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl outline-none">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black uppercase italic text-white tracking-tighter">Signal Hash</DialogTitle>
            <DialogDescription className="text-[8px] uppercase font-black tracking-widest text-primary/60 mt-1">Node Encryption Key</DialogDescription>
          </DialogHeader>
          <div className="py-4 flex justify-center">
            <div className="bg-white p-5 rounded-[2rem] shadow-xl relative">
              <div className="absolute -inset-1.5 border border-primary/20 rounded-[2.2rem]" />
              <div className="w-40 h-48 bg-white flex items-center justify-center relative overflow-hidden rounded-xl">
                {inviteLink && (
                  <QRCodeSVG 
                    value={inviteLink} 
                    size={140}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: "https://i.ibb.co/sd2MqGz2/Icon.png",
                      x: undefined,
                      y: undefined,
                      height: 32,
                      width: 32,
                      excavate: true,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          <p className="text-[9px] font-bold text-white/40 uppercase px-4 leading-relaxed mt-4 tracking-tight">SCAN TO ESTABLISH LINK</p>
          <Button variant="ghost" onClick={() => setIsQrOpen(false)} className="mt-6 w-full h-12 rounded-xl text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">Terminate View</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionCard({ icon: Icon, label, sub, accent, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="obsidian-glass border-white/5 p-4 rounded-3xl flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-lg hover:bg-white/5 group"
    >
      <Icon className={cn("w-6 h-6 mb-0.5 transition-transform duration-500 group-hover:scale-110", accent)} />
      <span className="text-[14px] font-black text-white italic tracking-tighter uppercase">{label}</span>
      <span className="text-[7px] uppercase font-black text-white/20 tracking-widest">{sub}</span>
    </div>
  );
}

function ProfileItem({ icon: Icon, label, color, onClick }: any) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-all group">
      <div className="flex items-center gap-4">
        <div className="bg-white/5 p-2 rounded-lg transition-all group-hover:bg-primary/10">
          <Icon className={cn("w-5 h-5", color, "opacity-60 group-hover:opacity-100")} />
        </div>
        <span className="text-white text-[15px] font-black italic tracking-tight uppercase group-hover:translate-x-0.5 transition-transform">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-white/5 group-hover:text-primary transition-colors" />
    </div>
  );
}