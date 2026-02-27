"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageSquareText, Loader2, Smartphone, UserCircle, AtSign, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
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

  const normalizePhone = (phone: string) => {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    if (!digits.startsWith('7') && digits.length === 10) digits = '7' + digits;
    if (!digits.startsWith('7')) digits = '7' + digits;
    return '+' + digits;
  };

  const getVirtualEmail = (phone: string) => {
    const digits = normalizePhone(phone).replace('+', '');
    return `${digits}@nuxus.chat`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhone = normalizePhone(formData.phone);
    
    if (fullPhone.length < 11) {
      toast({ title: "Ошибка", description: "Введите корректный номер (+7...)", variant: "destructive" });
      return;
    }

    if (formData.password.length < 6) {
      toast({ title: "Ошибка", description: "Пароль слишком короткий (мин. 6 симв.)", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const virtualEmail = getVirtualEmail(formData.phone);

    try {
      await setPersistence(auth, browserLocalPersistence);

      if (mode === 'register') {
        const username = formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + formData.username.toLowerCase();
        
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
          name: formData.name,
          username: username,
          phone: fullPhone,
          avatarUrl: `https://picsum.photos/seed/${user.uid}/200`,
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          isBanned: false,
          isPremium: fullPhone === '+79513332147',
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
        });
        toast({ title: "Успех", description: "Аккаунт создан! Добро пожаловать." });
      } else {
        const result = await signInWithEmailAndPassword(auth, virtualEmail, formData.password);
        const user = result.user;

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data()?.isBanned) {
          toast({ title: "Доступ запрещен", description: "Ваш аккаунт заблокирован", variant: "destructive" });
          await auth.signOut();
        }
      }
    } catch (err: any) {
      toast({ 
        title: `Ошибка: ${err.code || 'System'}`, 
        description: "Проверьте данные или соединение.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Футуристичные блюр-акценты */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full -z-10" />
      
      <div className="w-full max-w-sm relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary blur-2xl opacity-20 animate-pulse" />
            <div className="bg-primary p-5 rounded-[2rem] shadow-2xl shadow-primary/30 relative animate-float">
              <MessageSquareText className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        <Card className="border-white/5 bg-card/40 backdrop-blur-2xl shadow-2xl rounded-[2rem] overflow-hidden">
          <CardHeader className="text-center pb-2 pt-8">
            <CardTitle className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">
              Nuxus<span className="text-primary">Chat</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground/60 mt-2 font-medium tracking-wide uppercase text-[10px]">
              {mode === 'login' ? 'Вход в систему' : 'Создание аккаунта'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleAuth} className="space-y-5">
              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1">Ваше имя</Label>
                    <div className="relative group">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input placeholder="Имя" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 pl-10 h-12 rounded-2xl focus:border-primary/50 transition-all" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1">Желаемый никнейм</Label>
                    <div className="relative group">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input placeholder="@username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 pl-10 h-12 rounded-2xl focus:border-primary/50 transition-all" required />
                    </div>
                  </div>
                </>
              )}
              
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1">Номер телефона</Label>
                <div className="relative group">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input placeholder="+7 900 000 00 00" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-white/5 border-white/10 pl-10 h-12 rounded-2xl focus:border-primary/50 transition-all" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1">Пароль</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 pl-10 h-12 rounded-2xl focus:border-primary/50 transition-all" required />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full h-14 text-xs font-black uppercase tracking-[0.2em] bg-primary hover:bg-primary/90 rounded-2xl transition-all shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95">
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
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-black uppercase tracking-widest"
              >
                {mode === 'login' ? "Нет аккаунта? Создать" : "Уже зарегистрированы? Войти"}
              </button>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground/40 text-[9px] uppercase font-bold tracking-[0.3em]">
          <ShieldCheck className="w-3 h-3" /> Secure Nuxus Connection
        </div>
      </div>
    </div>
  );
}