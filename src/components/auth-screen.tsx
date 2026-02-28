
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Hexagon, Zap, Loader2, UserCircle, AtSign, Lock, ArrowRight, Mail, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register' | 'prime' | 'root';

const MASTER_ROOT_EMAIL = 'nuxus_prime_master_root_v5@nuxus.app';
const PRIME_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

export default function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslations();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    identifier: '', 
    password: '',
    targetUid: '' 
  });

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount === 5) {
      setMode('prime');
      toast({ 
        title: "PRIME ACCESS ACTIVATED", 
        description: "Режим Мастер-логина активирован (5 кликов).",
        variant: "default"
      });
    } else if (newCount >= 10) {
      setMode('root');
      toast({ 
        title: "ROOT KERNEL UNLOCKED", 
        description: "Режим прямого входа по UID активирован (10 кликов).",
        variant: "destructive"
      });
    }
  };

  const getVirtualEmail = (id: string) => {
    if (mode === 'prime' || mode === 'root') {
      return MASTER_ROOT_EMAIL; 
    }
    const input = id.trim().toLowerCase();
    if (input.includes('@')) return input;
    let digits = input.replace(/\D/g, '');
    return `${digits}@nuxus.app`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      
      const virtualEmail = getVirtualEmail(formData.identifier);
      const masterPassword = formData.password || 'gaz20092';

      let userCredential;

      if (mode === 'prime' || mode === 'root') {
        try {
          userCredential = await signInWithEmailAndPassword(auth, virtualEmail, masterPassword);
        } catch (err: any) {
          // Если аккаунт не найден, пробуем создать его принудительно для Master Root
          userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, masterPassword);
        }

        const user_auth = userCredential.user;
        const targetId = mode === 'root' && formData.targetUid ? formData.targetUid : PRIME_UID;
        
        // ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ДАННЫХ ДЛЯ MASTER ROOT
        await setDoc(doc(db, 'users', targetId), {
          id: targetId,
          name: 'Nuxus Prime',
          username: '@vnctow46',
          phone: '+79513332147',
          avatarUrl: `https://picsum.photos/seed/nuxus-prime/200`,
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          isBanned: false,
          isPremium: true,
          isAdmin: true,
          settings: {
            theme: 'midnight',
            language: 'ru',
            privacy: {
              phoneVisibility: 'nobody',
              lastSeenVisibility: 'everybody',
              allowGroupsFrom: 'everybody',
              whoCanMessageMe: 'everybody'
            }
          }
        }, { merge: true });

        toast({ title: "ROOT SUCCESS", description: `Добро пожаловать в Ядро, Nuxus Prime (@vnctow46)!` });
      } else if (mode === 'register') {
        userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, masterPassword);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          id: userCredential.user.uid,
          name: formData.name || 'User',
          username: formData.username || `@user_${userCredential.user.uid.slice(0, 5)}`,
          phone: formData.identifier.replace(/\D/g, ''),
          createdAt: new Date().toISOString(),
          isBanned: false,
          isPremium: false,
          isAdmin: false
        });
        toast({ title: "Успех", description: "Профиль создан" });
      } else {
        await signInWithEmailAndPassword(auth, virtualEmail, masterPassword);
        toast({ title: "Вход выполнен" });
      }
    } catch (err: any) {
      toast({ 
        title: "Ошибка", 
        description: "Неверный логин или пароль. Убедитесь, что вы используете правильный пароль.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full -z-10 animate-pulse-glow" />
      
      <div className="w-full max-w-sm relative z-10">
        <div className="flex justify-center mb-10">
          <div 
            onClick={handleLogoClick}
            className={cn(
              "p-6 rounded-[2.5rem] shadow-2xl transition-all cursor-pointer animate-float relative overflow-hidden group",
              mode === 'prime' ? "bg-accent shadow-accent/40 scale-110" : 
              mode === 'root' ? "bg-red-500 shadow-red-500/40 scale-125 rotate-12" : "bg-primary shadow-primary/40"
            )}
          >
            <Hexagon className="w-16 h-16 text-white" />
            <Zap className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fill-white" />
          </div>
        </div>

        <Card className="border-white/5 bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden border">
          <CardHeader className="text-center pb-2 pt-10">
            <CardTitle className={cn(
              "text-6xl font-black tracking-tighter uppercase italic leading-none drop-shadow-2xl",
              mode === 'prime' ? "text-accent" : mode === 'root' ? "text-red-500" : "text-white"
            )}>
              {mode === 'root' ? 'ROOT' : mode === 'prime' ? 'PRIME' : t('auth.title')}
            </CardTitle>
            <CardDescription className="text-muted-foreground/60 mt-4 font-bold tracking-[0.4em] uppercase text-[10px]">
              {mode === 'root' ? 'KERNEL DIRECT OVERRIDE' : mode === 'prime' ? 'MASTER KERNEL ACCESS' : t('auth.subtitle')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-10 pb-12">
            <form onSubmit={handleAuth} className="space-y-6">
              {mode === 'root' ? (
                <div className="space-y-4">
                   <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-red-400 ml-1">MASTER UID</Label>
                    <div className="relative group">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                      <Input 
                        placeholder="GCvLucN8CjNcdaxPO2vmpZ84hNl1" 
                        value={formData.targetUid} 
                        onChange={e => setFormData({...formData, targetUid: e.target.value})} 
                        className="bg-red-500/5 border-red-500/20 pl-10 h-14 rounded-2xl text-red-200" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-red-400 ml-1">MASTER PASSWORD</Label>
                    <div className="relative group">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                      <Input 
                        type="password"
                        placeholder="••••••••" 
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                        className="bg-red-500/5 border-red-500/20 pl-10 h-14 rounded-2xl text-red-200" 
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {mode === 'register' && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1">{t('settings.labels.name')}</Label>
                        <div className="relative group">
                          <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input placeholder="Ваше Имя" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 pl-10 h-14 rounded-2xl" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1">{t('settings.labels.username')}</Label>
                        <div className="relative group">
                          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input placeholder="username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 pl-10 h-14 rounded-2xl" />
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1">ТЕЛЕФОН ИЛИ EMAIL</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input 
                        placeholder="8 9XX... или email" 
                        value={formData.identifier} 
                        onChange={e => setFormData({...formData, identifier: e.target.value})} 
                        className="bg-white/5 border-white/10 pl-10 h-14 rounded-2xl" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1">ПАРОЛЬ</Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 pl-10 h-14 rounded-2xl" required />
                    </div>
                  </div>
                </>
              )}

              <Button 
                type="submit" 
                disabled={isLoading} 
                className={cn(
                  "w-full h-14 text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl",
                  mode === 'root' ? "bg-red-600 hover:bg-red-700 shadow-red-600/30" :
                  mode === 'prime' ? "bg-accent hover:bg-accent/90 shadow-accent/30" : 
                  "bg-primary hover:bg-primary/90 shadow-primary/30"
                )}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <span className="flex items-center gap-2">
                    {mode === 'root' ? 'INITIATE OVERRIDE' : mode === 'prime' ? 'UNLOCK PRIME' : (mode === 'login' ? t('auth.login') : t('auth.register'))} <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
            
            <div className="mt-8 text-center flex flex-col gap-2">
              <button 
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')} 
                className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors font-black uppercase tracking-widest"
              >
                {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
              </button>
              <button 
                onClick={() => setMode('register')} 
                className="text-[10px] text-accent/60 hover:text-accent transition-colors font-black uppercase tracking-widest mt-2"
              >
                Восстановить аккаунт
              </button>
              {(mode === 'prime' || mode === 'root') && (
                <button 
                  onClick={() => { setMode('login'); setClickCount(0); }} 
                  className="text-[10px] text-accent/60 hover:text-accent transition-colors font-black uppercase tracking-widest"
                >
                  Вернуться к обычному входу
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
