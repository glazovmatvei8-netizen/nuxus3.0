
"use client"

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useAppState } from '@/lib/app-state';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { Fingerprint, AlertTriangle, Lock, ShieldCheck, Loader2, RefreshCcw, Mail } from 'lucide-react';
import { doc } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { isUserActuallyBanned, isUserAnomaly, cn, triggerHaptic } from '@/lib/utils';
import { NuxusLogo } from '@/components/nuxus-logo';
import { checkBiometric } from '@/services/biometric-service';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * NUXUS HOME GATE V139.0 «STEALTH ACCESS»
 * UPDATED: Removed repetitive "Access Granted" toasts for better UX.
 */
export default function Home() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { is2FAVerified, setIs2FAVerified } = useAppState();
  const { toast } = useToast();
  
  const [twoFactorInput, setTwoFactorInput] = useState('');
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined' && (window.PublicKeyCredential || (window as any).Capacitor)) {
      setIsBiometricAvailable(true);
    }
    const timer = setTimeout(() => {
      setLoadTimeout(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  const userProfileRef = useMemo(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
  
  const isBanned = useMemo(() => isUserActuallyBanned(profile), [profile]);
  const isAnomaly = useMemo(() => isUserAnomaly(profile), [profile]);

  // Проверка верификации почты
  const needsVerification = useMemo(() => {
    if (!user) return false;
    // Пользователи с эмуляцией номера (+... @nuxus.internal) не нуждаются в верификации почты
    if (user.email?.includes('@nuxus.internal')) return false;
    return !user.emailVerified;
  }, [user]);

  const handleVerify2FA = useCallback(async (manualInput?: string) => {
    if (!profile) return;
    const inputToVerify = manualInput || twoFactorInput;
    try {
      if (profile.twoFactorEnabled && inputToVerify === profile.twoFactorPin) {
        setIs2FAVerified(true);
        // SILENT SUCCESS: Toast removed as per V139 requirements
        return;
      }
      const pinLimit = parseInt(profile.twoFactorPinLength || '6');
      if (inputToVerify.length >= pinLimit) {
        triggerHaptic();
        toast({ title: "Неверный код доступа", variant: "destructive" });
        setTwoFactorInput('');
      }
    } catch (e) {
      toast({ title: "Ошибка модуля защиты", variant: "destructive" });
    }
  }, [profile, twoFactorInput, setIs2FAVerified, toast]);

  const handleFaceID = async () => {
    setIsAuthenticating(true);
    try {
      const ok = await checkBiometric();
      if (ok) {
        setIs2FAVerified(true);
        // SILENT SUCCESS: Toast removed as per V139 requirements
      } else {
        toast({ title: "Биометрия не распознана", variant: "destructive" });
      }
    } catch (e) {
      console.warn("Nuxus FaceID: Signal Rejected");
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    if (profile?.twoFactorEnabled) {
      const targetLength = parseInt(profile.twoFactorPinLength || '6');
      if (twoFactorInput.length === targetLength) {
        handleVerify2FA();
      }
    }
  }, [twoFactorInput, profile, handleVerify2FA]);

  if (!isMounted) {
    return (
      <div className="h-[100dvh] w-full bg-[#010103] flex flex-col items-center justify-center">
         <NuxusLogo size={80} className="opacity-20 animate-pulse" />
      </div>
    );
  }

  if (loadTimeout && (isUserLoading || (user && isProfileLoading))) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] text-white p-8 text-center">
        <NuxusLogo size={80} className="opacity-20 mb-8" />
        <h2 className="text-xl font-black uppercase italic tracking-tighter mb-2">Задержка синхронизации</h2>
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-8">Ядро ожидает ответ от узлов сети...</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="rounded-2xl border-white/10 bg-white/5 font-black uppercase text-[10px] tracking-widest gap-2">
          <RefreshCcw className="w-4 h-4" /> Перезагрузить Ядро
        </Button>
      </div>
    );
  }

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] text-white">
        <NuxusLogo size={80} className="animate-pulse opacity-40" />
        <p className="mt-8 text-[8px] font-black uppercase tracking-[0.6em] text-primary/40">Syncing Engine V123.0</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  // Направляем на экран верификации, если почта не подтверждена
  if (needsVerification) {
    return <AuthScreen initialMode="verify" />;
  }

  if (isBanned || isAnomaly) {
    const errorText = isAnomaly 
      ? "Ваш узел не имеет идентификатора (@username). Доступ заблокирован протоколом Sovereign."
      : "Протокол Aegis аннигилировал ваш узел за нарушение безопасности.";

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#010103] p-8 text-center text-white space-y-8">
        <div className="w-24 h-24 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
           <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <div className="space-y-4 max-w-xs">
           <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Доступ ограничен</h1>
           <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">
             {errorText}
           </p>
        </div>
        <Button variant="ghost" onClick={() => signOut(auth!)} className="h-14 px-10 rounded-2xl text-white/40 font-black uppercase tracking-widest hover:text-white transition-all">Отключиться</Button>
      </div>
    );
  }

  const isProtected = profile?.twoFactorEnabled;
  if (isProtected && !is2FAVerified) {
    const pinLength = parseInt(profile?.twoFactorPinLength || '6');
    return (
      <div className="min-h-[100dvh] w-full flex flex-col bg-[#010103] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_70%)] pointer-events-none" />
        <ScrollArea className="flex-1 w-full h-full">
          <div className="w-full flex flex-col items-center justify-center p-6 py-12 min-h-full">
            <div className="w-full max-w-[400px] space-y-8 text-center animate-in fade-in zoom-in-95 duration-700 relative z-10">
              <div className="flex flex-col items-center gap-6">
                <div className="h-20 w-20 rounded-[2.2rem] bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.2)] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 group-hover:animate-pulse" />
                    <Lock className="w-10 h-10 text-primary relative z-10" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter">Личность</h2>
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.4em]">Pulse Protection Active</p>
                </div>
              </div>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="relative">
                    <Input type="password" placeholder={"•".repeat(pinLength)} maxLength={pinLength} autoFocus className="bg-white/[0.03] border-white/5 h-20 text-4xl tracking-[0.5em] text-center rounded-[2.2rem] font-black text-white focus:border-primary/40 transition-all shadow-inner" value={twoFactorInput} onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && handleVerify2FA()} />
                  </div>
                  <p className="text-[7px] font-black text-white/10 uppercase tracking-widest">Введите {pinLength}-значный код доступа</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button onClick={() => handleVerify2FA()} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all text-xs">Подтвердить код</Button>
                  {isBiometricAvailable && (
                    <Button variant="ghost" onClick={handleFaceID} disabled={isAuthenticating} className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase italic tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-4 group">
                      {isAuthenticating ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> : <><Fingerprint className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" /> Использовать Биометрию</>}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="shrink-0 p-6 flex flex-col items-center gap-3 opacity-20 bg-gradient-to-t from-[#010103] to-transparent">
           <ShieldCheck className="w-5 h-5 text-primary" />
           <span className="text-[7px] font-black uppercase tracking-[0.5em] text-white">Nuxus Secure Enclave Link Established</span>
        </div>
      </div>
    );
  }

  return <ChatMain />;
}
