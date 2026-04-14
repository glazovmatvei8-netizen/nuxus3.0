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
      if (isIos && !isStandalone && !localStorage.getItem('ios_installer_dismissed')) {
        setShowIosInstaller(true);
      }
    };
    checkIos();
  }, []);

  // Neural Link: Обработка параметров u (username) и ref (UID)
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
        } catch (e) {
          console.warn("Nuxus Neural Link: Failed to resolve username");
        }
      }
    };

    handleDeepLinks();
  }, [mounted, db, user?.uid, setInspectedUserId]);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
  const isBanned = isUserActuallyBanned(profile);

  useEffect(() => {
    if (!isUserLoading && (!user || !isProfileLoading)) {
      const timer = setTimeout(() => setIsInitialLoad(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isUserLoading, user, isProfileLoading]);

  const handleVerify2FA = () => {
    if (twoFactorInput === profile?.twoFactorPin) {
      setIs2FAVerified(true);
      toast({ title: "Neural Link Established" });
    } else {
      toast({ title: "Ключ не принят", variant: "destructive" });
      setTwoFactorInput('');
    }
  };

  if (!mounted) return null;

  if (isInitialLoad && (isUserLoading || (user && isProfileLoading))) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] text-white relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(45,10,85,0.4)_0%,transparent_50%),radial-gradient(circle_at_100%_100%,rgba(10,60,80,0.3)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary blur-[100px] opacity-30 animate-pulse" />
            <NuxusLogo size={180} />
          </div>
          <div className="mt-20 flex flex-col items-center gap-8">
            <div className="relative w-64 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent animate-[scanline_2s_linear_infinite]" />
            </div>
            <div className="space-y-2 text-center">
              <p className="text-[11px] font-black uppercase tracking-[1em] text-primary/80 animate-pulse ml-[1em]">
                {t('initializing')}
              </p>
              <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white/20 ml-[0.5em]">
                {t('app.kernel')} V4.4.0
              </p>
            </div>
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
        <div className="bg-destructive/10 p-12 rounded-[4rem] mb-8 border border-destructive/20 shadow-[0_0_80px_rgba(239,68,68,0.2)] relative">
          <div className="absolute inset-0 bg-destructive blur-3xl opacity-10 animate-pulse" />
          <ShieldAlert className="w-24 h-24 text-destructive animate-pulse relative z-10" />
        </div>
        <h1 className="text-5xl font-black mb-4 text-white uppercase italic tracking-tighter">NODE DISCONNECTED</h1>
        <p className="text-[12px] uppercase font-bold tracking-[0.4em] text-muted-foreground/60 mb-12">Security Breach Detected in Local Sector</p>
        <Button variant="outline" className="rounded-[2rem] border-white/10 h-16 px-12 font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all" onClick={() => signOut(auth)}>Terminate Connection</Button>
      </div>
    );
  }

  if (profile?.twoFactorEnabled && !is2FAVerified) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#020203] relative overflow-hidden px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(45,10,85,0.4)_0%,transparent_50%),radial-gradient(circle_at_100%_100%,rgba(10,60,80,0.3)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
        </div>
        
        <div className="w-full max-w-[320px] space-y-10 text-center relative z-10 animate-in fade-in zoom-in duration-1000">
          <div className="space-y-6">
            <div className="relative inline-block group">
              <div className="absolute -inset-6 bg-primary/20 blur-[60px] opacity-40 animate-pulse group-hover:opacity-60 transition-opacity duration-1000" />
              <div className="bg-white/[0.03] border border-white/10 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto relative z-10 shadow-2xl backdrop-blur-[120px] group-hover:scale-110 transition-transform duration-700">
                <Fingerprint className="w-8 h-8 text-primary animate-float" />
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">Neural Key</h2>
              <div className="flex items-center justify-center gap-3">
                <div className="h-px w-4 bg-primary/30" />
                <p className="text-[8px] font-black uppercase tracking-[0.6em] text-primary/60 ml-[0.6em]">Biometric Auth</p>
                <div className="h-px w-4 bg-primary/30" />
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="relative group max-w-[240px] mx-auto">
               <div className="absolute -inset-10 bg-primary/15 blur-[100px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
               <Input 
                type="password" 
                placeholder="••••••" 
                maxLength={6} 
                autoFocus
                className="bg-white/[0.04] border-white/10 h-16 text-3xl tracking-[0.6em] text-center rounded-2xl font-black focus:border-primary/50 transition-all shadow-[inset_0_0_20px_rgba(0,0,0,0.4)] relative z-10 placeholder:text-white/5 border-2"
                value={twoFactorInput}
                onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
              />
            </div>
            
            <div className="space-y-4 max-w-[240px] mx-auto">
              <Button onClick={handleVerify2FA} className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase italic tracking-[0.2em] shadow-[0_20px_50px_rgba(168,85,247,0.4)] group active:scale-95 transition-all text-xs relative overflow-hidden border border-white/10">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <span className="flex items-center gap-2 relative z-10">
                  Unlock Core <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </span>
              </Button>
              <button 
                onClick={() => signOut(auth)} 
                className="w-full text-[8px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-white transition-all py-2 hover:scale-105 active:scale-95"
              >
                Abort Uplink (Logout)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatMain />;
}
