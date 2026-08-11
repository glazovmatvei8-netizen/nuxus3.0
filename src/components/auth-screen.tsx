
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle2, ChevronDown, Phone, Mail, Globe } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase'; 
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { NuxusLogo } from './nuxus-logo';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { translations } from '@/lib/translations';

const COUNTRIES = [
  { name: 'Россия', code: '+7', flag: '🇷🇺' },
  { name: 'Казахстан', code: '+7', flag: '🇰🇿' },
  { name: 'Беларусь', code: '+375', flag: '🇧🇾' },
  { name: 'Узбекистан', code: '+998', flag: '🇺🇿' },
  { name: 'США', code: '+1', flag: '🇺🇸' },
  { name: 'Армения', code: '+374', flag: '🇦🇲' },
];

export default function AuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [lang, setLang] = useState<'ru' | 'en' | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Form State
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
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
      
      let finalEmail = email.trim();
      if (authMethod === 'phone') {
        finalEmail = `${country.code}${phoneNumber.replace(/\D/g, '')}@nuxus.app`;
      }

      if (mode === 'login') {
        // Стандартный вход по почте
        await signInWithEmailAndPassword(auth, finalEmail, password);
        toast({ title: "Вы вошли в аккаунт" });
      } else {
        // Регистрация
        const usernameWithAt = '@' + username.trim().replace('@', '');
        const userCred = await createUserWithEmailAndPassword(auth, finalEmail, password);
        
        await setDoc(doc(db, 'users', userCred.user.uid), {
          id: userCred.user.uid,
          name: name.trim(),
          username: usernameWithAt,
          usernameLowercase: usernameWithAt.toLowerCase(),
          phone: authMethod === 'phone' ? country.code + phoneNumber.replace(/\D/g, '') : '',
          email: authMethod === 'email' ? email.trim() : null,
          createdAt: new Date().toISOString(),
          balance: 0,
          settings: { language: lang || 'ru', appearance: 'dark', theme: 'default' }
        });
        
        toast({ title: "Аккаунт успешно создан" });
      }
    } catch (e: any) {
      console.error(e);
      let msg = "Ошибка авторизации";
      if (e.code === 'auth/user-not-found') msg = "Аккаунт не найден";
      if (e.code === 'auth/wrong-password') msg = "Неверный пароль";
      if (e.code === 'auth/email-already-in-use') msg = "Этот адрес уже занят";
      
      toast({ title: "Ошибка", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lang) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#0a0a0c] px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05)_0%,transparent_70%)]" />
        <NuxusLogo size={100} className="mb-12" />
        
        <div className="space-y-4 w-full max-w-sm relative z-10">
          <h1 className="text-3xl font-bold text-white text-center mb-8 tracking-tight">Выберите язык</h1>
          <button 
            onClick={() => setLang('ru')} 
            className="w-full h-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between px-6 transition-all group"
          >
            <span className="text-white font-semibold text-lg">Русский</span>
            <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">RU</div>
          </button>
          <button 
            onClick={() => setLang('en')} 
            className="w-full h-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between px-6 transition-all group"
          >
            <span className="text-white font-semibold text-lg">English</span>
            <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">EN</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#0a0a0c] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full" />
      
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-6 py-12">
          <div className="mb-8 cursor-pointer active:scale-95 transition-all" onClick={() => setLang(null)}>
            <NuxusLogo size={80} />
          </div>
          
          <Card className="w-full max-w-[440px] bg-white/[0.02] backdrop-blur-2xl border-white/10 rounded-[2.5rem] p-4 shadow-2xl relative z-10 overflow-hidden">
            <CardHeader className="text-center pt-8 pb-4 space-y-6">
              <div className="inline-flex bg-white/5 p-1 rounded-2xl border border-white/5 mx-auto">
                <button 
                  onClick={() => setMode('login')} 
                  className={cn("px-10 py-3 rounded-xl text-sm font-bold transition-all", mode === 'login' ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white/60")}
                >
                  {t.login}
                </button>
                <button 
                  onClick={() => setMode('register')} 
                  className={cn("px-10 py-3 rounded-xl text-sm font-bold transition-all", mode === 'register' ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white/60")}
                >
                  {t.register}
                </button>
              </div>
              
              <div className="space-y-2">
                <CardTitle className="text-4xl font-bold text-white tracking-tight leading-tight">
                  {mode === 'login' ? t.login : t.register}
                </CardTitle>
                <CardDescription className="text-white/40 font-medium text-lg">{t.subtitle}</CardDescription>
              </div>

              <div className="flex gap-2 p-1 bg-black/20 rounded-xl border border-white/5">
                <button 
                  onClick={() => setAuthMethod('phone')} 
                  className={cn("flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all", authMethod === 'phone' ? "bg-white/10 text-white" : "text-white/30")}
                >
                  <Phone size={14} /> Телефон
                </button>
                <button 
                  onClick={() => setAuthMethod('email')} 
                  className={cn("flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all", authMethod === 'email' ? "bg-white/10 text-white" : "text-white/30")}
                >
                  <Mail size={14} /> Почта
                </button>
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-10">
              <form onSubmit={handleAuth} className="space-y-5">
                {mode === 'register' && (
                  <div className="grid grid-cols-1 gap-4">
                    <Input 
                      placeholder={t.name} 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      className="h-14 bg-white/5 border-white/5 rounded-2xl font-medium text-lg px-6 focus:border-blue-500/50" 
                      required 
                    />
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500 font-bold text-lg">@</span>
                      <Input 
                        placeholder="username" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        className="h-14 bg-white/5 border-white/5 rounded-2xl font-medium text-lg pl-12 focus:border-blue-500/50" 
                        required 
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-5">
                  {authMethod === 'phone' ? (
                    <div className="flex gap-2">
                       <div className="relative group">
                          <button type="button" className="h-14 px-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all">
                             <span className="text-xl">{country.flag}</span>
                             <ChevronDown size={14} className="text-white/20" />
                          </button>
                       </div>
                       <Input 
                        placeholder={t.enterPhone} 
                        value={phoneNumber} 
                        onChange={e => setPhoneNumber(e.target.value)} 
                        className="h-14 flex-1 bg-white/5 border-white/5 rounded-2xl font-medium text-lg px-6 focus:border-blue-500/50" 
                        required 
                      />
                    </div>
                  ) : (
                    <Input 
                      type="email"
                      placeholder={t.enterEmail} 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="h-14 bg-white/5 border-white/5 rounded-2xl font-medium text-lg px-6 focus:border-blue-500/50" 
                      required 
                    />
                  )}

                  <div className="relative">
                    <Input 
                      type={showPass ? "text" : "password"} 
                      placeholder={t.enterPass} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="h-14 bg-white/5 border-white/5 rounded-2xl font-medium text-lg px-6 focus:border-blue-500/50" 
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPass(!showPass)} 
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                    >
                      {showPass ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-2xl shadow-xl shadow-blue-500/10 transition-all active:scale-95 mt-6"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? t.login : t.register)}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="mt-12 flex flex-col items-center gap-4 opacity-30">
            <div className="flex items-center gap-2">
               <CheckCircle2 className="w-5 h-5 text-blue-500" />
               <span className="text-xs font-bold uppercase tracking-widest text-white">Nuxus Secure Standard</span>
            </div>
            <p className="text-[10px] font-medium text-white/60">© 2025 Nuxus App platform</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
