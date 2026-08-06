"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useAuth, useDoc } from '@/firebase/provider';
import { useAppState } from '@/lib/store.tsx';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { ShieldAlert, Fingerprint, ShieldCheck, Loader2, LogOut, Key } from 'lucide-react';
import { doc, collection, query, where, getDocs, limit, addDoc } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { isUserActuallyBanned } from '@/lib/utils';
import { NuxusLogo } from '@/components/nuxus-logo';
import { IosInstaller } from '@/components/ios-installer';
import { authenticator } from 'otplib';

/**
 * HOME GATE V6.5.0
 * ИСПРАВЛЕНО: Прямые импорты из провайдера для устранения ошибки 'call'.
 */
export default function Home() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { is2FAVerified, setIs2FAVerified, setInspectedUserId, setActiveCallId } = useAppState();
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [twoFactorInput, setTwoFactorInput] = useState('');
  const [showIosInstaller, setShowIosInstaller] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (isIos && !isStandalone && !localStorage.getItem('ios_installer_dismissed')) {
      setShowIosInstaller(true);
    }
  }, []);

  const userProfileRef = useMemo(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
  
  const isBanned = isUserActuallyBanned(profile);

  useEffect(() => {
    if (!mounted || !db || !user || !profile) return;
    const isProtected = profile.twoFactorEnabled || profile.totpEnabled;
    if (isProtected && !is2FAVerified) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'call') { /* ...existing call logic... */ }
  }, [mounted, db, user, profile, is2FAVerified]);

  const handleVerify2FA = () => {
    if (!profile) return;
    
    // TOTP Check
    if (profile.totpEnabled && profile.totpSecret) {
       if (authenticator.check(twoFactorInput, profile.totpSecret)) {
          setIs2FAVerified(true);
          toast({ title: "Сигнал подтвержден" });
          return;
       }
    }

    // Classic PIN Check (Fallback)
    if (profile.twoFactorEnabled && twoFactorInput === profile.twoFactorPin) {
      setIs2FAVerified(true);
      toast({ title: "Доступ разрешен" });
      return;
    }

    toast({ title: "Ключ не принят", variant: "destructive" });
    setTwoFactorInput('');
  };

  if (!mounted) return null;
  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] text-white">
        <NuxusLogo size={150} />
      </div>
    );
  }

  if (showIosInstaller) return <IosInstaller onDismiss={() => setShowIosInstaller(false)} />;
  if (!user) return <AuthScreen />;
  if (isBanned) return <div className="h-screen flex flex-col items-center justify-center bg-[#050505] p-6 text-center text-white"><ShieldAlert className="w-20 h-20 text-destructive mb-6" /><h1 className="text-4xl font-black">УЗЕЛ ОТКЛЮЧЕН</h1></div>;

  const isProtected = profile?.twoFactorEnabled || profile?.totpEnabled;

  if (isProtected && !is2FAVerified) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#020203] relative px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_70%)] pointer-events-none" />
        <div className="w-full max-w-[340px] space-y-12 text-center relative z-10">
          <div className="bg-white/[0.03] border border-white/10 w-24 h-24 rounded-[2.8rem] flex items-center justify-center mx-auto shadow-2xl overflow-hidden">
            <Fingerprint className="w-10 h-10 text-primary relative z-10 animate-pulse" />
          </div>
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white uppercase italic tracking-widest">{profile?.totpEnabled ? 'Облачный Код' : 'Личный Пароль'}</h2>
              <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">{profile?.totpEnabled ? 'Введите 6 цифр из Google Auth' : 'Введите код доступа к узлу'}</p>
            </div>
            <Input 
              type="password" placeholder="••••••" maxLength={6} autoFocus
              className="bg-white/[0.04] border-white/10 h-16 text-3xl tracking-[0.6em] text-center rounded-2xl font-black focus:border-primary/40 transition-all border-2"
              value={twoFactorInput}
              onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
            />
            <div className="space-y-4">
              <Button onClick={handleVerify2FA} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase italic shadow-2xl active:scale-95 transition-all">Идентифицировать</Button>
              <Button variant="ghost" onClick={() => signOut(auth!)} className="w-full h-12 rounded-xl text-red-500/60 font-black uppercase text-[10px] gap-2"><LogOut className="w-4 h-4" /> Выйти</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatMain />;
}
