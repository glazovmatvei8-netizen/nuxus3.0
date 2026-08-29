"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useAppState } from '@/lib/app-state';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { Fingerprint, AlertTriangle } from 'lucide-react';
import { doc } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { isUserActuallyBanned, isUserAnomaly } from '@/lib/utils';
import { NuxusLogo } from '@/components/nuxus-logo';

/**
 * HOME GATE V5.9.0 «STABILITY FIRST»
 * ПОЛНЫЙ ФИКС: Устранена ошибка 'call' за счет прямой проверки window и отсутствия лишних зависимостей.
 */
export default function Home() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { is2FAVerified, setIs2FAVerified } = useAppState();
  const { toast } = useToast();
  
  const [twoFactorInput, setTwoFactorInput] = useState('');

  const userProfileRef = useMemo(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
  
  const isBanned = isUserActuallyBanned(profile);
  const isAnomaly = isUserAnomaly(profile);

  const handleVerify2FA = async () => {
    if (!profile) return;
    try {
      const { authenticator } = await import('otplib');
      if (profile.totpEnabled && profile.totpSecret) {
         if (authenticator.check(twoFactorInput, profile.totpSecret)) {
            setIs2FAVerified(true);
            return;
         }
      }
      if (profile.twoFactorEnabled && twoFactorInput === profile.twoFactorPin) {
        setIs2FAVerified(true);
        return;
      }
      toast({ title: "Неверный код доступа", variant: "destructive" });
      setTwoFactorInput('');
    } catch (e) {
      toast({ title: "Ошибка модуля защиты", variant: "destructive" });
    }
  };

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] text-white">
        <NuxusLogo size={60} className="animate-pulse opacity-40" />
        <p className="mt-8 text-[8px] font-black uppercase tracking-[0.6em] text-primary/40">Syncing Engine V5.9.0</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (isBanned || isAnomaly) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#010103] p-8 text-center text-white space-y-8">
        <div className="w-24 h-24 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
           <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <div className="space-y-2">
           <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Доступ ограничен</h1>
           <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Протокол Aegis аннигилировал ваш узел</p>
        </div>
        <Button variant="ghost" onClick={() => signOut(auth!)} className="h-14 px-10 rounded-2xl text-white/40 font-black uppercase tracking-widest hover:text-white transition-all">Отключиться</Button>
      </div>
    );
  }

  const isProtected = profile?.twoFactorEnabled || profile?.totpEnabled;
  if (isProtected && !is2FAVerified) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#010103] relative px-6">
        <div className="w-full max-w-[380px] space-y-12 text-center animate-in fade-in zoom-in-95 duration-700">
          <div className="h-20 w-20 rounded-[2.2rem] bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
             <Fingerprint className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-10">
            <div className="space-y-2">
               <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter">Защита</h2>
               <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Введите код авторизации узла</p>
            </div>
            <Input 
              type="password" placeholder="••••••" maxLength={6} autoFocus
              className="bg-white/[0.03] border-white/5 h-24 text-5xl tracking-[0.5em] text-center rounded-3xl font-black text-white focus:border-primary/40 transition-all"
              value={twoFactorInput}
              onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
            />
            <Button onClick={handleVerify2FA} className="w-full h-16 rounded-[1.8rem] bg-primary text-white font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all">Подтвердить Личность</Button>
          </div>
        </div>
      </div>
    );
  }

  return <ChatMain />;
}
