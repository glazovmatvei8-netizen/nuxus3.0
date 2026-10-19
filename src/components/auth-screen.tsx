
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, ShieldCheck, Mail, Phone, Lock, RefreshCw, Send, ChevronLeft } from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase/provider'; 
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { NuxusLogo } from './nuxus-logo';
import { cn, normalizePhoneNumber, triggerHaptic } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { translations } from '@/lib/translations';

/**
 * AUTH SCREEN V129.0 «FINAL AUDIT»
 * FIXED: No domain restriction, forced verification logic, full localization.
 */
export default function AuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'register' | 'verify' }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [lang, setLang] = useState<'ru' | 'en' | null>(null);
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>(initialMode);
  const [authType, setActiveAuthType] = useState<'email' | 'phone'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  
  const t = lang ? translations[lang].auth : translations.ru.auth;

  useEffect(() => {
    if (user && !user.emailVerified && !user.email?.includes('@nuxus.internal')) {
      setMode('verify');
    }
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !auth) return;
    
    setIsLoading(true);
    triggerHaptic();
    try {
      await setPersistence(auth, browserLocalPersistence);
      
      let finalId = identifier.trim().toLowerCase();
      if (authType === 'phone') {
        // Эмуляция входа по номеру через внутренний домен
        finalId = normalizePhoneNumber(identifier) + "@nuxus.internal";
      }
      
      if (mode === 'register') {
        if (!name.trim()) throw new Error(lang === 'en' ? "Enter your name" : "Введите ваше имя");
        if (!username.trim()) throw new Error(lang === 'en' ? "Choose @ID" : "Выберите @ID");
        
        const usernameWithAt = username.trim().startsWith('@') ? username.trim().toLowerCase() : '@' + username.trim().toLowerCase();
        
        const userCred = await createUserWithEmailAndPassword(auth, finalId, password);
        await updateProfile(userCred.user, { displayName: name.trim() });
        
        // Верификация обязательна для email
        if (authType === 'email') {
          await sendEmailVerification(userCred.user);
          setMode('verify');
          toast({ title: lang === 'en' ? "Verification Sent" : "Письмо отправлено", description: lang === 'en' ? "Check your inbox or spam folder." : "Проверьте входящие или папку Спам." });
        }

        const userData = {
          id: userCred.user.uid,
          name: name.trim(),
          username: usernameWithAt,
          usernameLowercase: usernameWithAt,
          phone: authType === 'phone' ? identifier : '',
          email: authType === 'email' ? finalId : null,
          createdAt: new Date().toISOString(),
          balance: 100,
          reputation: 0,
          settings: { 
            language: lang || 'ru', appearance: 'dark', theme: 'default',
            bubbleStyle: 'default', messageSize: 'medium',
            privacy: { phoneVisibility: 'everybody', lastSeenVisibility: 'everybody', allowGroupsFrom: 'everybody' }
          }
        };
        await setDoc(doc(db, 'users', userCred.user.uid), userData);
      } else {
        const cred = await signInWithEmailAndPassword(auth, finalId, password);
        if (!cred.user.emailVerified && !cred.user.email?.includes('@nuxus.internal')) {
          setMode('verify');
        } else {
          toast({ title: lang === 'en' ? "Sync Complete" : "Синхронизация завершена" });
        }
      }
    } catch (e: any) {
<<<<<<< HEAD
=======
      console.error("Authentication error:", e);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      let msg = e.message;
      if (e.code === 'auth/user-not-found') msg = lang === 'en' ? "Node not found." : "Узел не найден.";
      if (e.code === 'auth/wrong-password') msg = lang === 'en' ? "Incorrect password." : "Неверный пароль.";
      if (e.code === 'auth/invalid-credential') msg = lang === 'en' ? "Check your credentials." : "Ошибка данных. Проверьте ввод.";
      if (e.code === 'auth/email-already-in-use') msg = lang === 'en' ? "Identity already in use." : "Этот идентификатор уже занят.";
      toast({ title: lang === 'en' ? "Signal Error" : "Ошибка", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReload = async () => {
    if (!auth?.currentUser) return;
    setIsLoading(true);
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      toast({ title: lang === 'en' ? "Verified" : "Узел верифицирован" });
      window.location.reload();
    } else {
      toast({ title: lang === 'en' ? "Status Unchanged" : "Статус не изменился", description: lang === 'en' ? "Please click the link in your email." : "Пожалуйста, перейдите по ссылке в письме." });
    }
    setIsLoading(false);
  };

  const handleResend = async () => {
    if (!auth?.currentUser) return;
    setIsLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast({ title: lang === 'en' ? "Signal Resent" : "Сигнал отправлен повторно" });
    } catch (e) {
<<<<<<< HEAD
=======
      console.error("Resend verification email error:", e);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      toast({ title: lang === 'en' ? "Gateway Failed" : "Сбой шлюза", variant: "destructive" });
    }
    setIsLoading(false);
  };

  if (!lang) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(229,142,56,0.1)_0%,transparent_70%)]" />
        <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000">
          <NuxusLogo size={100} className="mb-10" />
          <div className="space-y-4 w-full max-w-[300px]">
            <h1 className="text-xl font-black text-white text-center mb-8 uppercase italic tracking-tighter">NUXUS CORE</h1>
            <button onClick={() => setLang('ru')} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between px-6 transition-all active:scale-95">
              <span className="text-white font-black uppercase italic text-xs">Русский</span>
              <div className="bg-primary/20 px-2 py-0.5 rounded-lg text-primary text-[8px] font-black">RU</div>
            </button>
            <button onClick={() => setLang('en')} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between px-6 transition-all active:scale-95">
              <span className="text-white font-black uppercase italic text-xs">English</span>
              <div className="bg-primary/20 px-2 py-0.5 rounded-lg text-primary text-[8px] font-black">EN</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'verify') {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05)_0%,transparent_70%)]" />
        <div className="relative z-10 space-y-8 max-w-sm">
          <div className="h-20 w-20 rounded-[2.2rem] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto shadow-2xl">
             <Mail className="w-10 h-10 text-blue-500 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter">{lang === 'en' ? "Verification" : "Верификация"}</h2>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
              {lang === 'en' ? "We sent an encrypted signal to " : "Мы отправили зашифрованный сигнал на "} <b>{auth?.currentUser?.email}</b>. {lang === 'en' ? "Please confirm your identity." : "Пожалуйста, подтвердите вашу личность."}
            </p>
          </div>
          <div className="flex flex-col gap-3">
             <Button onClick={handleReload} disabled={isLoading} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl">
               {isLoading ? <Loader2 className="animate-spin" /> : <><RefreshCw className="w-4 h-4 mr-2" /> {lang === 'en' ? "Check Status" : "Проверить статус"}</>}
             </Button>
             <Button onClick={handleResend} variant="ghost" disabled={isLoading} className="w-full h-12 text-white/30 font-black uppercase text-[10px] tracking-widest hover:text-white">
               <Send className="w-3 h-3 mr-2" /> {lang === 'en' ? "Resend Email" : "Отправить повторно"}
             </Button>
          </div>
          <button onClick={() => { auth?.signOut(); setMode('login'); }} className="text-[9px] font-black uppercase text-white/20 hover:text-white underline tracking-widest">
            {lang === 'en' ? "Use another account" : "Использовать другой узел"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#010103] relative overflow-hidden">
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-6 py-12">
          <div className="mb-6 cursor-pointer active:scale-95 transition-transform" onClick={() => setLang(null)}>
            <NuxusLogo size={80} />
          </div>
          
          <Card className="w-full max-w-[380px] bg-white/[0.01] backdrop-blur-3xl border-white/5 rounded-[2.5rem] p-1 shadow-2xl relative z-10">
            <CardHeader className="text-center pt-8 pb-4 space-y-6">
              <div className="inline-flex bg-black/40 p-1 rounded-xl border border-white/5 mx-auto">
                <button type="button" onClick={() => setMode('login')} className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", mode === 'login' ? "bg-white text-black shadow-lg" : "text-white/20")}>{t.login}</button>
                <button type="button" onClick={() => setMode('register')} className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", mode === 'register' ? "bg-white text-black shadow-lg" : "text-white/20")}>{t.register}</button>
              </div>

              <div className="flex justify-center gap-4">
                <button onClick={() => setActiveAuthType('email')} className={cn("flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all", authType === 'email' ? "text-primary" : "text-white/20")}>
                  <Mail size={14} /> Email
                </button>
                <button onClick={() => setActiveAuthType('phone')} className={cn("flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all", authType === 'phone' ? "text-primary" : "text-white/20")}>
                  <Phone size={14} /> {lang === 'en' ? "Phone" : "Номер"}
                </button>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-10">
              <form onSubmit={handleAuth} className="space-y-4">
                {mode === 'register' && (
                  <>
                    <Input placeholder={t.name} value={name} onChange={e => setName(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" />
                    <Input placeholder={t.username} value={username} onChange={e => setUsername(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl font-mono text-primary" />
                  </>
                )}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                    {authType === 'email' ? <Mail size={16} /> : <Phone size={16} />}
                  </div>
                  <Input 
                    type={authType === 'email' ? "email" : "text"} 
                    placeholder={authType === 'email' ? t.enterEmail : (lang === 'en' ? "Phone Number" : "Номер телефона")} 
                    value={identifier} 
                    onChange={e => setIdentifier(e.target.value)} 
                    className="h-12 bg-white/5 border-white/10 rounded-xl font-bold pl-12" 
                  />
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                    <Lock size={16} />
                  </div>
                  <Input 
                    type={showPass ? "text" : "password"} 
                    placeholder={t.enterPass} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="h-12 bg-white/5 border-white/10 rounded-xl font-black tracking-widest pl-12" 
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary text-white font-black uppercase italic tracking-widest rounded-2xl shadow-xl mt-4 active:scale-95 transition-all">
                  {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? t.login : t.register)}
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="mt-8 flex flex-col items-center gap-2 opacity-20">
             <ShieldCheck size={20} className="text-primary" />
             <p className="text-[8px] font-black uppercase text-white tracking-[0.4em]">© Nuxus 2024. Quantum Security Active.</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
