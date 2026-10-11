
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, ShieldCheck, Copyright, Lock, Globe } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase/provider'; 
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { NuxusLogo } from './nuxus-logo';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { translations } from '@/lib/translations';
import versions from '@/app/versions.json';

/**
 * AUTH SCREEN V116.0 «GLOBAL ACCESS»
 * UPDATED: Removed @nuxus.fun email restriction. Now any email can join the Core.
 */
export default function AuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [lang, setLang] = useState<'ru' | 'en' | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  
  const t = lang ? translations[lang].auth : translations.ru.auth;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !auth) return;
    
    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      
      const cleanEmail = email.trim().toLowerCase();
      
      if (mode === 'register') {
        if (!name.trim()) throw new Error("Введите ваше имя");
        if (!username.trim()) throw new Error("Выберите @ID");
        if (!cleanEmail.includes('@')) throw new Error("Введите корректный Email");

        const usernameWithAt = '@' + username.trim().replace('@', '').replace(/\s/g, '').toLowerCase();
        
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(userCred.user, { displayName: name.trim() });
        
        const userData = {
          id: userCred.user.uid,
          name: name.trim(),
          username: usernameWithAt,
          usernameLowercase: usernameWithAt,
          phone: '',
          email: cleanEmail,
          createdAt: new Date().toISOString(),
          balance: 0,
          reputation: 0,
          settings: { 
            language: lang || 'ru', appearance: 'dark', theme: 'default',
            fontFamily: 'jakarta', bubbleStyle: 'default', messageSize: 'medium',
            privacy: { phoneVisibility: 'everybody', lastSeenVisibility: 'everybody', allowGroupsFrom: 'everybody' }
          }
        };
        await setDoc(doc(db, 'users', userCred.user.uid), userData);
        toast({ title: "Узел успешно активирован", description: `Добро пожаловать в Ядро, ${name}!` });
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        toast({ title: "Синхронизация завершена" });
      }
    } catch (e: any) {
      let msg = e.message;
      if (e.code === 'auth/user-not-found') msg = "Узел не зарегистрирован. Проверьте почту.";
      if (e.code === 'auth/wrong-password') msg = "Неверный пароль доступа.";
      if (e.code === 'auth/invalid-credential') msg = "Ошибка авторизации: проверьте данные.";
      toast({ title: "Ошибка входа", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lang) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_70%)]" />
        <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000">
          <NuxusLogo size={120} className="mb-10 drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]" />
          <div className="space-y-4 w-full max-w-[300px]">
            <h1 className="text-2xl font-black text-white text-center mb-8 uppercase italic tracking-tighter">NUXUS CORE</h1>
            <button onClick={() => setLang('ru')} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between px-6 transition-all active:scale-95 hover:bg-white/10 group shadow-xl">
              <span className="text-white font-black uppercase italic tracking-widest text-xs">Русский</span>
              <div className="bg-primary/20 px-2 py-0.5 rounded-lg text-primary text-[8px] font-black uppercase">RU</div>
            </button>
            <button onClick={() => setLang('en')} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between px-6 transition-all active:scale-95 hover:bg-white/10 group shadow-xl">
              <span className="text-white font-black uppercase italic tracking-widest text-xs">English</span>
              <div className="bg-primary/20 px-2 py-0.5 rounded-lg text-primary text-[8px] font-black uppercase">EN</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#010103] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.1)_0%,transparent_70%)]" />
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-6 py-12">
          <div className="mb-6 cursor-pointer hover:scale-105 transition-transform" onClick={() => setLang(null)}><NuxusLogo size={80} /></div>
          <Card className="w-full max-w-[380px] bg-white/[0.01] backdrop-blur-[100px] border-white/5 rounded-[2.5rem] p-1 shadow-2xl relative z-10 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <CardHeader className="text-center pt-6 pb-2 space-y-5">
              <div className="inline-flex bg-black/60 p-1 rounded-xl border border-white/5 mx-auto shadow-inner">
                <button type="button" onClick={() => setMode('login')} className={cn("px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", mode === 'login' ? "bg-white text-black shadow-xl" : "text-white/20")}>Вход</button>
                <button type="button" onClick={() => setMode('register')} className={cn("px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", mode === 'register' ? "bg-white text-black shadow-xl" : "text-white/20")}>Регистрация</button>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-3xl font-black text-white tracking-tighter italic uppercase">{mode === 'login' ? 'Привет' : 'Создать'}</CardTitle>
                <CardDescription className="text-primary/60 font-black uppercase text-[7px] tracking-[0.4em] italic">{t.subtitle}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-8">
              <form onSubmit={handleAuth} className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                       <Label className="text-[8px] font-black uppercase text-primary/40 ml-2 tracking-widest">Ваше имя</Label>
                       <Input placeholder="Имя" value={name} onChange={e => setName(e.target.value)} className="h-11 bg-white/[0.02] border-white/5 rounded-xl font-bold text-sm px-4 focus:border-primary/40" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase text-primary/40 ml-2 tracking-widest">ID (@)</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-sm opacity-40">@</span>
                        <Input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} className="h-11 bg-white/[0.02] border-white/5 rounded-xl font-bold text-sm pl-8" />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-[8px] font-black uppercase text-primary/40 ml-2 tracking-widest">Email Адрес</Label>
                    <Input type="email" placeholder="example@gmail.com" value={email} onChange={e => setEmail(e.target.value)} className="h-11 bg-white/[0.02] border-white/5 rounded-xl font-bold text-sm px-4" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[8px] font-black uppercase text-primary/40 ml-2 tracking-widest">Пароль доступа</Label>
                    <div className="relative">
                      <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="h-11 bg-white/[0.02] border-white/5 rounded-xl font-black text-base px-4 tracking-[0.2em]" />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/10 hover:text-primary transition-colors p-1.5">{showPass ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary text-white font-black uppercase italic tracking-widest text-sm rounded-xl shadow-xl mt-4 active:scale-95 transition-all">
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (mode === 'login' ? 'Войти' : 'Создать')}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="mt-8 flex flex-col items-center gap-2 opacity-30">
             <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                <Copyright className="w-2.5 h-2.5 text-primary" />
                <p className="text-[7px] font-black text-white uppercase tracking-[0.3em]">Nuxus 2024. All Rights Reserved.</p>
             </div>
             <div className="flex items-center gap-3">
                <ShieldCheck className="w-3 h-3 text-green-500" />
                <p className="text-[6px] font-black text-white/40 uppercase tracking-[0.6em]">Secure Enclave Active • Build {versions.build}</p>
             </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
