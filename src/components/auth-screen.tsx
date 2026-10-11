
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
 * AUTH SCREEN V119.0 «GLOBAL ACCESS UNLOCKED»
 * FIXED: Removed all email restrictions.
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
          balance: 100, // Initial bonus for testing
          reputation: 0,
          settings: { 
            language: lang || 'ru', appearance: 'dark', theme: 'default',
            fontFamily: 'jakarta', bubbleStyle: 'default', messageSize: 'medium',
            privacy: { phoneVisibility: 'everybody', lastSeenVisibility: 'everybody', allowGroupsFrom: 'everybody' }
          }
        };
        await setDoc(doc(db, 'users', userCred.user.uid), userData);
        toast({ title: "Узел активирован", description: `Добро пожаловать, ${name}!` });
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        toast({ title: "Синхронизация завершена" });
      }
    } catch (e: any) {
      let msg = e.message;
      if (e.code === 'auth/user-not-found') msg = "Узел не найден. Проверьте почту.";
      if (e.code === 'auth/wrong-password') msg = "Неверный пароль.";
      if (e.code === 'auth/invalid-credential') msg = "Ошибка данных. Проверьте ввод.";
      toast({ title: "Ошибка", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#010103] relative overflow-hidden">
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-6 py-12">
          <div className="mb-6" onClick={() => setLang(null)}><NuxusLogo size={80} /></div>
          <Card className="w-full max-w-[380px] bg-white/[0.01] backdrop-blur-3xl border-white/5 rounded-[2.5rem] p-1 shadow-2xl relative z-10">
            <CardHeader className="text-center pt-8 pb-4 space-y-4">
              <div className="inline-flex bg-black/40 p-1 rounded-xl border border-white/5 mx-auto">
                <button type="button" onClick={() => setMode('login')} className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest", mode === 'login' ? "bg-white text-black" : "text-white/20")}>Вход</button>
                <button type="button" onClick={() => setMode('register')} className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest", mode === 'register' ? "bg-white text-black" : "text-white/20")}>Создать</button>
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
                <Input type="email" placeholder={t.enterEmail} value={email} onChange={e => setEmail(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" />
                <div className="relative">
                  <Input type={showPass ? "text" : "password"} placeholder={t.enterPass} value={password} onChange={e => setPassword(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl font-black tracking-widest" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary text-white font-black uppercase italic tracking-widest rounded-2xl shadow-xl mt-4">
                  {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? t.login : t.register)}
                </Button>
              </form>
            </CardContent>
          </Card>
          <p className="mt-8 text-[8px] font-black uppercase text-white/20 tracking-[0.4em]">© Nuxus 2024. All Rights Reserved.</p>
        </div>
      </ScrollArea>
    </div>
  );
}
