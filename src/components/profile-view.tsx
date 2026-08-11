
"use client"

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Pencil, ChevronRight, Star, Share2, QrCode, Fingerprint, Palette, Mail, ShieldAlert, LogOut
} from 'lucide-react';
import { useAppState } from '@/lib/store';
import { formatDisplayName, cn, isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from '@/hooks/use-translations';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';

export default function ProfileView() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { t } = useTranslations();
  const { toast } = useToast();
  const { setIsSettingsOpen, setSettingsTab, setIsLegalOpen } = useAppState();
  
  const [isQrOpen, setIsQrOpen] = useState(false);
  
  const userProfileRef = useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<User>(userProfileRef);

  const copyId = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    toast({ title: "ID скопирован" });
  };

  const isPremium = isUserPremium(profile);

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-hidden relative">
      <div className="px-6 pt-10 pb-4 flex items-center justify-between shrink-0 relative z-30">
        <h1 className="text-2xl font-bold text-white tracking-tight">{t('app.profile')}</h1>
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
          
          <div className="flex flex-col items-center gap-4 py-6 bg-white/[0.02] border border-white/5 rounded-[2.5rem] shadow-xl">
             <UserAvatar userId={user?.uid} className={cn("h-28 w-28 border-4 border-white/5", isPremium && "border-primary/40")} showOnlineStatus />
             <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                   <h2 className="text-2xl font-bold text-white tracking-tight">
                     {profile?.name ? formatDisplayName(profile.name) : 'Загрузка...'}
                   </h2>
                   {isPremium && <Star className="w-5 h-5 text-primary fill-primary" />}
                </div>
                <div className="flex items-center justify-center gap-2">
                   <span className="text-sm font-semibold text-white/40">{profile?.username}</span>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ActionCard icon={QrCode} label="Мой QR" sub="ПОДЕЛИТЬСЯ" accent="text-primary" onClick={() => setIsQrOpen(true)} />
            <ActionCard icon={Share2} label="Профиль" sub="КОПИРОВАТЬ ID" accent="text-blue-400" onClick={copyId} />
          </div>

          <div className="bg-white/[0.02] rounded-[2rem] border border-white/5 overflow-hidden divide-y divide-white/[0.03]">
            <ProfileItem icon={Fingerprint} label="Безопасность" color="text-green-400" onClick={() => { setSettingsTab('privacy'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={Palette} label="Стиль и Цвет" color="text-purple-400" onClick={() => { setSettingsTab('style'); setIsSettingsOpen(true); }} />
            <ProfileItem icon={ShieldAlert} label="Помощь и Право" color="text-orange-400" onClick={() => setIsLegalOpen(true)} />
          </div>

          <Button 
            variant="ghost" 
            className="w-full h-14 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-bold rounded-2xl gap-3 transition-all" 
            onClick={() => signOut(auth!)}
          >
            <LogOut className="w-5 h-5" />
            Выйти из аккаунта
          </Button>
        </div>
      </ScrollArea>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-xs bg-[#1c1c1e] border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl">
          <div className="py-4 flex justify-center">
            <div className="bg-white p-5 rounded-3xl shadow-2xl">
              <QRCodeSVG value={user?.uid || ''} size={160} />
            </div>
          </div>
          <p className="text-xs font-bold text-white/40 mt-4 uppercase tracking-widest">Ваш уникальный ключ доступа</p>
          <Button variant="ghost" onClick={() => setIsQrOpen(false)} className="mt-8 w-full h-12 rounded-xl text-primary font-bold uppercase tracking-widest">Закрыть</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionCard({ icon: Icon, label, sub, accent, onClick }: any) {
  return (
    <div onClick={onClick} className="bg-white/[0.02] border border-white/5 p-4 rounded-[2rem] flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-white/5 transition-all shadow-md">
      <Icon className={cn("w-6 h-6 mb-1", accent)} />
      <span className="text-sm font-bold text-white">{label}</span>
      <span className="text-[9px] uppercase font-black text-white/20 tracking-wider">{sub}</span>
    </div>
  );
}

function ProfileItem({ icon: Icon, label, color, onClick }: any) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-all group">
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-xl bg-white/5">
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        <span className="text-white font-semibold text-[15px]">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-primary transition-all" />
    </div>
  );
}
