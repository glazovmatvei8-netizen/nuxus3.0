"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronRight, Star, Fingerprint, Palette, ShieldCheck, 
  Share2, LayoutGrid, Info, Menu, RefreshCw
} from 'lucide-react';
import { useAppState } from '@/lib/app-state';
import { formatDisplayName, cn, isUserPremium, isGlobalAdmin } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AdminPanelModal } from './modals/admin-panel-modal';

/**
 * PROFILE VIEW V97.0 «ADAPTIVE AURA»
 * Внедрена полная синхронизация цвета карточки с акцентным цветом пользователя.
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
  const isPremium = isUserPremium(profile);

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Top Decoration */}
      <header className="h-14 flex items-center justify-between px-6 shrink-0 z-[100] border-b border-white/[0.05] bg-card/40 backdrop-blur-md">
        <Menu className="w-5 h-5 text-muted-foreground" />
        <div className="bg-white/5 px-4 py-1 rounded-full flex items-center gap-2 max-w-[200px] border border-white/5">
           <span className="text-[9px] text-muted-foreground/60 truncate font-black uppercase tracking-widest">nuxus.fun/kernel</span>
        </div>
        <RefreshCw className="w-5 h-5 text-muted-foreground" />
      </header>

      <ScrollArea className="flex-1 relative z-20">
        <div className="px-6 pt-6 pb-40 space-y-8 animate-in fade-in duration-1000">
          
          {/* THE MAIN ADAPTIVE CARD (Aura Mode) */}
          <div className="nuxus-event-card p-10 flex flex-col items-center gap-6 group relative">
             {/* Фоновое свечение, подстраивающееся под цвет */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--primary),0.1),transparent_80%)] pointer-events-none" />
             
             <div className="absolute top-6 right-8 opacity-60">
                <div className="border border-primary/30 rounded-lg px-2 py-1 flex flex-col items-center bg-black/40 backdrop-blur-sm">
                   <span className="text-[6px] font-black text-white leading-none">OCP</span>
                   <span className="text-[5px] font-bold text-primary uppercase mt-0.5">ON</span>
                </div>
             </div>

             <div className="relative group">
                <div className="absolute -inset-12 bg-primary/20 blur-[50px] rounded-full animate-pulse group-hover:bg-primary/30 transition-all duration-1000" />
                <div className="relative z-10 p-1.5 rounded-full border-2 border-primary/40 bg-black/60 shadow-2xl">
                   <UserAvatar 
                     userId={user?.uid} 
                     className="h-28 w-28 border-none shadow-2xl" 
                     manualAvatarUrl={profile?.avatarUrl}
                   />
                </div>
             </div>

             <div className="text-center space-y-4 relative z-10">
                <div className="flex items-center justify-center gap-3">
                   <h2 className="text-[22px] font-black text-white uppercase italic tracking-tighter leading-none drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
                     {profile?.name ? formatDisplayName(profile.name) : 'NODE ACTIVE'}
                   </h2>
                   <Star className="w-5 h-5 text-primary fill-primary animate-pulse" />
                </div>
                <div className="bg-black/50 backdrop-blur-xl border border-white/10 px-6 py-1.5 rounded-full shadow-2xl">
                   <span className="text-[9px] font-black uppercase text-primary tracking-[0.2em] italic">
                     {profile?.username || '@USERNAME'}
                   </span>
                </div>
             </div>
          </div>

          {/* LIST SECTIONS */}
          <div className="space-y-6">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">Мои Узлы</h3>
                <LayoutGrid className="w-3.5 h-3.5 text-primary/40" />
             </div>

             <div className="space-y-2">
                {/* CREATOR ITEM */}
                <div className="flex items-center gap-5 p-5 bg-card/40 border border-white/[0.05] rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                   <div className="relative">
                      <div className="absolute -inset-2 bg-primary/10 blur-xl rounded-full" />
                      <div className="relative z-10 p-0.5 rounded-full border border-primary/40 bg-black/20">
                         <UserAvatar userId={user?.uid} className="h-10 w-10" manualAvatarUrl={profile?.avatarUrl} />
                      </div>
                   </div>
                   <span className="text-[13px] font-black text-white uppercase italic tracking-widest">Создатель</span>
                   <div className="absolute right-6 w-3 h-3 bg-primary rounded-full border-4 border-background shadow-[0_0_15px_rgba(var(--primary),0.8)]" />
                </div>

                {/* ACTION ITEMS */}
                <div className="mt-4 bg-transparent divide-y divide-white/[0.03]">
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
                     onClick={() => toast({ title: "Ссылка скопирована" })} 
                   />
                   <ProfileListItem 
                     icon={Info} 
                     label="Legal" 
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
      className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/[0.02] transition-all group"
    >
      <div className="flex items-center gap-6">
        <div className="w-12 h-12 rounded-2xl bg-card/60 border border-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-all shadow-md">
          <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <span className="text-white/90 font-black uppercase tracking-widest text-[13px] italic leading-none">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-primary transition-all" />
    </div>
  );
}