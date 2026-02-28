
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Hexagon, Zap, Loader2, UserCircle, AtSign, Lock, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs, limit, getDoc } from 'firebase/firestore';
import { useTranslations } from '@/hooks/use-translations';

type AuthMode = 'login' | 'register';

// Номера телефонов, которые ведут в основной аккаунт Nuxus Prime
const ADMIN_PHONES = ['79513332147', '89513332147', '79508784513', '89508784513'];

export default function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslations();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    identifier: '', 
    password: ''
  });

  const getVirtualEmail = (id: string) => {
    const input = id.trim().toLowerCase();
    if (input.includes('@')) return input;
    let digits = input.replace(/\D/g, '');
    
    // ПРИНУДИТЕЛЬНОЕ ОБЪЕДИНЕНИЕ: все админ-номера ведут в один корень Nuxus Prime
    if (ADMIN_PHONES.includes(digits)) {
      return 'nuxus_prime_official_v5@nuxus.app'; 
    }
    
    if (digits.length === 11 && digits.startsWith('8')) {
      digits = '7' + digits.slice(1);
    }
    return `${digits}@nuxus.app`;
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

      if (mode === 'register') {
        let userCredential;
        try {
          userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, formData.password);
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            userCredential = await signInWithEmailAndPassword(auth, virtualEmail, formData.password);
          } else {
            throw authErr;
          }
        }

        const user_auth = userCredential.user;
        const isAdminUser = ADMIN_PHONES.includes(normalizedPhone);

        // Обновляем или создаем профиль
        await setDoc(doc(db, 'users', user_auth.uid), {
          id: user_auth.uid,
          name: formData.name || (isAdminUser ? 'Nuxus Prime' : 'User'),
          username: formData.username ? (formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + formData.username.toLowerCase()) : (isAdminUser ? '@admin' : `@user_${user_auth.uid.slice(0, 5)}`),
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

        toast({ title: "Успех", description: isAdminUser ? "Добро пожаловать, Nuxus Prime!" : "Добро пожаловать в Nuxus!" });
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
        description: mode === 'login' ? "Неверный логин или пароль. Попробуйте вкладку Регистрация для первого входа." : err.message, 
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
          <div className="bg-primary p-6 rounded-[2.5rem] shadow-2xl shadow-primary/40 animate-float relative overflow-hidden group">
            <Hexagon className="w-16 h-16 text-white" />
            <Zap className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fill-white" />
          </div>
        </div>

        <Card className="border-white/5 bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden border">
          <CardHeader className="text-center pb-2 pt-10">
            <CardTitle className="text-6xl font-black tracking-tighter text-white uppercase italic leading-none drop-shadow-2xl">
              {t('auth.title')}
            </CardTitle>
            <CardDescription className="text-muted-foreground/60 mt-4 font-bold tracking-[0.4em] uppercase text-[10px]">
              {mode === 'login' ? t('auth.subtitle') : 'IDENTITY CREATION'}
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
                  <Input placeholder="8 9XX... или email" value={formData.identifier} onChange={e => setFormData({...formData, identifier: e.target.value})} className="bg-white/5 border-white/10 pl-10 h-14 rounded-2xl" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1">ПАРОЛЬ</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 pl-10 h-14 rounded-2xl" required />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full h-14 text-xs font-black uppercase tracking-[0.2em] bg-primary hover:bg-primary/90 rounded-2xl transition-all shadow-xl shadow-primary/30">
                {isLoading ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <span className="flex items-center gap-2">
                    {mode === 'login' ? t('auth.login') : t('auth.register')} <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
            
            <div className="mt-8 text-center">
              <button 
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')} 
                className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors font-black uppercase tracking-widest"
              >
                {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
