"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageSquareText, Loader2, Smartphone, UserCircle, AtSign, Lock, ArrowRight, HelpCircle, AlertTriangle } from 'lucide-react';
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
  const [lastError, setLastError] = useState<string | null>(null);
  
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
    setLastError(null);
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
      setLastError(err.code || "unknown");
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full animate-pulse" />
      
      <Card className="w-full max-sm:max-w-none max-w-sm border-white/5 bg-card/40 backdrop-blur-3xl shadow-2xl relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary animate-shimmer" />
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-primary to-primary/80 p-4 rounded-3xl shadow-2xl shadow-primary/40 animate-float">
              <MessageSquareText className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black tracking-tighter text-white uppercase italic">NuxusChat</CardTitle>
          <CardDescription className="text-muted-foreground/80 mt-1">
            {mode === 'login' ? 'Вход в систему' : 'Создание аккаунта'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Ваше имя</Label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <Input placeholder="Имя" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 pl-10 rounded-2xl focus:ring-1 focus:ring-primary/50" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Желаемый никнейм</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <Input placeholder="@username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 pl-10 rounded-2xl focus:ring-1 focus:ring-primary/50" required />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Номер телефона</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <Input placeholder="+7 900 000 00 00" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-white/5 border-white/10 pl-10 rounded-2xl focus:ring-1 focus:ring-primary/50" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 pl-10 rounded-2xl focus:ring-1 focus:ring-primary/50" required />
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full h-14 text-md font-black uppercase tracking-tighter bg-gradient-to-r from-primary to-primary/80 shadow-2xl shadow-primary/20 rounded-2xl transition-all active:scale-95 group">
              {isLoading ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-2">{mode === 'login' ? 'Войти' : 'Начать'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-sm text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-widest">
              {mode === 'login' ? "Создать аккаунт" : "Уже есть аккаунт?"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}