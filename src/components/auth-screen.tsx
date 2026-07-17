
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff, UserPlus, LogIn, AtSign, User, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { NuxusLogo } from './nuxus-logo';
import { cn } from '@/lib/utils';
import { LegalModal } from './modals/legal-modal';

type AuthMode = 'login' | 'register';

/**
 * AuthScreen V56.3.0 «LEGAL SHIELD»
 * ДОБАВЛЕНО: Рабочая Политика конфиденциальности и Условия использования.
 */
export default function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIs2FAVerified } = useAppState();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);

  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  const getFinalEmail = (input: string) => {
    const val = input.trim();
    if (val.includes('@')) return val; 
    const cleanPhone = val.replace(/\D/g, '');
    return `${cleanPhone}@nuxus.chat`; 
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password || !auth || !db) return;

    setIsLoading(true);
    const finalEmail = getFinalEmail(identifier);
    const cleanPhone = identifier.includes('@') ? '' : identifier.replace(/\D/g, '');

    try {
      await setPersistence(auth, browserLocalPersistence);
      
      if (mode === 'login') {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, finalEmail, password);
          const userSnap = await getDoc(doc(db, 'users', userCredential.user.uid));
          
          if (!userSnap.exists()) {
             setMode('register');
             toast({ title: "Узел не завершен", description: "Загрузите данные профиля." });
          } else {
             setIs2FAVerified(true);
             toast({ title: "Сигнал принят", description: `Добро пожаловать, ${userSnap.data().name}` });
          }
        } catch (err: any) {
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
            toast({ title: "Доступ запрещен", description: "Неверный ID или пароль.", variant: "destructive" });
          } else {
            toast({ title: "Ошибка входа", description: err.message, variant: "destructive" });
          }
        }
      } else {
        if (!name.trim() || !username.trim()) {
          toast({ title: "Заполните профиль", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const rawNick = username.trim().replace('@', '');
        if (/[^a-zA-Z0-9_]/.test(rawNick)) {
          toast({ title: "Ошибка ника", description: "Только английские буквы и цифры.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const usernameWithAt = '@' + rawNick;
        const targetSearch = usernameWithAt.toLowerCase();

        const usersCol = collection(db, 'users');
        
        const nickCheck = await getDocs(query(usersCol, where('usernameLowercase', '==', targetSearch), limit(1)));
        if (!nickCheck.empty) {
          toast({ title: "Никнейм занят", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        if (cleanPhone) {
          const phoneCheck = await getDocs(query(usersCol, where('phone', '==', cleanPhone), limit(1)));
          if (!phoneCheck.empty) {
            toast({ title: "Номер уже в сети", description: "Этот телефон привязан к другому узлу.", variant: "destructive" });
            setIsLoading(false);
            return;
          }
        }

        if (identifier.includes('@')) {
          const emailCheck = await getDocs(query(usersCol, where('email', '==', identifier.trim()), limit(1)));
          if (!emailCheck.empty) {
            toast({ title: "Почта занята", variant: "destructive" });
            setIsLoading(false);
            return;
          }
        }

        try {
          const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, password);
          
          const profileData = {
            id: userCredential.user.uid,
            name: name.trim(),
            username: usernameWithAt,
            usernameLowercase: targetSearch,
            phone: cleanPhone,
            email: identifier.includes('@') ? identifier.trim() : null,
            createdAt: new Date().toISOString(),
            isPremium: false,
            balance: 0,
            settings: { 
              theme: 'default', 
              appearance: 'dark',
              privacy: {
                phoneVisibility: 'everybody',
                lastSeenVisibility: 'everybody',
                allowGroupsFrom: 'everybody'
              }
            }
          };

          await setDoc(doc(db, 'users', userCredential.user.uid), profileData);
          setIs2FAVerified(true);
          toast({ title: "Узел создан", description: "Синхронизация завершена." });
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
             toast({ title: "Узел существует", description: "Этот идентификатор уже занят.", variant: "destructive" });
          } else {
             toast({ title: "Ошибка регистрации", description: err.message, variant: "destructive" });
          }
        }
      }
    } catch (e: any) {
      toast({ title: "Критический сбой Ядра", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(168,85,247,0.15)_0%,transparent_50%)] pointer-events-none" />
      
      <div className="w-full max-w-[380px] relative z-10 flex flex-col items-center animate-in fade-in duration-1000">
        <div className="mb-10">
          <NuxusLogo size={90} />
        </div>

        <Card className="w-full border-white/[0.08] bg-white/[0.02] backdrop-blur-[40px] shadow-2xl rounded-[3rem] overflow-hidden relative border-2">
          <CardHeader className="text-center pb-2 pt-10 px-8">
            <div className="flex bg-white/5 p-1 rounded-2xl mb-6 border border-white/5">
              <button 
                onClick={() => setMode('login')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  mode === 'login' ? "bg-primary text-white shadow-lg" : "text-white/30 hover:text-white"
                )}
              >
                <LogIn className="w-3.5 h-3.5" /> Вход
              </button>
              <button 
                onClick={() => setMode('register')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  mode === 'register' ? "bg-primary text-white shadow-lg" : "text-white/30 hover:text-white"
                )}
              >
                <UserPlus className="w-3.5 h-3.5" /> Регистрация
              </button>
            </div>
            <CardTitle className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">
              {mode === 'login' ? 'Вход в Ядро' : 'Новый Узел'}
            </CardTitle>
            <CardDescription className="text-primary/60 font-black tracking-[0.5em] uppercase text-[8px] mt-3">
              Verification Engine v56.3
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-12 pt-6">
            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-[0.3em]">Телефон или Почта</Label>
                  <div className="relative group">
                     {identifier.includes('@') ? (
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary" />
                     ) : (
                       <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary" />
                     )}
                     <Input 
                        placeholder={mode === 'login' ? "+7... или @email" : "+7 (999) 000 00 00"} 
                        value={identifier} 
                        onChange={e => setIdentifier(e.target.value)} 
                        className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 text-lg font-bold tracking-tight border-2 focus:border-primary/40 transition-all" 
                        required 
                     />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Пароль Сигнала</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary" />
                    <Input 
                      type={showPass ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 font-bold focus:border-primary/40 transition-all" 
                      required 
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                    <div className="space-y-1.5 text-left">
                      <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Имя Оператора</Label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary" />
                        <Input 
                          placeholder="Ваше имя" 
                          value={name} 
                          onChange={e => setName(e.target.value)} 
                          className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 font-bold focus:border-primary/40 transition-all" 
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Цифровой ID (только английский)</Label>
                      <div className="relative group">
                        <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary" />
                        <Input 
                          placeholder="unique_id" 
                          value={username} 
                          onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_@]/g, ''))} 
                          className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 font-bold focus:border-primary/40 transition-all" 
                          required 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all text-sm group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : (mode === 'login' ? "Авторизовать" : "Создать Узел")}
              </Button>
            </form>

            <div className="mt-8 flex flex-col items-center gap-3">
               <button 
                 onClick={() => setIsLegalOpen(true)}
                 className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-primary transition-colors py-1"
               >
                 Политика конфиденциальности
               </button>
               <div className="flex items-center gap-3 opacity-30">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="text-[7px] font-black uppercase tracking-[0.4em] text-white">Quantum Encryption Signal 25.4</span>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <LegalModal open={isLegalOpen} onOpenChange={setIsLegalOpen} />
    </div>
  );
}
