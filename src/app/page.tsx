
"use client"

import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { useAppState } from '@/lib/store';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { Loader2, ShieldAlert, Lock, ArrowRight, ShieldCheck, Fingerprint, WifiOff, Globe, ZapOff, Zap } from 'lucide-react';
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
    const checkIos = () => {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
      if (isIos && !isStandalone && !localStorage.getItem('ios_installer_dismissed')) {
        setShowIosInstaller(true);
      }
    };
    checkIos();
  }, []);

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
      toast({ title: "Neural Link Established" });
    } else {
      toast({ title: "Ключ не принят", variant: "destructive" });
      setTwoFactorInput('');
    }
  };

  if (!mounted) return null;

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] text-white">
        <div className="relative">
          <div className="absolute inset-0 bg-primary blur-[80px] opacity-20 animate-pulse" />
          <NuxusLogo size={160} />
        </div>
        <div className="mt-16 flex flex-col items-center gap-6">
          <div className="relative w-48 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-primary animate-[scanline_2s_linear_infinite]" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.8em] text-primary/60 animate-pulse ml-[0.8em]">
            Syncing Neural Uplink
          </p>
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl aspect-square bg-primary/10 blur-[180px] rounded-full animate-pulse-glow" />
        </div>
        
        <div className="w-full max-w-sm space-y-12 text-center animate-in fade-in zoom-in duration-1000">
          <div className="space-y-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary blur-[60px] opacity-20 animate-pulse" />
              <div className="bg-white/[0.02] border border-white/10 w-28 h-28 rounded-[3rem] flex items-center justify-center mx-auto relative z-10 shadow-2xl backdrop-blur-[100px]">
                <Fingerprint className="w-12 h-12 text-primary animate-float" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-4xl font-black uppercase italic text-white tracking-tighter">Neural Key</h2>
              <p className="text-[9px] font-black uppercase tracking-[0.6em] text-primary/60 ml-[0.6em]">Biometric Verification Required</p>
            </div>
          </div>

          <div className="space-y-10">
            <div className="relative group max-w-[300px] mx-auto">
               <div className="absolute -inset-4 bg-primary/20 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
               <Input 
                type="password" 
                placeholder="••••••" 
                maxLength={6} 
                autoFocus
                className="bg-white/[0.03] border-white/10 h-20 text-4xl tracking-[0.8em] text-center rounded-[2rem] font-black focus:border-primary/50 transition-all shadow-inner relative z-10 placeholder:text-white/5"
                value={twoFactorInput}
                onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
              />
            </div>
            
            <div className="space-y-6 max-w-[300px] mx-auto">
              <Button onClick={handleVerify2FA} className="w-full h-16 rounded-[1.8rem] bg-primary hover:bg-primary/90 text-white font-black uppercase italic tracking-widest shadow-2xl shadow-primary/40 group active:scale-95 transition-all text-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <span className="flex items-center gap-2">
                  Unlock Core <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </span>
              </Button>
              <button 
                onClick={() => signOut(auth)} 
                className="w-full text-[9px] font-black uppercase tracking-[0.5em] text-white/20 hover:text-white transition-colors py-2"
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
