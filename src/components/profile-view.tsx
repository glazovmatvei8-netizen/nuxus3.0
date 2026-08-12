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
 * PROFILE VIEW V45.0 «STABLE RESOLUTION»
 * Оптимизированы отступы для исключения наложения нижней панели навигации.
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
      await navigator.share({
        title: 'Nuxus App',
        text: `Свяжитесь со мной в Nuxus: ${profile.username}`,
        url: window.location.origin
      });
    } catch (e) {
      navigator.clipboard.writeText(profile.username);
      toast({ title: "ID скопирован" });
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
      <div className="px-8 pt-16 pb-6 flex items-center justify-between shrink-0 relative z-30">
        <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">Профиль</h1>
        <Button 
          variant="ghost" size="icon" className="h-14 w-14 rounded-3xl obsidian-glass text-white/60 hover:text-white transition-all shadow-xl" 
          onClick={() => { setSettingsTab('profile'); setIsSettingsOpen(true); }}
        >
          <Pencil className="w-7 h-7" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-8 space-y-12 pb-52 pt-4 animate-in fade-in duration-700">
          
          <div className="flex flex-col items-center gap-8 py-12 obsidian-glass rounded-[4rem] shadow-2xl relative overflow-hidden">
             <div className="absolute top-6 right-6 z-20"><QrCode className="w-7 h-7 text-white/10 cursor-pointer hover:text-primary transition-colors" onClick={() => setIsQrOpen(true)} /></div>
             <div className="relative">
                <div className="absolute -inset-8 bg-primary/15 blur-3xl rounded-full animate-pulse" />
                <UserAvatar userId={user?.uid} className={cn("h-40 w-44 border-[8px] border-[#0a0a0c] shadow-2xl relative z-10", isPremium && "border-primary/20")} showOnlineStatus />
             </div>
             <div className="text-center space-y-3 relative z-10">
                <div className="flex items-center justify-center gap-4">
                   <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-tight">
                     {profile?.name ? formatDisplayName(profile.name) : 'Загрузка...'}
                   </h2>
                   {isPremium && <Star className="w-8 h-8 text-primary fill-primary animate-pulse" />}
                </div>
                <span className="text-sm font-black uppercase text-primary/60 tracking-[0.4em] italic">{profile?.username}</span>
             </div>
          </div>

          <div className="space-y-6">
             <h3 className="text-[11px] font-black uppercase text-white/20 tracking-[0.5em] ml-6 italic">Ваши Учётные записи</h3>
             <ScrollArea className="w-full" orientation="horizontal">
                <div className="flex gap-5 px-2 py-3">
                   {[0, 1, 2, 3, 4].map(i => (
                     <div key={i} className="flex flex-col items-center gap-3 shrink-0 group cursor-pointer" onClick={() => { if (activeAccountIndex !== i && confirm("Переключить узел?")) { setActiveAccountIndex(i); signOut(auth!); } }}>
                       <div className={cn(
                         "h-20 w-20 rounded-[2.5rem] border-2 flex items-center justify-center transition-all active:scale-90 shadow-2xl relative",
                         activeAccountIndex === i ? "border-primary bg-primary/10 shadow-primary/30" : "border-white/5 bg-white/5 opacity-40 hover:opacity-100"
                       )}>
                         {activeAccountIndex === i ? (
                           <UserAvatar userId={user?.uid} className="h-12 w-12 border-none" />
                         ) : (
                           <Plus className="w-7 h-7 text-white/20" />
                         )}
                         {activeAccountIndex === i && <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-[#0a0a0c] shadow-[0_0_15px_rgba(var(--primary),1)]" />}
                       </div>
                       <span className={cn(
                         "text-[9px] font-black uppercase tracking-widest truncate w-20 text-center italic",
                         activeAccountIndex === i ? "text-primary" : "text-white/20"
                       )}>
                         {activeAccountIndex === i ? (profile?.name || 'Node') : (slotNames[i] || `Empty`)}
                       </span>
                     </div>
                   ))}
                </div>
             </ScrollArea>
          </div>

          <div className="obsidian-glass rounded-[4rem] overflow-hidden divide-y divide-white/[0.03] shadow-2xl">
            {isAdmin && (
              <ProfileItem icon={ShieldCheck} label="Управление Сетью" color="text-red-500" sub="Ручное вмешательство" onClick={() => setIsAdminOpen(true)} />
            )}
            <ProfileItem icon={Fingerprint} label="Безопасность" color="text-primary" sub="Биометрия и 2FA" onClick={() => { setSettingsTab('privacy'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Palette} label="Визуальный Стиль" color="text-accent" sub="Оболочка интерфейса" onClick={() => { setSettingsTab('style'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Share2} label="Передать Сигнал" color="text-green-500" sub="Пригласить в Ядро" onClick={handleShare} />
            <ProfileItem icon={ShieldAlert} label="Инфо-центр" color="text-orange-400" sub="Правовая поддержка" onClick={() => setIsLegalOpen(true)} />
          </div>

          <Button 
            variant="ghost" 
            className="w-full h-22 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-black uppercase italic tracking-[0.2em] rounded-[2.5rem] gap-6 transition-all border border-red-500/10 shadow-xl" 
            onClick={() => signOut(auth!)}
          >
            <LogOut className="w-8 h-8" />
            Выйти из Ядра
          </Button>
        </div>
      </ScrollArea>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-xs bg-[#0a0a0c]/98 border-white/10 rounded-[3.5rem] p-12 text-center shadow-2xl outline-none">
          <DialogHeader><DialogTitle className="text-3xl font-black uppercase italic text-white text-center w-full">QR Identity</DialogTitle></DialogHeader>
          <div className="py-10 flex justify-center">
            <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-4 border-primary/20">
              <QRCodeSVG value={user?.uid || ''} size={200} fgColor="#010103" />
            </div>
          </div>
          <DialogDescription className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] text-center w-full italic">Node: {user?.uid?.slice(0, 16)}...</DialogDescription>
        </DialogContent>
      </Dialog>

      <AdminPanelModal open={isAdminOpen} onOpenChange={setIsAdminOpen} />
    </div>
  );
}

function ProfileItem({ icon: Icon, label, color, sub, onClick }: any) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-8 cursor-pointer hover:bg-white/[0.03] transition-all group">
      <div className="flex items-center gap-6">
        <div className="p-4 rounded-[2rem] bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-primary/20 transition-all shadow-xl">
          <Icon className={cn("w-7 h-7", color)} />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-white font-black uppercase italic tracking-tight text-xl">{label}</span>
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-1">{sub}</span>
        </div>
      </div>
      <ChevronRight className="w-6 h-6 text-white/10 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
    </div>
  );
}
