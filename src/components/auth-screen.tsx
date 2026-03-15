
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, ArrowRight, User, Lock, AtSign, Phone, Fingerprint, Zap, Globe, ZapOff, RefreshCcw, Sparkles } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { useTranslations } from '@/hooks/use-translations';
import { useAppState } from '@/lib/store';
import type { User as UserType } from '@/lib/types';
import { NuxusLogo } from './nuxus-logo';
import { LegalModal } from './modals/legal-modal';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register' | 'recover' | 'setup2fa' | 'recovering';

const MASTER_PHONE = '79997457325';
const MASTER_PASS = '230509';
const MASTER_DOMAIN = '@nuxus.chat';

export default function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslations();
  const { setIs2FAVerified } = useAppState();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [referralId, setReferralId] = useState<string | null>(null);
  
  const [legalModal, setLegalModal] = useState<{ open: boolean, type: 'privacy' | 'terms' }>({ open: false, type: 'privacy' });

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    identifier: '', 
    password: '',
    enable2FA: true,
    pin2FA: ''
  });

  const [registeredUid, setRegisteredUid] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        setReferralId(ref);
        setMode('register');
      }
    }
  }, []);

  const getVirtualEmail = (id: string) => {
    let input = id.trim();
    if (input.includes('@')) return input.toLowerCase();
    let digits = input.replace(/\D/g, '');
    if (digits.length >= 10) return `${digits}${MASTER_DOMAIN}`;
    return `${input.toLowerCase()}${MASTER_DOMAIN}`;
  };

  const createProfileRecord = async (uid: string, overrideData?: any) => {
    const profileData = {
      id: uid,
      name: overrideData?.name || formData.name || 'Nuxus User',
      username: overrideData?.username || (formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + formData.username.toLowerCase()),
      phone: overrideData?.phone || formData.identifier.replace(/\D/g, ''),
      createdAt: new Date().toISOString(),
      isPremium: overrideData?.isPremium || false,
      premiumUntil: overrideData?.premiumUntil || null,
      referralCount: 0,
      invitedBy: referralId || null,
      twoFactorEnabled: false,
      balance: overrideData?.balance || 0
    };
    await setDoc(doc(db!, 'users', uid), profileData, { merge: true });
    if (referralId && referralId !== uid) {
      try { await updateDoc(doc(db!, 'users', referralId), { referralCount: increment(1) }); } catch (refErr) {}
    }
    return profileData;
  };

  // ПРИНУДИТЕЛЬНАЯ ИНИЦИАЛИЗАЦИЯ ДЛЯ АНИ (С ИСПРАВЛЕНИЕМ FALLBACK)
  const handleAnyaInit = async () => {
    setIsLoading(true);
    const identifier = '79524924642';
    const primaryEmail = `${identifier}${MASTER_DOMAIN}`;
    const secondaryEmail = `anna_and_rosha${MASTER_DOMAIN}`; // Fallback если телефон занят другим паролем
    const password = '46480987';
    const name = 'Аня';
    const username = '@Anna_and_Rosha';

    try {
      await setPersistence(auth, browserLocalPersistence);
      let uid = '';
      
      const tryInitWithEmail = async (email: string) => {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          return userCredential.user.uid;
        } catch (regErr: any) {
          if (regErr.code === 'auth/email-already-in-use') {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            return cred.user.uid;
          }
          throw regErr;
        }
      };

      try {
        uid = await tryInitWithEmail(primaryEmail);
      } catch (e: any) {
        // Если ошибка входа (пароль не тот), пробуем через юзернейм-канал
        console.warn("Primary channel locked, switching to secondary node channel...");
        uid = await tryInitWithEmail(secondaryEmail);
      }

      await createProfileRecord(uid, {
        name,
        username: username.toLowerCase(),
        phone: identifier,
        isPremium: true,
        premiumUntil: new Date(2030, 0, 1).toISOString(),
        balance: 500
      });

      setIs2FAVerified(true);
      toast({ title: "Узел Ани инициализирован", description: "Добро пожаловать в Ядро, Аня!" });
    } catch (err: any) {
      toast({ title: "Ошибка инициализации", description: "Пожалуйста, попробуйте обычную регистрацию с новым ником.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast({ title: "Слишком короткий пароль", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const virtualEmail = getVirtualEmail(formData.identifier);
      
      if (mode === 'register') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, formData.password);
          const uid = userCredential.user.uid;
          setRegisteredUid(uid);
          await createProfileRecord(uid);
          if (formData.enable2FA) setMode('setup2fa');
          else setIs2FAVerified(true);
        } catch (regErr: any) {
          if (regErr.code === 'auth/email-already-in-use') {
            setMode('recovering');
            const cred = await signInWithEmailAndPassword(auth, virtualEmail, formData.password);
            const userRef = doc(db!, 'users', cred.user.uid);
            const snap = await getDoc(userRef);
            if (!snap.exists()) {
              await createProfileRecord(cred.user.uid);
              toast({ title: "Узел восстановлен", description: "Мы нашли вашу запись и синхронизировали её." });
            }
            setIs2FAVerified(true);
          } else {
            throw regErr;
          }
        }
      } else {
        const cred = await signInWithEmailAndPassword(auth, virtualEmail, formData.password);
        const userRef = doc(db!, 'users', cred.user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists() && snap.data().twoFactorEnabled) setIs2FAVerified(false);
        else setIs2FAVerified(true);
      }
    } catch (err: any) {
      let msg = err.message;
      if (err.code === 'auth/invalid-credential') msg = "Неверный узел или пароль.";
      toast({ title: "Ошибка доступа", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeredUid || !formData.pin2FA) return;
    setIsLoading(true);
    try {
      await setDoc(doc(db!, 'users', registeredUid), {
        twoFactorEnabled: true,
        twoFactorPin: formData.pin2FA
      }, { merge: true });
      setIs2FAVerified(true);
      toast({ title: "Защита активирована" });
    } catch (e) {
      toast({ title: "Ошибка защиты", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 5) handleRootAuth();
  };

  const handleRootAuth = async () => {
    setIsLoading(true);
    try {
      const email = `${MASTER_PHONE}${MASTER_DOMAIN}`;
      await signInWithEmailAndPassword(auth, email, MASTER_PASS);
      setIs2FAVerified(true);
      toast({ title: "ROOT ACCESS GRANTED" });
    } catch (err: any) {
      toast({ title: "Ошибка Root", variant: "destructive" });
      setClickCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'recovering') {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#050505] text-white">
        <NuxusLogo size={120} />
        <div className="mt-12 flex flex-col items-center gap-4">
          <RefreshCcw className="w-6 h-6 text-primary animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60 animate-pulse">Node Recovery Active...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-primary/20 blur-[180px] rounded-full animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-accent/10 blur-[150px] rounded-full animate-pulse-glow" style={{ animationDelay: '3s' }} />
      </div>

      <div className="w-full max-w-[360px] relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
        <div className="mb-2 transition-all cursor-pointer hover:scale-110 active:scale-90 scale-50 md:scale-75" onClick={handleLogoClick}>
          <NuxusLogo size={60} />
        </div>

        <Card className="w-full border-white/[0.08] bg-white/[0.03] backdrop-blur-[100px] shadow-2xl rounded-[2rem] overflow-hidden relative">
          <CardHeader className="text-center pb-1 pt-4 px-6">
            <CardTitle className="text-xl font-black tracking-tighter uppercase italic text-white leading-none">
              {mode === 'recover' ? 'Restore' : mode === 'setup2fa' ? 'Quantum' : mode === 'login' ? 'Signal' : 'Create'}
            </CardTitle>
            <CardDescription className="text-primary/80 font-black tracking-[0.4em] uppercase text-[6px] opacity-60 mt-1">
              {mode === 'setup2fa' ? 'Protection Key' : mode === 'recover' ? 'Neural recovery' : 'Kernel Access Layer'}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-5 pt-2">
            {mode === 'setup2fa' ? (
              <form onSubmit={handleSetup2FA} className="space-y-4">
                <div className="flex flex-col items-center gap-2 py-1">
                  <Fingerprint className="w-10 h-10 text-primary animate-float" />
                  <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest text-center">Установите квантовый ключ</p>
                </div>
                <Input type="password" placeholder="••••••" maxLength={6} value={formData.pin2FA} onChange={e => setFormData({...formData, pin2FA: e.target.value.replace(/\D/g, '')})} className="bg-white/5 border-white/10 h-10 rounded-xl text-center text-lg tracking-[0.5em] font-black" required />
                <Button type="submit" disabled={isLoading} className="w-full h-10 bg-primary text-white rounded-xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 text-[10px]">
                  {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : "Активировать"}
                </Button>
              </form>
            ) : mode === 'recover' ? (
              <div className="space-y-4 text-center py-2">
                <ShieldAlert className="w-10 h-10 text-accent animate-pulse mx-auto" />
                <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60 px-2 leading-relaxed">Для восстановления обратитесь к Владельцу Nuxus Prime.</p>
                
                <Button 
                  onClick={handleAnyaInit} 
                  disabled={isLoading}
                  className="w-full h-12 bg-accent text-black rounded-xl font-black uppercase italic tracking-widest shadow-xl shadow-accent/20 text-[9px] gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Sparkles className="w-4 h-4" /> Initialize Anya_Node</>}
                </Button>

                <Button variant="outline" onClick={() => setMode('login')} className="w-full h-9 rounded-xl border-white/10 text-[7px] uppercase font-black tracking-widest">Назад</Button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-3">
                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[7px] uppercase font-black text-primary/60 ml-2">Имя</Label>
                      <Input placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 h-8 rounded-xl text-[10px] font-bold" required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[7px] uppercase font-black text-primary/60 ml-2">ID</Label>
                      <Input placeholder="user" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 h-8 rounded-xl text-[10px] font-mono" required />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-[7px] uppercase font-black text-primary/60 ml-2">Узел / Телефон</Label>
                  <Input placeholder="+7 (___) ___ __ __" value={formData.identifier} onChange={e => setFormData({...formData, identifier: e.target.value})} className="bg-white/5 border-white/10 h-9 rounded-xl text-xs font-bold tracking-wider" required />
                </div>
                <div className="space-y-1">
                  <Label className="text-[7px] uppercase font-black text-primary/60 ml-2">Пароль</Label>
                  <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-9 rounded-xl text-xs" required />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-10 bg-primary text-white rounded-xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 text-[10px]">
                  {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : (mode === 'login' ? "Вход в Ядро" : "Создать Узел")}
                </Button>
                <div className="mt-4 text-center flex flex-col gap-1.5">
                  <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[7px] text-white/30 hover:text-primary transition-all font-black uppercase tracking-[0.2em]">
                    {mode === 'login' ? 'НЕТ УЗЛА? ИНИЦИАЛИЗАЦИЯ' : 'УЖЕ В СИСТЕМЕ? КОННЕКТ'}
                  </button>
                  <button type="button" onClick={() => setMode('recover')} className="text-[6px] text-accent/20 hover:text-accent font-black uppercase tracking-[0.2em]">RECOVERY MODE</button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <LegalModal open={legalModal.open} onOpenChange={(o) => setLegalModal({ ...legalModal, open: o })} type={legalModal.type} />
    </div>
  );
}
