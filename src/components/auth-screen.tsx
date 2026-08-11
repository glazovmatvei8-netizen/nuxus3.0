
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle2, Globe, ArrowRight } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase/provider'; 
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { NuxusLogo } from './nuxus-logo';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { translations } from '@/lib/translations';

export default function AuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [lang, setLang] = useState<'ru' | 'en' | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [identifier, setIdentifier] = useState(''); 
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
          settings: { language: lang || 'ru', appearance: 'dark', theme: 'default' }
        });
        toast({ title: "Аккаунт создан" });
      } else {
        await signInWithEmailAndPassword(auth, finalEmail, password);
        toast({ title: "Вход выполнен" });
      }
    } catch (e: any) {
      toast({ title: "Ошибка", description: "Проверьте данные для входа", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lang) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.05)_0%,transparent_70%)]" />
        <NuxusLogo size={120} className="mb-12" />
        
        <div className="space-y-4 w-full max-w-sm relative z-10">
          <h1 className="text-2xl font-bold text-white text-center mb-8 tracking-tight">Выберите язык / Select Language</h1>
          <button 
            onClick={() => setLang('ru')} 
            className="w-full h-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between px-6 transition-all group"
          >
            <span className="text-white font-semibold">Русский язык</span>
            <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </button>
          <button 
            onClick={() => setLang('en')} 
            className="w-full h-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between px-6 transition-all group"
          >
            <span className="text-white font-semibold">English Language</span>
            <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#010103] relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-6 py-12">
          <div className="mb-8 cursor-pointer active:scale-95 transition-all" onClick={() => setLang(null)}>
            <NuxusLogo size={80} />
          </div>
          
          <Card className="w-full max-w-[420px] bg-white/[0.03] backdrop-blur-2xl border-white/10 rounded-[2.5rem] p-4 shadow-2xl relative z-10 overflow-hidden">
            <CardHeader className="text-center pt-8 pb-4">
              <div className="inline-flex bg-white/5 p-1 rounded-xl mb-8 border border-white/5 mx-auto">
                <button 
                  onClick={() => setMode('login')} 
                  className={cn("px-8 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all", mode === 'login' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60")}
                >
                  {t.login}
                </button>
                <button 
                  onClick={() => setMode('register')} 
                  className={cn("px-8 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all", mode === 'register' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60")}
                >
                  {t.register}
                </button>
              </div>
              <CardTitle className="text-3xl font-bold text-white tracking-tight">
                {mode === 'login' ? t.login : t.register}
              </CardTitle>
              <CardDescription className="text-white/40 mt-2 font-medium">{t.subtitle}</CardDescription>
            </CardHeader>

            <CardContent className="px-6 pb-8">
              <form onSubmit={handleAuth} className="space-y-4">
                {mode === 'register' && (
                  <>
                    <div className="space-y-1">
                      <Input 
                        placeholder={t.name} 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="h-14 bg-white/5 border-white/5 rounded-2xl font-medium focus:border-primary/40 focus:ring-0" 
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <Input 
                        placeholder={t.username} 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        className="h-14 bg-white/5 border-white/5 rounded-2xl font-medium focus:border-primary/40 focus:ring-0" 
                        required 
                      />
                    </div>
                  </>
                )}
                
                <div className="space-y-1">
                  <Input 
                    placeholder={t.enterEmail} 
                    value={identifier} 
                    onChange={e => setIdentifier(e.target.value)} 
                    className="h-14 bg-white/5 border-white/5 rounded-2xl font-medium focus:border-primary/40 focus:ring-0" 
                    required 
                  />
                </div>

                <div className="relative">
                  <Input 
                    type={showPass ? "text" : "password"} 
                    placeholder={t.enterPass} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="h-14 bg-white/5 border-white/5 rounded-2xl font-medium focus:border-primary/40 focus:ring-0" 
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPass(!showPass)} 
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                  >
                    {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 mt-6"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? t.login : t.register)}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="mt-8 flex items-center gap-2 opacity-20">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">Nuxus Secure Auth</span>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
