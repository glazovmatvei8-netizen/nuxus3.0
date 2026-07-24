
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff, User as UserIcon, ShieldCheck, Scale, ExternalLink } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, limit, updateDoc } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { NuxusLogo } from './nuxus-logo';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * AUTH SCREEN V78.0.0 «PRIVACY FORCE»
 * Добавлен Checkbox согласия с политикой и ссылки на Legal Core.
 */
export default function AuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIs2FAVerified, setIsLegalOpen } = useAppState();
  
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);

  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  
  // HONEYPOT
  const [hpValue, setHpValue] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !db || !auth) return;

    if (mode === 'register' && !acceptedPolicy) {
      toast({ title: "Ошибка", description: "Вы должны согласиться с Политикой конфиденциальности.", variant: "destructive" });
      return;
    }

    if (hpValue !== '') return; 

    setIsLoading(true);
    const idClean = identifier.trim();
    const finalEmail = idClean.includes('@') ? idClean : `${idClean.replace(/\D/g, '')}@nuxus.chat`;

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
          phone: identifier.replace(/\D/g, ''),
          email: finalEmail,
          emailVerified: false,
          phoneVerified: false,
          createdAt: new Date().toISOString(),
          balance: 0,
          settings: { 
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
      toast({ title: "Ошибка", description: "Проверьте данные или соединение.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#020203] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(168,85,247,0.15)_0%,transparent_50%)]" />
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-12 relative z-10">
          <div className="mb-10"><NuxusLogo size={90} /></div>
          <Card className="w-full max-w-[420px] border-white/[0.08] bg-white/[0.02] backdrop-blur-[40px] shadow-2xl rounded-[3rem] overflow-hidden relative border-2">
            <CardHeader className="text-center pb-2 pt-10 px-8">
              <div className="grid grid-cols-2 bg-white/5 p-1.5 rounded-2xl mb-8 border border-white/5">
                <button 
                  type="button" onClick={() => setMode('login')} 
                  className={cn("h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", mode === 'login' ? "bg-primary text-white shadow-lg" : "text-white/30")}
                >Вход</button>
                <button 
                  type="button" onClick={() => setMode('register')} 
                  className={cn("h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", mode === 'register' ? "bg-primary text-white shadow-lg" : "text-white/30")}
                >Регистрация</button>
              </div>
              <CardTitle className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">
                {mode === 'login' ? 'Вход в Ядро' : 'Новый Узел'}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-10 pt-6">
              <form onSubmit={handleAuth} className="space-y-6">
                <div style={{ display: 'none' }}><input type="text" value={hpValue} onChange={e => setHpValue(e.target.value)} tabIndex={-1} /></div>

                <div className="space-y-4">
                  {mode === 'register' && (
                    <div className="space-y-1.5 text-left animate-in fade-in slide-in-from-top-2">
                      <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Публичное имя</Label>
                      <Input placeholder="Ваше имя" value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold" required />
                    </div>
                  )}
                  {mode === 'register' && (
                    <div className="space-y-1.5 text-left animate-in fade-in slide-in-from-top-2">
                      <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">ID Узла (@ник)</Label>
                      <Input placeholder="unique_id" value={username} onChange={e => setUsername(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold" required />
                    </div>
                  )}
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Телефон или Почта</Label>
                    <div className="relative">
                       <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                       <Input placeholder="7999..." value={identifier} onChange={e => setIdentifier(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 font-bold" required />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Пароль</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                      <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 font-bold" required />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <Checkbox id="policy" checked={acceptedPolicy} onCheckedChange={(v) => setAcceptedPolicy(!!v)} className="mt-0.5 border-primary/40 data-[state=checked]:bg-primary" />
                    <label htmlFor="policy" className="text-[10px] font-bold text-white/60 leading-tight cursor-pointer uppercase tracking-tight">
                      Я ознакомлен и согласен с <button type="button" onClick={() => setIsLegalOpen(true)} className="text-primary hover:underline font-black">Политикой конфиденциальности</button>
                    </label>
                  </div>
                )}

                <div className="space-y-4">
                  <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all group relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : (mode === 'login' ? "Авторизовать" : "Создать Узел")}
                  </Button>
                  
                  <div className="flex justify-center">
                    <button type="button" onClick={() => setIsLegalOpen(true)} className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors py-2">
                       <Scale className="w-3 h-3" /> Правовая информация
                    </button>
                  </div>
                </div>
              </form>
            </CardContent>
            <div className="pb-6 flex justify-center opacity-20 items-center gap-2">
               <ShieldCheck className="w-3 h-3 text-primary" />
               <span className="text-[7px] font-black uppercase tracking-[0.4em] text-white">Aegis Protection Active</span>
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
