
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, ShieldCheck, Mail, Phone, Lock, RefreshCw, Send } from 'lucide-react';
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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

/**
 * AUTH SCREEN V179.0 «AEGIS ANTI-BRUTE»
 * UPDATED: Added a cooldown period on login attempts to prevent automated brute-force.
 */
export default function AuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'register' | 'verify' }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [lang, setLang] = useState<'ru' | 'en' | null>(null);
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>(initialMode);
  const [authType, setActiveAuthType] = useState<'email' | 'phone'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showPass, setShowPass] = useState(false);

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  
  const t = lang ? translations[lang].auth : translations.ru.auth;

  // AUTO-LOGIN LOGIC
  useEffect(() => {
    if (user && !isUserLoading) {
      if (!user.emailVerified && !user.email?.includes('@nuxus.internal')) {
        setMode('verify');
      } else {
        router.push('/');
      }
    }
  }, [user, isUserLoading, router]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !auth || cooldown > 0) return;
    
    setIsLoading(true);
    triggerHaptic();
    try {
      await setPersistence(auth, browserLocalPersistence);
      
      let finalId = identifier.trim().toLowerCase();
      if (authType === 'phone') {
        finalId = normalizePhoneNumber(identifier) + "@nuxus.internal";
      }
      
      if (mode === 'register') {
        if (!name.trim()) throw new Error(lang === 'en' ? "Enter your name" : "Введите ваше имя");
        if (!username.trim()) throw new Error(lang === 'en' ? "Choose @ID" : "Выберите @ID");
        
        const usernameWithAt = username.trim().startsWith('@') ? username.trim().toLowerCase() : '@' + username.trim().toLowerCase();
        
        const userCred = await createUserWithEmailAndPassword(auth, finalId, password);
        await updateProfile(userCred.user, { displayName: name.trim() });
        
        if (authType === 'email') {
          await sendEmailVerification(userCred.user);
          setMode('verify');
        }

        await setDoc(doc(db, 'users', userCred.user.uid), {
          id: userCred.user.uid,
          name: name.trim(),
          username: usernameWithAt,
          usernameLowercase: usernameWithAt,
          phone: authType === 'phone' ? identifier : '',
          email: authType === 'email' ? finalId : null,
          createdAt: new Date().toISOString(),
          balance: 100,
          reputation: 0,
          settings: { language: lang || 'ru', appearance: 'dark', theme: 'default' }
        });
      } else {
        await signInWithEmailAndPassword(auth, finalId, password);
      }
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
      setCooldown(3); // Защитная пауза 3 сек после ошибки
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading || (user && mode !== 'verify')) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103]">
        <NuxusLogo size={80} className="animate-pulse opacity-40" />
      </div>
    );
  }

  if (!lang) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(229,142,56,0.1)_0%,transparent_70%)]" />
        <div className="relative z-10 flex flex-col items-center animate-in fade-in duration-1000">
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
                  <Input 
                    type={authType === 'email' ? "email" : "text"} 
                    placeholder={authType === 'email' ? t.enterEmail : "Номер телефона"} 
                    value={identifier} 
                    onChange={e => setIdentifier(e.target.value)} 
                    className="h-12 bg-white/5 border-white/10 rounded-xl font-bold pl-12" 
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                    <Mail size={16} />
                  </div>
                </div>
                <div className="relative">
                  <Input 
                    type={showPass ? "text" : "password"} 
                    placeholder={t.enterPass} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="h-12 bg-white/5 border-white/10 rounded-xl font-black tracking-widest pl-12" 
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"><Lock size={16} /></div>
                </div>
                <Button type="submit" disabled={isLoading || cooldown > 0} className="w-full h-14 bg-primary text-white font-black uppercase italic tracking-widest rounded-2xl shadow-xl mt-4">
                  {isLoading ? <Loader2 className="animate-spin" /> : cooldown > 0 ? `Wait ${cooldown}s` : (mode === 'login' ? t.login : t.register)}
                </Button>
                {cooldown > 0 && (
                  <p className="text-[9px] text-center text-red-400 uppercase font-black tracking-widest animate-pulse mt-2">Aegis Cooldown Active</p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
