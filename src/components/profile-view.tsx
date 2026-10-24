"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronRight, Star, Fingerprint, Palette, ShieldCheck, 
  Share2, LayoutGrid, Info, Menu, RefreshCw, Sparkles, Trophy, Zap, HelpCircle, Calendar, Loader2, MessageCircle
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
 * PROFILE VIEW V199.0 «NATURAL CASE»
 * ОПТИМИЗИРОВАНО: Удален принудительный uppercase для имени пользователя.
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

  const statusText = useMemo(() => {
    if (!mounted || !profile) return '...';
    return formatLastSeen(profile.lastSeen, profile.settings?.privacy?.lastSeenVisibility, 'в сети');
  }, [profile, mounted]);

  const birthdayText = useMemo(() => {
    if (!profile?.birthday) return null;
    try {
      return format(parseISO(profile.birthday), 'd MMMM', { locale: ru });
    } catch (e) {
      console.error("Error formatting birthday:", e);
      return null;
    }
  }, [profile?.birthday]);

  const handleRefresh = () => {
    triggerHaptic();
    toast({ title: "Синхронизация..." });
  };

  if (!mounted) return <div className="flex-1 bg-[#121212]" />;

  if (isLoading && !profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#121212] gap-6">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-[10px] font-black uppercase text-white/20 tracking-[0.4em]">Синхронизация узла...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#121212] overflow-hidden relative">
      <header className="h-14 flex items-center justify-between px-6 shrink-0 z-[100] border-b border-white/[0.05] bg-card/40 backdrop-blur-md">
        <div className="w-5" />
        <div className="bg-white/5 px-4 py-1 rounded-full border border-white/5 shadow-inner">
           <span className="text-[9px] text-muted-foreground/60 font-black uppercase tracking-widest italic">nuxus.fun/node</span>
        </div>
        <button onClick={handleRefresh} className="active:rotate-180 transition-transform duration-500">
           <RefreshCw className="w-5 h-5 text-muted-foreground hover:text-primary" />
        </button>
      </header>

      <ScrollArea className="flex-1 relative z-20">
        <div className="px-6 pt-10 pb-40 space-y-8 animate-in fade-in duration-1000">
          
          <div className="nuxus-event-card w-full py-12 px-6 flex flex-col items-center justify-center relative overflow-hidden group min-h-[350px]">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsla(var(--primary),0.15),transparent_75%)] pointer-events-none" />
             
             <div className="absolute top-6 right-6 opacity-30">
                <div className="w-12 h-12 rounded-2xl border border-white/20 bg-white/5 flex flex-col items-center justify-center shadow-lg">
                   <span className="text-[7px] font-black text-white leading-none">TRUST</span>
                   <span className="text-[7px] font-black text-primary leading-none mt-1">LVL {rep.level}</span>
                </div>
             </div>

             <div className="relative mb-6">
                <div className="absolute -inset-12 bg-primary/25 blur-[50px] rounded-full animate-pulse" />
                <div className="relative z-10 p-1.5 rounded-full border-2 border-primary/40 bg-black/60 shadow-2xl group-hover:scale-105 transition-transform duration-700">
                   <UserAvatar 
                     userId={user?.uid} 
                     className="h-28 w-28 border-none shadow-2xl" 
                     manualAvatarUrl={profile?.avatarUrl}
                   />
                </div>
             </div>

             <div className="flex flex-col items-center gap-4 relative z-10 w-full text-center">
                <div className="flex items-center justify-center gap-3">
                   <h2 className="text-[24px] font-black text-white tracking-[0.05em] leading-none drop-shadow-[0_4px_15px_rgba(255,255,255,0.15)] italic">
                     {profile?.name ? formatDisplayName(profile.name) : 'NODE ACTIVE'}
                   </h2>
                   {profile?.isPremium && <Star className="w-5 h-5 text-primary fill-primary animate-pulse" />}
                </div>

                {profile?.settings?.statusText && (
                   <div className="bg-primary/10 border border-primary/20 px-5 py-2 rounded-2xl max-w-[85%] animate-in zoom-in-95 duration-500 flex items-center gap-3 shadow-lg">
                      <MessageCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-[11px] font-black text-white italic tracking-tight line-clamp-1">{profile.settings.statusText}</span>
                   </div>
                )}
                
                <div className="bg-black/60 backdrop-blur-xl border border-white/5 px-6 py-1.5 rounded-full shadow-inner flex flex-col items-center gap-1">
                   <span className="text-[10px] font-bold uppercase text-primary/60 tracking-[0.2em] italic">
                     {profile?.username || '@USERNAME'}
                   </span>
                   <span className={cn(
                     "text-[8px] font-black uppercase tracking-widest",
                     statusText === 'в сети' ? "text-green-500" : "text-white/40"
                   )}>
                     {statusText}
                   </span>
                </div>

                {birthdayText && (
                  <div className="mt-2 flex items-center gap-2 text-primary">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{birthdayText}</span>
                  </div>
                )}
             </div>
          </div>

          <div className="bg-[#1C1C1E] p-6 rounded-[2.8rem] border border-white/[0.05] shadow-2xl space-y-6 relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg">
                      <Trophy className={cn("w-5 h-5", rep.color)} />
                   </div>
                   <div className="flex flex-col">
                      <span className={cn("text-[13px] font-black uppercase italic tracking-widest", rep.color)}>{rep.name}</span>
                      <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Aegis Trust Node</span>
                   </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:text-primary transition-colors">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-black/90 border-white/10 rounded-2xl p-4 text-[10px] uppercase font-bold text-white tracking-widest max-w-[200px]">
                    Репутация растет при активности в Ядре. Каждый сигнал повышает уровень доверия.
                  </TooltipContent>
                </Tooltip>
             </div>

             <div className="space-y-2">
                <div className="flex justify-between items-end px-1">
                   <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Experience Signal</span>
                   <span className="text-[10px] font-black text-primary italic">{rep.progress}%</span>
                </div>
                <div className="h-3 w-full bg-black/60 rounded-full border border-white/5 p-1 shadow-inner">
                   <div 
                     className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(var(--primary),0.5)]", rep.color.replace('text-', 'bg-'))} 
                     style={{ width: `${rep.progress}%` }} 
                   />
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between px-3">
                <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.3em] italic">Управление Узлом</h3>
                <Sparkles className="w-4 h-4 text-primary opacity-20" />
             </div>

             <div className="space-y-1">
                <div className="bg-[#1C1C1E]/30 divide-y divide-white/[0.03] rounded-[2.8rem] overflow-hidden border border-white/[0.03]">
                   {isAdmin && (
                     <ProfileListItem 
                       icon={ShieldCheck} 
                       label="Система Aegis" 
                       onClick={() => { triggerHaptic(); setIsAdminOpen(true); }} 
                     />
                   )}
                   <ProfileListItem 
                     icon={Fingerprint} 
                     label="Безопасность" 
                     onClick={() => { triggerHaptic(); setSettingsTab('privacy'); setIsSettingsOpen(true); }} 
                   />
                   <ProfileListItem 
                     icon={Palette} 
                     label="Визуальный код" 
                     onClick={() => { triggerHaptic(); setSettingsTab('style'); setIsSettingsOpen(true); }} 
                   />
                   <ProfileListItem 
                     icon={Share2} 
                     label="Передать сигнал" 
                     onClick={() => {
                        triggerHaptic();
                        const url = typeof window !== 'undefined' ? window.location.origin : 'https://nuxus.fun';
                        navigator.clipboard.writeText(`${url}/?u=${profile?.username?.replace('@','')}`);
                        toast({ title: "ID узла скопирован" });
                     }} 
                   />
                   <ProfileListItem 
                     icon={Info} 
                     label="Правовой узел" 
                     onClick={() => { triggerHaptic(); setIsLegalOpen(true); }} 
                   />
                </div>
             </div>
          </div>
        </div>
      </ScrollArea>

      <AdminPanelModal open={isAdminOpen} onOpenChange={setIsAdminOpen} />
    </div>
  );
}

function ProfileListItem({ icon: Icon, label, onClick }: any) {
  return (
    <div 
      onClick={onClick} 
      className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/[0.02] transition-all group bg-transparent"
    >
      <div className="flex items-center gap-6">
        <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all shadow-lg">
          <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <span className="text-white/80 font-black uppercase tracking-[0.15em] text-[13px] italic leading-none">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </div>
  );
}
