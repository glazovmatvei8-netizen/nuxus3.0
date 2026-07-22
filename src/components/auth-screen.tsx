
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff, User as UserIcon, ShieldCheck } from 'lucide-react';
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
 * AUTH SCREEN V75.0.0 «AEGIS SHIELD»
 * Добавлен Honeypot для защиты от ботов.
 */
export default function AuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIs2FAVerified } = useAppState();
  
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [isVkLoading, setIsVkLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [vkIdToLink, setVkIdToLink] = useState<number | null>(null);
  
  // HONEYPOT (Анти-бот ловушка)
  const [hpValue, setHpValue] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !db || !auth) return;

    // ЕСЛИ HONEYPOT ЗАПОЛНЕН - ЭТО БОТ
    if (hpValue !== '') {
      console.warn("Nuxus Shield: Bot attempt neutralized.");
      return; 
    }

    setIsLoading(true);
    const idClean = identifier.trim();
    const finalEmail = idClean.includes('@') ? idClean : `${idClean.replace(/\D/g, '')}@nuxus.chat`;

    try {
      await setPersistence(auth, browserLocalPersistence);
      if (mode === 'login') {
        const userCred = await signInWithEmailAndPassword(auth, finalEmail, password);
        if (vkIdToLink) {
          await updateDoc(doc(db, 'users', userCred.user.uid), { vkId: vkIdToLink });
        }
        setIs2FAVerified(true);
      } else {
        const usernameWithAt = '@' + username.trim().replace('@', '');
        const userCred = await createUserWithEmailAndPassword(auth, finalEmail, vkIdToLink ? `vk_quantum_${vkIdToLink}_secure_v74` : password);
        await setDoc(doc(db, 'users', userCred.user.uid), {
          id: userCred.user.uid,
          name: name.trim(),
          username: usernameWithAt,
          usernameLowercase: usernameWithAt.toLowerCase(),
          phone: identifier.replace(/\D/g, ''),
          vkId: vkIdToLink,
          createdAt: new Date().toISOString(),
          balance: 0,
          settings: { 
            theme: 'default', 
            appearance: 'dark', 
            bubbleStyle: 'default',
            privacy: { lastSeenVisibility: 'everybody' } 
          }
        });
        setIs2FAVerified(true);
      }
    } catch (e: any) {
      toast({ title: "Ошибка", description: "Проверьте идентификатор или пароль.", variant: "destructive" });
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
            <CardContent className="px-8 pb-12 pt-6">
              <form onSubmit={handleAuth} className="space-y-6">
                
                {/* HONEYPOT FIELD (Hidden for humans) */}
                <div style={{ display: 'none' }}>
                  <input type="text" value={hpValue} onChange={e => setHpValue(e.target.value)} tabIndex={-1} autoComplete="off" />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Идентификатор</Label>
                    <div className="relative">
                       <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                       <Input placeholder="Телефон, Email или @ID" value={identifier} onChange={e => setIdentifier(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 font-bold" required />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Пароль</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                      <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 font-bold" required={!vkIdToLink} />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all group relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : (mode === 'login' ? "Авторизовать" : "Создать Узел")}
                  </Button>
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
