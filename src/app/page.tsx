"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useAuth, useDoc } from '@/firebase';
import { useAppState } from '@/lib/store.tsx';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { Fingerprint, Loader2, LogOut, X, AlertTriangle } from 'lucide-react';
import { doc } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { isUserActuallyBanned, isUserAnomaly } from '@/lib/utils';
import { NuxusLogo } from '@/components/nuxus-logo';

/**
 * HOME GATE V64.0 «PURE STATIC»
 * ФИКС ОШИБКИ 'call' и оптимизация под APK.
 */
export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] text-white">
        <NuxusLogo size={80} />
      </div>
    );
  }

  return <HomeContent />;
}

function HomeContent() {
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
        <NuxusLogo size={60} />
        <p className="mt-6 text-[8px] font-black uppercase tracking-[0.5em] opacity-20">Syncing Engine</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (isBanned || isAnomaly) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#010103] p-8 text-center text-white space-y-8 animate-in fade-in duration-700">
        <AlertTriangle className="w-20 h-20 text-red-500" />
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Доступ ограничен</h1>
        <Button variant="ghost" onClick={() => signOut(auth!)} className="h-14 rounded-2xl text-white/40 font-black uppercase tracking-widest">Выйти</Button>
      </div>
    );
  }

  const isProtected = profile?.twoFactorEnabled || profile?.totpEnabled;
  if (isProtected && !is2FAVerified) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#010103] relative px-6">
        <div className="w-full max-w-[380px] space-y-12 text-center">
          <Fingerprint className="w-10 h-10 text-primary mx-auto" />
          <div className="space-y-8">
            <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter">Защита</h2>
            <Input 
              type="password" placeholder="••••••" maxLength={6} autoFocus
              className="bg-white/[0.04] border-white/10 h-20 text-4xl tracking-[0.8em] text-center rounded-3xl font-bold text-white"
              value={twoFactorInput}
              onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
            />
            <Button onClick={handleVerify2FA} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase italic tracking-widest shadow-xl">Подтвердить</Button>
          </div>
        </div>
      </div>
    );
  }

  return <ChatMain />;
}
