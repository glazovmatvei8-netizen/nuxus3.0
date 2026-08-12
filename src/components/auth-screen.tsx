
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Phone, Mail, ChevronDown, Lock } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase'; 
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { NuxusLogo } from './nuxus-logo';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { translations } from '@/lib/translations';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppState } from '@/lib/store';

const COUNTRIES = [
  { name: 'Россия', code: '+7', flag: '🇷🇺' },
  { name: 'Казахстан', code: '+7', flag: '🇰🇿' },
  { name: 'Беларусь', code: '+375', flag: '🇧🇾' },
  { name: 'Узбекистан', code: '+998', flag: '🇺🇿' },
  { name: 'Киргизия', code: '+996', flag: '🇰🇬' },
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
  const { activeAccountIndex, setSlotName } = useAppState();
  
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
      
      let finalEmail = email.trim().toLowerCase();
      if (authMethod === 'phone') {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length < 5) throw new Error("Введите корректный номер");
        const cleanCountryCode = country.code.replace('+', '');
        // Единый стандарт формирования email для телефонов: код_номер@nuxus.app
        finalEmail = `${cleanCountryCode}${cleanPhone}@nuxus.app`;
      }

      if (mode === 'login') {
        const userCred = await signInWithEmailAndPassword(auth, finalEmail, password);
        const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
        if (userDoc.exists()) {
          setSlotName(activeAccountIndex, userDoc.data().name || 'Аккаунт');
        } else {
          setSlotName(activeAccountIndex, userCred.user.displayName || 'Аккаунт');
        }
        toast({ title: "Синхронизация успешна" });
      } else {
        const usernameWithAt = '@' + username.trim().replace('@', '').replace(/\s/g, '').toLowerCase();
        const userCred = await createUserWithEmailAndPassword(auth, finalEmail, password);
        await updateProfile(userCred.user, { displayName: name.trim() });
        
        const userData = {
          id: userCred.user.uid,
          name: name.trim(),
          username: usernameWithAt,
          usernameLowercase: usernameWithAt,
          phone: authMethod === 'phone' ? country.code + phoneNumber.replace(/\D/g, '') : '',
          email: authMethod === 'email' ? email.trim() : null,
          createdAt: new Date().toISOString(),
          balance: 0,
          settings: { 
            language: lang || 'ru', 
            appearance: 'dark', 
            theme: 'default',
            fontFamily: 'jakarta',
            bubbleStyle: 'default',
            messageSize: 'medium'
          }
        };

        await setDoc(doc(db, 'users', userCred.user.uid), userData);
        setSlotName(activeAccountIndex, name.trim());
        toast({ title: "Аккаунт создан" });
      }
    } catch (e: any) {
      console.error("Auth Error:", e);
      let msg = "Ошибка авторизации";
      if (e.code === 'auth/user-not-found') msg = "Аккаунт не найден";
      if (e.code === 'auth/wrong-password') msg = "Неверный пароль";
      if (e.code === 'auth/email-already-in-use') msg = "Этот адрес или номер уже занят";
      toast({ title: "Сигнал прерван", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lang) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.08)_0%,transparent_70%)]" />
        <NuxusLogo size={140} className="mb-16 animate-in fade-in zoom-in duration-1000" />
        
        <div className="space-y-4 w-full max-w-[340px] relative z-10">
          <h1 className="text-4xl font-black text-white text-center mb-12 tracking-tight uppercase italic drop-shadow-2xl">Язык Системы</h1>
          <button 
            onClick={() => setLang('ru')} 
            className="w-full h-20 bg-white/[0.02] border border-white/5 backdrop-blur-xl hover:bg-white/10 rounded-[2rem] flex items-center justify-between px-10 transition-all active:scale-95 group shadow-2xl"
          >
            <span className="text-white font-black uppercase italic tracking-widest text-lg">Русский</span>
            <div className="bg-primary/20 px-4 py-1.5 rounded-xl text-primary text-[10px] font-black uppercase">RU</div>
          </button>
          <button 
            onClick={() => setLang('en')} 
            className="w-full h-20 bg-white/[0.02] border border-white/5 backdrop-blur-xl hover:bg-white/10 rounded-[2rem] flex items-center justify-between px-10 transition-all active:scale-95 group shadow-2xl"
          >
            <span className="text-white font-black uppercase italic tracking-widest text-lg">English</span>
            <div className="bg-primary/20 px-4 py-1.5 rounded-xl text-primary text-[10px] font-black uppercase">EN</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#010103] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.08)_0%,transparent_70%)]" />
      
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-6 py-20">
          <div className="mb-12 cursor-pointer active:scale-90 transition-all" onClick={() => setLang(null)}>
            <NuxusLogo size={100} />
          </div>
          
          <Card className="w-full max-w-[460px] bg-white/[0.01] backdrop-blur-3xl border-white/10 rounded-[3.5rem] p-2 sm:p-4 shadow-[0_40px_120px_rgba(0,0,0,0.8)] relative z-10 overflow-hidden">
            <CardHeader className="text-center pt-10 pb-6 space-y-10">
              <div className="inline-flex bg-black/40 p-1.5 rounded-[1.8rem] border border-white/5 mx-auto shadow-inner">
                <button 
                  onClick={() => setMode('login')} 
                  className={cn("px-12 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all", mode === 'login' ? "bg-white text-black shadow-2xl" : "text-white/20 hover:text-white/40")}
                >
                  Вход
                </button>
                <button 
                  onClick={() => setMode('register')} 
                  className={cn("px-12 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all", mode === 'register' ? "bg-white text-black shadow-2xl" : "text-white/20 hover:text-white/40")}
                >
                  Регистрация
                </button>
              </div>
              
              <div className="space-y-3">
                <CardTitle className="text-5xl font-black text-white tracking-tighter italic uppercase leading-none">
                  {mode === 'login' ? 'Вход' : 'Аккаунт'}
                </CardTitle>
                <CardDescription className="text-white/20 font-bold uppercase text-[11px] tracking-[0.4em]">{t.subtitle}</CardDescription>
              </div>

              <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5 shadow-inner w-full max-w-[360px] mx-auto">
                <button 
                  onClick={() => setAuthMethod('phone')} 
                  className={cn("flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all", authMethod === 'phone' ? "bg-white/5 text-white" : "text-white/20")}
                >
                  <Phone size={15} /> Телефон
                </button>
                <button 
                  onClick={() => setAuthMethod('email')} 
                  className={cn("flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all", authMethod === 'email' ? "bg-white/5 text-white" : "text-white/20")}
                >
                  <Mail size={15} /> Почта
                </button>
              </div>
            </CardHeader>

            <CardContent className="px-8 sm:px-12 pb-14">
              <form onSubmit={handleAuth} className="space-y-6">
                {mode === 'register' && (
                  <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="relative">
                       <Input 
                        placeholder="Ваше имя" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="h-16 bg-white/[0.03] border-white/5 rounded-2xl font-bold text-lg px-8 focus:border-primary/40 transition-all shadow-inner w-full placeholder:text-white/10" 
                        required 
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-8 top-1/2 -translate-y-1/2 text-primary font-black text-xl">@</span>
                      <Input 
                        placeholder="id_пользователя" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        className="h-16 bg-white/[0.03] border-white/5 rounded-2xl font-bold text-lg pl-14 focus:border-primary/40 transition-all shadow-inner w-full placeholder:text-white/10" 
                        required 
                      />
                    </div>
                  </div>
                )}
                
                {authMethod === 'phone' ? (
                  <div className="flex gap-4 w-full">
                     <Popover open={isCountryPickerOpen} onOpenChange={setIsCountryPickerOpen}>
                        <PopoverTrigger asChild>
                          <button type="button" className="h-16 px-5 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-3 hover:bg-white/[0.08] transition-all shadow-inner min-w-[110px] justify-between group">
                             <div className="flex items-center gap-2">
                                <span className="text-2xl shrink-0">{country.flag}</span>
                                <span className="text-[12px] font-black text-white/80">{country.code}</span>
                             </div>
                             <ChevronDown size={14} className="text-white/20 group-hover:text-primary transition-colors shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 bg-[#0a0a0c]/98 backdrop-blur-2xl border-white/10 rounded-[2.5rem] p-2 shadow-2xl z-[1000]">
                           <ScrollArea className="h-72">
                              <div className="p-2 space-y-1.5">
                                {COUNTRIES.map((c, i) => (
                                  <button 
                                    key={i} 
                                    type="button"
                                    onClick={() => { setCountry(c); setIsCountryPickerOpen(false); }}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all text-left"
                                  >
                                     <div className="flex items-center gap-4">
                                        <span className="text-2xl">{c.flag}</span>
                                        <span className="text-[13px] font-black text-white/80">{c.name}</span>
                                     </div>
                                     <span className="text-[11px] font-black text-primary">{c.code}</span>
                                  </button>
                                ))}
                              </div>
                           </ScrollArea>
                        </PopoverContent>
                     </Popover>
                     <Input 
                      placeholder="Номер телефона" 
                      value={phoneNumber} 
                      onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))} 
                      className="h-16 flex-1 bg-white/[0.03] border-white/5 rounded-2xl font-bold text-lg px-8 focus:border-primary/40 transition-all shadow-inner placeholder:text-white/10 text-white" 
                      required 
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <Input 
                      type="email"
                      placeholder="example@nuxus.app" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="h-16 bg-white/[0.03] border-white/5 rounded-2xl font-bold text-lg px-8 focus:border-primary/40 transition-all shadow-inner w-full placeholder:text-white/10" 
                      required 
                    />
                  </div>
                )}

                <div className="relative w-full group">
                  <Input 
                    type={showPass ? "text" : "password"} 
                    placeholder="Пароль доступа" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="h-16 bg-white/[0.03] border-white/5 rounded-2xl font-bold text-lg px-8 focus:border-primary/40 transition-all shadow-inner w-full placeholder:text-white/10" 
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPass(!showPass)} 
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-white/10 hover:text-white transition-colors p-3"
                  >
                    {showPass ? <EyeOff size={24} /> : <Eye size={24} />}
                  </button>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full h-20 bg-primary hover:scale-[1.02] text-white font-black uppercase italic tracking-[0.2em] text-xl rounded-[2rem] shadow-2xl shadow-primary/20 transition-all active:scale-95 mt-6 border border-white/10"
                >
                  {isLoading ? <Loader2 className="animate-spin w-8 h-8" /> : (mode === 'login' ? 'Войти' : 'Создать')}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="mt-16 flex flex-col items-center gap-6 opacity-30">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em]">© 2025 Nuxus platforms • V{versions.latestVersion}</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
