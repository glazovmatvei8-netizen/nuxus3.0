
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Fingerprint, MessageSquare, Phone, ChevronRight, UserPlus, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, increment, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { NuxusLogo } from './nuxus-logo';
import { cn } from '@/lib/utils';

export type AuthStep = 'phone' | 'verify' | 'cloud_password' | 'profile' | 'setup2fa';

/**
 * AUTH SCREEN V31.0.0 «TRIPLE BARRIER»
 * Поддержка SMS -> Облачный пароль -> Настройка профиля.
 */
export default function AuthScreen({ initialMode }: { initialMode?: any }) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIs2FAVerified } = useAppState();
  
  const [step, setStep] = useState<AuthStep>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [cloudPasswordInput, setCloudPasswordInput] = useState('');
  const [showCloudPass, setShowCloudPassword] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [referralId, setReferralId] = useState<string | null>(null);
  const [registeredUid, setRegisteredUid] = useState<string | null>(null);
  const [userDocCache, setUserDocCache] = useState<any>(null);
  
  const [profileForm, setProfileForm] = useState({
    name: '',
    username: '',
    pin2FA: ''
  });

  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) setReferralId(ref);
    }
  }, []);

  const initRecaptcha = () => {
    if (!recaptchaVerifier.current && typeof window !== 'undefined' && auth) {
      try {
        recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => { console.log("Nuxus Security: Recaptcha Solved"); }
        });
      } catch (e) {
        console.warn("Nuxus Auth: Recaptcha Init Error");
      }
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      toast({ title: "Неверный формат", description: "Введите полный номер телефона.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      initRecaptcha();
      const appVerifier = recaptchaVerifier.current;
      if (!appVerifier) throw new Error("Security Engine not ready");

      const finalPhone = phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber;
      const result = await signInWithPhoneNumber(auth!, finalPhone, appVerifier);
      setConfirmationResult(result);
      setStep('verify');
      toast({ title: "Сигнал отправлен", description: "SMS-код летит на ваш узел." });
    } catch (err: any) {
      toast({ title: "Ошибка отправки", description: "Проверьте номер или попробуйте позже.", variant: "destructive" });
      if (recaptchaVerifier.current) {
        recaptchaVerifier.current.clear();
        recaptchaVerifier.current = null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !verificationCode) return;

    setIsLoading(true);
    try {
      await setPersistence(auth!, browserLocalPersistence);
      const userCredential = await confirmationResult.confirm(verificationCode);
      const uid = userCredential.user.uid;
      
      const userRef = doc(db!, 'users', uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        setRegisteredUid(uid);
        setStep('profile');
      } else {
        const data = snap.data();
        setUserDocCache(data);
        if (data.cloudPasswordEnabled) {
          setStep('cloud_password');
        } else if (data.twoFactorEnabled) {
          setRegisteredUid(uid);
          setStep('setup2fa');
        } else {
          setIs2FAVerified(true);
        }
      }
    } catch (err: any) {
      toast({ title: "Неверный код", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCloudPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDocCache) return;

    if (cloudPasswordInput === userDocCache.cloudPassword) {
      if (userDocCache.twoFactorEnabled) {
        setRegisteredUid(userDocCache.id);
        setStep('setup2fa');
      } else {
        setIs2FAVerified(true);
      }
    } else {
      toast({ title: "Пароль не принят", variant: "destructive" });
      setCloudPasswordInput('');
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim() || !profileForm.username.trim()) {
      toast({ title: "Заполните данные", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const cleanUsername = profileForm.username.trim().replace('@', '');
      const targetSearch = ('@' + cleanUsername).toLowerCase();
      
      const q = query(collection(db!, 'users'), where('usernameLowercase', '==', targetSearch), limit(1));
      const checkSnap = await getDocs(q);
      
      if (!checkSnap.empty) {
        toast({ title: "Никнейм занят", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const uid = registeredUid || auth?.currentUser?.uid;
      if (!uid) throw new Error("Session lost");

      const profileData = {
        id: uid,
        name: profileForm.name.trim(),
        username: '@' + cleanUsername,
        usernameLowercase: targetSearch,
        phone: phoneNumber.replace(/\D/g, ''),
        phoneVerified: true,
        createdAt: new Date().toISOString(),
        isPremium: false,
        referralCount: 0,
        invitedBy: referralId || null,
        balance: 0,
        settings: {
          theme: 'default',
          appearance: 'dark',
          privacy: { phoneVisibility: 'nobody', lastSeenVisibility: 'everybody' }
        }
      };

      await setDoc(doc(db!, 'users', uid), profileData, { merge: true });

      if (referralId && referralId !== uid) {
        try { await updateDoc(doc(db!, 'users', referralId), { referralCount: increment(1) }); } catch (e) {}
      }

      setStep('setup2fa');
    } catch (err: any) {
      toast({ title: "Ошибка регистрации", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = registeredUid || auth?.currentUser?.uid;
    if (!uid || !profileForm.pin2FA) {
      setIs2FAVerified(true);
      return;
    }

    setIsLoading(true);
    try {
      await updateDoc(doc(db!, 'users', uid), {
        twoFactorEnabled: true,
        twoFactorPin: profileForm.pin2FA
      });
      setIs2FAVerified(true);
    } catch (e) {
      setIs2FAVerified(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] p-4 relative overflow-hidden">
      <div id="recaptcha-container" className="hidden"></div>
      
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(120,50,255,0.15)_0%,transparent_50%),radial-gradient(circle_at_100%_100%,rgba(10,182,212,0.1)_0%,transparent_50%)]" />
      </div>

      <div className="w-full max-w-[380px] relative z-10 flex flex-col items-center animate-in fade-in duration-1000">
        <div className="mb-12">
          <NuxusLogo size={100} />
        </div>

        <Card className="w-full border-white/[0.08] bg-white/[0.02] backdrop-blur-[40px] shadow-[0_30px_80px_rgba(0,0,0,0.7)] rounded-[3rem] overflow-hidden relative border-2">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse" />
          
          <CardHeader className="text-center pb-2 pt-10 px-8">
            <CardTitle className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">
              {step === 'phone' ? 'Вход в Ядро' : step === 'verify' ? 'Код доступа' : step === 'cloud_password' ? 'Облачный пароль' : step === 'profile' ? 'Профиль' : 'Защита'}
            </CardTitle>
            <CardDescription className="text-primary/60 font-black tracking-[0.5em] uppercase text-[8px] opacity-60 mt-3 ml-[0.5em]">
              {step === 'cloud_password' ? 'Security Level 2' : 'Quantum Protocol v31.0'}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-12 pt-6">
            {step === 'phone' && (
              <form onSubmit={handleSendCode} className="space-y-8">
                <div className="space-y-2 text-left">
                  <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-[0.3em]">Мобильный узел</Label>
                  <div className="relative group">
                     <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary transition-colors" />
                     <Input 
                        placeholder="+7 (___) ___ __ __" 
                        value={phoneNumber} 
                        onChange={e => setPhoneNumber(e.target.value)} 
                        className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 text-lg font-bold tracking-widest focus:border-primary/50 transition-all border-2" 
                        required 
                     />
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all text-sm group">
                  {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <span className="flex items-center gap-2">Получить сигнал <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>}
                </Button>
                <p className="text-[7px] text-center text-white/20 uppercase font-bold tracking-widest px-4">Входя на платформу, вы принимаете цифровой регламент Ядра.</p>
              </form>
            )}

            {step === 'verify' && (
              <form onSubmit={handleVerifyCode} className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-4 text-center">
                  <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-primary/20 shadow-lg">
                    <MessageSquare className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <p className="text-[9px] text-white/40 uppercase font-black tracking-[0.2em]">Введите код из сообщения</p>
                </div>
                <Input 
                  placeholder="••••••" 
                  maxLength={6} 
                  value={verificationCode} 
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))} 
                  className="bg-white/5 border-white/10 h-20 rounded-2xl text-center text-4xl tracking-[0.6em] font-black focus:border-primary/50 transition-all border-2 outline-none" 
                  required 
                  autoFocus
                />
                <div className="space-y-3">
                  <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all">
                    {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : "Подтвердить"}
                  </Button>
                  <button type="button" onClick={() => setStep('phone')} className="w-full py-2 text-[8px] font-black uppercase text-white/20 hover:text-white tracking-[0.3em] transition-colors">Сменить номер</button>
                </div>
              </form>
            )}

            {step === 'cloud_password' && (
              <form onSubmit={handleVerifyCloudPassword} className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-4 text-center">
                  <div className="bg-accent/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-accent/20 shadow-lg">
                    <Lock className="w-8 h-8 text-accent animate-pulse" />
                  </div>
                  <p className="text-[9px] text-white/40 uppercase font-black tracking-[0.2em]">Требуется мастер-пароль</p>
                </div>
                <div className="relative">
                  <Input 
                    type={showCloudPass ? "text" : "password"}
                    placeholder="Ваш пароль" 
                    value={cloudPasswordInput} 
                    onChange={e => setCloudPasswordInput(e.target.value)} 
                    className="bg-white/5 border-white/10 h-16 rounded-2xl text-center text-xl font-bold focus:border-accent/50 transition-all border-2 outline-none pr-12" 
                    required 
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowCloudPassword(!showCloudPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white">
                    {showCloudPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <Button type="submit" className="w-full h-16 bg-accent text-black rounded-2xl font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all">
                  Разблокировать
                </Button>
              </form>
            )}

            {step === 'profile' && (
              <form onSubmit={handleCreateProfile} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Имя оператора</Label>
                    <Input placeholder="Имя" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl text-sm font-bold border-2" required />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Цифровой ID (@никнейм)</Label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">@</span>
                       <Input placeholder="unique_id" value={profileForm.username} onChange={e => setProfileForm({...profileForm, username: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-10 text-sm font-bold border-2" required />
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all">
                  {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <span className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Создать узел</span>}
                </Button>
              </form>
            )}

            {step === 'setup2fa' && (
              <form onSubmit={handleSetup2FA} className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="flex flex-col items-center gap-4 py-2 text-center">
                  <div className="bg-accent/10 p-4 rounded-2xl border border-accent/20">
                    <Fingerprint className="w-12 h-12 text-accent" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-white font-black uppercase tracking-[0.2em]">Локальный ключ доступа</p>
                    <p className="text-[7px] text-white/20 font-bold uppercase tracking-[0.1em]">Дополнительный барьер защиты</p>
                  </div>
                </div>
                <Input 
                  type="password" 
                  placeholder="••••••" 
                  maxLength={6} 
                  value={profileForm.pin2FA} 
                  onChange={e => setProfileForm({...profileForm, pin2FA: e.target.value.replace(/\D/g, '')})} 
                  className="w-full bg-white/5 border-white/10 h-16 rounded-2xl text-center text-3xl tracking-[0.6em] font-black focus:border-accent/50 transition-all border-2 outline-none" 
                />
                <div className="space-y-3">
                  <Button type="submit" disabled={isLoading} className="w-full h-16 bg-accent text-black rounded-2xl font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all text-sm">
                    {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : "Активировать Защиту"}
                  </Button>
                  <button type="button" onClick={() => setIs2FAVerified(true)} className="w-full py-2 text-[8px] font-black uppercase text-white/20 hover:text-white tracking-[0.3em] transition-colors italic">Пропустить (не рекомендуется)</button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-10 flex items-center gap-2 opacity-20">
           <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
           <span className="text-[7px] font-black uppercase tracking-[0.8em] text-white ml-2">Nuxus Secure Enclave</span>
        </div>
      </div>
    </div>
  );
}
