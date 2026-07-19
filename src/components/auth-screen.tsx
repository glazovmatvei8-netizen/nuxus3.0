"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff, User as UserIcon, Link as LinkIcon } from 'lucide-react';
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
 * AUTH SCREEN V67.0.0 «ABSOLUTE DOMAIN SYNC»
 * ИСПРАВЛЕНО: Домен nuxus.fun | Redirect https://nuxus.fun
 * Соответствует скриншоту консоли VK ID.
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

  const handleVkLogin = async () => {
    setIsVkLoading(true);
    const VKID = (window as any).VKIDSDK;

    if (!VKID) {
      toast({ title: "SDK НЕ ГОТОВ", description: "Подождите секунду, Ядро прогревается...", variant: "destructive" });
      setIsVkLoading(false);
      return;
    }

    try {
      const isNative = !!(window as any).Capacitor || !!(window as any).webkit;
      const APP_ID = isNative ? 54684554 : 54684553;

      VKID.Config.init({
        app: APP_ID,
        redirectUrl: 'https://nuxus.fun',
        responseMode: 'callback',
        source: 'lowcode',
      });

      const result = await VKID.Auth.login();
      if (result) {
        const data = await VKID.Auth.exchangeCode(result.code, result.device_id);
        handleVkSuccess(data);
      }
    } catch (e: any) {
      toast({ title: "Сбой VK", description: "Сигнал прерван.", variant: "destructive" });
    } finally {
      setIsVkLoading(false);
    }
  };

  const handleVkSuccess = async (data: any) => {
    if (!db || !auth) return;
    setIsLoading(true);
    try {
      const vId = data.user_id || data.id;
      const vkEmail = `vk_${vId}@nuxus.chat`;
      const vkPass = `vk_quantum_${vId}_secure_v57`;

      const vkSnap = await getDocs(query(collection(db, 'users'), where('vkId', '==', vId), limit(1)));
      if (!vkSnap.empty) {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, vkEmail, vkPass);
        setIs2FAVerified(true);
        return;
      }

      setMode('register');
      setName(data.user?.first_name ? `${data.user.first_name} ${data.user.last_name || ''}` : "VK User");
      setIdentifier((data.user?.phone || "").replace(/\D/g, ''));
      setVkIdToLink(vId);
      toast({ title: "VK ID Распознан", description: "Завершите регистрацию узла." });
    } catch (e: any) {
      toast({ title: "Сбой синхронизации", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !db || !auth) return;

    setIsLoading(true);
    const finalEmail = identifier.includes('@') ? identifier.trim() : `${identifier.replace(/\D/g, '')}@nuxus.chat`;

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
        const userCred = await createUserWithEmailAndPassword(auth, finalEmail, vkIdToLink ? `vk_quantum_${vkIdToLink}_secure_v57` : password);
        await setDoc(doc(db, 'users', userCred.user.uid), {
          id: userCred.user.uid,
          name: name.trim(),
          username: usernameWithAt,
          usernameLowercase: usernameWithAt.toLowerCase(),
          phone: identifier.replace(/\D/g, ''),
          vkId: vkIdToLink,
          createdAt: new Date().toISOString(),
          balance: 0,
          settings: { theme: 'default', appearance: 'dark' }
        });
        setIs2FAVerified(true);
      }
    } catch (e: any) {
      toast({ title: "Ошибка", description: "Проверьте данные или пароль.", variant: "destructive" });
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
                  {mode === 'register' && (
                    <div className="space-y-4 animate-in slide-in-from-top-4">
                      <div className="space-y-1.5 text-left">
                        <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Имя</Label>
                        <Input placeholder="Ваше имя" value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-6 font-bold" required />
                      </div>
                      <div className="space-y-1.5 text-left">
                        <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Никнейм</Label>
                        <Input placeholder="unique_id" value={username} onChange={e => setUsername(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-6 font-bold" required />
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-6">
                  <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all">
                    {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : (mode === 'login' ? "Авторизовать" : "Создать Узел")}
                  </Button>
                  <div className="space-y-6 pt-2">
                     <div className="flex items-center gap-4 px-2">
                        <div className="h-px flex-1 bg-white/5" /><span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">или</span><div className="h-px flex-1 bg-white/5" />
                     </div>
                     <button 
                       type="button" onClick={handleVkLogin} disabled={isVkLoading}
                       className="w-full h-14 bg-[#0077ff] hover:bg-[#0066dd] text-white rounded-[1.2rem] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl font-bold"
                     >
                       {isVkLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                         <>
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.598-.19 1.365 1.26 2.18 1.817.615.422 1.083.33 1.083.33l2.177-.03s1.14-.071.6-.972c-.044-.073-.314-.66-1.617-1.866-1.364-1.26-1.183-1.055.462-3.23.998-1.332 1.397-2.144 1.272-2.493-.12-.333-.862-.244-.862-.244l-2.45.015s-.182-.025-.316.056c-.132.08-.217.267-.217.267s-.39 1.037-.91 1.92c-1.094 1.84-1.532 1.937-1.713 1.82-.42-.27-.315-1.087-.315-1.666 0-1.812.275-2.568-.536-2.764-.27-.065-.467-.108-1.155-.115-.882-.01-1.63.003-2.054.21-.282.14-.498.45-.366.468.164.023.535.1.732.365.254.34.245 1.103.245 1.103s.146 2.13-.34 2.395c-.334.183-.792-.19-1.775-1.896-.504-.87-.886-1.83-.886-1.83s-.074-.18-.206-.276c-.16-.12-.384-.157-.384-.157l-2.33.015s-.35.01-.478.162c-.115.137-.008.42-.008.42s1.834 4.286 3.91 6.45c1.903 1.984 4.067 1.85 4.067 1.85h.98z"/></svg>
                           <span className="uppercase text-[11px] tracking-widest font-black">Войти через VK</span>
                         </>
                       )}
                     </button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
