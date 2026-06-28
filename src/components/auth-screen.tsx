"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Fingerprint, Lock, ShieldCheck, ArrowRight, Zap, Globe } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { NuxusLogo } from './nuxus-logo';
import { LegalModal } from './modals/legal-modal';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';

export type AuthMode = 'login' | 'register' | 'recover' | 'setup2fa' | 'recovering';

const MASTER_DOMAIN = '@nuxus.chat';

interface AuthScreenProps {
  initialMode?: AuthMode;
}

export default function AuthScreen({ initialMode = 'login' }: AuthScreenProps) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIs2FAVerified } = useAppState();
  const { t } = useTranslations();
  
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
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

  /**
   * КОРРЕКТНОЕ СОЗДАНИЕ ПРОФИЛЯ V15.5
   * Имена и ники берутся СТРОГО из полей ввода. Никаких телефонов в никах.
   */
  const createProfileRecord = async (uid: string, overrideData?: any) => {
    if (!db) return;
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    
    // Имя: только из инпута или дефолтное
    const inputName = formData.name.trim();
    const finalName = inputName || overrideData?.name || (snap.exists() ? snap.data().name : `Агент ${uid.slice(0, 4).toUpperCase()}`);
    
    // ID: принудительно очищаем от мусора. Никогда не используем телефон.
    let inputUsername = formData.username.trim().replace('@', '');
    let finalUsername = inputUsername || overrideData?.username || (snap.exists() ? snap.data().username : null);
    
    if (!finalUsername) {
      finalUsername = `user_${uid.slice(0, 5).toLowerCase()}`;
    }

    // Валидация ника: только буквы, цифры и подчеркивание
    finalUsername = finalUsername.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    
    // Превращаем в @username
    const usernameWithAt = finalUsername.startsWith('@') ? finalUsername : '@' + finalUsername;

    const profileData = {
      id: uid,
      name: finalName,
      username: usernameWithAt,
      phone: formData.identifier.replace(/\D/g, '') || (snap.exists() ? snap.data().phone : ''),
      createdAt: snap.exists() ? snap.data().createdAt : new Date().toISOString(),
      isPremium: snap.exists() ? snap.data().isPremium : (overrideData?.isPremium || false),
      premiumUntil: snap.exists() ? snap.data().premiumUntil : (overrideData?.premiumUntil || null),
      referralCount: snap.exists() ? snap.data().referralCount : 0,
      invitedBy: snap.exists() ? snap.data().invitedBy : (referralId || null),
      twoFactorEnabled: snap.exists() ? snap.data().twoFactorEnabled : false,
      balance: snap.exists() ? snap.data().balance : (overrideData?.balance || 0),
      settings: snap.exists() ? snap.data().settings : {
        theme: 'default',
        appearance: 'dark',
        privacy: {
          phoneVisibility: 'nobody',
          lastSeenVisibility: 'everybody',
          allowGroupsFrom: 'everybody',
          whoCanMessageMe: 'everybody'
        }
      }
    };

    await setDoc(userRef, profileData, { merge: true });

    if (!snap.exists() && referralId && referralId !== uid) {
      try { 
        await updateDoc(doc(db, 'users', referralId), { referralCount: increment(1) }); 
      } catch (refErr) {}
    }
    return profileData;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast({ title: "Слишком короткий пароль", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (storageErr: any) {
        if (storageErr.code === 'auth/web-storage-unsupported' || storageErr.message?.includes('quota')) {
          localStorage.clear();
          await setPersistence(auth, browserSessionPersistence);
        }
      }

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
            const cred = await signInWithEmailAndPassword(auth, virtualEmail, formData.password);
            await createProfileRecord(cred.user.uid);
            setIs2FAVerified(true);
          } else {
            throw regErr;
          }
        }
      } else {
        const cred = await signInWithEmailAndPassword(auth, virtualEmail, formData.password);
        const userRef = doc(db!, 'users', cred.user.uid);
        const snap = await getDoc(userRef);
        
        if (!snap.exists()) {
          await createProfileRecord(cred.user.uid);
        }

        const currentProfile = (await getDoc(userRef)).data();
        if (currentProfile?.twoFactorEnabled) setIs2FAVerified(false);
        else setIs2FAVerified(true);
      }
    } catch (err: any) {
      let msg = err.message;
      if (err.code === 'auth/invalid-credential') msg = "Неверный логин или пароль.";
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

  if (mode === 'recovering') {
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
          <p className="text-[10px] font-black uppercase tracking-[0.8em] text-primary/60 animate-pulse ml-[0.8em]">СИНХРОНИЗАЦИЯ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(45,10,85,0.4)_0%,transparent_50%),radial-gradient(circle_at_100%_100%,rgba(10,60,80,0.3)_0%,transparent_50%)]" />
      </div>

      <div className="w-full max-w-[380px] relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-1000">
        <div className="mb-10 scale-90 hover:scale-100 transition-all duration-700 cursor-pointer active:rotate-[360deg]">
          <NuxusLogo size={100} />
        </div>

        <Card className="w-full border-white/[0.08] bg-white/[0.02] backdrop-blur-[120px] shadow-[0_30px_100px_rgba(0,0,0,0.8)] rounded-[3rem] overflow-hidden relative border-2">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-pulse" />
          
          <CardHeader className="text-center pb-2 pt-10 px-8">
            <CardTitle className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              {mode === 'recover' ? 'Восстановление' : mode === 'setup2fa' ? 'Защита' : mode === 'login' ? 'Вход V15.5' : 'Создание'}
            </CardTitle>
            <CardDescription className="text-primary/80 font-black tracking-[0.5em] uppercase text-[8px] opacity-60 mt-3 ml-[0.5em]">
              {mode === 'setup2fa' ? 'Квантовый ключ' : mode === 'recover' ? 'Нейронный сброс' : 'Nuxus Kernel 2026'}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-10 pt-6">
            {mode === 'setup2fa' ? (
              <form onSubmit={handleSetup2FA} className="space-y-8">
                <div className="flex flex-col items-center gap-4 py-2">
                  <Fingerprint className="w-16 h-16 text-primary animate-float relative z-10" />
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em] text-center leading-relaxed">Установите 6-значный<br/>ключ доступа</p>
                </div>
                <input 
                  type="password" 
                  placeholder="••••••" 
                  maxLength={6} 
                  value={formData.pin2FA} 
                  onChange={e => setFormData({...formData, pin2FA: e.target.value.replace(/\D/g, '')})} 
                  className="w-full bg-white/5 border-white/10 h-16 rounded-[1.5rem] text-center text-3xl tracking-[0.6em] font-black focus:border-primary/50 transition-all border-2 outline-none" 
                  required 
                />
                <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary text-white rounded-[1.5rem] font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all text-sm border border-white/10">
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Активировать Узел"}
                </Button>
              </form>
            ) : mode === 'recover' ? (
              <div className="space-y-8 text-center py-4">
                <ShieldAlert className="w-16 h-16 text-destructive animate-float mx-auto relative z-10" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 px-4 leading-relaxed">
                  Для восстановления доступа обратитесь к Оператору Ядра.
                </p>
                <Button variant="outline" onClick={() => setMode('login')} className="w-full h-14 rounded-[1.5rem] border-white/10 text-[10px] uppercase font-black tracking-[0.3em]">Вернуться</Button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-5">
                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[8px] uppercase font-black text-primary/60 ml-3 tracking-widest">Имя</Label>
                      <Input placeholder="Имя" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-[1.2rem] text-xs font-bold border-2" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[8px] uppercase font-black text-primary/60 ml-3 tracking-widest">ID</Label>
                      <Input placeholder="id" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-[1.2rem] text-xs font-mono border-2" required />
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-[8px] uppercase font-black text-primary/60 ml-3 tracking-widest">Логин / Телефон</Label>
                  <Input placeholder="+7 (___) ___ __ __" value={formData.identifier} onChange={e => setFormData({...formData, identifier: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-[1.2rem] text-sm font-bold tracking-widest border-2" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[8px] uppercase font-black text-primary/60 ml-3 tracking-widest">Пароль</Label>
                  <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-[1.2rem] text-sm tracking-widest border-2" required />
                </div>
                
                <div className="pt-4">
                  <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary text-white rounded-[1.5rem] font-black uppercase italic tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all text-sm border border-white/10">
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (mode === 'login' ? `Войти в Систему` : "Создать Узел")}
                  </Button>
                </div>

                <div className="mt-8 text-center flex flex-col gap-3">
                  <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[8px] text-white/40 hover:text-primary transition-all font-black uppercase tracking-[0.3em]">
                    {mode === 'login' ? 'НЕТ АККАУНТА? РЕГИСТРАЦИЯ' : 'УЖЕ ЕСТЬ АККАУНТ? ВОЙТИ'}
                  </button>
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