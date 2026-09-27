"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useAppState } from '@/lib/app-state';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { Fingerprint, AlertTriangle, KeyRound, Smartphone, ShieldCheck, Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { isUserActuallyBanned, isUserAnomaly, cn } from '@/lib/utils';
import { NuxusLogo } from '@/components/nuxus-logo';
import { checkBiometric } from '@/services/biometric-service';

/**
 * NUXUS HOME GATE V72.0 «BIOMETRIC SECURE»
 * Основная точка входа мессенджера (Entry Point).
 * Интегрирована поддержка Face ID и динамической длины PIN.
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

  const userProfileRef = useMemo(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
  
  useEffect(() => {
    // Проверка поддержки биометрии устройством
    if (typeof window !== 'undefined' && (window as any).PublicKeyCredential) {
      setIsBiometricAvailable(true);
    }
  }, []);

  const isBanned = isUserActuallyBanned(profile);
  const isAnomaly = isUserAnomaly(profile);

  const handleVerify2FA = async () => {
    if (!profile) return;
    try {
      if (profile.twoFactorEnabled && twoFactorInput === profile.twoFactorPin) {
        setIs2FAVerified(true);
        return;
      }
      // Визуальный и тактильный отклик при ошибке
      if (window.navigator?.vibrate) window.navigator.vibrate(200);
      toast({ title: "Неверный код доступа", variant: "destructive" });
      setTwoFactorInput('');
    } catch (e) {
      toast({ title: "Ошибка модуля защиты", variant: "destructive" });
    }
  };

  const handleFaceID = async () => {
    setIsAuthenticating(true);
    try {
      const ok = await checkBiometric();
      if (ok) {
        setIs2FAVerified(true);
        toast({ title: "Личность подтверждена" });
      }
    } catch (e) {
      console.warn("FaceID fail");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Автоматический Face ID при входе в защищенный режим
  useEffect(() => {
    if (profile?.twoFactorEnabled && !is2FAVerified && isBiometricAvailable && !isAuthenticating) {
       // Мы не вызываем его автоматически, чтобы не пугать пользователя, 
       // но кнопка будет доступна.
    }
  }, [profile?.twoFactorEnabled, is2FAVerified, isBiometricAvailable]);

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] text-white">
        <NuxusLogo size={60} className="animate-pulse opacity-40" />
        <p className="mt-8 text-[8px] font-black uppercase tracking-[0.6em] text-primary/40">Syncing Engine V72.0</p>
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

  const isProtected = profile?.twoFactorEnabled;
  if (isProtected && !is2FAVerified) {
    const pinLength = parseInt(profile?.twoFactorPinLength || '6');

    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#010103] relative px-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="w-full max-w-[380px] space-y-12 text-center animate-in fade-in zoom-in-95 duration-700 relative z-10">
          <div className="flex flex-col items-center gap-6">
             <div className="h-20 w-20 rounded-[2.2rem] bg-primary/10 border border-primary/20 flex items-center justify-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                <Lock className="w-10 h-10 text-primary relative z-10" />
             </div>
             <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter">Личность</h2>
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.4em]">Hardware Encryption Protocol Active</p>
             </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <Input 
                type="password" 
                placeholder={"•".repeat(pinLength)} 
                maxLength={pinLength} 
                autoFocus
                className="bg-white/[0.03] border-white/5 h-24 text-5xl tracking-[0.5em] text-center rounded-[2rem] font-black text-white focus:border-primary/40 transition-all shadow-inner"
                value={twoFactorInput}
                onChange={e => {
                   const val = e.target.value.replace(/\D/g, '');
                   setTwoFactorInput(val);
                   if (val.length === pinLength) {
                      // Автоматическая проверка при заполнении всех цифр
                      setTimeout(() => {
                         if (val === profile.twoFactorPin) {
                            setIs2FAVerified(true);
                         }
                      }, 100);
                   }
                }}
                onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
              />
              <p className="text-[7px] font-black text-white/10 uppercase tracking-widest">Введите {pinLength}-значный код авторизации</p>
            </div>

            <div className="flex flex-col gap-4">
              <Button 
                onClick={handleVerify2FA} 
                className="w-full h-16 rounded-[1.8rem] bg-primary text-white font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all text-xs"
              >
                Подтвердить Личность
              </Button>

              {isBiometricAvailable && (
                <Button 
                  variant="ghost" 
                  onClick={handleFaceID}
                  disabled={isAuthenticating}
                  className="w-full h-16 rounded-[1.8rem] bg-white/5 border border-white/10 text-white font-black uppercase italic tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                >
                  {isAuthenticating ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <>
                      <Fingerprint className="w-5 h-5 text-primary" />
                      Использовать Face ID
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-3 opacity-20">
           <ShieldCheck className="w-5 h-5 text-primary" />
           <span className="text-[7px] font-black uppercase tracking-[0.5em] text-white">Nuxus Secure Enclave Link established</span>
        </div>
      </div>
    );
  }

  return <ChatMain />;
}
