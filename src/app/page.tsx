
"use client"

import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { useAppState } from '@/lib/store';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { Loader2, ShieldAlert, Lock, ArrowRight, ShieldCheck, Fingerprint, WifiOff, Globe } from 'lucide-react';
import { doc, collection, query, where, limit, getDocs, arrayUnion, updateDoc, getDoc } from 'firebase/firestore';
import type { User as UserType, Chat, StickerPack } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
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
  const [isVpnDetected, setIsVpnDetected] = useState(false);
  const [isVpnChecking, setIsVpnChecking] = useState(true);
  
  const [stickerPackToInstall, setStickerPackToInstall] = useState<StickerPack | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // VPN Check & IP Tracking on Mount
    const checkVpnAndSyncIp = async () => {
      try {
        const res = await fetch('https://ipwho.is/');
        const data = await res.json();
        
        // VPN Detection
        if (data.security && (data.security.vpn || data.security.proxy || data.security.tor)) {
          setIsVpnDetected(true);
        }

        // Silent IP Update for existing session
        if (user && db && data.ip) {
          const uRef = doc(db, 'users', user.uid);
          await updateDoc(uRef, { lastIp: data.ip });
        }
      } catch (e) {
        console.warn("Nuxus Shield: Connection check skipped due to network error");
      } finally {
        setIsVpnChecking(false);
      }
    };
    
    checkVpnAndSyncIp();

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIos && !isStandalone) {
      const dismissed = localStorage.getItem('ios_installer_dismissed');
      if (!dismissed) {
        setShowIosInstaller(true);
      }
    }
  }, [user, db]);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);

  const isBanned = isUserActuallyBanned(profile);

  useEffect(() => {
    if (!user || !db || isJoining || !mounted) return;

    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');
    const stickerParam = params.get('stickers');

    if (stickerParam) {
      const fetchPack = async () => {
        const packRef = doc(db, 'stickerPacks', stickerParam);
        const packSnap = await getDoc(packRef);
        if (packSnap.exists()) {
          setStickerPackToInstall({ id: packSnap.id, ...packSnap.data() } as StickerPack);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      };
      fetchPack();
    }

    if (joinParam) {
      const handleJoin = async () => {
        setIsJoining(true);
        try {
          const searchUsername = joinParam.startsWith('@') ? joinParam.toLowerCase() : '@' + joinParam.toLowerCase();
          const q = query(collection(db, 'chats'), where('username', '==', searchUsername), limit(1));
          const snap = await getDocs(q);

          if (!snap.empty) {
            const chatDoc = snap.docs[0];
            const chatData = { id: chatDoc.id, ...chatDoc.data() } as Chat;
            if (!chatData.participantIds.includes(user.uid)) {
              await updateDoc(doc(db, 'chats', chatDoc.id), { participantIds: arrayUnion(user.uid) });
              toast({ title: "Успех", description: `Вы вступили в ${chatData.name}` });
            }
            setCurrentChatId(chatDoc.id);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (e) {
          console.error("Join error:", e);
        } finally {
          setIsJoining(false);
        }
      };
      handleJoin();
    }
  }, [user, db, setCurrentChatId, toast, isJoining, mounted]);

  const handleInstallPack = async () => {
    if (!db || !user || !stickerPackToInstall) return;
    await updateDoc(doc(db, 'users', user.uid), {
      installedStickerPackIds: arrayUnion(stickerPackToInstall.id)
    });
    toast({ title: "Успех", description: `Стикерпак "${stickerPackToInstall.name}" добавлен!` });
    setStickerPackToInstall(null);
  };

  const handleVerify2FA = () => {
    if (twoFactorInput === profile?.twoFactorPin) {
      setIs2FAVerified(true);
      toast({ title: "Доступ разрешен" });
    } else {
      toast({ title: "Ошибка PIN", variant: "destructive" });
    }
  };

  const dismissIosInstaller = () => {
    setShowIosInstaller(false);
    localStorage.setItem('ios_installer_dismissed', 'true');
  };

  if (!mounted) return null;

  // VPN Block Screen
  if (isVpnDetected) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050000] p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-destructive/5 animate-pulse" />
        <div className="relative z-10 space-y-8 max-w-sm">
          <div className="bg-destructive/20 p-8 rounded-[3rem] border border-destructive/30 shadow-[0_0_100px_rgba(239,68,68,0.2)] mx-auto w-fit">
            <Globe className="w-20 h-20 text-destructive animate-bounce" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Signal Interference</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.4em] text-destructive animate-pulse">VPN / Proxy Detection Active</p>
            <p className="text-muted-foreground/60 text-[11px] leading-relaxed uppercase font-bold px-4">
              Использование анонимайзеров запрещено протоколами Ядра Nuxus. Пожалуйста, отключите VPN и перезапустите приложение.
            </p>
          </div>
          <Button variant="outline" className="rounded-2xl border-white/10 h-14 px-10 font-black uppercase tracking-widest bg-white/5" onClick={() => window.location.reload()}>
            Проверить сигнал
          </Button>
        </div>
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
    return <IosInstaller onDismiss={dismissIosInstaller} />;
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
        {/* Plasma Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-2xl aspect-square bg-primary/10 blur-[150px] rounded-full -z-10 animate-pulse-glow" />
        
        <div className="w-full max-w-md space-y-16 text-center animate-in fade-in zoom-in duration-700">
          <div className="space-y-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary blur-[60px] opacity-30 animate-pulse" />
              <div className="bg-white/[0.03] border border-white/10 w-28 h-28 rounded-[2.5rem] flex items-center justify-center mx-auto relative z-10 shadow-2xl backdrop-blur-3xl">
                <Fingerprint className="w-12 h-12 text-primary animate-float" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-4xl font-black uppercase italic text-white tracking-[-0.05em]">Verify PIN</h2>
              <p className="text-[9px] font-black uppercase tracking-[0.5em] text-primary/60">Cloud Protection Active</p>
            </div>
          </div>

          <div className="space-y-10">
            <div className="relative group">
               <div className="absolute -inset-1 bg-primary/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
               <Input 
                type="password" 
                placeholder="••••••" 
                maxLength={6} 
                autoFocus
                className="bg-white/[0.03] border-white/10 h-24 text-5xl tracking-[0.8em] text-center rounded-[2.5rem] font-black focus:border-primary/50 transition-all shadow-inner relative z-10"
                value={twoFactorInput}
                onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
              />
            </div>
            
            <div className="space-y-4">
              <Button onClick={handleVerify2FA} className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-white font-black uppercase italic tracking-widest text-lg shadow-[0_20px_50px_rgba(139,92,246,0.3)] group active:scale-[0.98]">
                Unlock Kernel <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="ghost" onClick={() => signOut(auth)} className="w-full text-[9px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-white transition-colors">Disconnect Node (Logout)</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ChatMain />
      
      <Dialog open={!!stickerPackToInstall} onOpenChange={() => setStickerPackToInstall(null)}>
        <DialogContent className="max-w-xs bg-card/90 backdrop-blur-3xl border-white/10 rounded-[3rem] p-8 text-center shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic text-white tracking-tighter">New Signal</DialogTitle>
            <DialogDescription className="text-[9px] uppercase font-black tracking-[0.3em] text-primary/60">
              Install Sticker Pack?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-8 flex flex-col items-center gap-5">
            <div className="w-28 h-28 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl relative">
              <div className="absolute inset-0 bg-primary/10 blur-2xl" />
              {stickerPackToInstall?.iconUrl ? (
                <img src={stickerPackToInstall.iconUrl} className="w-full h-full object-cover relative z-10" />
              ) : (
                <NuxusLogo size={70} className="relative z-10" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">{stickerPackToInstall?.name}</h3>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{stickerPackToInstall?.stickerUrls.length} Units</p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-3">
            <Button onClick={handleInstallPack} className="w-full h-14 rounded-[1.5rem] bg-primary font-black uppercase tracking-widest shadow-lg shadow-primary/20">Install</Button>
            <Button variant="ghost" onClick={() => setStickerPackToInstall(null)} className="w-full h-10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] opacity-30 hover:opacity-100">Abort</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
