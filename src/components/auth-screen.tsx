
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff, ShieldCheck, User as UserIcon, Link as LinkIcon } from 'lucide-react';
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
 * AuthScreen V56.9.1 «SDK SYNC FIX»
 * ИСПРАВЛЕНО: Ошибка "VK SDK не готов" устранена за счет инициализации при клике.
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

  const handleVkLogin = () => {
    const VKID = (window as any).VKIDSDK;
    if (!VKID) {
      toast({ title: "SDK VK еще загружается", description: "Подождите пару секунд...", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      // Инициализируем конфиг ПРЯМО ПЕРЕД входом
      VKID.Config.init({
        app: 54684553,
        redirectUrl: 'https://nuxus.fun',
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: '', 
      });

      VKID.Auth.login()
        .then((data: any) => {
          handleVkSuccess(data);
        })
        .catch((err: any) => {
          console.error("VK Login Error:", err);
          setIsLoading(false);
          toast({ title: "Сбой входа VK", variant: "destructive" });
        });
    } catch (e) {
      setIsLoading(false);
      toast({ title: "Ошибка инициализации SDK", variant: "destructive" });
    }
  };

  const handleVkSuccess = async (data: any) => {
    if (!db || !auth) return;

    try {
      const vId = data.user_id || data.id;
      const vName = data.user?.first_name ? `${data.user.first_name} ${data.user.last_name || ''}` : "VK User";
      const phoneNumber = data.user?.phone || "";
      
      const vkEmail = `vk_${vId}@nuxus.chat`;
      const vkPass = `vk_quantum_${vId}_secure_signal_v3`;

      // 1. ПРИОРИТЕТ: Прямой поиск по VK ID
      const vkQuery = query(collection(db, 'users'), where('vkId', '==', vId), limit(1));
      const vkSnap = await getDocs(vkQuery);

      if (!vkSnap.empty) {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, vkEmail, vkPass);
        setIs2FAVerified(true);
        toast({ title: "Вход выполнен через VK" });
        setIsLoading(false);
        return;
      }

      // 2. ВТОРИЧНО: Предложение связки, если номер совпадает
      if (phoneNumber) {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const phoneQuery = query(collection(db, 'users'), where('phone', '==', cleanPhone), limit(1));
        const phoneSnap = await getDocs(phoneQuery);
        
        if (!phoneSnap.empty) {
          toast({ title: "Узел Обнаружен", description: "Введите пароль для привязки вашего VK." });
          setIdentifier(phoneNumber);
          setMode('login');
          setVkId(vId); 
          setIsLoading(false);
          return;
        }
      }

      // 3. ТРЕТИЧНО: Новый узел
      setMode('register');
      setName(vName);
      setIdentifier(phoneNumber || '');
      setVkId(vId);
      toast({ title: "Сигнал получен", description: "Выберите никнейм для завершения." });
      
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
    return cleanPhone ? `${cleanPhone}@nuxus.chat` : val; 
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
          const userRef = doc(db, 'users', userCredential.user.uid);
          
          if (vkId) {
            await updateDoc(userRef, { vkId });
            toast({ title: "VK ID успешно привязан" });
          }
          
          setIs2FAVerified(true);
          toast({ title: "Доступ разрешен" });
        } catch (err: any) {
          toast({ title: "Ошибка входа", description: "Проверьте данные.", variant: "destructive" });
        }
      } else {
        if (!name.trim() || !username.trim()) {
          toast({ title: "Заполните все поля", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const usernameWithAt = '@' + username.trim().replace('@', '');
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
          email: identifier.includes('@') ? identifier.trim() : (vkId ? null : finalEmail),
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
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-12 relative z-10">
          <div className="mb-10">
            <NuxusLogo size={90} />
          </div>

          <Card className="w-full max-w-[420px] border-white/[0.08] bg-white/[0.02] backdrop-blur-[40px] shadow-2xl rounded-[3rem] overflow-hidden relative border-2 z-20">
            <CardHeader className="text-center pb-2 pt-10 px-8">
              <div className="grid grid-cols-2 bg-white/5 p-1 rounded-2xl mb-8 border border-white/5 w-full relative">
                <button 
                  type="button" 
                  onClick={() => setMode('login')} 
                  className={cn(
                    "h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all z-10", 
                    mode === 'login' ? "bg-primary text-white shadow-lg" : "text-white/30 hover:bg-white/5"
                  )}
                >
                  Вход
                </button>
                <button 
                  type="button" 
                  onClick={() => setMode('register')} 
                  className={cn(
                    "h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all z-10", 
                    mode === 'register' ? "bg-primary text-white shadow-lg" : "text-white/30 hover:bg-white/5"
                  )}
                >
                  Регистрация
                </button>
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
                      <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 font-bold" required={!vkId || mode === 'login'} />
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
                  
                  {mode === 'register' && vkId && (
                    <button 
                      type="button" 
                      onClick={() => setMode('login')}
                      className="w-full flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors py-2"
                    >
                      <LinkIcon className="w-3 h-3" /> Привязать к существующему узлу
                    </button>
                  )}

                  <div className="space-y-6 pt-2">
                     <div className="flex items-center gap-4 px-2">
                        <div className="h-px flex-1 bg-white/5" />
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">или войти через</span>
                        <div className="h-px flex-1 bg-white/5" />
                     </div>
                     
                     <div className="flex justify-center w-full">
                        <button 
                          type="button"
                          onClick={handleVkLogin}
                          disabled={isLoading}
                          className="flex items-center justify-center gap-3 bg-[#0077ff] hover:bg-[#0066dd] text-white rounded-[1.2rem] px-8 py-3.5 font-bold transition-all shadow-xl active:scale-95 disabled:opacity-50 min-w-[280px]"
                        >
                          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.598-.19 1.365 1.26 2.18 1.817.615.422 1.083.33 1.083.33l2.177-.03s1.14-.071.6-.972c-.044-.073-.314-.66-1.617-1.866-1.364-1.26-1.183-1.055.462-3.23.998-1.332 1.397-2.144 1.272-2.493-.12-.333-.862-.244-.862-.244l-2.45.015s-.182-.025-.316.056c-.132.08-.217.267-.217.267s-.39 1.037-.91 1.92c-1.094 1.84-1.532 1.937-1.713 1.82-.42-.27-.315-1.087-.315-1.666 0-1.812.275-2.568-.536-2.764-.27-.065-.467-.108-1.155-.115-.882-.01-1.63.003-2.054.21-.282.14-.498.45-.366.468.164.023.535.1.732.365.254.34.245 1.103.245 1.103s.146 2.13-.34 2.395c-.334.183-.792-.19-1.775-1.896-.504-.87-.886-1.83-.886-1.83s-.074-.18-.206-.276c-.16-.12-.384-.157-.384-.157l-2.33.015s-.35.01-.478.162c-.115.137-.008.42-.008.42s1.834 4.286 3.91 6.45c1.903 1.984 4.067 1.85 4.067 1.85h.98z"/>
                              </svg>
                              <span className="uppercase text-[11px] tracking-widest font-black">Войти через VK</span>
                            </>
                          )}
                        </button>
                     </div>
                  </div>
                </div>
              </form>

              <div className="mt-10 flex flex-col items-center gap-3">
                 <button type="button" onClick={() => setIsLegalOpen(true)} className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-primary transition-colors py-1">Политика конфиденциальности</button>
                 <div className="flex items-center gap-3 opacity-30">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span className="text-[7px] font-black uppercase tracking-[0.4em] text-white">Quantum Link 56.9.1</span>
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
