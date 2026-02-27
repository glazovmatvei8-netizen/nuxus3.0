
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageSquareText, Loader2, Smartphone, UserCircle, AtSign, Lock, ArrowRight, HelpCircle } from 'lucide-react';
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
        
        // Проверка уникальности ника
        const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          toast({ title: "Ник занят", description: "Этот @username уже используется", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const result = await createUserWithEmailAndPassword(auth, virtualEmail, formData.password);
        const user = result.user;

        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          name: formData.name,
          username: username,
          phone: fullPhone,
          avatarUrl: `https://picsum.photos/seed/${user.uid}/200`,
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          isBanned: false,
          settings: {
            theme: 'default',
            chatBackground: 'default',
            messageSize: 'medium',
            privacy: {
              phoneVisibility: 'nobody',
              lastSeenVisibility: 'everybody',
              allowGroupsFrom: 'everybody'
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
      console.error("Auth Error:", err.code, err.message);
      
      let errorMessage = "Проверьте данные или включите Email/Password в Firebase Console";
      if (err.code === 'auth/operation-not-allowed') {
        errorMessage = "Метод входа отключен. Включите Email/Password в консоли Firebase.";
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = "Этот номер уже зарегистрирован. Попробуйте войти.";
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = "Неверный пароль.";
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = "Аккаунт не найден.";
      } else if (err.code === 'auth/admin-restricted-operation') {
        errorMessage = "Операция ограничена. Проверьте настройки доменов в Firebase.";
      }

      toast({ 
        title: `Ошибка: ${err.code}`, 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background">
      <Card className="w-full max-sm:max-w-none max-w-sm border-primary/20 bg-card/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20 animate-in zoom-in-50 duration-500">
              <MessageSquareText className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">NuxusChat</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Вход по номеру и паролю' : 'Создать новый аккаунт'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground ml-1">Ваше имя</Label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Имя" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-muted/30 pl-9 rounded-xl" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground ml-1">Желаемый никнейм</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="@username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-muted/30 pl-9 rounded-xl" required />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground ml-1">Номер телефона</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="+7 900 000 00 00" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-muted/30 pl-9 rounded-xl" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground ml-1">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder="Мин. 6 символов" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-muted/30 pl-9 rounded-xl" required />
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full h-12 text-md font-bold shadow-lg shadow-primary/20 rounded-xl transition-all active:scale-95">
              {isLoading ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-2">{mode === 'login' ? 'Войти' : 'Начать общение'} <ArrowRight className="w-4 h-4" /></span>}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
              {mode === 'login' ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
            </button>
          </div>
          
          <div className="mt-6 flex items-start gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
            <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-tight">
              Если возникает ошибка, убедитесь, что в Firebase Console включен метод "Электронная почта/пароль".
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
