"use client"

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Pencil, ChevronRight, Star, Share2, QrCode, Fingerprint, Palette, Mail, ShieldAlert, LogOut, LayoutGrid, Crown, ShieldCheck, Plus, Wallet, Smartphone, Activity
} from 'lucide-react';
import { useAppState } from '@/lib/store';
import { formatDisplayName, cn, isUserPremium, isGlobalAdmin } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from '@/hooks/use-translations';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';
import { AdminPanelModal } from './modals/admin-panel-modal';

/**
 * PROFILE VIEW V46.0 «INFINITE HORIZON»
 * ПОЛНОЭКРАННЫЙ РЕЖИМ: Профиль больше не зажат в узкое окно.
 * Устранены все наложения навигационной панели.
 */
export default function ProfileView() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { t } = useTranslations();
  const { toast } = useToast();
  const { setIsSettingsOpen, setSettingsTab, setIsLegalOpen, activeAccountIndex, setActiveAccountIndex, slotNames } = useAppState();
  
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const isAdmin = isGlobalAdmin(profile);
  const isPremium = isUserPremium(profile);

  const handleShare = async () => {
    if (!profile) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Nuxus App',
          text: `Свяжитесь со мной в Nuxus: ${profile.username}`,
          url: window.location.origin
        });
      } else {
        throw new Error();
      }
    } catch (e) {
      navigator.clipboard.writeText(profile.username);
      toast({ title: "ID скопирован в буфер" });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#010103] overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none z-0" />
      
      {/* Header */}
      <div className="px-8 pt-16 pb-8 flex items-center justify-between shrink-0 relative z-30">
        <div className="flex flex-col">
           <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">Аккаунт</h1>
           <span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.5em] mt-2 ml-1">Personal Terminal</span>
        </div>
        <Button 
          variant="ghost" size="icon" className="h-14 w-14 rounded-[2rem] bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all shadow-2xl active:scale-90" 
          onClick={() => { setSettingsTab('profile'); setIsSettingsOpen(true); }}
        >
          <Pencil className="w-7 h-7" />
        </Button>
      </div>

      <ScrollArea className="flex-1 relative z-20">
        <div className="px-6 space-y-12 pb-60 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          
          {/* Profile Card */}
          <div className="flex flex-col items-center gap-8 py-14 bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
             <div className="absolute top-8 right-8 z-20">
                <button onClick={() => setIsQrOpen(true)} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/20 hover:text-primary transition-all">
                   <QrCode className="w-7 h-7" />
                </button>
             </div>
             
             <div className="relative">
                <div className="absolute -inset-10 bg-primary/20 blur-[60px] rounded-full animate-pulse" />
                <UserAvatar 
                  userId={user?.uid} 
                  className={cn("h-44 w-44 border-[10px] border-[#0a0a0c] shadow-2xl relative z-10", isPremium && "border-primary/20")} 
                  showOnlineStatus 
                />
             </div>
             
             <div className="text-center space-y-4 relative z-10">
                <div className="flex items-center justify-center gap-4">
                   <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-tight">
                     {profile?.name ? formatDisplayName(profile.name) : 'Синхронизация...'}
                   </h2>
                   {isPremium && <Star className="w-8 h-8 text-primary fill-primary animate-pulse" />}
                </div>
                <div className="inline-flex bg-primary/10 border border-primary/20 px-6 py-2 rounded-full">
                   <span className="text-xs font-black uppercase text-primary tracking-[0.3em] italic">{profile?.username}</span>
                </div>
             </div>
          </div>

          {/* Account Slots */}
          <div className="space-y-6">
             <div className="flex items-center justify-between px-4">
                <h3 className="text-[11px] font-black uppercase text-white/30 tracking-[0.4em] italic">Ваши Узлы Сети</h3>
                <span className="text-[9px] font-bold text-primary/40 uppercase">5 слотов активно</span>
             </div>
             <ScrollArea className="w-full" orientation="horizontal">
                <div className="flex gap-5 px-4 py-4">
                   {[0, 1, 2, 3, 4].map(i => (
                     <div 
                      key={i} 
                      className="flex flex-col items-center gap-3 shrink-0 group cursor-pointer" 
                      onClick={() => { if (activeAccountIndex !== i) { if(confirm("Переключиться на другой узел?")) { setActiveAccountIndex(i); signOut(auth!); } } }}
                     >
                       <div className={cn(
                         "h-22 w-22 rounded-[2.8rem] border-2 flex items-center justify-center transition-all active:scale-90 shadow-2xl relative",
                         activeAccountIndex === i ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--primary),0.3)]" : "border-white/5 bg-white/5 opacity-40 hover:opacity-100 hover:border-white/20"
                       )}>
                         {activeAccountIndex === i ? (
                           <UserAvatar userId={user?.uid} className="h-14 w-14 border-none" />
                         ) : (
                           <Plus className="w-8 h-8 text-white/20 group-hover:text-primary transition-colors" />
                         )}
                         {activeAccountIndex === i && <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full border-[3px] border-[#010103] shadow-[0_0_15px_rgba(var(--primary),1)]" />}
                       </div>
                       <span className={cn(
                         "text-[10px] font-black uppercase tracking-widest truncate w-24 text-center italic",
                         activeAccountIndex === i ? "text-primary" : "text-white/20"
                       )}>
                         {activeAccountIndex === i ? (profile?.name || 'Node Active') : (slotNames[i] || `Пустой слот`)}
                       </span>
                     </div>
                   ))}
                </div>
             </ScrollArea>
          </div>

          {/* Menu Items */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[4rem] overflow-hidden divide-y divide-white/[0.03] shadow-2xl backdrop-blur-2xl">
            {isAdmin && (
              <ProfileItem icon={ShieldCheck} label="Контроль Системы" color="text-red-500" sub="Ручное управление Ядром" onClick={() => setIsAdminOpen(true)} />
            )}
            <ProfileItem icon={Fingerprint} label="Безопасность" color="text-primary" sub="Биометрия и защита доступа" onClick={() => { setSettingsTab('privacy'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Palette} label="Визуальный Код" color="text-accent" sub="Настройка интерфейса и тем" onClick={() => { setSettingsTab('style'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Share2} label="Передать Сигнал" color="text-green-500" sub="Пригласить друга в Ядро" onClick={handleShare} />
            <ProfileItem icon={ShieldAlert} label="Юридический Узел" color="text-orange-400" sub="Права и условия использования" onClick={() => setIsLegalOpen(true)} />
          </div>

          <div className="px-2">
            <Button 
              variant="ghost" 
              className="w-full h-24 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-black uppercase italic tracking-[0.3em] rounded-[3rem] gap-8 transition-all border border-red-500/10 shadow-2xl active:scale-95" 
              onClick={() => signOut(auth!)}
            >
              <LogOut className="w-10 h-10" />
              Отключиться от Системы
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* QR Dialog */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-xs bg-[#0a0a0c]/98 border-white/10 rounded-[3.5rem] p-12 text-center shadow-2xl outline-none z-[1000]">
          <DialogHeader>
             <DialogTitle className="text-3xl font-black uppercase italic text-white text-center w-full">QR Identity</DialogTitle>
             <DialogDescription className="sr-only">Your unique node identity QR code</DialogDescription>
          </DialogHeader>
          <div className="py-10 flex justify-center">
            <div className="bg-white p-8 rounded-[3.5rem] shadow-[0_30px_60px_rgba(255,255,255,0.1)] border-4 border-primary/20">
              <QRCodeSVG value={user?.uid || ''} size={200} fgColor="#010103" />
            </div>
          </div>
          <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] text-center w-full italic">UID: {user?.uid?.slice(0, 16)}...</div>
        </DialogContent>
      </Dialog>

      <AdminPanelModal open={isAdminOpen} onOpenChange={setIsAdminOpen} />
    </div>
  );
}

function ProfileItem({ icon: Icon, label, color, sub, onClick }: any) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-10 cursor-pointer hover:bg-white/[0.04] transition-all group active:bg-white/[0.06]">
      <div className="flex items-center gap-8">
        <div className="p-5 rounded-[2rem] bg-white/5 border border-white/10 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all shadow-xl">
          <Icon className={cn("w-8 h-8", color)} />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-white font-black uppercase italic tracking-tight text-2xl leading-none">{label}</span>
          <span className="text-[11px] font-bold text-white/20 uppercase tracking-[0.4em] mt-2">{sub}</span>
        </div>
      </div>
      <ChevronRight className="w-8 h-8 text-white/10 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-2" />
    </div>
  );
}
