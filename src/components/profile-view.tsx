"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronRight, Star, Fingerprint, Palette, ShieldCheck, 
  Share2, LayoutGrid, Info, Menu, RefreshCw, Sparkles
} from 'lucide-react';
import { useAppState } from '@/lib/app-state';
import { formatDisplayName, cn, isGlobalAdmin } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AdminPanelModal } from './modals/admin-panel-modal';

/**
 * PROFILE VIEW V99.0 «ABSOLUTE MIRROR»
 * Полная репликация горизонтальной карточки из референса.
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
  const { data: profile } = useDoc<User>(userProfileRef);

  const isAdmin = isGlobalAdmin(profile);

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full bg-[#121212] overflow-hidden relative">
      {/* Top Header */}
      <header className="h-14 flex items-center justify-between px-6 shrink-0 z-[100] border-b border-white/[0.05] bg-card/40 backdrop-blur-md">
        <Menu className="w-5 h-5 text-muted-foreground" />
        <div className="bg-white/5 px-4 py-1 rounded-full flex items-center gap-2 max-w-[200px] border border-white/5">
           <span className="text-[9px] text-muted-foreground/60 truncate font-black uppercase tracking-widest italic">nuxus.fun/kernel</span>
        </div>
        <RefreshCw className="w-5 h-5 text-muted-foreground" />
      </header>

      <ScrollArea className="flex-1 relative z-20">
        <div className="px-6 pt-10 pb-40 space-y-12 animate-in fade-in duration-1000">
          
          {/* THE MIRROR CARD (Horizontal Aspect) */}
          <div className="nuxus-event-card w-full py-10 px-6 flex flex-col items-center justify-center relative overflow-hidden group min-h-[280px]">
             {/* Dynamic Aura Background */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsla(var(--primary),0.35),transparent_75%)] pointer-events-none" />
             
             {/* Ghost Badge (Top Right) - Replicating the photo */}
             <div className="absolute top-6 right-6 opacity-30">
                <div className="w-10 h-10 rounded-xl border border-white/20 bg-white/5 flex flex-col items-center justify-center">
                   <span className="text-[6px] font-black text-white leading-none">CORE</span>
                   <span className="text-[6px] font-black text-white leading-none mt-0.5">NODE</span>
                </div>
             </div>

             <div className="relative mb-6">
                <div className="absolute -inset-12 bg-primary/25 blur-[50px] rounded-full animate-pulse" />
                <div className="relative z-10 p-1.5 rounded-full border border-primary/40 bg-black/60 shadow-2xl">
                   <UserAvatar 
                     userId={user?.uid} 
                     className="h-24 w-24 border-none shadow-2xl" 
                     manualAvatarUrl={profile?.avatarUrl}
                   />
                </div>
             </div>

             <div className="flex flex-col items-center gap-4 relative z-10 w-full text-center">
                <div className="flex items-center justify-center gap-3">
                   <h2 className="text-[22px] font-black text-white uppercase tracking-[0.05em] leading-none drop-shadow-[0_4px_15px_rgba(255,255,255,0.15)]">
                     {profile?.name ? formatDisplayName(profile.name) : 'NODE ACTIVE'}
                   </h2>
                   <Star className="w-5 h-5 text-primary fill-primary animate-pulse" />
                </div>
                
                <div className="bg-black/40 backdrop-blur-xl border border-white/5 px-6 py-1.5 rounded-full shadow-inner min-w-[140px]">
                   <span className="text-[10px] font-bold uppercase text-[#8E8E93] tracking-[0.2em]">
                     {profile?.username || '@USERNAME'}
                   </span>
                </div>
             </div>
          </div>

          {/* LIST SECTIONS */}
          <div className="space-y-8">
             <div className="flex items-center justify-between px-3">
                <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.3em] italic">Мои Узлы</h3>
                <div className="relative">
                   <div className="absolute inset-0 bg-primary/20 blur-md rounded-full" />
                   <Sparkles className="w-3.5 h-3.5 text-primary relative z-10" />
                </div>
             </div>

             <div className="space-y-3">
                {/* CREATOR ITEM */}
                <div className="flex items-center gap-6 p-6 bg-[#1C1C1E] border border-white/[0.03] rounded-[2.8rem] shadow-2xl relative overflow-hidden group">
                   <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className="relative">
                      <div className="absolute -inset-4 bg-primary/15 blur-xl rounded-full" />
                      <div className="relative z-10 p-1 rounded-full border border-primary/30 bg-black/40">
                         <UserAvatar userId={user?.uid} className="h-10 w-10" manualAvatarUrl={profile?.avatarUrl} />
                      </div>
                   </div>
                   <div className="flex flex-col text-left">
                      <span className="text-[13px] font-black text-white uppercase italic tracking-widest">Создатель Ядра</span>
                      <span className="text-[8px] text-primary/60 font-bold uppercase tracking-widest">Master Identity</span>
                   </div>
                   <div className="absolute right-8 w-2 h-2 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),1)] animate-pulse" />
                </div>

                {/* ACTION ITEMS */}
                <div className="mt-4 bg-transparent divide-y divide-white/[0.03] rounded-[2.8rem] overflow-hidden border border-white/[0.03]">
                   {isAdmin && (
                     <ProfileListItem 
                       icon={ShieldCheck} 
                       label="Система Aegis" 
                       onClick={() => setIsAdminOpen(true)} 
                     />
                   )}
                   <ProfileListItem 
                     icon={Fingerprint} 
                     label="Безопасность" 
                     onClick={() => { setSettingsTab('privacy'); setIsSettingsOpen(true); }} 
                   />
                   <ProfileListItem 
                     icon={Palette} 
                     label="Визуальный код" 
                     onClick={() => { setSettingsTab('style'); setIsSettingsOpen(true); }} 
                   />
                   <ProfileListItem 
                     icon={Share2} 
                     label="Передать сигнал" 
                     onClick={() => {
                        navigator.clipboard.writeText(`https://nuxus.fun/?u=${profile?.username?.replace('@','')}`);
                        toast({ title: "Ссылка скопирована" });
                     }} 
                   />
                   <ProfileListItem 
                     icon={Info} 
                     label="Правовой узел" 
                     onClick={() => setIsLegalOpen(true)} 
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
      className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/[0.02] transition-all group bg-[#1C1C1E]/30"
    >
      <div className="flex items-center gap-6">
        <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all shadow-xl">
          <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <span className="text-white/80 font-black uppercase tracking-[0.15em] text-[13px] italic leading-none">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </div>
  );
}
