"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Phone, Mail, ChevronDown, Lock, Globe, UserCheck, ShieldCheck } from 'lucide-react';
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
import { cn, formatDisplayName } from '@/lib/utils';
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
        // Формируем уникальный идентификатор для телефона без спецсимволов
        finalEmail = `${cleanCountryCode}${cleanPhone}@nuxus.app`;
      }

      if (mode === 'login') {
        const userCred = await signInWithEmailAndPassword(auth, finalEmail, password);
        const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSlotName(activeAccountIndex, formatDisplayName(userData.name, userData.username));
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
            messageSize: 'medium',
            privacy: { phoneVisibility: 'everybody', lastSeenVisibility: 'everybody', allowGroupsFrom: 'everybody' }
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
      toast({ title: "Сбой входа", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lang) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_70%)]" />
        <NuxusLogo size={160} className="mb-20 animate-in fade-in zoom-in duration-1000" />
        
        <div className="space-y-6 w-full max-w-[360px] relative z-10">
          <h1 className="text-5xl font-black text-white text-center mb-16 tracking-tighter uppercase italic drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]">Язык Системы</h1>
          <button 
            onClick={() => setLang('ru')} 
            className="w-full h-24 bg-white/[0.03] border border-white/10 backdrop-blur-2xl hover:bg-white/10 rounded-[2.5rem] flex items-center justify-between px-10 transition-all active:scale-95 group shadow-2xl"
          >
            <span className="text-white font-black uppercase italic tracking-widest text-xl">Русский</span>
            <div className="bg-primary/20 px-5 py-2 rounded-xl text-primary text-[11px] font-black uppercase border border-primary/20">RU</div>
          </button>
          <button 
            onClick={() => setLang('en')} 
            className="w-full h-24 bg-white/[0.03] border border-white/10 backdrop-blur-2xl hover:bg-white/10 rounded-[2.5rem] flex items-center justify-between px-10 transition-all active:scale-95 group shadow-2xl"
          >
            <span className="text-white font-black uppercase italic tracking-widest text-xl">English</span>
            <div className="bg-primary/20 px-5 py-2 rounded-xl text-primary text-[11px] font-black uppercase border border-primary/20">EN</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#010103] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.1)_0%,transparent_70%)]" />
      
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-6 py-20">
          <div className="mb-14 cursor-pointer active:scale-90 transition-all" onClick={() => setLang(null)}>
            <NuxusLogo size={120} />
          </div>
          
          <Card className="w-full max-w-[480px] bg-white/[0.02] backdrop-blur-[60px] border-white/10 rounded-[3.5rem] p-2 sm:p-4 shadow-[0_50px_150px_rgba(0,0,0,0.9)] relative z-10 overflow-hidden">
            <CardHeader className="text-center pt-10 pb-8 space-y-12">
              <div className="inline-flex bg-black/60 p-2 rounded-[2rem] border border-white/5 mx-auto shadow-inner">
                <button 
                  onClick={() => setMode('login')} 
                  className={cn("px-14 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all", mode === 'login' ? "bg-white text-black shadow-2xl scale-105" : "text-white/20 hover:text-white/40")}
                >
                  Вход
                </button>
                <button 
                  onClick={() => setMode('register')} 
                  className={cn("px-14 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all", mode === 'register' ? "bg-white text-black shadow-2xl scale-105" : "text-white/20 hover:text-white/40")}
                >
                  Регистрация
                </button>
              </div>
              
              <div className="space-y-4">
                <CardTitle className="text-6xl font-black text-white tracking-tighter italic uppercase leading-none drop-shadow-2xl">
                  {mode === 'login' ? 'Вход' : 'Аккаунт'}
                </CardTitle>
                <CardDescription className="text-primary/60 font-black uppercase text-[11px] tracking-[0.5em] italic">{t.subtitle}</CardDescription>
              </div>

              <div className="flex gap-3 p-2 bg-black/40 rounded-[1.8rem] border border-white/5 shadow-inner w-full max-w-[400px] mx-auto">
                <button 
                  onClick={() => setAuthMethod('phone')} 
                  className={cn("flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all", authMethod === 'phone' ? "bg-white/10 text-white shadow-xl" : "text-white/20")}
                >
                  <Phone size={16} /> Телефон
                </button>
                <button 
                  onClick={() => setAuthMethod('email')} 
                  className={cn("flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all", authMethod === 'email' ? "bg-white/10 text-white shadow-xl" : "text-white/20")}
                >
                  <Mail size={16} /> Почта
                </button>
              </div>
            </CardHeader>

            <CardContent className="px-10 sm:px-14 pb-16">
              <form onSubmit={handleAuth} className="space-y-6">
                {mode === 'register' && (
                  <div className="space-y-6 animate-in slide-in-from-top-6 duration-700">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-primary/40 ml-4 tracking-widest">Ваше Имя</Label>
                       <Input 
                        placeholder="Иван Иванов" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="h-16 bg-white/[0.03] border-white/10 rounded-[1.5rem] font-black italic text-lg px-8 focus:border-primary/50 transition-all shadow-inner w-full placeholder:text-white/10 text-white" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-primary/40 ml-4 tracking-widest">Никнейм (@)</Label>
                      <div className="relative">
                        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-primary font-black text-xl italic">@</span>
                        <Input 
                          placeholder="username" 
                          value={username} 
                          onChange={e => setUsername(e.target.value)} 
                          className="h-16 bg-white/[0.03] border-white/10 rounded-[1.5rem] font-bold text-lg pl-16 focus:border-primary/50 transition-all shadow-inner w-full placeholder:text-white/10 text-white" 
                          required 
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {authMethod === 'phone' ? (
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-primary/40 ml-4 tracking-widest">Номер Телефона</Label>
                     <div className="flex gap-4 w-full">
                        <Popover open={isCountryPickerOpen} onOpenChange={setIsCountryPickerOpen}>
                           <PopoverTrigger asChild>
                             <button type="button" className="h-16 px-6 bg-white/[0.03] border border-white/10 rounded-[1.5rem] flex items-center gap-4 hover:bg-white/[0.08] transition-all shadow-inner min-w-[130px] justify-between group">
                                <div className="flex items-center gap-3">
                                   <span className="text-2xl shrink-0">{country.flag}</span>
                                   <span className="text-[13px] font-black text-white/80">{country.code}</span>
                                </div>
                                <ChevronDown size={16} className="text-white/20 group-hover:text-primary transition-colors shrink-0" />
                             </button>
                           </PopoverTrigger>
                           <PopoverContent className="w-72 bg-[#0a0a0c]/98 backdrop-blur-[40px] border-white/10 rounded-[2.5rem] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.9)] z-[1000] outline-none">
                              <ScrollArea className="h-80">
                                 <div className="p-2 space-y-2">
                                   {COUNTRIES.map((c, i) => (
                                     <button 
                                       key={i} 
                                       type="button"
                                       onClick={() => { setCountry(c); setIsCountryPickerOpen(false); }}
                                       className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all text-left group"
                                     >
                                        <div className="flex items-center gap-4">
                                           <span className="text-2xl">{c.flag}</span>
                                           <span className="text-[14px] font-black text-white/80 uppercase group-hover:text-white">{c.name}</span>
                                        </div>
                                        <span className="text-[12px] font-black text-primary italic">{c.code}</span>
                                     </button>
                                   ))}
                                 </div>
                              </ScrollArea>
                           </PopoverContent>
                        </Popover>
                        <Input 
                         placeholder="900 000-00-00" 
                         value={phoneNumber} 
                         onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))} 
                         className="h-16 flex-1 bg-white/[0.03] border-white/10 rounded-[1.5rem] font-black text-xl px-8 focus:border-primary/50 transition-all shadow-inner placeholder:text-white/10 text-white tracking-widest" 
                         required 
                       />
                     </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-primary/40 ml-4 tracking-widest">Электронная Почта</Label>
                    <Input 
                      type="email"
                      placeholder="example@mail.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="h-16 bg-white/[0.03] border-white/10 rounded-[1.5rem] font-bold text-lg px-8 focus:border-primary/50 transition-all shadow-inner w-full placeholder:text-white/10 text-white" 
                      required 
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary/40 ml-4 tracking-widest">Пароль Доступа</Label>
                  <div className="relative group">
                    <Input 
                      type={showPass ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="h-16 bg-white/[0.03] border-white/10 rounded-[1.5rem] font-black text-xl px-8 focus:border-primary/50 transition-all shadow-inner w-full placeholder:text-white/10 text-white tracking-[0.3em]" 
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPass(!showPass)} 
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-white/10 hover:text-primary transition-colors p-4 active:scale-90"
                    >
                      {showPass ? <EyeOff size={24} /> : <Eye size={24} />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full h-24 bg-primary hover:scale-[1.02] text-white font-black uppercase italic tracking-[0.3em] text-2xl rounded-[2.2rem] shadow-[0_20px_60px_rgba(var(--primary),0.4)] transition-all active:scale-95 mt-10 border border-white/20 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  {isLoading ? <Loader2 className="animate-spin w-10 h-10" /> : (mode === 'login' ? 'Войти' : 'Создать')}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="mt-20 flex flex-col items-center gap-6 opacity-20 group">
             <div className="flex items-center gap-3 bg-white/5 px-6 py-2 rounded-full border border-white/10">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <p className="text-[10px] font-black text-white uppercase tracking-[0.6em]">Quantum Shield Active</p>
             </div>
             <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.8em]">Build {versions.build} • Pulse {versions.latestVersion}</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
