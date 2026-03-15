
"use client"

import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { useAppState } from '@/lib/store';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { Loader2, ShieldAlert, Lock, ArrowRight, ShieldCheck, Fingerprint, WifiOff, Globe, ZapOff } from 'lucide-react';
import { doc, collection, query, where, limit, getDocs, arrayUnion, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import type { User as UserType, Chat, StickerPack } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { useEffect, useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { isUserActuallyBanned } from '@/lib/utils';
import { NuxusLogo } from '@/components/nuxus-logo';
import { IosInstaller } from '@/components/ios-installer';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { setCurrentChatId, is2FAVerified, setIs2FAVerified } = useAppState();
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [twoFactorInput, setTwoFactorInput] = useState('');
  const [showIosInstaller, setShowIosInstaller] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // iOS PWA Check
    const checkIos = () => {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
      if (isIos && !isStandalone && !localStorage.getItem('ios_installer_dismissed')) {
        setShowIosInstaller(true);
      }
    };
    checkIos();
  }, []);

  // Фоновая синхронизация IP (без блокировки)
  useEffect(() => {
    if (!user || !db || !mounted) return;

    const syncIpAndGeo = async () => {
      try {
        const res = await fetch('https://ipwho.is/');
        const data = await res.json();
        if (data.ip) {
          const uRef = doc(db, 'users', user.uid);
          await setDoc(uRef, { 
            lastIp: data.ip,
            countryCode: data.country_code || '??'
          }, { merge: true });
        }
      } catch (e) {}
    };

    const timer = setTimeout(syncIpAndGeo, 3000); 
    return () => clearTimeout(timer);
  }, [user, db, mounted]);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);

  const isBanned = isUserActuallyBanned(profile);

  const handleVerify2FA = () => {
    if (twoFactorInput === profile?.twoFactorPin) {
      setIs2FAVerified(true);
      toast({ title: "Доступ разрешен" });
    } else {
      toast({ title: "Ошибка PIN", variant: "destructive" });
    }
  };

  if (!mounted) return null;

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#050505] text-white">
        <NuxusLogo size={120} />
        <div className="mt-12 flex flex-col items-center gap-4">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60 animate-pulse">
            Neural Syncing...
          </p>
        </div>
      </div>
    );
  }

  if (showIosInstaller) {
    return <IosInstaller onDismiss={() => setShowIosInstaller(false)} />;
  }

  if (!user) return <AuthScreen />;

  if (isBanned) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505] p-6 text-center">
        <div className="bg-destructive/10 p-8 rounded-[3rem] mb-8 border border-destructive/20 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="w-20 h-20 text-destructive animate-pulse" />
        </div>
        <h1 className="text-4xl font-black mb-4 text-white uppercase italic tracking-tighter">Access Denied</h1>
        <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground/60 mb-10">Твой узел отключен от Ядра</p>
        <Button variant="outline" className="rounded-2xl border-white/10 h-14 px-10 font-black uppercase tracking-widest" onClick={() => signOut(auth)}>Отключиться</Button>
      </div>
    );
  }

  if (profile?.twoFactorEnabled && !is2FAVerified) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#050505] relative overflow-hidden px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-2xl aspect-square bg-primary/10 blur-[150px] rounded-full -z-10 animate-pulse-glow" />
        
        <div className="w-full max-w-sm space-y-6 text-center animate-in fade-in zoom-in duration-700">
          <div className="space-y-4">
            <div className="relative inline-block scale-75 md:scale-100">
              <div className="absolute inset-0 bg-primary blur-[40px] opacity-30 animate-pulse" />
              <div className="bg-white/[0.03] border border-white/10 w-20 h-20 rounded-[1.8rem] flex items-center justify-center mx-auto relative z-10 shadow-2xl backdrop-blur-3xl">
                <Fingerprint className="w-8 h-8 text-primary animate-float" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-2xl font-black uppercase italic text-white tracking-tight">Verify PIN</h2>
              <p className="text-[7px] font-black uppercase tracking-[0.4em] text-primary/60">Cloud Protection Active</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative group max-w-[240px] mx-auto">
               <div className="absolute -inset-1 bg-primary/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
               <Input 
                type="password" 
                placeholder="••••••" 
                maxLength={6} 
                autoFocus
                className="bg-white/[0.03] border-white/10 h-14 text-2xl tracking-[0.5em] text-center rounded-[1.2rem] font-black focus:border-primary/50 transition-all shadow-inner relative z-10"
                value={twoFactorInput}
                onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
              />
            </div>
            
            <div className="space-y-2 max-w-[240px] mx-auto">
              <Button onClick={handleVerify2FA} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 group active:scale-[0.98] text-xs">
                Unlock Kernel <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="ghost" onClick={() => signOut(auth)} className="w-full text-[7px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors">Disconnect (Logout)</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatMain />;
}
