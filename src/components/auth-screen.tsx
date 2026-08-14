"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Phone, Mail, ChevronDown, ShieldCheck } from 'lucide-react';
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
import versions from '@/app/versions.json';

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

/**
 * AUTH SCREEN V61.0 «PERFECT FIT»
 * ОБНОВЛЕНИЕ: Исправлены отступы и размеры для 100% адаптивности.
 */
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
      
      let finalEmail = "";
      
      if (authMethod === 'email') {
        finalEmail = email.trim().toLowerCase();
        if (!finalEmail.includes('@')) throw new Error("Введите корректный Email");
      } else {
        const cleanPhoneInput = phoneNumber.replace(/\D/g, '');
        const cleanCountryCode = country.code.replace('+', '');
        let processedPhone = cleanPhoneInput;
        if (processedPhone.startsWith(cleanCountryCode)) {
          processedPhone = processedPhone.substring(cleanCountryCode.length);
        }
        if (processedPhone.length < 5) throw new Error("Номер слишком короткий");
        finalEmail = `${cleanCountryCode}${processedPhone}@nuxus.app`;
      }

      if (mode === 'login') {
        const userCred = await signInWithEmailAndPassword(auth, finalEmail, password);
        const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSlotName(activeAccountIndex, formatDisplayName(userData.name, userData.username));
        }
        toast({ title: "Синхронизация завершена" });
      } else {
        if (!name.trim()) throw new Error("Введите ваше имя");
        if (!username.trim()) throw new Error("Выберите @ID");
        const usernameWithAt = '@' + username.trim().replace('@', '').replace(/\s/g, '').toLowerCase();
        const userCred = await createUserWithEmailAndPassword(auth, finalEmail, password);
        await updateProfile(userCred.user, { displayName: name.trim() });
        const userData = {
          id: userCred.user.uid,
          name: name.trim(),
          username: usernameWithAt,
          usernameLowercase: usernameWithAt,
          phone: authMethod === 'phone' ? country.code + phoneNumber.replace(/\D/g, '').replace(country.code.replace('+', ''), '') : '',
          email: authMethod === 'email' ? email.trim() : null,
          createdAt: new Date().toISOString(),
          balance: 0,
          settings: { 
            language: lang || 'ru', appearance: 'dark', theme: 'default',
            fontFamily: 'jakarta', bubbleStyle: 'default', messageSize: 'medium',
            privacy: { phoneVisibility: 'everybody', lastSeenVisibility: 'everybody', allowGroupsFrom: 'everybody' }
          }
        };
        await setDoc(doc(db, 'users', userCred.user.uid), userData);
        setSlotName(activeAccountIndex, name.trim());
        toast({ title: "Узел активирован" });
      }
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lang) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1)_0%,transparent_70%)]" />
        <NuxusLogo size={100} className="mb-10" />
        <div className="space-y-4 w-full max-w-[300px] relative z-10">
          <h1 className="text-xl font-black text-white text-center mb-6 uppercase italic opacity-80">Выберите язык</h1>
          <button onClick={() => setLang('ru')} className="w-full h-16 obsidian-glass rounded-2xl flex items-center justify-between px-6 transition-all active:scale-95 group">
            <span className="text-white font-black uppercase italic tracking-widest text-xs">Русский</span>
            <div className="bg-primary/20 px-2 py-0.5 rounded-lg text-primary text-[8px] font-black uppercase">RU</div>
          </button>
          <button onClick={() => setLang('en')} className="w-full h-16 obsidian-glass rounded-2xl flex items-center justify-between px-6 transition-all active:scale-95 group">
            <span className="text-white font-black uppercase italic tracking-widest text-xs">English</span>
            <div className="bg-primary/20 px-2 py-0.5 rounded-lg text-primary text-[8px] font-black uppercase">EN</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#010103] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.1)_0%,transparent_70%)]" />
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-6 py-12">
          <div className="mb-6 cursor-pointer" onClick={() => setLang(null)}><NuxusLogo size={70} /></div>
          <Card className="w-full max-w-[380px] bg-white/[0.01] backdrop-blur-[100px] border-white/5 rounded-[2.2rem] p-1 shadow-2xl relative z-10">
            <CardHeader className="text-center pt-6 pb-2 space-y-5">
              <div className="inline-flex bg-black/60 p-1 rounded-xl border border-white/5 mx-auto">
                <button onClick={() => setMode('login')} className={cn("px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", mode === 'login' ? "bg-white text-black shadow-xl" : "text-white/20")}>Вход</button>
                <button onClick={() => setMode('register')} className={cn("px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", mode === 'register' ? "bg-white text-black shadow-xl" : "text-white/20")}>Регистрация</button>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-3xl font-black text-white tracking-tighter italic uppercase">{mode === 'login' ? 'Привет' : 'Вход'}</CardTitle>
                <CardDescription className="text-primary/60 font-black uppercase text-[7px] tracking-[0.4em] italic">{t.subtitle}</CardDescription>
              </div>
              <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5 w-[240px] mx-auto">
                <button onClick={() => setAuthMethod('phone')} className={cn("flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5", authMethod === 'phone' ? "bg-white/10 text-white" : "text-white/20")}><Phone size={9} /> Номер</button>
                <button onClick={() => setAuthMethod('email')} className={cn("flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5", authMethod === 'email' ? "bg-white/10 text-white" : "text-white/20")}><Mail size={9} /> Почта</button>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-8">
              <form onSubmit={handleAuth} className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                       <Label className="text-[8px] font-black uppercase text-primary/40 ml-2">Ваше имя</Label>
                       <Input placeholder="Имя" value={name} onChange={e => setName(e.target.value)} className="h-11 bg-white/[0.02] border-white/5 rounded-xl font-bold text-sm px-4 focus:border-primary/40" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase text-primary/40 ml-2">ID (@)</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-sm opacity-40">@</span>
                        <Input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} className="h-11 bg-white/[0.02] border-white/5 rounded-xl font-bold text-sm pl-8" />
                      </div>
                    </div>
                  </div>
                )}
                {authMethod === 'phone' ? (
                  <div className="space-y-1">
                     <Label className="text-[8px] font-black uppercase text-primary/40 ml-2">Номер телефона</Label>
                     <div className="flex gap-2">
                        <Popover open={isCountryPickerOpen} onOpenChange={setIsCountryPickerOpen}>
                           <PopoverTrigger asChild>
                             <button type="button" className="h-11 px-2.5 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-1.5 min-w-[65px] justify-between">
                                <span className="text-sm">{country.flag}</span>
                                <span className="text-[9px] font-black text-white/80">{country.code}</span>
                                <ChevronDown size={8} className="text-white/20" />
                             </button>
                           </PopoverTrigger>
                           <PopoverContent className="w-52 bg-black border-white/10 rounded-xl p-1 shadow-2xl z-[1000]">
                              <ScrollArea className="h-56 no-scrollbar">
                                 {COUNTRIES.map((c, i) => (
                                   <button key={i} type="button" onClick={() => { setCountry(c); setIsCountryPickerOpen(false); }} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all">
                                      <div className="flex items-center gap-2">
                                         <span className="text-sm">{c.flag}</span>
                                         <span className="text-[8px] font-black text-white/80 uppercase">{c.name}</span>
                                      </div>
                                      <span className="text-[8px] font-black text-primary">{c.code}</span>
                                   </button>
                                 ))}
                              </ScrollArea>
                           </PopoverContent>
                        </Popover>
                        <Input placeholder="000 000 00 00" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="h-11 flex-1 bg-white/[0.02] border-white/5 rounded-xl font-bold text-sm px-4 focus:border-primary/40 tracking-wider" />
                     </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-[8px] font-black uppercase text-primary/40 ml-2">Электронная почта</Label>
                    <Input type="email" placeholder="mail@nuxus.chat" value={email} onChange={e => setEmail(e.target.value)} className="h-11 bg-white/[0.02] border-white/5 rounded-xl font-bold text-sm px-4" />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-[8px] font-black uppercase text-primary/40 ml-2">Пароль</Label>
                  <div className="relative">
                    <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="h-11 bg-white/[0.02] border-white/5 rounded-xl font-black text-base px-4 tracking-[0.2em]" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/10 hover:text-primary transition-colors p-1.5">{showPass ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-12 bg-primary text-white font-black uppercase italic tracking-widest text-sm rounded-xl shadow-xl mt-4 active:scale-95 transition-all">
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (mode === 'login' ? 'Войти' : 'Создать')}
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="mt-8 flex flex-col items-center gap-2 opacity-20">
             <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                <ShieldCheck className="w-2.5 h-2.5 text-primary" />
                <p className="text-[6px] font-black text-white uppercase tracking-[0.3em]">System Active</p>
             </div>
             <p className="text-[5px] font-black text-white/40 uppercase tracking-[0.6em]">Build {versions.build}</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
