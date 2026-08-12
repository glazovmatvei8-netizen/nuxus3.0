
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
 * PROFILE VIEW V47.0 «BALANCED ELEGANCE»
 * РЕДИЗАЙН: Устранена визуальная тяжесть. 
 * Элементы стали компактнее, шрифты — благороднее, баланс — идеальным.
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
      {/* Background Glows - Softened */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0" />
      
      {/* Header - More Elegant */}
      <div className="px-8 pt-12 pb-6 flex items-center justify-between shrink-0 relative z-30">
        <div className="flex flex-col text-left">
           <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-none">Аккаунт</h1>
           <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.4em] mt-1.5 ml-0.5">Secure Terminal</span>
        </div>
        <Button 
          variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all active:scale-90" 
          onClick={() => { setSettingsTab('profile'); setIsSettingsOpen(true); }}
        >
          <Pencil className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 relative z-20">
        <div className="px-6 space-y-10 pb-40 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
          
          {/* Profile Card - Balanced size */}
          <div className="flex flex-col items-center gap-6 py-10 bg-white/[0.015] border border-white/5 backdrop-blur-2xl rounded-[3rem] shadow-2xl relative overflow-hidden">
             <div className="absolute top-6 right-6 z-20">
                <button onClick={() => setIsQrOpen(true)} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/10 hover:text-primary transition-all">
                   <QrCode className="w-5 h-5" />
                </button>
             </div>
             
             <div className="relative">
                <div className="absolute -inset-6 bg-primary/10 blur-[40px] rounded-full animate-pulse" />
                <UserAvatar 
                  userId={user?.uid} 
                  className={cn("h-32 w-32 border-[6px] border-[#0a0a0c] shadow-xl relative z-10", isPremium && "border-primary/20")} 
                  showOnlineStatus 
                />
             </div>
             
             <div className="text-center space-y-3 relative z-10">
                <div className="flex items-center justify-center gap-2.5">
                   <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                     {profile?.name ? formatDisplayName(profile.name) : 'Синхронизация...'}
                   </h2>
                   {isPremium && <Star className="w-5 h-5 text-primary fill-primary" />}
                </div>
                <div className="inline-flex bg-primary/5 border border-primary/10 px-4 py-1.5 rounded-full">
                   <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest italic">{profile?.username}</span>
                </div>
             </div>
          </div>

          {/* Account Slots - Cleaner and proportionate */}
          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-[9px] font-black uppercase text-white/20 tracking-[0.3em]">Мои Узлы</h3>
                <Activity className="w-3.5 h-3.5 text-primary/30" />
             </div>
             <ScrollArea className="w-full" orientation="horizontal">
                <div className="flex gap-4 px-2 py-2">
                   {[0, 1, 2, 3, 4].map(i => (
                     <div 
                      key={i} 
                      className="flex flex-col items-center gap-2.5 shrink-0 group cursor-pointer" 
                      onClick={() => { if (activeAccountIndex !== i) { if(confirm("Переключиться на другой узел?")) { setActiveAccountIndex(i); signOut(auth!); } } }}
                     >
                       <div className={cn(
                         "h-16 w-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-90 shadow-xl relative",
                         activeAccountIndex === i ? "border-primary bg-primary/10" : "border-white/5 bg-white/5 opacity-40 hover:opacity-100 hover:border-white/20"
                       )}>
                         {activeAccountIndex === i ? (
                           <UserAvatar userId={user?.uid} className="h-10 w-10 border-none" />
                         ) : (
                           <Plus className="w-5 h-5 text-white/20" />
                         )}
                         {activeAccountIndex === i && <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-[#010103]" />}
                       </div>
                       <span className={cn(
                         "text-[8px] font-black uppercase tracking-widest truncate w-16 text-center",
                         activeAccountIndex === i ? "text-primary" : "text-white/10"
                       )}>
                         {activeAccountIndex === i ? (profile?.name || 'Active') : (slotNames[i] || `Empty`)}
                       </span>
                     </div>
                   ))}
                </div>
             </ScrollArea>
          </div>

          {/* Menu Items - Clean Modern List */}
          <div className="bg-white/[0.015] border border-white/5 rounded-[2.5rem] overflow-hidden divide-y divide-white/[0.03] shadow-xl backdrop-blur-xl">
            {isAdmin && (
              <ProfileItem icon={ShieldCheck} label="Система Aegis" color="text-red-500" sub="Контроль безопасности сети" onClick={() => setIsAdminOpen(true)} />
            )}
            <ProfileItem icon={Fingerprint} label="Безопасность" color="text-primary" sub="Биометрия и 2FA" onClick={() => { setSettingsTab('privacy'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Palette} label="Визуальный код" color="text-accent" sub="Интерфейс и темы" onClick={() => { setSettingsTab('style'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Share2} label="Передать сигнал" color="text-green-500" sub="Пригласить в Ядро" onClick={handleShare} />
            <ProfileItem icon={ShieldAlert} label="Legal" color="text-orange-400" sub="Правовой узел" onClick={() => setIsLegalOpen(true)} />
          </div>

          <div className="px-2 pt-2">
            <Button 
              variant="ghost" 
              className="w-full h-16 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-black uppercase text-[10px] tracking-widest rounded-2xl gap-4 transition-all border border-red-500/10 active:scale-95" 
              onClick={() => signOut(auth!)}
            >
              <LogOut className="w-5 h-5" />
              Отключиться от Системы
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* QR Dialog */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-xs bg-[#0a0a0c]/98 border-white/10 rounded-[3rem] p-10 text-center shadow-2xl outline-none z-[1000]">
          <DialogHeader>
             <DialogTitle className="text-xl font-black uppercase text-white text-center w-full">Node ID</DialogTitle>
             <DialogDescription className="sr-only">Your unique node identity QR code</DialogDescription>
          </DialogHeader>
          <div className="py-8 flex justify-center">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-primary/20">
              <QRCodeSVG value={user?.uid || ''} size={160} fgColor="#010103" />
            </div>
          </div>
          <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] text-center w-full italic">UID: {user?.uid?.slice(0, 12)}...</div>
        </DialogContent>
      </Dialog>

      <AdminPanelModal open={isAdminOpen} onOpenChange={setIsAdminOpen} />
    </div>
  );
}

function ProfileItem({ icon: Icon, label, color, sub, onClick }: any) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-7 cursor-pointer hover:bg-white/[0.03] transition-all group active:bg-white/[0.05]">
      <div className="flex items-center gap-6">
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 group-hover:bg-primary/20 group-hover:border-primary/30 transition-all">
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-white font-black uppercase tracking-tight text-sm leading-none">{label}</span>
          <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1.5">{sub}</span>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-white/5 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
    </div>
  );
}
