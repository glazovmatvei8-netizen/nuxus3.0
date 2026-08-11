"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, ShieldCheck, Zap, ArrowRight, Activity, Sparkles } from 'lucide-react';
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

/**
 * AUTH SCREEN V19.0 «CORE ENTRY»
 * Элитный экран входа с иммерсивными эффектами.
 */
export default function AuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIsLegalOpen } = useAppState();
  
  const [langSelected, setLangSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Form State
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !auth) return;
    setIsLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      const isEmailInput = identifier.includes('@');
      const finalEmail = isEmailInput ? identifier.trim() : `${identifier.replace(/\D/g, '')}@nuxus.chat`;

      if (mode === 'register') {
        const usernameWithAt = '@' + username.trim().replace('@', '');
        const userCred = await createUserWithEmailAndPassword(auth, finalEmail, password);
        await setDoc(doc(db, 'users', userCred.user.uid), {
          id: userCred.user.uid,
          name: name.trim(),
          username: usernameWithAt,
          usernameLowercase: usernameWithAt.toLowerCase(),
          phone: isEmailInput ? '' : identifier.replace(/\D/g, ''),
          email: finalEmail,
          createdAt: new Date().toISOString(),
          balance: 0,
          settings: { language: langSelected || 'ru', appearance: 'dark' }
        });
        toast({ title: "Узел инициализирован" });
      } else {
        await signInWithEmailAndPassword(auth, finalEmail, password);
        toast({ title: "Синхронизация успешна" });
      }
    } catch (e: any) {
      toast({ title: "Сбой доступа", description: "Проверьте данные сигнала", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!langSelected) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020205] px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.15)_0%,transparent_70%)] animate-pulse" />
        <NuxusLogo size={180} />
        <div className="space-y-4 w-full max-w-sm mt-16 relative z-10">
          <button 
            onClick={() => setLangSelected('ru')} 
            className="w-full h-18 crystal-card bg-primary text-white font-black uppercase italic tracking-[0.2em] shadow-[0_20px_50px_rgba(168,85,247,0.4)] active:scale-95 transition-all"
          >
            РУССКИЙ СИГНАЛ
          </button>
          <button 
            onClick={() => setLangSelected('en')} 
            className="w-full h-16 obsidian-glass text-white/60 font-black uppercase italic tracking-[0.2em] rounded-3xl active:scale-95 transition-all"
          >
            ENGLISH SIGNAL
          </button>
        </div>
        <div className="absolute bottom-10 flex items-center gap-3 opacity-20">
           <Activity className="w-5 h-5 text-primary" />
           <span className="text-[8px] font-black uppercase tracking-[0.6em]">Nuxus Kernel V19.0</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#020205] relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[150px] rounded-full" />
      
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-6 py-12">
          <div className="mb-12 cursor-pointer active:scale-90 transition-all" onClick={() => setLangSelected(null)}>
            <NuxusLogo size={100} />
          </div>
          
          <Card className="w-full max-w-[440px] obsidian-glass rounded-[3.5rem] p-4 shadow-2xl relative z-10">
            <CardHeader className="text-center pt-8 pb-6">
              <div className="grid grid-cols-2 bg-white/5 p-1.5 rounded-2xl mb-10 border border-white/5 shadow-inner">
                <button onClick={() => setMode('login')} className={cn("h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", mode === 'login' ? "bg-primary text-white shadow-xl" : "text-white/20")}>ВХОД</button>
                <button onClick={() => setMode('register')} className={cn("h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", mode === 'register' ? "bg-primary text-white shadow-xl" : "text-white/20")}>РЕГИСТРАЦИЯ</button>
              </div>
              <CardTitle className="text-4xl font-black italic text-white uppercase tracking-tighter drop-shadow-2xl">
                {mode === 'login' ? 'ENTRY' : 'NEW NODE'}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-8 space-y-5">
              <form onSubmit={handleAuth} className="space-y-5">
                {mode === 'register' && (
                  <div className="grid grid-cols-1 gap-5">
                    <Input placeholder="ИМЯ УЗЛА" value={name} onChange={e => setName(e.target.value)} className="h-16 crystal-card pl-6 font-bold focus:border-primary/50" required />
                    <Input placeholder="@ID" value={username} onChange={e => setUsername(e.target.value)} className="h-16 crystal-card pl-6 font-bold focus:border-primary/50" required />
                  </div>
                )}
                <Input 
                  placeholder="ТЕЛЕФОН ИЛИ EMAIL" 
                  value={identifier} 
                  onChange={e => setIdentifier(e.target.value)} 
                  className="h-16 crystal-card pl-6 font-bold focus:border-primary/50" 
                  required 
                />
                <div className="relative">
                   <Input type={showPass ? "text" : "password"} placeholder="МАСТЕР-ПАРОЛЬ" value={password} onChange={e => setPassword(e.target.value)} className="h-16 crystal-card pl-6 font-bold focus:border-primary/50" required />
                   <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">{showPass ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full h-18 bg-primary text-white font-black uppercase italic tracking-[0.2em] rounded-3xl shadow-[0_20px_60px_rgba(168,85,247,0.4)] active:scale-95 transition-all group overflow-hidden mt-8">
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? 'АВТОРИЗОВАТЬ' : 'ИНИЦИАЛИЗИРОВАТЬ')}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <p className="mt-10 text-[9px] font-black uppercase tracking-[0.5em] text-white/20">Protocol QES 25.4 Locked</p>
        </div>
      </ScrollArea>
    </div>
  );
}