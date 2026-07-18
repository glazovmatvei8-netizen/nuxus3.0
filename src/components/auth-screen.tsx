
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff, Phone, ShieldCheck } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, limit, updateDoc } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { NuxusLogo } from './nuxus-logo';
import { cn } from '@/lib/utils';
import { LegalModal } from './modals/legal-modal';
import { ScrollArea } from '@/components/ui/scroll-area';

type AuthMode = 'login' | 'register';

/**
 * AuthScreen V56.6.6 «ULTIMATE VK ID LIGHT FIX»
 * ИСПРАВЛЕНО: Принудительная белая схема для кнопки VK ID, исключающая "черный экран".
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
  const [vkId, setVkId] = useState<number | null>(null);

  const vkidContainerRef = useRef<HTMLDivElement>(null);
  const isVkRendered = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initVKIDWidget = () => {
      const VKID = (window as any).VKIDSDK;
      if (!VKID || !vkidContainerRef.current || isVkRendered.current) return;

      try {
        VKID.Config.init({
          app: 54684553,
          redirectUrl: 'https://nuxus.fun',
          responseMode: VKID.ConfigResponseMode.Callback,
          source: VKID.ConfigSource.LOWCODE,
          scope: '', 
        });

        const oneTap = new VKID.OneTap();

        // ФОРСИРОВАННАЯ СВЕТЛАЯ СХЕМА ДЛЯ ВИДИМОСТИ
        oneTap.render({
          container: vkidContainerRef.current,
          showAlternativeLogin: true,
          scheme: 'light', 
          lang: 'ru',
          styles: {
            borderRadius: 12,
            height: 48,
            width: 320 // Фиксированная ширина для стабильности iframe
          }
        })
        .on(VKID.WidgetEvents.ERROR, (error: any) => {
          console.error("VK ID Error:", error);
        })
        .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, function (payload: any) {
          const code = payload.code;
          const deviceId = payload.device_id;

          setIsLoading(true);
          VKID.Auth.exchangeCode(code, deviceId)
            .then(handleVkSuccess)
            .catch((err: any) => {
              console.error("VK Exchange Error:", err);
              setIsLoading(false);
              toast({ title: "Сбой синхронизации VK", variant: "destructive" });
            });
        });

        isVkRendered.current = true;
      } catch (e) {
        console.warn("VK ID Init Fail:", e);
      }
    };

    const checkInterval = setInterval(() => {
      if ((window as any).VKIDSDK) {
        initVKIDWidget();
        clearInterval(checkInterval);
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, []);

  const handleVkSuccess = async (data: any) => {
    if (!db || !auth) return;

    try {
      const vId = data.user_id || data.id;
      const vName = data.user?.first_name ? `${data.user.first_name} ${data.user.last_name || ''}` : "VK User";
      const phoneNumber = data.user?.phone || "";
      
      const vkEmail = `vk_${vId}@nuxus.chat`;
      const vkPass = `vk_quantum_${vId}_secure_signal_v3`;

      if (phoneNumber) {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const phoneQuery = query(collection(db, 'users'), where('phone', '==', cleanPhone), limit(1));
        const phoneSnap = await getDocs(phoneQuery);
        
        if (!phoneSnap.empty) {
          const existingUser = phoneSnap.docs[0].data();
          await setPersistence(auth, browserLocalPersistence);
          try {
            await signInWithEmailAndPassword(auth, existingUser.email || `${cleanPhone}@nuxus.chat`, vkPass);
          } catch (e) {
            toast({ title: "Узел Обнаружен", description: "Введите пароль для объединения с VK." });
            setIdentifier(phoneNumber);
            setMode('login');
            setVkId(vId);
            setIsLoading(false);
            return;
          }
          setIs2FAVerified(true);
          toast({ title: "Вход по VK", description: `С возвращением, ${existingUser.name}` });
          setIsLoading(false);
          return;
        }
      }

      const vkQuery = query(collection(db, 'users'), where('vkId', '==', vId), limit(1));
      const vkSnap = await getDocs(vkQuery);

      if (!vkSnap.empty) {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, vkEmail, vkPass);
        setIs2FAVerified(true);
        toast({ title: "VK Сигнал Принят", description: `С возвращением!` });
        setIsLoading(false);
        return;
      }

      setMode('register');
      setName(vName);
      setIdentifier(phoneNumber || '');
      setVkId(vId);
      toast({ title: "Новый Узел", description: "Данные VK подтянуты. Выберите никнейм." });
      
    } catch (error: any) {
      toast({ title: "Ошибка VK ID", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const getFinalEmail = (input: string) => {
    const val = input.trim();
    if (val.includes('@')) return val; 
    const cleanPhone = val.replace(/\D/g, '');
    return `${cleanPhone}@nuxus.chat`; 
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || (!password && !vkId) || !auth || !db) return;

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
             toast({ title: "Профиль не завершен" });
          } else {
             if (vkId) {
               await updateDoc(doc(db, 'users', userCredential.user.uid), { vkId });
               toast({ title: "VK Привязан" });
             }
             setIs2FAVerified(true);
             toast({ title: "Сигнал принят", description: `Добро пожаловать, ${userSnap.data().name}` });
          }
        } catch (err: any) {
          toast({ title: "Доступ запрещен", description: "Неверный идентификатор или пароль.", variant: "destructive" });
        }
      } else {
        if (!name.trim() || !username.trim()) {
          toast({ title: "Заполните все поля", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const rawNick = username.trim().replace('@', '');
        const usernameWithAt = '@' + rawNick;
        const targetSearch = usernameWithAt.toLowerCase();

        const nickCheck = await getDocs(query(collection(db, 'users'), where('usernameLowercase', '==', targetSearch), limit(1)));
        if (!nickCheck.empty) {
          toast({ title: "Никнейм занят", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const regEmail = vkId ? `vk_${vkId}@nuxus.chat` : finalEmail;
        const regPass = vkId ? `vk_quantum_${vkId}_secure_signal_v3` : password;
        
        const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPass);
        
        const profileData = {
          id: userCredential.user.uid,
          name: name.trim(),
          username: usernameWithAt,
          usernameLowercase: targetSearch,
          phone: cleanPhone,
          email: identifier.includes('@') ? identifier.trim() : null,
          vkId: vkId,
          createdAt: new Date().toISOString(),
          isPremium: false,
          balance: 0,
          settings: { theme: 'default', appearance: 'dark' }
        };

        await setDoc(doc(db, 'users', userCredential.user.uid), profileData);
        setIs2FAVerified(true);
        toast({ title: "Узел создан" });
      }
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#020203] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(168,85,247,0.15)_0%,transparent_50%)] pointer-events-none" />
      
      <ScrollArea className="w-full h-full">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-12 relative z-10 animate-in fade-in duration-1000">
          <div className="mb-10">
            <NuxusLogo size={90} />
          </div>

          <Card className="w-full max-w-[380px] border-white/[0.08] bg-white/[0.02] backdrop-blur-[40px] shadow-2xl rounded-[3rem] overflow-hidden relative border-2 z-20">
            <CardHeader className="text-center pb-2 pt-10 px-8">
              <div className="flex bg-white/5 p-1 rounded-2xl mb-6 border border-white/5">
                <button type="button" onClick={() => setMode('login')} className={cn("flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", mode === 'login' ? "bg-primary text-white" : "text-white/30")}>Вход</button>
                <button type="button" onClick={() => setMode('register')} className={cn("flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", mode === 'register' ? "bg-primary text-white" : "text-white/30")}>Регистрация</button>
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
                       <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                       <Input placeholder="+7..." value={identifier} onChange={e => setIdentifier(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 font-bold" required />
                    </div>
                  </div>

                  {!vkId && (
                    <div className="space-y-1.5 text-left">
                      <Label className="text-[8px] uppercase font-black text-primary/60 ml-4 tracking-widest">Пароль</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                        <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 font-bold" required={!vkId} />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

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
                  
                  <div className="space-y-4">
                     <div className="flex items-center gap-4 px-2">
                        <div className="h-px flex-1 bg-white/5" />
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">или войти через</span>
                        <div className="h-px flex-1 bg-white/5" />
                     </div>
                     
                     {/* КРИТИЧЕСКИЙ ФИКС: Белая подложка для видимости на темном фоне */}
                     <div className="relative w-full min-h-[52px] z-[100] flex justify-center items-center">
                        <div 
                          ref={vkidContainerRef} 
                          className="w-full max-w-[320px] min-h-[48px] rounded-xl overflow-visible shadow-xl cursor-pointer" 
                          style={{ 
                            pointerEvents: 'auto', 
                            display: 'block',
                            backgroundColor: '#FFFFFF', // Гарантирует видимость кнопки
                            borderRadius: '12px'
                          }}
                        />
                     </div>
                  </div>
                </div>
              </form>

              <div className="mt-10 flex flex-col items-center gap-3">
                 <button type="button" onClick={() => setIsLegalOpen(true)} className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-primary transition-colors py-1">Политика конфиденциальности</button>
                 <div className="flex items-center gap-3 opacity-30">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span className="text-[7px] font-black uppercase tracking-[0.4em] text-white">Quantum Link 56.6.6</span>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      <LegalModal open={isLegalOpen} onOpenChange={setIsLegalOpen} />
    </div>
  );
}
