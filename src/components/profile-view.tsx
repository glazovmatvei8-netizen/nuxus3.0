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
      <div className="px-6 pt-10 pb-4 flex items-center justify-between shrink-0 relative z-30">
        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Профиль</h1>
        <div className="flex gap-2">
          <Button 
            variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white/5 text-white/60 hover:text-white transition-all shadow-xl" 
            onClick={() => { setSettingsTab('profile'); setIsSettingsOpen(true); }}
          >
            <Pencil className="w-6 h-6" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 space-y-8 pb-40 pt-2 animate-in fade-in duration-700">
          
          <div className="flex flex-col items-center gap-6 py-10 obsidian-glass rounded-[3rem] shadow-2xl relative overflow-hidden">
             <div className="absolute top-4 right-4"><QrCode className="w-6 h-6 text-white/10 cursor-pointer hover:text-primary transition-colors" onClick={() => setIsQrOpen(true)} /></div>
             <div className="relative">
                <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full animate-pulse" />
                <UserAvatar userId={user?.uid} className={cn("h-32 w-32 border-[6px] border-[#0a0a0c] shadow-2xl relative z-10", isPremium && "border-primary/20")} showOnlineStatus />
             </div>
             <div className="text-center space-y-2 relative z-10">
                <div className="flex items-center justify-center gap-3">
                   <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                     {profile?.name ? formatDisplayName(profile.name) : 'Загрузка...'}
                   </h2>
                   {isPremium && <Star className="w-6 h-6 text-primary fill-primary animate-pulse" />}
                </div>
                <span className="text-[12px] font-black uppercase text-primary/60 tracking-[0.3em]">{profile?.username}</span>
             </div>
          </div>

          <div className="space-y-5">
             <h3 className="text-[10px] font-black uppercase text-white/20 tracking-[0.4em] ml-4 italic">Учётные записи</h3>
             <div className="flex gap-4 overflow-x-auto scrollbar-hide px-1 py-2">
                {[0, 1, 2, 3, 4].map(i => (
                  <button 
                    key={i} 
                    onClick={() => {
                      if (activeAccountIndex !== i) {
                        if (confirm("Переключиться на этот аккаунт?")) {
                          setActiveAccountIndex(i);
                          signOut(auth!);
                        }
                      }
                    }}
                    className={cn(
                      "h-16 min-w-[64px] rounded-2xl border-2 transition-all flex items-center justify-center relative overflow-hidden active:scale-90 shadow-xl",
                      activeAccountIndex === i ? "border-primary bg-primary/10 shadow-primary/20" : "border-white/5 bg-white/5 opacity-40 hover:opacity-100"
                    )}
                  >
                    {activeAccountIndex === i ? (
                      <UserAvatar userId={user?.uid} className="h-10 w-10 border-none" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <Plus className="w-4 h-4 text-white/20" />
                      </div>
                    )}
                    {activeAccountIndex === i && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),1)]" />}
                    {slotNames[i] && activeAccountIndex !== i && (
                      <div className="absolute bottom-1 px-1 w-full bg-black/60 backdrop-blur-sm">
                        <span className="text-[6px] font-black text-white uppercase truncate block w-full text-center">{slotNames[i]}</span>
                      </div>
                    )}
                  </button>
                ))}
             </div>
          </div>

          <div className="obsidian-glass rounded-[3rem] overflow-hidden divide-y divide-white/[0.03] shadow-2xl">
            {isAdmin && (
              <ProfileItem icon={ShieldCheck} label="Панель Управления" color="text-red-500" sub="Модерация и статистика" onClick={() => setIsAdminOpen(true)} />
            )}
            <ProfileItem icon={Fingerprint} label="Безопасность" color="text-primary" sub="2FA и облачный пароль" onClick={() => { setSettingsTab('privacy'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Palette} label="Оформление" color="text-accent" sub="Цвета и темы интерфейса" onClick={() => { setSettingsTab('style'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Share2} label="Поделиться" color="text-green-500" sub="Пригласить в Nuxus" onClick={handleShare} />
            <ProfileItem icon={ShieldAlert} label="Поддержка" color="text-orange-400" sub="Право и помощь" onClick={() => setIsLegalOpen(true)} />
          </div>

          <Button 
            variant="ghost" 
            className="w-full h-20 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-black uppercase italic tracking-widest rounded-[2rem] gap-4 transition-all border border-red-500/10 shadow-xl" 
            onClick={() => signOut(auth!)}
          >
            <LogOut className="w-6 h-6" />
            Выйти из системы
          </Button>
        </div>
      </ScrollArea>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-xs bg-[#0a0a0c]/98 border-white/10 rounded-[3rem] p-10 text-center shadow-2xl outline-none">
          <DialogHeader><DialogTitle className="text-2xl font-black uppercase italic text-white text-center w-full">QR Профиль</DialogTitle></DialogHeader>
          <div className="py-8 flex justify-center">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-primary/20">
              <QRCodeSVG value={user?.uid || ''} size={180} fgColor="#010103" />
            </div>
          </div>
          <DialogDescription className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] text-center w-full">Уникальный ID: {user?.uid?.slice(0, 12)}...</DialogDescription>
        </DialogContent>
      </Dialog>

      <AdminPanelModal open={isAdminOpen} onOpenChange={setIsAdminOpen} />
    </div>
  );
}

function ProfileItem({ icon: Icon, label, color, sub, onClick }: any) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/[0.03] transition-all group">
      <div className="flex items-center gap-5">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-primary/20 transition-all shadow-xl">
          <Icon className={cn("w-6 h-6", color)} />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-white font-black uppercase italic tracking-tight text-[16px]">{label}</span>
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{sub}</span>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
    </div>
  );
}
