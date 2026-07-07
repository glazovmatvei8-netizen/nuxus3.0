
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Phone, ChevronRight, UserPlus, Lock, Eye, EyeOff, ShieldCheck, Info, Mail } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  browserLocalPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { NuxusLogo } from './nuxus-logo';

export type AuthStep = 'phone' | 'verify' | 'email' | 'cloud_password' | 'profile' | 'setup2fa';

/**
 * AUTH SCREEN V32.6.0 «UNIVERSAL ACCESS»
 * ОБНОВЛЕНО: Добавлен вход по почте как альтернатива дорогому СМС-шлюзу.
 */
export default function AuthScreen({ initialMode }: { initialMode?: any }) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIs2FAVerified, setIsLegalOpen } = useAppState();
  
  const [step, setStep] = useState<AuthStep>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [cloudPasswordInput, setCloudPasswordInput] = useState('');
  const [showCloudPass, setShowCloudPassword] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [registeredUid, setRegisteredUid] = useState<string | null>(null);
  const [userDocCache, setUserDocCache] = useState<any>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    name: '',
    username: '',
    pin2FA: ''
  });

  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => {
      if (recaptchaVerifier.current) {
        recaptchaVerifier.current.clear();
        recaptchaVerifier.current = null;
      }
    };
  }, []);

  const initSilentVerifier = () => {
    if (typeof window !== 'undefined' && auth) {
      try {
        if (recaptchaVerifier.current) {
          recaptchaVerifier.current.clear();
        }
        
        const verifier = new RecaptchaVerifier(auth, 'silent-auth-container', {
          size: 'invisible'
        });
        
        recaptchaVerifier.current = verifier;
        return verifier;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || !auth) return;

    setIsLoading(true);
    try {
      const verifier = initSilentVerifier();
      if (!verifier) throw new Error("Security module fail");

      let finalPhone = phoneNumber.trim().replace(/\s/g, '');
      if (!finalPhone.startsWith('+')) {
        finalPhone = '+' + finalPhone;
      }

      const result = await signInWithPhoneNumber(auth, finalPhone, verifier);
      setConfirmationResult(result);
      setStep('verify');
      toast({ title: "Сигнал отправлен", description: "SMS-код летит на ваш узел." });
    } catch (err: any) {
      if (err.code === 'auth/billing-not-enabled') {
        toast({ 
          title: "Ограничение тарифа", 
          description: "Для реальных СМС нужен тариф Blaze. Используйте вход по почте ниже.", 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Ошибка сети", variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !auth || !db) return;
    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } else {
          throw err;
        }
      }
      
      const uid = userCredential.user.uid;
      checkUserProfile(uid);
    } catch (e: any) {
      toast({ title: "Ошибка входа", description: "Проверьте данные", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const checkUserProfile = async (uid: string) => {
    if (!db) return;
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      setIsNewUser(true);
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
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !verificationCode || !auth || !db) return;

    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await confirmationResult.confirm(verificationCode);
      checkUserProfile(userCredential.user.uid);
    } catch (err: any) {
      toast({ title: "Неверный код", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim() || !profileForm.username.trim() || !db) return;

    setIsLoading(true);
    try {
      const cleanUsername = profileForm.username.trim().replace('@', '');
      const targetSearch = ('@' + cleanUsername).toLowerCase();
      
      const q = query(collection(db, 'users'), where('usernameLowercase', '==', targetSearch), limit(1));
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
        phone: phoneNumber.replace(/\D/g, '') || null,
        email: email || null,
        createdAt: new Date().toISOString(),
        isPremium: false,
        balance: 0,
        settings: { theme: 'default', appearance: 'dark' }
      };

      await setDoc(doc(db, 'users', uid), profileData, { merge: true });
      setStep('setup2fa');
    } catch (err: any) {
      toast({ title: "Ошибка регистрации", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] p-4 relative overflow-hidden">
      <div id="silent-auth-container" className="fixed -top-[1000px] left-0 opacity-0 pointer-events-none z-[-1]"></div>
      
      <div className="w-full max-w-[380px] relative z-10 flex flex-col items-center animate-in fade-in duration-1000">
        <div className="mb-10">
          <NuxusLogo size={90} />
        </div>

        <Card className="w-full border-white/[0.08] bg-white/[0.02] backdrop-blur-[40px] shadow-2xl rounded-[3rem] overflow-hidden relative border-2">
          <CardHeader className="text-center pb-2 pt-10 px-8">
            <CardTitle className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">
              {step === 'phone' || step === 'email' ? 'Вход в Ядро' : 'Авторизация'}
            </CardTitle>
            <CardDescription className="text-primary/60 font-black tracking-[0.5em] uppercase text-[8px] mt-3">
              {isNewUser ? 'New Node Identity' : 'Quantum Protocol v32.6'}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-12 pt-6">
            {step === 'phone' && (
              <form onSubmit={handleSendCode} className="space-y-8">
                <div className="space-y-2 text-left">
                  <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-[0.3em]">Мобильный узел</Label>
                  <div className="relative group">
                     <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                     <Input 
                        placeholder="+7 (___) ___ __ __" 
                        value={phoneNumber} 
                        onChange={e => setPhoneNumber(e.target.value)} 
                        className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 text-lg font-bold tracking-widest border-2" 
                        required 
                     />
                  </div>
                </div>
                <div className="space-y-3">
                  <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all text-sm">
                    {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : "Получить сигнал"}
                  </Button>
                  <button type="button" onClick={() => setStep('email')} className="w-full py-2 text-[8px] font-black uppercase text-primary/40 hover:text-primary tracking-[0.2em] transition-colors">Использовать почту (бесплатно)</button>
                </div>
              </form>
            )}

            {step === 'email' && (
              <form onSubmit={handleEmailAuth} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Signal E-mail</Label>
                    <Input type="email" placeholder="mail@example.com" value={email} onChange={e => setEmail(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl text-sm font-bold" required />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Signal Password</Label>
                    <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl text-sm font-bold" required />
                  </div>
                </div>
                <div className="space-y-3">
                  <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all">
                    {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : "Авторизовать узел"}
                  </Button>
                  <button type="button" onClick={() => setStep('phone')} className="w-full py-2 text-[8px] font-black uppercase text-white/20 hover:text-white tracking-[0.2em]">Вернуться к телефону</button>
                </div>
              </form>
            )}

            {step === 'verify' && (
              <form onSubmit={handleVerifyCode} className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-4 text-center">
                  <MessageSquare className="w-8 h-8 text-primary animate-pulse mx-auto" />
                  <p className="text-[9px] text-white/40 uppercase font-black tracking-[0.2em]">Введите код из сообщения</p>
                  <div className="flex items-center justify-center gap-1 text-[7px] text-primary/40 uppercase font-bold">
                    <Info className="w-2.5 h-2.5" /> Используйте код из консоли (для теста)
                  </div>
                </div>
                <Input 
                  placeholder="••••••" 
                  maxLength={6} 
                  value={verificationCode} 
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))} 
                  className="bg-white/5 border-white/10 h-20 rounded-2xl text-center text-4xl tracking-[0.6em] font-black focus:border-primary/50 transition-all border-2" 
                  required 
                  autoFocus
                />
                <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all">
                  {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : "Подтвердить"}
                </Button>
              </form>
            )}

            {step === 'profile' && (
              <form onSubmit={handleCreateProfile} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Имя оператора</Label>
                    <Input placeholder="Ваше имя" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl text-sm font-bold" required />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Цифровой ID (@никнейм)</Label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">@</span>
                       <Input placeholder="unique_id" value={profileForm.username} onChange={e => setProfileForm({...profileForm, username: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-10 text-sm font-bold" required />
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all">
                  {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : "Создать профиль"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center px-4">
           <p className="text-[8px] text-white/30 uppercase font-bold tracking-widest leading-relaxed">
             Входя на платформу, вы принимаете{' '}
             <button type="button" onClick={() => setIsLegalOpen(true)} className="text-primary/60 hover:text-primary transition-colors underline decoration-primary/20 underline-offset-2">Цифровой регламент</button>
             {' '}и{' '}
             <button type="button" onClick={() => setIsLegalOpen(true)} className="text-primary/60 hover:text-primary transition-colors underline decoration-primary/20 underline-offset-2">Политику безопасности</button>.
           </p>
        </div>
      </div>
    </div>
  );
}
