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
 * AUTH SCREEN V52.0 «STABILITY & EXPANSION»
 * FIXED: Phone auth reliability and improved layout.
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
      
      let finalEmail = email.trim().toLowerCase();
      if (authMethod === 'phone') {
        const cleanPhoneInput = phoneNumber.replace(/\D/g, '');
        const cleanCountryCode = country.code.replace('+', '');
        
        // Ensure we don't double the country code if user typed it
        let cleanPhone = cleanPhoneInput;
        if (cleanPhone.startsWith(cleanCountryCode)) {
          cleanPhone = cleanPhone.substring(cleanCountryCode.length);
        }

        if (cleanPhone.length < 5) throw new Error("Введите корректный номер");
        finalEmail = `${cleanCountryCode}${cleanPhone}@nuxus.app`;
      }

      if (mode === 'login') {
        const userCred = await signInWithEmailAndPassword(auth, finalEmail, password);
        const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSlotName(activeAccountIndex, formatDisplayName(userData.name, userData.username));
        } else {
          setSlotName(activeAccountIndex, userCred.user.displayName || 'Account');
        }
        toast({ title: "Синхронизация завершена" });
      } else {
        const usernameWithAt = '@' + username.trim().replace('@', '').replace(/\s/g, '').toLowerCase();
        const userCred = await createUserWithEmailAndPassword(auth, finalEmail, password);
        await updateProfile(userCred.user, { displayName: name.trim() });
        
        const cleanPhoneInput = phoneNumber.replace(/\D/g, '');
        const cleanCountryCode = country.code.replace('+', '');
        let cleanPhone = cleanPhoneInput;
        if (cleanPhone.startsWith(cleanCountryCode)) {
          cleanPhone = cleanPhone.substring(cleanCountryCode.length);
        }

        const userData = {
          id: userCred.user.uid,
          name: name.trim(),
          username: usernameWithAt,
          usernameLowercase: usernameWithAt,
          phone: authMethod === 'phone' ? country.code + cleanPhone : '',
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
        toast({ title: "Узел активирован" });
      }
    } catch (e: any) {
      let msg = "Ошибка авторизации";
      if (e.code === 'auth/user-not-found') msg = "Узел не найден";
      if (e.code === 'auth/wrong-password') msg = "Неверный пароль";
      if (e.code === 'auth/email-already-in-use') msg = "ID уже занят";
      toast({ title: "Сбой", description: e.message || msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lang) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1)_0%,transparent_70%)]" />
        <NuxusLogo size={120} className="mb-12 animate-in fade-in zoom-in duration-1000" />
        
        <div className="space-y-4 w-full max-w-[320px] relative z-10">
          <h1 className="text-2xl font-black text-white text-center mb-8 tracking-tighter uppercase italic opacity-80">Выберите язык</h1>
          <button 
            onClick={() => setLang('ru')} 
            className="w-full h-18 obsidian-glass rounded-2xl flex items-center justify-between px-8 transition-all active:scale-95 group"
          >
            <span className="text-white font-black uppercase italic tracking-widest text-sm">Русский</span>
            <div className="bg-primary/20 px-3 py-1 rounded-lg text-primary text-[8px] font-black uppercase border border-primary/20">RU</div>
          </button>
          <button 
            onClick={() => setLang('en')} 
            className="w-full h-18 obsidian-glass rounded-2xl flex items-center justify-between px-8 transition-all active:scale-95 group"
          >
            <span className="text-white font-black uppercase italic tracking-widest text-sm">English</span>
            <div className="bg-primary/20 px-3 py-1 rounded-lg text-primary text-[8px] font-black uppercase border border-primary/20">EN</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#010103] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.1)_0%,transparent_70%)]" />
      
      <ScrollArea className="w-full h-full no-scrollbar">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-10">
          <div className="mb-8 cursor-pointer active:scale-90 transition-all" onClick={() => setLang(null)}>
            <NuxusLogo size={80} />
          </div>
          
          <Card className="w-full max-w-[420px] bg-white/[0.01] backdrop-blur-[100px] border-white/5 rounded-[2.5rem] p-1 shadow-2xl relative z-10 overflow-hidden">
            <CardHeader className="text-center pt-8 pb-4 space-y-6">
              <div className="inline-flex bg-black/60 p-1 rounded-2xl border border-white/5 mx-auto shadow-inner">
                <button 
                  onClick={() => setMode('login')} 
                  className={cn("px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", mode === 'login' ? "bg-white text-black shadow-xl" : "text-white/20 hover:text-white/40")}
                >
                  Вход
                </button>
                <button 
                  onClick={() => setMode('register')} 
                  className={cn("px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", mode === 'register' ? "bg-white text-black shadow-xl" : "text-white/20 hover:text-white/40")}
                >
                  Регистрация
                </button>
              </div>
              
              <div className="space-y-1">
                <CardTitle className="text-4xl font-black text-white tracking-tighter italic uppercase leading-none">
                  {mode === 'login' ? 'Привет' : 'Вход'}
                </CardTitle>
                <CardDescription className="text-primary/60 font-black uppercase text-[7px] tracking-[0.4em] italic">{t.subtitle}</CardDescription>
              </div>

              <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5 shadow-inner w-full max-w-[280px] mx-auto">
                <button 
                  onClick={() => setAuthMethod('phone')} 
                  className={cn("flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all", authMethod === 'phone' ? "bg-white/10 text-white" : "text-white/20")}
                >
                  <Phone size={10} /> Номер
                </button>
                <button 
                  onClick={() => setAuthMethod('email')} 
                  className={cn("flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all", authMethod === 'email' ? "bg-white/10 text-white" : "text-white/20")}
                >
                  <Mail size={10} /> Почта
                </button>
              </div>
            </CardHeader>

            <CardContent className="px-6 sm:px-10 pb-12">
              <form onSubmit={handleAuth} className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                    <div className="space-y-1.5 text-left">
                       <Label className="text-[8px] font-black uppercase text-primary/40 ml-4 tracking-widest">Ваше имя</Label>
                       <Input 
                        placeholder="Имя" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="h-12 bg-white/[0.02] border-white/5 rounded-xl font-bold italic text-sm px-5 focus:border-primary/40 transition-all text-white" 
                        required 
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <Label className="text-[8px] font-black uppercase text-primary/40 ml-4 tracking-widest">ID (@)</Label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-black text-sm italic opacity-40">@</span>
                        <Input 
                          placeholder="username" 
                          value={username} 
                          onChange={e => setUsername(e.target.value)} 
                          className="h-12 bg-white/[0.02] border-white/5 rounded-xl font-bold text-sm pl-10 focus:border-primary/40 transition-all text-white" 
                          required 
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {authMethod === 'phone' ? (
                  <div className="space-y-1.5 text-left">
                     <Label className="text-[8px] font-black uppercase text-primary/40 ml-4 tracking-widest">Номер телефона</Label>
                     <div className="flex gap-2">
                        <Popover open={isCountryPickerOpen} onOpenChange={setIsCountryPickerOpen}>
                           <PopoverTrigger asChild>
                             <button type="button" className="h-12 px-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-1.5 hover:bg-white/5 transition-all min-w-[70px] justify-between group shrink-0">
                                <span className="text-base">{country.flag}</span>
                                <span className="text-[10px] font-black text-white/80">{country.code}</span>
                                <ChevronDown size={10} className="text-white/20 group-hover:text-primary transition-colors" />
                             </button>
                           </PopoverTrigger>
                           <PopoverContent className="w-56 bg-black/95 backdrop-blur-[120px] border-white/10 rounded-2xl p-1 shadow-2xl z-[1000] outline-none">
                              <ScrollArea className="h-64 no-scrollbar">
                                 <div className="p-1 space-y-1">
                                   {COUNTRIES.map((c, i) => (
                                     <button 
                                       key={i} 
                                       type="button"
                                       onClick={() => { setCountry(c); setIsCountryPickerOpen(false); }}
                                       className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-all text-left"
                                     >
                                        <div className="flex items-center gap-2">
                                           <span className="text-base">{c.flag}</span>
                                           <span className="text-[9px] font-black text-white/80 uppercase">{c.name}</span>
                                        </div>
                                        <span className="text-[9px] font-black text-primary">{c.code}</span>
                                     </button>
                                   ))}
                                 </div>
                              </ScrollArea>
                           </PopoverContent>
                        </Popover>
                        <Input 
                         placeholder="000 000 00 00" 
                         value={phoneNumber} 
                         onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))} 
                         className="h-12 flex-1 bg-white/[0.02] border-white/5 rounded-xl font-bold text-sm px-5 focus:border-primary/40 transition-all text-white tracking-widest min-w-0" 
                         required 
                       />
                     </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[8px] font-black uppercase text-primary/40 ml-4 tracking-widest">Электронная почта</Label>
                    <Input 
                      type="email"
                      placeholder="mail@nuxus.chat" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="h-12 bg-white/[0.02] border-white/5 rounded-xl font-bold text-sm px-5 focus:border-primary/40 transition-all text-white" 
                      required 
                    />
                  </div>
                )}

                <div className="space-y-1.5 text-left">
                  <Label className="text-[8px] font-black uppercase text-primary/40 ml-4 tracking-widest">Пароль</Label>
                  <div className="relative">
                    <Input 
                      type={showPass ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="h-12 bg-white/[0.02] border-white/5 rounded-xl font-black text-base px-5 focus:border-primary/40 transition-all text-white tracking-[0.2em]" 
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPass(!showPass)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 hover:text-primary transition-colors p-2"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full h-14 bg-primary hover:scale-[1.02] text-white font-black uppercase italic tracking-[0.1em] text-base rounded-2xl shadow-xl transition-all active:scale-95 mt-4 border border-white/10 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : (mode === 'login' ? 'Войти' : 'Создать')}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="mt-8 flex flex-col items-center gap-3 opacity-20">
             <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <ShieldCheck className="w-3 h-3 text-primary" />
                <p className="text-[7px] font-black text-white uppercase tracking-[0.3em]">System Active</p>
             </div>
             <p className="text-[6px] font-black text-white/40 uppercase tracking-[0.6em]">Build {versions.build} • Pulse {versions.latestVersion}</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}