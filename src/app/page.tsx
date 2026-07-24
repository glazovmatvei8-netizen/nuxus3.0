
"use client"

import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { useAppState } from '@/lib/store';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { ShieldAlert, Fingerprint, ShieldCheck, Loader2, LogOut } from 'lucide-react';
import { doc, collection, query, where, getDocs, limit, addDoc } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { isUserActuallyBanned } from '@/lib/utils';
import { NuxusLogo } from '@/components/nuxus-logo';
import { IosInstaller } from '@/components/ios-installer';
import { LegalModal } from '@/components/modals/legal-modal';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { is2FAVerified, setIs2FAVerified, setInspectedUserId, setActiveCallId, isLegalOpen, setIsLegalOpen } = useAppState();
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [twoFactorInput, setTwoFactorInput] = useState('');
  const [showIosInstaller, setShowIosInstaller] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
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
    if (!mounted || !db || !user || !profile) return;
    
    if (profile.twoFactorEnabled && !is2FAVerified) {
       return;
    }

    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const usernameParam = params.get('u');
    const action = params.get('action');
    const targetId = params.get('to');
    
    if (action === 'call' && targetId && targetId !== user.uid) {
      const startDirectCall = async () => {
        try {
          const callRef = await addDoc(collection(db, 'calls'), {
            callerId: user.uid,
            receiverId: targetId,
            participantIds: [user.uid, targetId], 
            chatId: 'direct_link',
            type: 'audio',
            status: 'calling',
            createdAt: new Date().toISOString()
          });
          setActiveCallId(callRef.id);
          toast({ title: "Signal Link Established" });
        } catch (e) {
          console.warn("Call link failed");
        }
      };
      startDirectCall();
      window.history.replaceState({}, document.title, "/");
    } else if (ref && ref !== user?.uid) {
      setInspectedUserId(ref);
      window.history.replaceState({}, document.title, "/");
    } else if (usernameParam) {
      const cleanUsername = usernameParam.startsWith('@') ? usernameParam.toLowerCase() : '@' + usernameParam.toLowerCase();
      getDocs(query(collection(db, 'users'), where('usernameLowercase', '==', cleanUsername), limit(1))).then(snap => {
        if (!snap.empty && snap.docs[0].id !== user?.uid) {
          setInspectedUserId(snap.docs[0].id);
        }
      });
      window.history.replaceState({}, document.title, "/");
    }
  }, [mounted, db, user, profile, is2FAVerified, setInspectedUserId, setActiveCallId, toast]);

  const handleVerify2FA = () => {
    if (twoFactorInput === profile?.twoFactorPin) {
      setIs2FAVerified(true);
      toast({ title: "Доступ разрешен" });
    } else {
      toast({ title: "Ключ не принят", variant: "destructive" });
      setTwoFactorInput('');
    }
  };

  const handleSignOutFrom2FA = () => {
    signOut(auth).then(() => {
      setIs2FAVerified(false);
      setTwoFactorInput('');
      toast({ title: "Сессия завершена" });
    });
  };

  const tryBiometricAuth = () => {
    const storedIdBase64 = localStorage.getItem('nuxus_biometric_id');
    if (!storedIdBase64 || !navigator.credentials) return;

    setIsVerifying(true);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const id = Uint8Array.from(atob(storedIdBase64), c => c.charCodeAt(0));

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
      }).finally(() => setIsVerifying(false));
    } catch (e) {
      setIsVerifying(false);
    }
  };

  if (!mounted) return null;

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center">
          <NuxusLogo size={150} />
          <div className="mt-16 flex flex-col items-center gap-6">
            <div className="relative w-48 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent animate-[scanline_1.5s_linear_infinite]" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.8em] text-primary/60 animate-pulse ml-[0.8em]">СИНХРОНИЗАЦИЯ ЯДРА</p>
          </div>
        </div>
      </div>
    );
  }

  if (showIosInstaller) return <IosInstaller onDismiss={() => setShowIosInstaller(false)} />;
  
  if (!user) {
    return (
      <>
        <AuthScreen />
        <LegalModal open={isLegalOpen} onOpenChange={setIsLegalOpen} />
      </>
    );
  }

  if (isBanned) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505] p-6 text-center">
        <ShieldAlert className="w-20 h-20 text-destructive mb-6 animate-pulse" />
        <h1 className="text-4xl font-black mb-4 text-white uppercase italic tracking-tighter">УЗЕЛ ОТКЛЮЧЕН</h1>
        <Button variant="outline" className="rounded-full h-12 px-8 uppercase font-bold text-xs" onClick={() => signOut(auth)}>Завершить сессию</Button>
      </div>
    );
  }

  if (profile?.twoFactorEnabled && !is2FAVerified) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#020203] relative px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_70%)] pointer-events-none" />
        <div className="w-full max-w-[340px] space-y-12 text-center relative z-10">
          <div className="bg-white/[0.03] border border-white/10 w-24 h-24 rounded-[2.8rem] flex items-center justify-center mx-auto shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/10 animate-pulse" />
            <Fingerprint className="w-10 h-10 text-primary relative z-10" />
          </div>
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white uppercase italic tracking-widest">Облачный пароль</h2>
              <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">Введите код доступа к узлу</p>
            </div>
            <Input 
              type="password" 
              placeholder="••••••" 
              maxLength={6} 
              autoFocus
              className="bg-white/[0.04] border-white/10 h-16 text-3xl tracking-[0.6em] text-center rounded-2xl font-black focus:border-primary/40 transition-all border-2"
              value={twoFactorInput}
              onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
            />
            <div className="space-y-4">
              <Button onClick={handleVerify2FA} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all">
                Разблокировать
              </Button>
              <div className="grid grid-cols-1 gap-3">
                 {profile?.settings?.biometricEnabled && (
                   <Button variant="ghost" onClick={tryBiometricAuth} disabled={isVerifying} className="w-full h-12 rounded-xl text-primary font-black uppercase text-[10px] tracking-widest gap-2 bg-white/5 border border-white/5">
                     {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} 
                     Face ID / Touch ID
                   </Button>
                 )}
                 <Button variant="ghost" onClick={handleSignOutFrom2FA} className="w-full h-12 rounded-xl text-red-500/60 hover:text-red-500 font-black uppercase text-[10px] tracking-widest gap-2 bg-white/5 border border-white/5">
                    <LogOut className="w-4 h-4" /> Выйти из аккаунта
                 </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatMain />;
}
