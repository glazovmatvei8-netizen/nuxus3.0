
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Hexagon, Zap, Loader2, UserCircle, AtSign, Lock, ArrowRight, Mail } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register' | 'prime';

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
    password: ''
  });

  const getVirtualEmail = (id: string) => {
    const input = id.trim().toLowerCase();
    
    // В режиме PRIME всегда используем мастер-email, который ведет на UID GCv...
    if (mode === 'prime') {
      return 'nuxus_prime_master_root_v5@nuxus.app'; 
    }
    
    if (input.includes('@')) return input;
    let digits = input.replace(/\D/g, '');
    
    // Обычный вход для админ-номеров (если не в режиме Prime) ведет в обычные аккаунты
    if (digits.length === 11 && digits.startsWith('8')) {
      digits = '7' + digits.slice(1);
    }
    return `${digits}@nuxus.app`;
  };

  const handleLogoClick = () => {
    setClickCount(prev => prev + 1);
    if (clickCount + 1 >= 5) {
      setMode('prime');
      toast({ 
        title: "PRIME ACCESS ACTIVATED", 
        description: "Теперь вы можете войти в ядро Nuxus Prime с любого админ-номера" 
      });
      setClickCount(0);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const virtualEmail = getVirtualEmail(formData.identifier);
    const normalizedPhone = !formData.identifier.includes('@') ? formData.identifier.replace(/\D/g, '') : '';

    if (!formData.identifier.trim()) {
      toast({ title: "Ошибка", description: "Введите данные для входа", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);

      let userCredential;
      const isPrimeTarget = mode === 'prime';

      // Если мы в режиме Prime или Register, пытаемся войти или создать мастер-аккаунт
      if (mode === 'register' || isPrimeTarget) {
        try {
          // Сначала пробуем войти
          userCredential = await signInWithEmailAndPassword(auth, virtualEmail, formData.password);
        } catch (err: any) {
          if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
             // Если не нашли - создаем (или пароль другой, тогда создаем/обновляем если это админ-номер)
             userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, formData.password);
          } else {
            throw err;
          }
        }

        const user_auth = userCredential.user;
        const isAdminUser = isPrimeTarget;

        // Принудительно ставим правильные данные для Nuxus Prime (UID GCv... всегда будет иметь эти данные)
        await setDoc(doc(db, 'users', user_auth.uid), {
          id: user_auth.uid,
          name: isAdminUser ? 'Nuxus Prime' : (formData.name || 'User'),
          username: isAdminUser ? '@vnctow46' : (formData.username || `@user_${user_auth.uid.slice(0, 5)}`),
          phone: normalizedPhone ? '+' + normalizedPhone : '',
          avatarUrl: `https://picsum.photos/seed/${user_auth.uid}/200`,
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          isBanned: false,
          isPremium: isAdminUser,
          isAdmin: isAdminUser,
          settings: {
            theme: 'default',
            chatBackground: 'default',
            messageSize: 'medium',
            language: 'ru',
            privacy: {
              phoneVisibility: 'nobody',
              lastSeenVisibility: 'everybody',
              allowGroupsFrom: 'everybody',
              whoCanMessageMe: 'everybody'
            }
          }
        }, { merge: true });

        toast({ title: "Успех", description: isAdminUser ? "Добро пожаловать, Nuxus Prime (@vnctow46)!" : "Добро пожаловать в Nuxus!" });
      } else {
        const result = await signInWithEmailAndPassword(auth, virtualEmail, formData.password);
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        
        if (userDoc.exists() && userDoc.data()?.isBanned) {
          toast({ title: "Доступ запрещен", description: "Аккаунт заблокирован", variant: "destructive" });
          await auth.signOut();
          setIsLoading(false);
          return;
        }
        
        toast({ title: "Вход выполнен", description: `С возвращением, ${userDoc.data()?.name || 'User'}` });
      }
    } catch (err: any) {
      toast({ 
        title: "Ошибка", 
        description: "Неверный логин или пароль. Если это первый вход, используйте 'Загрузить профиль'.", 
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
              mode === 'prime' ? "bg-accent shadow-accent/40 scale-110" : "bg-primary shadow-primary/40"
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
              mode === 'prime' ? "text-accent" : "text-white"
            )}>
              {mode === 'prime' ? 'PRIME' : t('auth.title')}
            </CardTitle>
            <CardDescription className="text-muted-foreground/60 mt-4 font-bold tracking-[0.4em] uppercase text-[10px]">
              {mode === 'prime' ? 'MASTER KERNEL ACCESS' : (mode === 'login' ? t('auth.subtitle') : 'IDENTITY CREATION')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-10 pb-12">
            <form onSubmit={handleAuth} className="space-y-6">
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

              <Button 
                type="submit" 
                disabled={isLoading} 
                className={cn(
                  "w-full h-14 text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl",
                  mode === 'prime' ? "bg-accent hover:bg-accent/90 shadow-accent/30" : "bg-primary hover:bg-primary/90 shadow-primary/30"
                )}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <span className="flex items-center gap-2">
                    {mode === 'prime' ? 'UNLOCK PRIME' : (mode === 'login' ? t('auth.login') : t('auth.register'))} <ArrowRight className="w-4 h-4" />
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
              {mode === 'prime' && (
                <button 
                  onClick={() => setMode('login')} 
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
