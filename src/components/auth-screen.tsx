
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle2, ChevronDown, Phone, Mail, Globe, Search } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase'; 
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { NuxusLogo } from './nuxus-logo';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { translations } from '@/lib/translations';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const COUNTRIES = [
  { name: 'Россия', code: '+7', flag: '🇷🇺' },
  { name: 'Казахстан', code: '+7', flag: '🇰🇿' },
  { name: 'Беларусь', code: '+375', flag: '🇧🇾' },
  { name: 'Узбекистан', code: '+998', flag: '🇺🇿' },
  { name: 'США', code: '+1', flag: '🇺🇸' },
  { name: 'Армения', code: '+374', flag: '🇦🇲' },
  { name: 'Украина', code: '+380', flag: '🇺🇦' },
  { name: 'Германия', code: '+49', flag: '🇩🇪' },
  { name: 'ОАЭ', code: '+971', flag: '🇦🇪' },
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
  
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);

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
        /**
         * КРИТИЧЕСКИЙ ФИКС: В Next.js 15 чтение из Firestore до логина запрещено.
         * Поэтому проверку почты делаем через обработку ошибки Auth.
         */
        await signInWithEmailAndPassword(auth, finalEmail, password);
        toast({ title: "Вы вошли в аккаунт" });
      } else {
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
      if (e.code === 'auth/invalid-email') msg = "Неверный формат почты";
      
      toast({ title: "Ошибка", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lang) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] px-6 relative overflow-hidden">
        <NuxusLogo size={100} className="mb-12 animate-in fade-in zoom-in duration-1000" />
        
        <div className="space-y-4 w-full max-w-sm relative z-10">
          <h1 className="text-3xl font-bold text-white text-center mb-10 tracking-tight">Выберите язык</h1>
          <button 
            onClick={() => setLang('ru')} 
            className="w-full h-16 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl flex items-center justify-between px-8 transition-all group shadow-xl active:scale-95"
          >
            <span className="text-white font-semibold text-lg">Русский</span>
            <div className="bg-blue-500/20 px-3 py-1 rounded-lg text-blue-400 text-xs font-black opacity-40 group-hover:opacity-100 transition-opacity uppercase">RU</div>
          </button>
          <button 
            onClick={() => setLang('en')} 
            className="w-full h-16 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl flex items-center justify-between px-8 transition-all group shadow-xl active:scale-95"
          >
            <span className="text-white font-semibold text-lg">English</span>
            <div className="bg-blue-500/20 px-3 py-1 rounded-lg text-blue-400 text-xs font-black opacity-40 group-hover:opacity-100 transition-opacity uppercase">EN</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#010103] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full" />
      
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-6 py-12">
          <div className="mb-10 cursor-pointer active:scale-95 transition-all" onClick={() => setLang(null)}>
            <NuxusLogo size={80} />
          </div>
          
          <Card className="w-full max-w-[440px] bg-white/[0.02] backdrop-blur-2xl border-white/10 rounded-[3rem] p-4 shadow-2xl relative z-10 overflow-hidden">
            <CardHeader className="text-center pt-8 pb-4 space-y-6">
              <div className="inline-flex bg-black/20 p-1 rounded-2xl border border-white/5 mx-auto shadow-inner">
                <button 
                  onClick={() => setMode('login')} 
                  className={cn("px-10 py-3 rounded-xl text-sm font-bold transition-all", mode === 'login' ? "bg-white text-black shadow-xl" : "text-white/30 hover:text-white/50")}
                >
                  {t.login}
                </button>
                <button 
                  onClick={() => setMode('register')} 
                  className={cn("px-10 py-3 rounded-xl text-sm font-bold transition-all", mode === 'register' ? "bg-white text-black shadow-xl" : "text-white/30 hover:text-white/50")}
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

              <div className="flex gap-2 p-1 bg-black/20 rounded-xl border border-white/5 shadow-inner">
                <button 
                  onClick={() => setAuthMethod('phone')} 
                  className={cn("flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all", authMethod === 'phone' ? "bg-white/5 text-white" : "text-white/20")}
                >
                  <Phone size={14} /> Телефон
                </button>
                <button 
                  onClick={() => setAuthMethod('email')} 
                  className={cn("flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all", authMethod === 'email' ? "bg-white/5 text-white" : "text-white/20")}
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
                      className="h-14 bg-white/[0.03] border-white/5 rounded-2xl font-medium text-lg px-6 focus:border-blue-500/40 transition-all shadow-inner" 
                      required 
                    />
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500 font-black text-lg">@</span>
                      <Input 
                        placeholder="username" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        className="h-14 bg-white/[0.03] border-white/5 rounded-2xl font-medium text-lg pl-12 focus:border-blue-500/40 transition-all shadow-inner" 
                        required 
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-5">
                  {authMethod === 'phone' ? (
                    <div className="flex gap-2">
                       <Popover open={isCountryPickerOpen} onOpenChange={setIsCountryPickerOpen}>
                          <PopoverTrigger asChild>
                            <button type="button" className="h-14 px-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-2 hover:bg-white/[0.08] transition-all shadow-inner shrink-0">
                               <span className="text-xl">{country.flag}</span>
                               <ChevronDown size={14} className="text-white/20" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 bg-[#121214] border-white/10 rounded-2xl p-2 shadow-2xl z-[1000]">
                             <ScrollArea className="h-64">
                                {COUNTRIES.map((c, i) => (
                                  <button 
                                    key={i} 
                                    type="button"
                                    onClick={() => { setCountry(c); setIsCountryPickerOpen(false); }}
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all text-left"
                                  >
                                     <div className="flex items-center gap-3">
                                        <span className="text-xl">{c.flag}</span>
                                        <span className="text-sm font-bold text-white/80">{c.name}</span>
                                     </div>
                                     <span className="text-[10px] font-black text-blue-500">{c.code}</span>
                                  </button>
                                ))}
                             </ScrollArea>
                          </PopoverContent>
                       </Popover>
                       <Input 
                        placeholder={t.enterPhone} 
                        value={phoneNumber} 
                        onChange={e => setPhoneNumber(e.target.value)} 
                        className="h-14 flex-1 bg-white/[0.03] border-white/5 rounded-2xl font-medium text-lg px-6 focus:border-blue-500/40 transition-all shadow-inner" 
                        required 
                      />
                    </div>
                  ) : (
                    <Input 
                      type="email"
                      placeholder={t.enterEmail} 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="h-14 bg-white/[0.03] border-white/5 rounded-2xl font-medium text-lg px-6 focus:border-blue-500/40 transition-all shadow-inner" 
                      required 
                    />
                  )}

                  <div className="relative">
                    <Input 
                      type={showPass ? "text" : "password"} 
                      placeholder={t.enterPass} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="h-14 bg-white/[0.03] border-white/5 rounded-2xl font-medium text-lg px-6 focus:border-blue-500/40 transition-all shadow-inner" 
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
                  className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-2xl shadow-2xl transition-all active:scale-95 mt-6 border border-white/10"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? t.login : t.register)}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="mt-12 flex flex-col items-center gap-4 opacity-30">
            <div className="flex items-center gap-3">
               <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Secure Connection</span>
            </div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">© 2025 Nuxus App Platform</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
