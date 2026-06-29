
"use client"

import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { useAppState } from '@/lib/store';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { Loader2, ShieldAlert, Lock, ArrowRight, ShieldCheck, Fingerprint, WifiOff, Globe, ZapOff, Zap } from 'lucide-react';
import { doc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { isUserActuallyBanned } from '@/lib/utils';
import { NuxusLogo } from '@/components/nuxus-logo';
import { IosInstaller } from '@/components/ios-installer';
import { useTranslations } from '@/hooks/use-translations';

/**
 * ГЛАВНЫЙ КОНТРОЛЛЕР ЯДРА V23.0
 * ФИКС: Мгновенный вызов Face ID для Safari (Zero-Latency Tap).
 */
export default function Home() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { is2FAVerified, setIs2FAVerified, setInspectedUserId } = useAppState();
  const { toast } = useToast();
  const { t } = useTranslations();
  
  const [mounted, setMounted] = useState(false);
  const [twoFactorInput, setTwoFactorInput] = useState('');
  const [showIosInstaller, setShowIosInstaller] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  useEffect(() => {
    setMounted(true);
    const checkIos = () => {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
      // Если не установлено как приложение (ни PWA, ни Native), показываем инсталлер
      if (isIos && !isStandalone && !localStorage.getItem('ios_installer_dismissed')) {
        setShowIosInstaller(true);
      }
    };
    checkIos();
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
  const isBanned = isUserActuallyBanned(profile);

  // Обработка глубоких ссылок
  useEffect(() => {
    if (!mounted || !db) return;
    const handleDeepLinks = async () => {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      const usernameParam = params.get('u');
      if (ref && ref !== user?.uid) {
        setInspectedUserId(ref);
        window.history.replaceState({}, document.title, "/");
      } else if (usernameParam) {
        try {
          const cleanUsername = usernameParam.startsWith('@') ? usernameParam.toLowerCase() : '@' + usernameParam.toLowerCase();
          const q = query(collection(db, 'users'), where('username', '==', cleanUsername), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty && snap.docs[0].id !== user?.uid) {
            setInspectedUserId(snap.docs[0].id);
          }
          window.history.replaceState({}, document.title, "/");
        } catch (e) {}
      }
    };
    handleDeepLinks();
  }, [mounted, db, user?.uid, setInspectedUserId]);

  const handleVerify2FA = () => {
    if (twoFactorInput === profile?.twoFactorPin) {
      setIs2FAVerified(true);
      toast({ title: "Доступ разрешен", description: "Квантовый канал стабилизирован." });
    } else {
      toast({ title: "Ключ не принят", variant: "destructive" });
      setTwoFactorInput('');
    }
  };

  /**
   * ПРОВЕРКА FACE ID V23.0: МГНОВЕННЫЙ ТАП
   */
  const tryBiometricAuth = async () => {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      toast({ title: "Ошибка устройства", description: "Биометрия не поддерживается.", variant: "destructive" });
      return;
    }
    
    const storedIdBase64 = localStorage.getItem('nuxus_biometric_id');
    if (!storedIdBase64) {
      toast({ title: "Не настроено", description: "Включите Face ID в настройках Ядра." });
      return;
    }

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const id = Uint8Array.from(atob(storedIdBase64), c => c.charCodeAt(0));

      // КРИТИЧЕСКИЙ ФИКС: Вызов ДОЛЖЕН быть синхронным с кликом
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            id: id,
            type: 'public-key',
            transports: ['internal']
          }],
          userVerification: "required"
        }
      });

      if (assertion) {
        setIs2FAVerified(true);
        toast({ title: "Личность подтверждена", description: "Вход через Hardware ID." });
      }
    } catch (e: any) {
      console.warn("Nuxus Auth Fail:", e);
      if (e.name === 'NotAllowedError') {
        toast({ 
          title: "Safari: Ожидание", 
          description: "Нажмите кнопку ещё раз для активации биометрии.", 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Сбой биометрии", description: "Используйте системный PIN-код.", variant: "destructive" });
      }
    }
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
          <div className="relative">
            <div className="absolute inset-0 bg-primary blur-[100px] opacity-30 animate-pulse" />
            <NuxusLogo size={180} />
          </div>
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
        <div className="bg-destructive/10 p-12 rounded-[4rem] mb-8 border border-destructive/20 shadow-[0_0_80px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="w-24 h-24 text-destructive animate-pulse" />
        </div>
        <h1 className="text-5xl font-black mb-4 text-white uppercase italic tracking-tighter">УЗЕЛ ОТКЛЮЧЕН</h1>
        <Button variant="outline" className="rounded-full border-white/10 h-16 px-12 font-black uppercase tracking-widest text-xs" onClick={() => signOut(auth)}>Завершить сессию</Button>
      </div>
    );
  }

  if (profile?.twoFactorEnabled && !is2FAVerified) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#020203] relative overflow-hidden px-6">
        <div className="w-full max-w-[340px] space-y-12 text-center relative z-10 animate-in fade-in zoom-in duration-1000">
          <div className="space-y-6">
            <div className="relative inline-block group">
              <div className="absolute -inset-8 bg-primary/20 blur-[60px] opacity-40 animate-pulse" />
              <div className="bg-white/[0.03] border border-white/10 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto relative z-10 shadow-2xl backdrop-blur-3xl">
                <Fingerprint className="w-10 h-10 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter">Защищенный вход</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60 ml-[0.5em]">Hardware Security</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="relative group max-w-[260px] mx-auto">
               <Input 
                type="password" 
                placeholder="••••••" 
                maxLength={6} 
                autoFocus
                className="bg-white/[0.04] border-white/10 h-16 text-3xl tracking-[0.6em] text-center rounded-2xl font-black focus:border-primary/50 transition-all shadow-inner relative z-10 placeholder:text-white/5"
                value={twoFactorInput}
                onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
              />
            </div>
            
            <div className="space-y-4 max-w-[260px] mx-auto">
              <Button onClick={handleVerify2FA} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all text-sm">
                Разблокировать Ядро
              </Button>
              
              {profile?.settings?.biometricEnabled && (
                <Button 
                  variant="ghost" 
                  onClick={tryBiometricAuth} 
                  className="w-full h-12 rounded-xl text-primary font-black uppercase text-[10px] tracking-widest gap-2 bg-white/5 border border-white/5 hover:bg-white/10"
                >
                  <ShieldCheck className="w-4 h-4" /> Использовать Face ID
                </Button>
              )}

              <button 
                onClick={() => signOut(auth)} 
                className="w-full text-[9px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-white transition-all py-4"
              >
                Завершить сессию
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatMain />;
}
