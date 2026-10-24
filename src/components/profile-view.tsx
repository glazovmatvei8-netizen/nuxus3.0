
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronRight, Star, Fingerprint, Palette, ShieldCheck, 
  Share2, Info, RefreshCw, Sparkles, Trophy, Zap, HelpCircle, Calendar, Loader2, MessageCircle, Lock, Cpu, Activity, ShieldAlert
} from 'lucide-react';
import { useAppState } from '@/lib/app-state';
import { formatDisplayName, cn, isGlobalAdmin, getReputationInfo, triggerHaptic, formatLastSeen } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AdminPanelModal } from './modals/admin-panel-modal';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * PROFILE VIEW V219.0 «AEGIS TERMINAL»
 * REDESIGNED: Hyper-futuristic layered GUI with Security Score and Kernel Monitoring.
 */
export default function ProfileView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIsSettingsOpen, setSettingsTab, setIsLegalOpen } = useAppState();
  
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const userProfileRef = useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile, isLoading } = useDoc<User>(userProfileRef);

  const isAdmin = useMemo(() => isGlobalAdmin(profile), [profile]);
  const rep = useMemo(() => getReputationInfo(profile?.reputation || 0), [profile?.reputation]);

  // Dynamic Security Score Calculation
  const securityScore = useMemo(() => {
    if (!profile) return 0;
    let score = 65; // Base encryption score
    if (profile.twoFactorEnabled) score += 20;
    if (profile.isPremium) score += 10;
    if (profile.emailVerified) score += 5;
    return Math.min(100, score);
  }, [profile]);

  const statusText = useMemo(() => {
    if (!mounted || !profile) return '...';
    return formatLastSeen(profile.lastSeen, profile.settings?.privacy?.lastSeenVisibility, 'в сети');
  }, [profile, mounted]);

  const handleRefresh = () => {
    triggerHaptic();
    toast({ title: "Калибровка Ядра..." });
  };

  if (!mounted) return <div className="flex-1 bg-[#010103]" />;

  if (isLoading && !profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#010103] gap-6">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-[10px] font-black uppercase text-white/20 tracking-[0.4em]">Инициализация Терминала...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#05060a] overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--primary),0.05),transparent_70%)] pointer-events-none" />
      
      <header className="h-16 flex items-center justify-between px-6 shrink-0 z-[100] border-b border-white/[0.05] bg-black/40 backdrop-blur-3xl">
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
           <span className="text-[10px] text-white/40 font-black uppercase tracking-widest italic">Signal Stable</span>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={handleRefresh} className="active:rotate-180 transition-transform duration-500 p-2 rounded-xl bg-white/5 border border-white/10">
              <RefreshCw className="w-4 h-4 text-primary" />
           </button>
        </div>
      </header>

      <ScrollArea className="flex-1 relative z-20">
        <div className="px-6 pt-8 pb-40 space-y-8 animate-in fade-in zoom-in-95 duration-1000">
          
          {/* Layer 1: Identity Matrix */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-[3rem] blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            <div className="relative flex flex-col items-center p-10 bg-[#0a0c12]/80 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl">
                <div className="absolute top-6 left-8 flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                   <Lock className="w-3 h-3 text-primary" />
                   <span className="text-[8px] font-black text-primary uppercase">MIG Protected</span>
                </div>

                <div className="relative mb-8 mt-4">
                  <div className="absolute -inset-10 bg-primary/30 blur-[60px] rounded-full animate-pulse-soft" />
                  <div className="relative z-10 p-1 rounded-full border-[3px] border-primary/50 shadow-2xl">
                     <UserAvatar userId={user?.uid} className="h-28 w-28 border-none" manualAvatarUrl={profile?.avatarUrl} />
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-black/80 rounded-2xl border border-white/20 flex items-center justify-center text-xl shadow-xl z-20">
                     {rep.icon}
                  </div>
                </div>

                <div className="text-center space-y-4">
                   <div className="space-y-1">
                      <h2 className="text-3xl font-black italic text-white tracking-tighter uppercase leading-none">{profile?.name}</h2>
                      <p className="text-[11px] font-bold text-primary/60 tracking-widest">{profile?.username}</p>
                   </div>
                   <div className="px-6 py-2 bg-white/5 rounded-2xl border border-white/10 inline-block">
                      <span className={cn("text-[9px] font-black uppercase tracking-widest", statusText === 'в сети' ? "text-green-400" : "text-white/40")}>{statusText}</span>
                   </div>
                </div>
            </div>
          </div>

          {/* Layer 2: Security & Trust Matrix */}
          <div className="grid grid-cols-2 gap-4">
             <div className="p-6 bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] border border-white/5 shadow-xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                   <ShieldCheck className="w-5 h-5 text-emerald-400" />
                   <span className="text-xs font-black text-white italic">{securityScore}%</span>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Security Score</p>
                   <div className="h-1.5 w-full bg-black/60 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] transition-all duration-1000" style={{ width: `${securityScore}%` }} />
                   </div>
                </div>
             </div>

             <div className="p-6 bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] border border-white/5 shadow-xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                   <Trophy className="w-5 h-5 text-primary" />
                   <span className="text-xs font-black text-white italic">LVL {rep.level}</span>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Reputation</p>
                   <div className="h-1.5 w-full bg-black/60 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-primary shadow-[0_0_10px_rgba(0,212,255,0.8)] transition-all duration-1000" style={{ width: `${rep.progress}%` }} />
                   </div>
                </div>
             </div>
          </div>

          {/* Layer 3: System Controls */}
          <div className="space-y-4">
             <div className="flex items-center gap-3 px-3">
                <Cpu className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-black uppercase text-white/30 tracking-[0.4em] italic">Kernel Module Management</h3>
             </div>

             <div className="bg-[#0e1018]/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 overflow-hidden divide-y divide-white/5 shadow-2xl">
                {isAdmin && (
                  <TerminalItem icon={ShieldAlert} label="AEGIS PRIME CONTROL" color="text-red-500" onClick={() => setIsAdminOpen(true)} />
                )}
                <TerminalItem icon={Lock} label="Криптографические ключи" color="text-primary" onClick={() => { setSettingsTab('privacy'); setIsSettingsOpen(true); }} />
                <TerminalItem icon={Palette} label="Визуальные фильтры" color="text-primary" onClick={() => { setSettingsTab('style'); setIsSettingsOpen(true); }} />
                <TerminalItem icon={Share2} label="Синхронизация узла" color="text-primary" onClick={() => {
                   const url = window.location.origin;
                   navigator.clipboard.writeText(`${url}/?u=${profile?.username?.replace('@','')}`);
                   toast({ title: "ID узла скопирован в буфер" });
                }} />
                <TerminalItem icon={Info} label="Правовой протокол" color="text-primary" onClick={() => setIsLegalOpen(true)} />
             </div>
          </div>

          <div className="p-8 bg-red-500/5 rounded-[2.5rem] border border-red-500/10 flex items-center justify-between group cursor-pointer hover:bg-red-500/10 transition-all" onClick={() => { triggerHaptic(); signOut(nuxus.auth!); }}>
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform">
                    <Activity className="w-5 h-5 text-red-500" />
                 </div>
                 <span className="text-[12px] font-black text-red-500 uppercase tracking-widest italic">Деактивация Узла</span>
              </div>
              <ChevronRight className="w-4 h-4 text-red-500/40" />
          </div>
        </div>
      </ScrollArea>

      <AdminPanelModal open={isAdminOpen} onOpenChange={setIsAdminOpen} />
    </div>
  );
}

function TerminalItem({ icon: Icon, label, color, onClick }: any) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-6 hover:bg-white/[0.03] transition-all cursor-pointer group active:bg-white/5">
       <div className="flex items-center gap-6">
          <div className={cn("w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-all shadow-lg", color.replace('text-', 'border-').replace('500', '500/40'))}>
             <Icon className={cn("w-5 h-5", color)} />
          </div>
          <span className="text-[13px] font-black text-white/80 uppercase tracking-[0.15em] italic">{label}</span>
       </div>
       <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </div>
  );
}
