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
      toast({ title: "PIN Error", variant: "destructive" });
    }
  };

  if (!mounted) return null;

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] text-white">
        <NuxusLogo size={160} />
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
        <div className="bg-destructive/10 p-12 rounded-[4rem] mb-8 border border-destructive/20 shadow-[0_0_80px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="w-24 h-24 text-destructive animate-pulse" />
        </div>
        <h1 className="text-5xl font-black mb-4 text-white uppercase italic tracking-tighter">NODE DISCONNECTED</h1>
        <p className="text-[12px] uppercase font-bold tracking-[0.4em] text-muted-foreground/60 mb-12">Security Breach Detected in Local Sector</p>
        <Button variant="outline" className="rounded-2xl border-white/10 h-16 px-12 font-black uppercase tracking-widest text-xs" onClick={() => signOut(auth)}>Terminate Connection</Button>
      </div>
    );
  }

  if (profile?.twoFactorEnabled && !is2FAVerified) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#020203] relative overflow-hidden px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl aspect-square bg-primary/10 blur-[180px] rounded-full animate-pulse-glow" />
        </div>
        
        <div className="w-full max-w-sm space-y-10 text-center animate-in fade-in zoom-in duration-1000">
          <div className="space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary blur-[50px] opacity-20 animate-pulse" />
              <div className="bg-white/[0.02] border border-white/10 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto relative z-10 shadow-2xl backdrop-blur-3xl">
                <Fingerprint className="w-10 h-10 text-primary animate-float" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter">Neural Key</h2>
              <p className="text-[8px] font-black uppercase tracking-[0.5em] text-primary/60">Biometric Verification Required</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="relative group max-w-[280px] mx-auto">
               <div className="absolute -inset-2 bg-primary/20 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
               <Input 
                type="password" 
                placeholder="••••••" 
                maxLength={6} 
                autoFocus
                className="bg-white/[0.02] border-white/10 h-16 text-3xl tracking-[0.6em] text-center rounded-[1.5rem] font-black focus:border-primary/50 transition-all shadow-inner relative z-10"
                value={twoFactorInput}
                onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
              />
            </div>
            
            <div className="space-y-4 max-w-[280px] mx-auto">
              <Button onClick={handleVerify2FA} className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 group active:scale-[0.98] text-sm">
                Unlock Core <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
              </Button>
              <Button variant="ghost" onClick={() => signOut(auth)} className="w-full text-[8px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-white transition-colors">Abort Uplink (Logout)</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatMain />;
}
