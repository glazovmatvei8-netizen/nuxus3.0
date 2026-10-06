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
 * PROFILE VIEW V98.0 «TOTAL ADAPTIVE AURA»
 * Теперь карточка полностью окрашивается в акцентный цвет пользователя.
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
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Top Header */}
      <header className="h-14 flex items-center justify-between px-6 shrink-0 z-[100] border-b border-white/[0.05] bg-card/40 backdrop-blur-md">
        <Menu className="w-5 h-5 text-muted-foreground" />
        <div className="bg-white/5 px-4 py-1 rounded-full flex items-center gap-2 max-w-[200px] border border-white/5">
           <span className="text-[9px] text-muted-foreground/60 truncate font-black uppercase tracking-widest">nuxus.fun/kernel</span>
        </div>
        <RefreshCw className="w-5 h-5 text-muted-foreground" />
      </header>

      <ScrollArea className="flex-1 relative z-20">
        <div className="px-6 pt-6 pb-40 space-y-10 animate-in fade-in duration-1000">
          
          {/* THE MAIN ADAPTIVE CARD (Total Tint Mode) */}
          <div className="nuxus-event-card p-12 flex flex-col items-center gap-8 group relative overflow-hidden">
             {/* Dynamic Aura Background */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--primary),0.3),transparent_100%)] pointer-events-none" />
             
             {/* Decor Badge */}
             <div className="absolute top-8 right-10 opacity-70">
                <div className="border border-primary/40 rounded-xl px-2.5 py-1.5 flex flex-col items-center bg-black/60 backdrop-blur-sm shadow-xl">
                   <span className="text-[7px] font-black text-white leading-none tracking-tighter">OCP</span>
                   <span className="text-[6px] font-bold text-primary uppercase mt-1">ON</span>
                </div>
             </div>

             <div className="relative group">
                <div className="absolute -inset-16 bg-primary/30 blur-[60px] rounded-full animate-pulse group-hover:bg-primary/40 transition-all duration-1000" />
                <div className="relative z-10 p-2 rounded-full border-2 border-primary/50 bg-black/80 shadow-2xl">
                   <UserAvatar 
                     userId={user?.uid} 
                     className="h-32 w-32 border-none shadow-2xl" 
                     manualAvatarUrl={profile?.avatarUrl}
                   />
                </div>
             </div>

             <div className="text-center space-y-5 relative z-10 w-full">
                <div className="flex flex-col items-center gap-3">
                   <div className="flex items-center gap-3">
                      <h2 className="text-[26px] font-black text-white uppercase italic tracking-tighter leading-none drop-shadow-[0_4px_20px_rgba(255,255,255,0.2)]">
                        {profile?.name ? formatDisplayName(profile.name) : 'NODE ACTIVE'}
                      </h2>
                      <Star className="w-6 h-6 text-primary fill-primary animate-pulse" />
                   </div>
                   <div className="bg-black/60 backdrop-blur-2xl border border-white/10 px-8 py-2 rounded-full shadow-2xl">
                      <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] italic">
                        {profile?.username || '@USERNAME'}
                      </span>
                   </div>
                </div>
                
                <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto">
                   УЗЕЛ СИНХРОНИЗИРОВАН С ГЛОБАЛЬНЫМ ЯДРОМ
                </p>
             </div>
          </div>

          {/* LIST SECTIONS */}
          <div className="space-y-8">
             <div className="flex items-center justify-between px-3">
                <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.4em]">Мои Узлы</h3>
                <LayoutGrid className="w-4 h-4 text-primary/40" />
             </div>

             <div className="space-y-3">
                {/* CREATOR ITEM */}
                <div className="flex items-center gap-6 p-6 bg-card/60 border border-white/[0.08] rounded-[3rem] shadow-2xl relative overflow-hidden group">
                   <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className="relative">
                      <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full" />
                      <div className="relative z-10 p-1 rounded-full border-2 border-primary/50 bg-black/40">
                         <UserAvatar userId={user?.uid} className="h-12 w-12" manualAvatarUrl={profile?.avatarUrl} />
                      </div>
                   </div>
                   <div className="flex flex-col text-left">
                      <span className="text-[14px] font-black text-white uppercase italic tracking-widest">Создатель Ядра</span>
                      <span className="text-[9px] text-primary/60 font-bold uppercase tracking-widest">Master Identity</span>
                   </div>
                   <div className="absolute right-8 w-3.5 h-3.5 bg-primary rounded-full border-4 border-[#121212] shadow-[0_0_20px_rgba(var(--primary),1)]" />
                </div>

                {/* ACTION ITEMS */}
                <div className="mt-6 bg-transparent divide-y divide-white/[0.05] rounded-[3rem] overflow-hidden border border-white/[0.05]">
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
      className="flex items-center justify-between p-7 cursor-pointer hover:bg-white/[0.03] transition-all group bg-[#1C1C1E]/40"
    >
      <div className="flex items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/40 transition-all shadow-xl">
          <Icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <span className="text-white/90 font-black uppercase tracking-[0.2em] text-[15px] italic leading-none">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </div>
  );
}