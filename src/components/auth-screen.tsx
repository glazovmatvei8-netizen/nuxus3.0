
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
 * AUTH SCREEN V49.0 «AUTO-RESPONSE UI»
 * Исправлена адаптивность полей ввода. Теперь всё помещается на экран.
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
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length < 5) throw new Error("Введите корректный номер");
        const cleanCountryCode = country.code.replace('+', '');
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
        toast({ title: "Sync completed" });
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
        toast({ title: "Account activated" });
      }
    } catch (e: any) {
      let msg = "Auth error";
      if (e.code === 'auth/user-not-found') msg = "User not found";
      if (e.code === 'auth/wrong-password') msg = "Wrong password";
      if (e.code === 'auth/email-already-in-use') msg = "Email already in use";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lang) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1)_0%,transparent_70%)]" />
        <NuxusLogo size={140} className="mb-16 animate-in fade-in zoom-in duration-1000" />
        
        <div className="space-y-4 w-full max-w-[340px] relative z-10">
          <h1 className="text-3xl font-black text-white text-center mb-10 tracking-tighter uppercase italic opacity-80">Select Language</h1>
          <button 
            onClick={() => setLang('ru')} 
            className="w-full h-20 obsidian-glass rounded-[2rem] flex items-center justify-between px-8 transition-all active:scale-95 group"
          >
            <span className="text-white font-black uppercase italic tracking-widest text-base">Русский</span>
            <div className="bg-primary/20 px-4 py-1.5 rounded-xl text-primary text-[9px] font-black uppercase border border-primary/20">RU</div>
          </button>
          <button 
            onClick={() => setLang('en')} 
            className="w-full h-20 obsidian-glass rounded-[2rem] flex items-center justify-between px-8 transition-all active:scale-95 group"
          >
            <span className="text-white font-black uppercase italic tracking-widest text-base">English</span>
            <div className="bg-primary/20 px-4 py-1.5 rounded-xl text-primary text-[9px] font-black uppercase border border-primary/20">EN</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#010103] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.1)_0%,transparent_70%)]" />
      
      <ScrollArea className="w-full h-full no-scrollbar">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-12">
          <div className="mb-12 cursor-pointer active:scale-90 transition-all" onClick={() => setLang(null)}>
            <NuxusLogo size={100} />
          </div>
          
          <Card className="w-full max-w-[480px] bg-white/[0.01] backdrop-blur-[100px] border-white/5 rounded-[3rem] p-1 shadow-[0_40px_120px_rgba(0,0,0,0.9)] relative z-10 overflow-hidden">
            <CardHeader className="text-center pt-10 pb-6 space-y-8">
              <div className="inline-flex bg-black/60 p-1 rounded-[2rem] border border-white/5 mx-auto shadow-inner">
                <button 
                  onClick={() => setMode('login')} 
                  className={cn("px-8 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all", mode === 'login' ? "bg-white text-black shadow-xl" : "text-white/20 hover:text-white/40")}
                >
                  Login
                </button>
                <button 
                  onClick={() => setMode('register')} 
                  className={cn("px-8 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all", mode === 'register' ? "bg-white text-black shadow-xl" : "text-white/20 hover:text-white/40")}
                >
                  Register
                </button>
              </div>
              
              <div className="space-y-2">
                <CardTitle className="text-5xl font-black text-white tracking-tighter italic uppercase leading-none">
                  {mode === 'login' ? 'Welcome' : 'Join'}
                </CardTitle>
                <CardDescription className="text-primary/60 font-black uppercase text-[8px] tracking-[0.5em] italic">{t.subtitle}</CardDescription>
              </div>

              <div className="flex gap-2 p-1 bg-black/40 rounded-[2rem] border border-white/5 shadow-inner w-full max-w-[320px] mx-auto">
                <button 
                  onClick={() => setAuthMethod('phone')} 
                  className={cn("flex-1 py-3 rounded-2xl text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all", authMethod === 'phone' ? "bg-white/10 text-white" : "text-white/20")}
                >
                  <Phone size={12} /> Phone
                </button>
                <button 
                  onClick={() => setAuthMethod('email')} 
                  className={cn("flex-1 py-3 rounded-2xl text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all", authMethod === 'email' ? "bg-white/10 text-white" : "text-white/20")}
                >
                  <Mail size={12} /> Email
                </button>
              </div>
            </CardHeader>

            <CardContent className="px-6 sm:px-12 pb-16">
              <form onSubmit={handleAuth} className="space-y-6">
                {mode === 'register' && (
                  <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="space-y-2 text-left">
                       <Label className="text-[9px] font-black uppercase text-primary/40 ml-4 tracking-widest">Your Name</Label>
                       <Input 
                        placeholder="Name" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="h-14 bg-white/[0.02] border-white/5 rounded-[1.5rem] font-black italic text-base px-6 focus:border-primary/40 transition-all text-white" 
                        required 
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label className="text-[9px] font-black uppercase text-primary/40 ml-4 tracking-widest">Username (@)</Label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-black text-lg italic opacity-40">@</span>
                        <Input 
                          placeholder="username" 
                          value={username} 
                          onChange={e => setUsername(e.target.value)} 
                          className="h-14 bg-white/[0.02] border-white/5 rounded-[1.5rem] font-bold text-base pl-12 focus:border-primary/40 transition-all text-white" 
                          required 
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {authMethod === 'phone' ? (
                  <div className="space-y-2 text-left">
                     <Label className="text-[9px] font-black uppercase text-primary/40 ml-4 tracking-widest">Phone Number</Label>
                     <div className="flex gap-3">
                        <Popover open={isCountryPickerOpen} onOpenChange={setIsCountryPickerOpen}>
                           <PopoverTrigger asChild>
                             <button type="button" className="h-14 px-4 bg-white/[0.02] border border-white/5 rounded-[1.5rem] flex items-center gap-2 hover:bg-white/5 transition-all min-w-[90px] justify-between group shrink-0">
                                <span className="text-lg">{country.flag}</span>
                                <span className="text-[12px] font-black text-white/80">{country.code}</span>
                                <ChevronDown size={12} className="text-white/20 group-hover:text-primary transition-colors" />
                             </button>
                           </PopoverTrigger>
                           <PopoverContent className="w-64 bg-black/95 backdrop-blur-[120px] border-white/10 rounded-[2.5rem] p-2 shadow-2xl z-[1000] outline-none">
                              <ScrollArea className="h-72 no-scrollbar">
                                 <div className="p-1 space-y-1">
                                   {COUNTRIES.map((c, i) => (
                                     <button 
                                       key={i} 
                                       type="button"
                                       onClick={() => { setCountry(c); setIsCountryPickerOpen(false); }}
                                       className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all text-left"
                                     >
                                        <div className="flex items-center gap-3">
                                           <span className="text-xl">{c.flag}</span>
                                           <span className="text-[11px] font-black text-white/80 uppercase">{c.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-primary">{c.code}</span>
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
                         className="h-14 flex-1 bg-white/[0.02] border-white/5 rounded-[1.5rem] font-black text-lg px-6 focus:border-primary/40 transition-all text-white tracking-widest min-w-0" 
                         required 
                       />
                     </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-left">
                    <Label className="text-[9px] font-black uppercase text-primary/40 ml-4 tracking-widest">Email Address</Label>
                    <Input 
                      type="email"
                      placeholder="mail@nuxus.chat" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="h-14 bg-white/[0.02] border-white/5 rounded-[1.5rem] font-bold text-base px-6 focus:border-primary/40 transition-all text-white" 
                      required 
                    />
                  </div>
                )}

                <div className="space-y-2 text-left">
                  <Label className="text-[9px] font-black uppercase text-primary/40 ml-4 tracking-widest">Passcode</Label>
                  <div className="relative">
                    <Input 
                      type={showPass ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="h-14 bg-white/[0.02] border-white/5 rounded-[1.5rem] font-black text-lg px-6 focus:border-primary/40 transition-all text-white tracking-[0.2em]" 
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPass(!showPass)} 
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-white/10 hover:text-primary transition-colors p-2"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full h-20 bg-primary hover:scale-[1.02] text-white font-black uppercase italic tracking-[0.2em] text-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(var(--primary),0.3)] transition-all active:scale-95 mt-6 border border-white/10 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  {isLoading ? <Loader2 className="animate-spin w-8 h-8" /> : (mode === 'login' ? 'Login' : 'Register')}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="mt-12 flex flex-col items-center gap-4 opacity-20">
             <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <ShieldCheck className="w-3 h-3 text-primary" />
                <p className="text-[8px] font-black text-white uppercase tracking-[0.4em]">System Active</p>
             </div>
             <p className="text-[7px] font-black text-white/40 uppercase tracking-[0.8em]">Build {versions.build} • Pulse {versions.latestVersion}</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
