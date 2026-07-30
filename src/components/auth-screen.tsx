"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRY_CODES = [
  { code: '+380', name: 'Украина', flag: '🇺🇦' },
  { code: '+1', name: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', name: 'UK', flag: '🇬🇧' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+48', name: 'Poland', flag: '🇵🇱' },
  { code: '+375', name: 'Belarus', flag: '🇧🇾' },
  { code: '+77', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: '+995', name: 'Georgia', flag: '🇬🇪' },
  { code: '+370', name: 'Lithuania', flag: '🇱🇹' },
  { code: '+371', name: 'Latvia', flag: '🇱🇻' },
  { code: '+372', name: 'Estonia', flag: '🇪🇪' },
  { code: '+358', name: 'Finland', flag: '🇫🇮' },
  { code: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: '+90', name: 'Turkey', flag: '🇹🇷' },
  { code: '+972', name: 'Israel', flag: '🇮🇱' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+82', name: 'S.Korea', flag: '🇰🇷' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: '+420', name: 'Czech Republic', flag: '🇨🇿' },
  { code: '+43', name: 'Austria', flag: '🇦🇹' },
  { code: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: '+30', name: 'Greece', flag: '🇬🇷' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+852', name: 'Hong Kong', flag: '🇭🇰' },
  { code: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
];

export default function AuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIsLegalOpen } = useAppState();
  
  const [langSelected, setLangSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);

  const [countryCode, setCountryCode] = useState('+380');
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !db || !auth) return;

    if (mode === 'register' && !acceptedPolicy) {
      toast({ title: langSelected === 'ru' ? "Ошибка" : "Error", description: langSelected === 'ru' ? "Вы должны согласиться с Политикой конфиденциальности." : "You must agree to the Privacy Policy.", variant: "destructive" });
      return;
    }

    const manualInput = identifier.trim();
    if (manualInput.startsWith('+7') || manualInput.startsWith('7') || manualInput.startsWith('89')) {
       toast({ 
         title: langSelected === 'ru' ? "Региональное ограничение" : "Regional Restriction", 
         description: langSelected === 'ru' ? "Регистрация из РФ временно недоступна." : "Registration from RF is temporarily unavailable.", 
         variant: "destructive" 
       });
       return;
    }

    setIsLoading(true);
    const idClean = identifier.replace(/\D/g, '');
    const isEmail = identifier.includes('@');
    const finalPhone = isEmail ? identifier.trim() : `${countryCode.replace('+', '')}${idClean}`;
    const finalEmail = isEmail ? identifier.trim() : `${finalPhone}@nuxus.chat`;

    try {
      await setPersistence(auth, browserLocalPersistence);
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, finalEmail, password);
      } else {
        const usernameWithAt = '@' + username.trim().replace('@', '');
        const userCred = await createUserWithEmailAndPassword(auth, finalEmail, password);
        await setDoc(doc(db, 'users', userCred.user.uid), {
          id: userCred.user.uid,
          name: name.trim(),
          username: usernameWithAt,
          usernameLowercase: usernameWithAt.toLowerCase(),
          phone: finalPhone,
          email: finalEmail,
          createdAt: new Date().toISOString(),
          balance: 0,
          settings: { 
            language: langSelected || 'ru', 
            theme: 'default', 
            appearance: 'dark',
            privacy: { phoneVisibility: 'contacts', lastSeenVisibility: 'everybody', allowGroupsFrom: 'everybody' }
          }
        });
      }
    } catch (e: any) {
      toast({ title: langSelected === 'ru' ? "Сбой" : "Fail", description: "Проверьте данные. Регистрация из РФ ограничена.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const openLegal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLegalOpen(true);
  };

  if (!langSelected) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] px-6">
        <NuxusLogo size={140} />
        <div className="space-y-4 w-full max-sm mt-12">
          <button onClick={() => setLangSelected('ru')} className="w-full h-16 bg-primary text-white font-black uppercase italic tracking-widest rounded-2xl shadow-2xl active:scale-95 transition-all">Продолжить на русском</button>
          <button onClick={() => setLangSelected('en')} className="w-full h-14 bg-white/5 text-white/60 font-black uppercase italic tracking-widest rounded-2xl active:scale-95 transition-all">Continue in English</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#020203] relative overflow-hidden">
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-12">
          <div className="mb-10 cursor-pointer" onClick={() => setLangSelected(null)}><NuxusLogo size={90} /></div>
          <Card className="w-full max-w-[420px] bg-white/[0.02] border-white/10 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden">
            <CardHeader className="text-center pt-10 px-8">
              <div className="grid grid-cols-2 bg-white/5 p-1 rounded-2xl mb-8 border border-white/5">
                <button type="button" onClick={() => setMode('login')} className={cn("h-11 rounded-xl text-[10px] font-black uppercase transition-all", mode === 'login' ? "bg-primary text-white shadow-lg" : "text-white/30")}>{langSelected === 'ru' ? 'Вход' : 'Login'}</button>
                <button type="button" onClick={() => setMode('register')} className={cn("h-11 rounded-xl text-[10px] font-black uppercase transition-all", mode === 'register' ? "bg-primary text-white shadow-lg" : "text-white/30")}>{langSelected === 'ru' ? 'Регистрация' : 'Register'}</button>
              </div>
              <CardTitle className="text-3xl font-black italic text-white uppercase tracking-tighter">{mode === 'login' ? (langSelected === 'ru' ? 'Вход в Ядро' : 'Entry') : (langSelected === 'ru' ? 'Новый Узел' : 'New Node')}</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-10">
              <form onSubmit={handleAuth} className="space-y-6">
                {mode === 'register' && (
                  <>
                    <Input placeholder={langSelected === 'ru' ? 'Имя' : 'Name'} value={name} onChange={e => setName(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10 font-bold focus:border-primary/40 transition-all shadow-inner" required />
                    <Input placeholder="ID (@nick)" value={username} onChange={e => setUsername(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10 font-bold focus:border-primary/40 transition-all shadow-inner" required />
                  </>
                )}
                
                <div className="flex gap-2">
                  {!identifier.includes('@') && (
                    <div className="w-[110px] shrink-0">
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold focus:ring-0 focus:border-primary/40 transition-all shadow-inner">
                          <SelectValue placeholder="🌍" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="bg-[#0a0a0c] border-white/10 rounded-2xl max-h-[300px] overflow-y-auto z-[2000] scrollbar-hide shadow-2xl">
                          {COUNTRY_CODES.map((c) => (
                            <SelectItem key={c.code} value={c.code} className="py-3 cursor-pointer hover:bg-primary/10 transition-colors">
                              {c.flag} {c.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Input placeholder={langSelected === 'ru' ? 'Телефон или Почта' : 'Phone or Email'} value={identifier} onChange={e => setIdentifier(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10 flex-1 font-bold focus:border-primary/40 transition-all shadow-inner" required />
                </div>

                <div className="relative">
                  <Input type={showPass ? "text" : "password"} placeholder={langSelected === 'ru' ? 'Пароль' : 'Password'} value={password} onChange={e => setPassword(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10 font-bold focus:border-primary/40 transition-all shadow-inner" required />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">{showPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>

                {mode === 'register' && (
                  <div className="flex items-start space-x-3 p-5 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                    <Checkbox id="policy" checked={acceptedPolicy} onCheckedChange={(v) => setAcceptedPolicy(!!v)} className="mt-1" />
                    <label htmlFor="policy" className="text-[10px] font-bold text-white/60 leading-tight cursor-pointer uppercase tracking-tight">
                      Я согласен с <button type="button" onClick={openLegal} className="text-primary font-black underline hover:text-white transition-colors">Политикой конфиденциальности</button>
                    </label>
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary text-white font-black uppercase italic tracking-widest rounded-2xl shadow-2xl shadow-primary/20 active:scale-95 transition-all group overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? 'Авторизовать' : 'Инициализировать')}
                </Button>
                
                <button type="button" onClick={openLegal} className="w-full text-[9px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white transition-all py-2">Правовая информация</button>
              </form>
            </CardContent>
          </Card>
          <div className="mt-8 flex items-center gap-3 bg-red-500/10 px-6 py-3 rounded-2xl border border-red-500/20 shadow-xl animate-pulse">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">РФ: Регистрация ограничена</span>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
