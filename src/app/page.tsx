
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
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { setCurrentChatId, is2FAVerified, setIs2FAVerified } = useAppState();
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [twoFactorInput, setTwoFactorInput] = useState('');
  const [showIosInstaller, setShowIosInstaller] = useState(false);
  
  // NUXUS SHIELD STATES
  const [isVpnDetected, setIsVpnDetected] = useState(false);
  const [isShieldFailure, setIsShieldFailure] = useState(false);
  const [isVpnChecking, setIsVpnChecking] = useState(true);
  
  const [isPending, startTransition] = useTransition();
  const [stickerPackToInstall, setStickerPackToInstall] = useState<StickerPack | null>(null);

  useEffect(() => {
    setMounted(true);
    
    const checkVpnStatus = async () => {
      try {
        // Проверка локального кеша блокировки
        if (sessionStorage.getItem('nuxus_shield_locked') === 'true') {
          setIsVpnDetected(true);
          setIsVpnChecking(false);
          return;
        }

        const res = await fetch('https://ipwho.is/', { cache: 'no-store' });
        if (!res.ok) throw new Error("Shield bypass attempt detected");
        
        const data = await res.json();
        
        // Агрессивная проверка: VPN, Proxy, TOR или Cloud Hosting
        const isSuspicious = data.security && (
          data.security.vpn || 
          data.security.proxy || 
          data.security.tor || 
          data.security.relay ||
          data.security.type === 'hosting'
        );

        if (isSuspicious) {
          setIsVpnDetected(true);
          sessionStorage.setItem('nuxus_shield_locked', 'true');
        }
      } catch (e) {
        console.error("Nuxus Shield: Critical scan error", e);
        // В параноидальном режиме мы блокируем вход, если не смогли проверить IP
        setIsShieldFailure(true);
      } finally {
        setIsVpnChecking(false);
      }
    };

    const timer = setTimeout(checkVpnStatus, 500);

    // iOS PWA Check
    const checkIos = () => {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
      if (isIos && !isStandalone && !localStorage.getItem('ios_installer_dismissed')) {
        setShowIosInstaller(true);
      }
    };
    checkIos();

    return () => clearTimeout(timer);
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
      toast({ title: "Доступ разрешен" });
    } else {
      toast({ title: "Ошибка PIN", variant: "destructive" });
    }
  };

  if (!mounted) return null;

  // NUXUS SHIELD: VPN BLOCK UI
  if (isVpnDetected) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050000] p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-destructive/5 animate-pulse" />
        <div className="relative z-10 space-y-8 max-w-sm">
          <div className="bg-destructive/20 p-8 rounded-[3rem] border border-destructive/30 shadow-[0_0_100px_rgba(239,68,68,0.2)] mx-auto w-fit">
            <Globe className="w-20 h-20 text-destructive animate-bounce" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Signal Blocked</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.4em] text-destructive animate-pulse">VPN / Proxy Detection Active</p>
            <p className="text-muted-foreground/60 text-[11px] leading-relaxed uppercase font-bold px-4">
              Использование анонимайзеров строго запрещено протоколами Ядра Nuxus. Пожалуйста, отключите VPN и перезапустите браузер.
            </p>
          </div>
          <Button variant="outline" className="rounded-2xl border-white/10 h-14 px-10 font-black uppercase tracking-widest bg-white/5" onClick={() => window.location.reload()}>
            Проверить сигнал
          </Button>
        </div>
      </div>
    );
  }

  // NUXUS SHIELD: SCAN FAILURE
  if (isShieldFailure) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050000] p-6 text-center">
        <ZapOff className="w-16 h-16 text-primary/40 mb-6" />
        <h2 className="text-xl font-black text-white uppercase italic mb-2">Shield Offline</h2>
        <p className="text-[10px] text-muted-foreground uppercase font-bold max-w-xs mb-8">
          Не удалось связаться с узлом безопасности. Проверьте интернет-соединение или отключите блокировщики рекламы.
        </p>
        <Button variant="ghost" onClick={() => window.location.reload()} className="font-black uppercase text-[10px] tracking-widest">Переподключить</Button>
      </div>
    );
  }

  if (isUserLoading || isVpnChecking || (user && isProfileLoading)) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#050505] text-white">
        <NuxusLogo size={120} />
        <div className="mt-12 flex flex-col items-center gap-4">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60 animate-pulse">
            {isVpnChecking ? 'Shield Scanning...' : 'Neural Syncing...'}
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
