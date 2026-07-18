
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff, User as UserIcon, Link as LinkIcon, Sparkles } from 'lucide-react';
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

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIs2FAVerified } = useAppState();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [vkIdToLink, setVkIdToLink] = useState<number | null>(null);

  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  const vkidContainerRef = useRef<HTMLDivElement>(null);
  const sdkInited = useRef(false);

  // ГЛОБАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ VK SDK
  useEffect(() => {
    const initVK = async () => {
      const VKID = (window as any).VKIDSDK;
      if (!VKID || sdkInited.current) return;

      VKID.Config.init({
        app: 54684553,
        redirectUrl: 'https://nuxus.fun',
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: '',
      });

      // 1. Интеграция Шторки (FloatingOneTap)
      const floatingOneTap = new VKID.FloatingOneTap();
      floatingOneTap.render({
        appName: 'Nuxus 2.0',
        showAlternativeLogin: true
      })
      .on(VKID.FloatingOneTapInternalEvents.LOGIN_SUCCESS, (payload: any) => {
        VKID.Auth.exchangeCode(payload.code, payload.device_id)
          .then((data: any) => {
            floatingOneTap.close();
            handleVkSuccess(data);
          });
      });

      // 2. Интеграция Кнопки (OneTap) в форму
      if (vkidContainerRef.current) {
        const oneTap = new VKID.OneTap();
        oneTap.render({
          container: vkidContainerRef.current,
          showAlternativeLogin: true,
          styles: { borderRadius: 50, width: 385 }
        })
        .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, (payload: any) => {
          VKID.Auth.exchangeCode(payload.code, payload.device_id)
            .then(handleVkSuccess);
        });
      }

      sdkInited.current = true;
    };

    const interval = setInterval(() => {
      if ((window as any).VKIDSDK) {
        initVK();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleVkSuccess = async (data: any) => {
    if (!db || !auth) return;
    setIsLoading(true);
    try {
      const vId = data.user_id || data.id;
      const vName = data.user?.first_name ? `${data.user.first_name} ${data.user.last_name || ''}` : "VK User";
      const phoneNumber = (data.user?.phone || "").replace(/\D/g, '');
      
      const vkEmail = `vk_${vId}@nuxus.chat`;
      const vkPass = `vk_quantum_${vId}_secure_v57`;

      // Поиск по vkId
      const vkSnap = await getDocs(query(collection(db, 'users'), where('vkId', '==', vId), limit(1)));

      if (!vkSnap.empty) {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, vkEmail, vkPass);
        setIs2FAVerified(true);
        toast({ title: "Синхронизация по VK ID" });
        return;
      }

      // Поиск по номеру телефона
      if (phoneNumber) {
        const phoneSnap = await getDocs(query(collection(db, 'users'), where('phone', '==', phoneNumber), limit(1)));
        if (!phoneSnap.empty) {
          toast({ title: "Узел Обнаружен", description: "Введите пароль для привязки VK к вашему узлу." });
          setIdentifier(phoneNumber);
          setMode('login');
          setVkIdToLink(vId);
          return;
        }
      }

      // Если новый пользователь
      setMode('register');
      setName(vName);
      setIdentifier(phoneNumber || '');
      setVkIdToLink(vId);
      toast({ title: "Данные получены", description: "Завершите регистрацию." });
    } catch (e: any) {
      toast({ title: "Сбой VK", description: e.message, variant: "destructive" });
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
          toast({ title: "VK ID Привязан" });
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
      toast({ title: "Ошибка", description: "Проверьте данные.", variant: "destructive" });
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
              <div className="grid grid-cols-2 bg-white/5 p-1 rounded-2xl mb-8 border border-white/5">
                <button onClick={() => setMode('login')} className={cn("h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", mode === 'login' ? "bg-primary text-white shadow-lg" : "text-white/30")}>Вход</button>
                <button onClick={() => setMode('register')} className={cn("h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", mode === 'register' ? "bg-primary text-white shadow-lg" : "text-white/30")}>Регистрация</button>
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
                  
                  {vkIdToLink && mode === 'register' && (
                    <button type="button" onClick={() => setMode('login')} className="w-full flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60 hover:text-primary py-2">
                      <LinkIcon className="w-3 h-3" /> Привязать к существующему узлу
                    </button>
                  )}

                  <div className="space-y-6 pt-2">
                     <div className="flex items-center gap-4 px-2">
                        <div className="h-px flex-1 bg-white/5" /><span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">или</span><div className="h-px flex-1 bg-white/5" />
                     </div>
                     
                     {/* VK ID OneTap Container */}
                     <div ref={vkidContainerRef} className="w-full flex justify-center min-h-[52px] overflow-visible" />
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
