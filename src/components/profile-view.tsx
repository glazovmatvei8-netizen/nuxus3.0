
"use client"

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Pencil, ChevronRight, Star, Share2, QrCode, Fingerprint, Palette, Mail, ShieldAlert, LogOut, LayoutGrid, Crown, ShieldCheck
} from 'lucide-react';
import { useAppState } from '@/lib/store';
import { formatDisplayName, cn, isUserPremium, isGlobalAdmin } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  const { setIsSettingsOpen, setSettingsTab, setIsLegalOpen, activeAccountIndex, setActiveAccountIndex } = useAppState();
  
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  const userProfileRef = useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const isAdmin = isGlobalAdmin(profile);
  const isPremium = isUserPremium(profile);

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-hidden relative">
      <div className="px-6 pt-10 pb-4 flex items-center justify-between shrink-0 relative z-30">
        <h1 className="text-2xl font-bold text-white tracking-tight">Аккаунт</h1>
        <div className="flex gap-2">
          <Button 
            variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 text-white/60 hover:text-white" 
            onClick={() => { setSettingsTab('profile'); setIsSettingsOpen(true); }}
          >
            <Pencil className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 space-y-6 pb-32 pt-2">
          
          <div className="flex flex-col items-center gap-4 py-8 bg-white/[0.02] border border-white/5 rounded-[3rem] shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4"><QrCode className="w-6 h-6 text-white/10 cursor-pointer hover:text-primary" onClick={() => setIsQrOpen(true)} /></div>
             <UserAvatar userId={user?.uid} className={cn("h-28 w-28 border-4 border-white/5", isPremium && "border-primary/40")} showOnlineStatus />
             <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                   <h2 className="text-2xl font-bold text-white tracking-tight">
                     {profile?.name ? formatDisplayName(profile.name) : 'Загрузка...'}
                   </h2>
                   {isPremium && <Star className="w-5 h-5 text-primary fill-primary" />}
                </div>
                <span className="text-sm font-semibold text-white/40">{profile?.username}</span>
             </div>
          </div>

          {/* Accounts Switcher (Mobile) */}
          <div className="md:hidden space-y-3">
             <h3 className="text-[10px] font-black uppercase text-white/20 tracking-widest ml-4">Учётные записи (Слоты)</h3>
             <div className="flex gap-3 overflow-x-auto scrollbar-hide px-1">
                {[0, 1, 2, 3, 4].map(i => (
                  <button 
                    key={i} 
                    onClick={() => setActiveAccountIndex(i)}
                    className={cn(
                      "h-14 min-w-[56px] rounded-2xl border transition-all flex items-center justify-center relative overflow-hidden",
                      activeAccountIndex === i ? "border-primary bg-primary/10" : "border-white/5 bg-white/5 opacity-40"
                    )}
                  >
                    {activeAccountIndex === i ? <UserAvatar userId={user?.uid} className="w-10 h-10" /> : <Plus className="w-5 h-5 text-white/20" />}
                    {activeAccountIndex === i && <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />}
                  </button>
                ))}
             </div>
          </div>

          <div className="bg-white/[0.02] rounded-[2.5rem] border border-white/5 overflow-hidden divide-y divide-white/[0.03] shadow-2xl">
            {isAdmin && (
              <ProfileItem icon={ShieldCheck} label="Панель Управления" color="text-red-500" onClick={() => setIsAdminOpen(true)} />
            )}
            <ProfileItem icon={Fingerprint} label="Безопасность" color="text-primary" onClick={() => { setSettingsTab('privacy'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Palette} label="Стиль и Оформление" color="text-accent" onClick={() => { setSettingsTab('style'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={ShieldAlert} label="Помощь и Право" color="text-orange-400" onClick={() => setIsLegalOpen(true)} />
          </div>

          <Button 
            variant="ghost" 
            className="w-full h-16 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-bold rounded-[2rem] gap-3 transition-all border border-red-500/10" 
            onClick={() => signOut(auth!)}
          >
            <LogOut className="w-5 h-5" />
            Выйти из системы
          </Button>
        </div>
      </ScrollArea>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-xs bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 text-center shadow-2xl outline-none">
          <DialogTitle className="text-xl font-bold text-white mb-6">Ваш QR-код</DialogTitle>
          <div className="py-4 flex justify-center">
            <div className="bg-white p-5 rounded-3xl shadow-2xl">
              <QRCodeSVG value={user?.uid || ''} size={160} />
            </div>
          </div>
          <DialogDescription className="text-xs font-bold text-white/40 mt-6 uppercase tracking-widest">Уникальный идентификатор аккаунта</DialogDescription>
        </DialogContent>
      </Dialog>

      <AdminPanelModal open={isAdminOpen} onOpenChange={setIsAdminOpen} />
    </div>
  );
}

function ProfileItem({ icon: Icon, label, color, onClick }: any) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/[0.02] transition-all group">
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 group-hover:border-primary/20 transition-all">
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        <span className="text-white font-bold text-[16px]">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-primary transition-all" />
    </div>
  );
}
