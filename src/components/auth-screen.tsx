
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Hexagon, Zap, Loader2, Smartphone, UserCircle, AtSign, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs, limit, getDoc } from 'firebase/firestore';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    password: ''
  });

  /**
   * Нормализация для базы данных.
   */
  const normalizePhoneForDb = (phone: string) => {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      if (digits.startsWith('8') || digits.startsWith('7')) {
        digits = '7' + digits.slice(1);
      }
    } else if (digits.length === 10) {
      digits = '7' + digits;
    }
    return '+' + digits;
  };

  /**
   * КРИТИЧЕСКИЙ ФИКС: Возвращаем старый формат Email для админа, 
   * чтобы восстановить чаты ("Чайник" и другие).
   */
  const getVirtualEmail = (phone: string) => {
    const rawDigits = phone.replace(/\D/g, '');
    
    // Если это номер админа, ГАРАНТИРОВАННО используем старый формат на 8...
    if (rawDigits.endsWith('9513332147')) {
      return '89513332147@nuxus.app';
    }

    // Для остальных используем стандарт на 7...
    let digits = rawDigits;
    if (digits.length === 11 && digits.startsWith('8')) {
      digits = '7' + digits.slice(1);
    }
    return `${digits}@nuxus.app`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const virtualEmail = getVirtualEmail(formData.phone);
    const dbPhone = normalizePhoneForDb(formData.phone);
    
    if (formData.phone.replace(/\D/g, '').length < 10) {
      toast({ title: "Ошибка", description: "Введите корректный номер", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);

      if (mode === 'register') {
        const username = formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + formData.username.toLowerCase();
        
        // Проверка уникальности ника
        const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          toast({ title: "Ник занят", description: "Этот @username уже используется", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        let user;
        try {
          const result = await createUserWithEmailAndPassword(auth, virtualEmail, formData.password);
          user = result.user;
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            const result = await signInWithEmailAndPassword(auth, virtualEmail, formData.password);
            user = result.user;
          } else {
            throw authErr;
          }
        }

        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          name: formData.name || 'Пользователь',
          username: username,
          phone: dbPhone,
          avatarUrl: `https://picsum.photos/seed/${user.uid}/200`,
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          isBanned: false,
          isPremium: dbPhone === '+79513332147',
          settings: {
            theme: 'default',
            chatBackground: 'default',
            messageSize: 'medium',
            privacy: {
              phoneVisibility: 'nobody',
              lastSeenVisibility: 'everybody',
              allowGroupsFrom: 'everybody',
              whoCanMessageMe: 'everybody'
            }
          }
        }, { merge: true });
        
        toast({ title: "Успех", description: "Добро пожаловать в Nuxus!" });
      } else {
        try {
          const result = await signInWithEmailAndPassword(auth, virtualEmail, formData.password);
          const user = result.user;

          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data()?.isBanned) {
            toast({ title: "Доступ запрещен", description: "Ваш аккаунт заблокирован", variant: "destructive" });
            await auth.signOut();
            setIsLoading(false);
            return;
          }
        } catch (err: any) {
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
            toast({ 
              title: "Ошибка входа", 
              description: "Проверьте номер и пароль. Мы вернули доступ к вашему старому аккаунту.", 
              variant: "destructive" 
            });
            setIsLoading(false);
            return;
          }
          throw err;
        }
      }
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full -z-10 animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/10 blur-[120px] rounded-full -z-10 animate-pulse-glow" style={{ animationDelay: '2s' }} />
      
      <div className="w-full max-w-sm relative z-10">
        <div className="flex justify-center mb-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="bg-primary p-6 rounded-[2rem] shadow-2xl shadow-primary/40 relative animate-float">
              <div className="relative">
                <Hexagon className="w-14 h-14 text-white" />
                <Zap className="w-7 h-7 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fill-white" />
              </div>
            </div>
          </div>
        </div>

        <Card className="border-white/5 bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden border">
          <CardHeader className="text-center pb-2 pt-10">
            <CardTitle className="text-6xl font-black tracking-tighter text-white uppercase italic leading-none">
              Nuxus
            </CardTitle>
            <CardDescription className="text-muted-foreground/60 mt-4 font-bold tracking-[0.4em] uppercase text-[10px]">
              {mode === 'login' ? 'Energy Authorization' : 'New Identity Core'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-10 pb-12">
            <form onSubmit={handleAuth} className="space-y-6">
              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1">Имя</Label>
                    <div className="relative group">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input placeholder="Ваше имя" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 pl-10 h-14 rounded-2xl focus:border-primary/50 transition-all" required={mode === 'register'} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1">Никнейм</Label>
                    <div className="relative group">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input placeholder="username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 pl-10 h-14 rounded-2xl focus:border-primary/50 transition-all" required={mode === 'register'} />
                    </div>
                  </div>
                </>
              )}
              
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1">Номер телефона</Label>
                <div className="relative group">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input placeholder="8 9XX XXX XX XX" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-white/5 border-white/10 pl-10 h-14 rounded-2xl focus:border-primary/50 transition-all" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1">Пароль</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 pl-10 h-14 rounded-2xl focus:border-primary/50 transition-all" required />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full h-14 text-xs font-black uppercase tracking-[0.25em] bg-primary hover:bg-primary/90 rounded-2xl transition-all shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95">
                {isLoading ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <span className="flex items-center gap-2">
                    {mode === 'login' ? 'Войти' : 'Создать'} <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
            
            <div className="mt-8 text-center">
              <button 
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')} 
                className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors font-black uppercase tracking-widest"
              >
                {mode === 'login' ? "Нет аккаунта? Регистрация" : "Уже есть аккаунт? Вход"}
              </button>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-10 flex items-center justify-center gap-3 text-muted-foreground/40 text-[9px] uppercase font-bold tracking-[0.4em]">
          <div className="w-8 h-[1px] bg-white/10" />
          <ShieldCheck className="w-3 h-3" /> Secure Nuxus Connection
          <div className="w-8 h-[1px] bg-white/10" />
        </div>
      </div>
    </div>
  );
}
