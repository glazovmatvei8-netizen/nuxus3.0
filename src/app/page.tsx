
"use client"

import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { useAppState } from '@/lib/store';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { Loader2, ShieldAlert, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
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
  
  const [stickerPackToInstall, setStickerPackToInstall] = useState<StickerPack | null>(null);

  useEffect(() => {
    setMounted(true);
    
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIos && !isStandalone) {
      const dismissed = localStorage.getItem('ios_installer_dismissed');
      if (!dismissed) {
        setShowIosInstaller(true);
      }
    }
  }, []);

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

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#0a0a0c] text-white">
        <NuxusLogo size={120} />
        <div className="mt-12 flex flex-col items-center gap-4">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 animate-pulse">
            Инициализация Ядра...
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
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0c] p-6 text-center">
        <div className="bg-destructive/10 p-6 rounded-full mb-6">
          <ShieldAlert className="w-16 h-16 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold mb-4 text-white uppercase italic">Доступ ограничен</h1>
        <Button variant="outline" className="rounded-2xl border-white/10" onClick={() => signOut(auth)}>Выйти</Button>
      </div>
    );
  }

  if (profile?.twoFactorEnabled && !is2FAVerified) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0c] relative overflow-hidden px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-lg aspect-square bg-primary/5 blur-[120px] rounded-full -z-10" />
        
        <div className="w-full max-w-md space-y-12 text-center">
          <div className="space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary blur-2xl opacity-20 animate-pulse" />
              <div className="bg-white/[0.03] border border-white/5 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto relative z-10">
                <Lock className="w-10 h-10 text-primary animate-float" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter">Введите PIN</h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Защита облачного пароля активна</p>
            </div>
          </div>

          <div className="space-y-6">
            <Input 
              type="password" 
              placeholder="••••••" 
              maxLength={6} 
              autoFocus
              className="bg-white/5 border-white/10 h-20 text-4xl tracking-[0.8em] text-center rounded-[2rem] font-black focus:border-primary/50 transition-all shadow-[0_0_40px_rgba(0,0,0,0.3)]"
              value={twoFactorInput}
              onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
            />
            
            <div className="space-y-3">
              <Button onClick={handleVerify2FA} className="w-full h-16 rounded-[1.8rem] bg-primary hover:bg-primary/90 text-white font-black uppercase italic tracking-widest text-base shadow-2xl shadow-primary/20 group">
                Разблокировать <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="ghost" onClick={() => signOut(auth)} className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-white transition-colors">Сменить узел (Выход)</Button>
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
        <DialogContent className="max-w-xs bg-card border-white/10 rounded-[2.5rem] p-6 text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic text-white">Новый Стикерпак</DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
              Вы хотите добавить этот набор?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              {stickerPackToInstall?.iconUrl ? (
                <img src={stickerPackToInstall.iconUrl} className="w-full h-full object-cover" />
              ) : (
                <NuxusLogo size={60} />
              )}
            </div>
            <h3 className="text-lg font-bold text-white">{stickerPackToInstall?.name}</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-black">{stickerPackToInstall?.stickerUrls.length} стикеров</p>
          </div>

          <DialogFooter className="flex-col gap-2">
            <Button onClick={handleInstallPack} className="w-full h-12 rounded-2xl bg-primary font-black uppercase tracking-widest">Установить</Button>
            <Button variant="ghost" onClick={() => setStickerPackToInstall(null)} className="w-full h-10 rounded-xl text-[10px] font-bold uppercase opacity-40">Отмена</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
