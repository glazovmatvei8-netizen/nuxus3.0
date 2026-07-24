"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff, User as UserIcon, ShieldCheck, Scale, Globe, Languages, AlertCircle } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
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
];

export default function AuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIs2FAVerified, setIsLegalOpen } = useAppState();
  
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
  const [hpValue, setHpValue] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !db || !auth) return;

    if (mode === 'register' && !acceptedPolicy) {
      toast({ title: langSelected === 'ru' ? "Ошибка" : "Error", description: langSelected === 'ru' ? "Вы должны согласиться с Политикой конфиденциальности." : "You must agree to the Privacy Policy.", variant: "destructive" });
      return;
    }

    if (hpValue !== '') return; 

    const manualInput = identifier.trim();
    if (manualInput.startsWith('+7') || manualInput.startsWith('7') || manualInput.startsWith('89')) {
       toast({ 
         title: langSelected === 'ru' ? "Региональное ограничение" : "Regional Restriction", 
         description: langSelected === 'ru' ? "Регистрация из РФ временно недоступна для обеспечения безопасности Ядра." : "Registration from RF is temporarily unavailable due to security protocols.", 
         variant: "destructive" 
       });
       return;
    }

    setIsLoading(true);
    const idClean = identifier.trim().replace(/\D/g, '');
    const finalPhone = identifier.includes('@') ? idClean : `${countryCode.replace('+', '')}${idClean}`;
    const finalEmail = identifier.includes('@') ? identifier.trim() : `${finalPhone}@nuxus.chat`;

    try {
      await setPersistence(auth, browserLocalPersistence);
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, finalEmail, password);
        setIs2FAVerified(true);
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
          emailVerified: false,
          phoneVerified: false,
          createdAt: new Date().toISOString(),
          balance: 0,
          settings: { 
            language: langSelected || 'ru',
            theme: 'default', 
            appearance: 'dark', 
            bubbleStyle: 'default',
            privacy: { 
              lastSeenVisibility: 'everybody',
              phoneVisibility: 'contacts',
              allowGroupsFrom: 'everybody'
            } 
          }
        });
        setIs2FAVerified(true);
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: langSelected === 'ru' ? "Сбой доступа" : "Access Fail", description: langSelected === 'ru' ? "Проверьте данные или соединение. Регистрация из РФ ограничена." : "Check details or connection. RF registration restricted.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!langSelected) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] relative overflow-hidden px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_70%)]" />
        <div className="relative z-10 flex flex-col items-center gap-12 w-full max-sm text-center">
           <div className="animate-in fade-in zoom-in-95 duration-1000"><NuxusLogo size={140} /></div>
           <div className="space-y-4 w-full">
              <div className="flex items-center justify-center gap-3 mb-6">
                 <Languages className="w-5 h-5 text-primary" />
                 <h2 className="text-xl font-black uppercase italic tracking-widest text-white">Choose Language</h2>
              </div>
              <Button onClick={() => setLangSelected('ru')} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all text-sm">Продолжить на русском</Button>
              <Button onClick={() => setLangSelected('en')} variant="ghost" className="w-full h-14 bg-white/5 text-white/60 hover:text-white rounded-2xl font-black uppercase tracking-widest transition-all text-[11px]">Continue in English</Button>
           </div>
           <div className="opacity-20 flex flex-col items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="text-[7px] font-black uppercase tracking-[0.6em]">Nuxus Kernel V5.8.0</span>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#020203] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(168,85,247,0.15)_0%,transparent_50%)]" />
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-12 relative z-10">
          <div className="mb-10 cursor-pointer" onClick={() => setLangSelected(null)}><NuxusLogo size={90} /></div>
          <Card className="w-full max-w-[420px] border-white/[0.08] bg-white/[0.02] backdrop-blur-[40px] shadow-2xl rounded-[3rem] overflow-hidden relative border-2">
            <CardHeader className="text-center pb-2 pt-10 px-8">
              <div className="grid grid-cols-2 bg-white/5 p-1.5 rounded-2xl mb-8 border border-white/5">
                <button type="button" onClick={() => setMode('login')} className={cn("h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", mode === 'login' ? "bg-primary text-white shadow-lg" : "text-white/30")}>{langSelected === 'ru' ? 'Вход' : 'Login'}</button>
                <button type="button" onClick={() => setMode('register')} className={cn("h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", mode === 'register' ? "bg-primary text-white shadow-lg" : "text-white/30")}>{langSelected === 'ru' ? 'Регистрация' : 'Register'}</button>
              </div>
              <CardTitle className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">{mode === 'login' ? (langSelected === 'ru' ? 'Вход в Ядро' : 'Core Entry') : (langSelected === 'ru' ? 'Новый Узел' : 'New Node')}</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-10 pt-6">
              <form onSubmit={handleAuth} className="space-y-6">
                <div style={{ display: 'none' }}><input type="text" value={hpValue} onChange={e => setHpValue(e.target.value)} tabIndex={-1} /></div>
                <div className="space-y-4">
                  {mode === 'register' && (
                    <div className="space-y-1.5 text-left animate-in fade-in slide-in-from-top-2">
                      <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">{langSelected === 'ru' ? 'Публичное имя' : 'Public Name'}</Label>
                      <Input placeholder={langSelected === 'ru' ? 'Ваше имя' : 'Your name'} value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold" required />
                    </div>
                  )}
                  {mode === 'register' && (
                    <div className="space-y-1.5 text-left animate-in fade-in slide-in-from-top-2">
                      <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">{langSelected === 'ru' ? 'ID Узла (@ник)' : 'Node ID (@nick)'}</Label>
                      <Input placeholder="unique_id" value={username} onChange={e => setUsername(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold" required />
                    </div>
                  )}
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">{langSelected === 'ru' ? 'Телефон или Почта' : 'Phone or Email'}</Label>
                    <div className="flex gap-2">
                      {!identifier.includes('@') && (
                        <div className="w-[110px] shrink-0">
                          <Select value={countryCode} onValueChange={setCountryCode}>
                            <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold px-3">
                              <SelectValue placeholder="🌍" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="bg-[#0a0a0c] border-white/10 rounded-2xl max-h-[300px] overflow-y-auto">
                              {COUNTRY_CODES.map((c) => (
                                <SelectItem key={c.code} value={c.code} className="text-[11px] font-black uppercase py-3 cursor-pointer">
                                  {c.flag} {c.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="relative flex-1">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                        <Input placeholder={langSelected === 'ru' ? "Номер без кода" : "Number without code"} value={identifier} onChange={e => setIdentifier(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 font-bold" required />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">{langSelected === 'ru' ? 'Пароль' : 'Password'}</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                      <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 font-bold" required />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                </div>
                {mode === 'register' && (
                  <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <Checkbox id="policy" checked={acceptedPolicy} onCheckedChange={(v) => setAcceptedPolicy(!!v)} className="mt-0.5 border-primary/40 data-[state=checked]:bg-primary" />
                    <label htmlFor="policy" className="text-[10px] font-bold text-white/60 leading-tight cursor-pointer uppercase tracking-tight">
                      {langSelected === 'ru' ? 'Я ознакомлен и согласен с' : 'I have read and agree to the'} <button type="button" onClick={(e) => { e.preventDefault(); setIsLegalOpen(true); }} className="text-primary hover:underline font-black">{langSelected === 'ru' ? 'Политикой конфиденциальности' : 'Privacy Policy'}</button>
                    </label>
                  </div>
                )}
                <div className="space-y-4">
                  <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all group relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : (mode === 'login' ? (langSelected === 'ru' ? "Авторизовать" : "Authorize") : (langSelected === 'ru' ? "Создать Узел" : "Create Node"))}
                  </Button>
                  <div className="flex justify-center">
                    <button type="button" onClick={() => setIsLegalOpen(true)} className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors py-2"><Scale className="w-3 h-3" /> {langSelected === 'ru' ? 'Правовая информация' : 'Legal Information'}</button>
                  </div>
                </div>
              </form>
            </CardContent>
            <div className="pb-6 flex justify-center opacity-20 items-center gap-2"><ShieldCheck className="w-3 h-3 text-primary" /><span className="text-[7px] font-black uppercase tracking-[0.4em] text-white">Aegis Protection Active</span></div>
          </Card>
          <div className="mt-8 flex items-center gap-2 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20"><AlertCircle className="w-3.5 h-3.5 text-red-500" /><span className="text-[9px] font-black text-red-500 uppercase tracking-widest">{langSelected === 'ru' ? 'РФ: Регистрация ограничена' : 'RF: Registration Restricted'}</span></div>
        </div>
      </ScrollArea>
    </div>
  );
}
