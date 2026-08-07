
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, AlertCircle, Mail, Phone, ArrowRight, ShieldCheck, Key } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase/provider'; 
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAppState } from '@/lib/store.tsx'; 
import { NuxusLogo } from './nuxus-logo';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendVerificationCode } from '@/ai/flows/send-verification-email-flow';

const COUNTRY_CODES = [
  { code: '+380', name: 'Украина', flag: '🇺🇦' },
  { code: '+1', name: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', name: 'UK', flag: '🇬🇧' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+48', name: 'Poland', flag: '🇵🇱' },
  { code: '+375', name: 'Belarus', flag: '🇧🇾' },
  { code: '+77', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: '+995', name: 'Georgia', flag: '🇬🇪' },
  { code: '+370', name: 'Lithuania', flag: '🇱🇹' },
  { code: '+371', name: 'Latvia', flag: '🇱🇻' },
  { code: '+372', name: 'Estonia', flag: '🇪🇪' },
  { code: '+358', name: 'Finland', flag: '🇫🇮' },
  { code: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: '+90', name: 'Turkey', flag: '🇹🇷' },
  { code: '+972', name: 'Israel', flag: '🇮🇱' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+82', name: 'S.Korea', flag: '🇰🇷' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: '+420', name: 'Czech Republic', flag: '🇨🇿' },
  { code: '+43', name: 'Austria', flag: '🇦🇹' },
  { code: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: '+30', name: 'Greece', flag: '🇬🇷' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+852', name: 'Hong Kong', flag: '🇭🇰' },
  { code: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
];

type AuthStep = 'initial' | 'email-verify';

export default function AuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIsLegalOpen } = useAppState();
  
  const [langSelected, setLangSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [authStep, setAuthStep] = useState<AuthStep>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);

  // Form State
  const [countryCode, setCountryCode] = useState('+380');
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // Verification State
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState<string | null>(null);

  const validateRegistration = () => {
    if (!name.trim() || name.trim().toLowerCase() === 'user' || name.trim().length < 2) {
      toast({ title: "Недопустимое имя", description: "Пожалуйста, введите ваше реальное имя.", variant: "destructive" });
      return false;
    }
    const cleanUsername = username.trim().replace('@', '');
    if (!cleanUsername || cleanUsername.length < 3) {
      toast({ title: "Недопустимый ID", description: "ID должен содержать минимум 3 символа.", variant: "destructive" });
      return false;
    }
    if (!acceptedPolicy) {
      toast({ title: "Ошибка", description: "Вы должны согласиться с Политикой конфиденциальности.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const initiateRegistration = async () => {
    if (!validateRegistration()) return;
    
    if (email.trim()) {
      setIsLoading(true);
      try {
        const { code, success } = await sendVerificationCode({ email: email.trim(), userName: name.trim() });
        if (success) {
          setSentCode(code);
          setAuthStep('email-verify');
          toast({ title: "Код отправлен", description: `Проверьте почту ${email}` });
        }
      } catch (e: any) {
        toast({ title: "Ошибка почтового шлюза", description: "Не удалось отправить код подтверждения.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Стандартная регистрация без почты
      executeFinalAuth();
    }
  };

  const handleVerifyAndRegister = () => {
    if (verificationCode === sentCode) {
      executeFinalAuth(true);
    } else {
      toast({ title: "Неверный код", description: "Проверьте цифры в письме.", variant: "destructive" });
    }
  };

  const executeFinalAuth = async (isEmailVerified = false) => {
    if (!db || !auth) return;
    setIsLoading(true);

    const idClean = identifier.replace(/\D/g, '');
    const isEmailInput = identifier.includes('@');
    
    const finalPhone = isEmailInput 
      ? idClean // fallback or ignore if email-only
      : identifier.startsWith('+') 
        ? identifier.replace('+', '').replace(/\D/g, '') 
        : `${countryCode.replace('+', '')}${idClean}`;

    const finalEmail = isEmailInput ? identifier.trim() : (email.trim() || `${finalPhone}@nuxus.chat`);

    // REGIONAL SHIELD (RF Block)
    if (!isEmailInput) {
      if (finalPhone.startsWith('7') && !finalPhone.startsWith('77')) {
         toast({ title: "Региональное ограничение", description: "Регистрация из РФ временно недоступна.", variant: "destructive" });
         setIsLoading(false);
         return;
      }
    }

    try {
      await setPersistence(auth, browserLocalPersistence);
      const usernameWithAt = '@' + username.trim().replace('@', '');
      const userCred = await createUserWithEmailAndPassword(auth, finalEmail, password);
      
      await setDoc(doc(db, 'users', userCred.user.uid), {
        id: userCred.user.uid,
        name: name.trim(),
        username: usernameWithAt,
        usernameLowercase: usernameWithAt.toLowerCase(),
        phone: finalPhone,
        email: finalEmail,
        emailVerified: isEmailVerified,
        createdAt: new Date().toISOString(),
        balance: 0,
        settings: { 
          language: langSelected || 'ru', 
          theme: 'default', 
          appearance: 'dark',
          privacy: { phoneVisibility: 'contacts', lastSeenVisibility: 'everybody', allowGroupsFrom: 'everybody' }
        }
      });

      toast({ title: "Узел успешно создан", description: "Добро пожаловать в Ядро." });
    } catch (e: any) {
      toast({ title: "Сбой инициализации", description: e.message || "Проверьте данные.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !db || !auth) return;

    setIsLoading(true);
    
    const idClean = identifier.replace(/\D/g, '');
    const isEmailInput = identifier.includes('@');
    
    const finalEmail = isEmailInput 
      ? identifier.trim() 
      : identifier.startsWith('+') 
        ? `${identifier.replace('+', '').replace(/\D/g, '')}@nuxus.chat`
        : `${countryCode.replace('+', '')}${idClean}@nuxus.chat`;

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, finalEmail, password);
    } catch (e: any) {
      toast({ title: "Доступ запрещен", description: "Неверный логин или пароль.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!langSelected) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] px-6">
        <NuxusLogo size={140} />
        <div className="space-y-4 w-full max-w-sm mt-12">
          <button onClick={() => setLangSelected('ru')} className="w-full h-16 bg-primary text-white font-black uppercase italic tracking-widest rounded-2xl shadow-2xl active:scale-95 transition-all">Продолжить на русском</button>
          <button onClick={() => setLangSelected('en')} className="w-full h-14 bg-white/5 text-white/60 font-black uppercase italic tracking-widest rounded-2xl active:scale-95 transition-all">Continue in English</button>
        </div>
      </div>
    );
  }

  if (authStep === 'email-verify') {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] px-6">
         <Card className="w-full max-w-[400px] bg-white/[0.02] border-white/10 rounded-[3rem] shadow-2xl p-8 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20 shadow-xl">
               <ShieldCheck className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
               <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Верификация</h3>
               <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Введите 6 цифр, отправленных на {email}</p>
            </div>
            <Input 
               placeholder="••••••" maxLength={6} value={verificationCode} onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
               className="h-16 bg-white/5 border-white/10 text-center text-3xl font-black tracking-[0.5em] focus:border-primary/50 transition-all rounded-2xl"
            />
            <Button onClick={handleVerifyAndRegister} disabled={isLoading || verificationCode.length < 6} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl">
               {isLoading ? <Loader2 className="animate-spin" /> : 'Подтвердить узел'}
            </Button>
            <button onClick={() => setAuthStep('initial')} className="text-[10px] font-black uppercase text-white/20 hover:text-white transition-all">Вернуться назад</button>
         </Card>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#020203] relative overflow-hidden">
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-12">
          <div className="mb-10 cursor-pointer" onClick={() => setLangSelected(null)}><NuxusLogo size={90} /></div>
          <Card className="w-full max-w-[420px] bg-white/[0.02] border-white/10 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden">
            <CardHeader className="text-center pt-10 px-8">
              <div className="grid grid-cols-2 bg-white/5 p-1 rounded-2xl mb-8 border border-white/5">
                <button type="button" onClick={() => setMode('login')} className={cn("h-11 rounded-xl text-[10px] font-black uppercase transition-all", mode === 'login' ? "bg-primary text-white shadow-lg" : "text-white/30")}>{langSelected === 'ru' ? 'Вход' : 'Login'}</button>
                <button type="button" onClick={() => setMode('register')} className={cn("h-11 rounded-xl text-[10px] font-black uppercase transition-all", mode === 'register' ? "bg-primary text-white shadow-lg" : "text-white/30")}>{langSelected === 'ru' ? 'Регистрация' : 'Register'}</button>
              </div>
              <CardTitle className="text-3xl font-black italic text-white uppercase tracking-tighter">{mode === 'login' ? (langSelected === 'ru' ? 'Вход в Ядро' : 'Entry') : (langSelected === 'ru' ? 'Новый Узел' : 'New Node')}</CardTitle>
              {mode === 'register' && <CardDescription className="text-[9px] font-black uppercase text-primary/40 tracking-widest mt-1">Шаг 1: Идентификация личности</CardDescription>}
            </CardHeader>
            <CardContent className="px-8 pb-10">
              <form onSubmit={mode === 'login' ? handleLogin : (e) => { e.preventDefault(); initiateRegistration(); }} className="space-y-5">
                {mode === 'register' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Имя (не User)</Label>
                      <Input placeholder={langSelected === 'ru' ? 'Ваше имя' : 'Name'} value={name} onChange={e => setName(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10 font-bold focus:border-primary/40 transition-all shadow-inner" required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">ID (@ID)</Label>
                      <Input placeholder="unique_id" value={username} onChange={e => setUsername(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10 font-bold focus:border-primary/40 transition-all shadow-inner" required />
                    </div>
                  </>
                )}
                
                <div className="space-y-1">
                  {mode === 'register' && <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Телефон (для связи)</Label>}
                  <div className="flex gap-2">
                    {!identifier.includes('@') && (
                      <div className="w-[110px] shrink-0">
                        <Select value={countryCode} onValueChange={setCountryCode}>
                          <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold focus:ring-0 focus:border-primary/40 transition-all shadow-inner">
                            <SelectValue placeholder="🌍" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="bg-[#0a0a0c] border-white/10 rounded-2xl max-h-[300px] overflow-y-auto z-[2000] scrollbar-hide shadow-2xl">
                            {COUNTRY_CODES.map((c) => (
                              <SelectItem key={c.code} value={c.code} className="py-3 cursor-pointer hover:bg-primary/10 transition-colors">
                                {c.flag} {c.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Input 
                      placeholder={langSelected === 'ru' ? (identifier.includes('@') ? 'Почта' : 'Телефон') : (identifier.includes('@') ? 'Email' : 'Phone')} 
                      value={identifier} 
                      onChange={e => setIdentifier(e.target.value)} 
                      className="h-14 rounded-2xl bg-white/5 border-white/10 flex-1 font-bold focus:border-primary/40 transition-all shadow-inner" 
                      required 
                    />
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-primary/60 ml-2 italic">Почта для подтверждения (Опционально)</Label>
                    <Input 
                      type="email" 
                      placeholder="example@mail.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="h-14 rounded-2xl bg-white/5 border-white/10 font-bold focus:border-primary/40 transition-all shadow-inner"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  {mode === 'register' && <Label className="text-[9px] font-black uppercase text-primary/60 ml-2">Мастер-пароль</Label>}
                  <div className="relative">
                    <Input type={showPass ? "text" : "password"} placeholder={langSelected === 'ru' ? 'Пароль' : 'Password'} value={password} onChange={e => setPassword(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10 font-bold focus:border-primary/40 transition-all shadow-inner" required />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">{showPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="flex items-start space-x-3 p-5 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                    <Checkbox id="policy" checked={acceptedPolicy} onCheckedChange={(v) => setAcceptedPolicy(!!v)} className="mt-1" />
                    <label htmlFor="policy" className="text-[10px] font-bold text-white/60 leading-tight cursor-pointer uppercase tracking-tight">
                      Я согласен с <button type="button" onClick={(e) => { e.preventDefault(); setIsLegalOpen(true); }} className="text-primary font-black underline hover:text-white transition-colors">Политикой конфиденциальности</button>
                    </label>
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary text-white font-black uppercase italic tracking-widest rounded-2xl shadow-2xl shadow-primary/20 active:scale-95 transition-all group overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? 'Авторизовать' : 'Инициализировать')}
                </Button>
                
                <button type="button" onClick={(e) => { e.preventDefault(); setIsLegalOpen(true); }} className="w-full text-[9px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white transition-all py-2">Правовая информация</button>
              </form>
            </CardContent>
          </Card>
          <div className="mt-8 flex items-center gap-3 bg-red-500/10 px-6 py-3 rounded-2xl border border-red-500/20 shadow-xl animate-pulse">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">РФ: Регистрация ограничена</span>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

