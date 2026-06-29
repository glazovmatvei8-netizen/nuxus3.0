"use client"

import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { useAppState } from '@/lib/store';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { ShieldAlert, Fingerprint, ShieldCheck } from 'lucide-react';
import { doc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { isUserActuallyBanned } from '@/lib/utils';
import { NuxusLogo } from '@/components/nuxus-logo';
import { IosInstaller } from '@/components/ios-installer';

/**
 * ГЛАВНЫЙ КОНТРОЛЛЕР ЯДРА V24.1.5
 * ФИКС: Прямой вызов WebAuthn для Safari (Zero-Latency).
 */
export default function Home() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { is2FAVerified, setIs2FAVerified, setInspectedUserId } = useAppState();
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [twoFactorInput, setTwoFactorInput] = useState('');
  const [showIosInstaller, setShowIosInstaller] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  useEffect(() => {
    setMounted(true);
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (isIos && !isStandalone && !localStorage.getItem('ios_installer_dismissed')) {
      setShowIosInstaller(true);
    }
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
  const isBanned = isUserActuallyBanned(profile);

  useEffect(() => {
    if (!mounted || !db) return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const usernameParam = params.get('u');
    
    if (ref && ref !== user?.uid) {
      setInspectedUserId(ref);
      window.history.replaceState({}, document.title, "/");
    } else if (usernameParam) {
      const cleanUsername = usernameParam.startsWith('@') ? usernameParam.toLowerCase() : '@' + usernameParam.toLowerCase();
      getDocs(query(collection(db, 'users'), where('username', '==', cleanUsername), limit(1))).then(snap => {
        if (!snap.empty && snap.docs[0].id !== user?.uid) {
          setInspectedUserId(snap.docs[0].id);
        }
      });
      window.history.replaceState({}, document.title, "/");
    }
  }, [mounted, db, user?.uid, setInspectedUserId]);

  const handleVerify2FA = () => {
    if (twoFactorInput === profile?.twoFactorPin) {
      setIs2FAVerified(true);
      toast({ title: "Доступ разрешен" });
    } else {
      toast({ title: "Ключ не принят", variant: "destructive" });
      setTwoFactorInput('');
    }
  };

  /**
   * ПРОВЕРКА FACE ID V24.1.5: МГНОВЕННЫЙ ВЫЗОВ (Zero-Latency)
   * Прямой вызов системного окна для Safari без блокирующих пауз.
   */
  const tryBiometricAuth = () => {
    const storedIdBase64 = localStorage.getItem('nuxus_biometric_id');
    if (!storedIdBase64 || !navigator.credentials) return;

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const id = Uint8Array.from(atob(storedIdBase64), c => c.charCodeAt(0));

      // Мгновенный вызов Promise без await для обхода блокировок Safari
      navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ id, type: 'public-key', transports: ['internal'] }],
          userVerification: "required"
        }
      }).then((assertion) => {
        if (assertion) {
          setIs2FAVerified(true);
          toast({ title: "Личность подтверждена" });
        }
      }).catch((e) => {
        console.warn("Nuxus Auth Reject:", e);
      });
    } catch (e) {}
  };

  useEffect(() => {
    if (!isUserLoading && (!user || !isProfileLoading)) {
      const timer = setTimeout(() => setIsInitialLoad(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isUserLoading, user, isProfileLoading]);

  if (!mounted) return null;

  if (isInitialLoad && (isUserLoading || (user && isProfileLoading))) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center">
          <NuxusLogo size={180} />
          <div className="mt-20 flex flex-col items-center gap-8">
            <div className="relative w-64 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent animate-[scanline_2s_linear_infinite]" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[1em] text-primary/80 animate-pulse ml-[1em]">ИНИЦИАЛИЗАЦИЯ</p>
          </div>
        </div>
      </div>
    );
  }

  if (showIosInstaller) return <IosInstaller onDismiss={() => setShowIosInstaller(false)} />;
  if (!user) return <AuthScreen />;

  if (isBanned) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505] p-6 text-center">
        <ShieldAlert className="w-24 h-24 text-destructive mb-8 animate-pulse" />
        <h1 className="text-5xl font-black mb-4 text-white uppercase italic tracking-tighter">УЗЕЛ ОТКЛЮЧЕН</h1>
        <Button variant="outline" className="rounded-full" onClick={() => signOut(auth)}>Завершить сессию</Button>
      </div>
    );
  }

  if (profile?.twoFactorEnabled && !is2FAVerified) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#020203] relative px-6">
        <div className="w-full max-w-[340px] space-y-12 text-center relative z-10">
          <div className="bg-white/[0.03] border border-white/10 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
            <Fingerprint className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <div className="space-y-8">
            <Input 
              type="password" 
              placeholder="••••••" 
              maxLength={6} 
              autoFocus
              className="bg-white/[0.04] border-white/10 h-16 text-3xl tracking-[0.6em] text-center rounded-2xl font-black"
              value={twoFactorInput}
              onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
            />
            <div className="space-y-4">
              <Button onClick={handleVerify2FA} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase italic tracking-widest">
                Разблокировать Ядро
              </Button>
              {profile?.settings?.biometricEnabled && (
                <Button variant="ghost" onClick={tryBiometricAuth} className="w-full h-12 rounded-xl text-primary font-black uppercase text-[10px] tracking-widest gap-2 bg-white/5">
                  <ShieldCheck className="w-4 h-4" /> Использовать Face ID
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatMain />;
}