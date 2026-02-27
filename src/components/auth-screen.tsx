
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageSquareText, Loader2, Smartphone, UserCircle, AtSign, CheckCircle2 } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult 
} from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs, limit, getDoc } from 'firebase/firestore';

type AuthStep = 'phone' | 'code';
type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<AuthStep>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    code: ''
  });

  // Инициализация ReCAPTCHA
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved
        }
      });
    }
  }, [auth]);

  const normalizePhone = (phone: string) => {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) {
      digits = '7' + digits.substring(1);
    }
    if (!digits.startsWith('7') && digits.length === 10) {
      digits = '7' + digits;
    }
    return digits.startsWith('+') ? digits : `+${digits}`;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhone = normalizePhone(formData.phone);
    
    if (fullPhone.length < 11) {
      toast({ title: "Ошибка", description: "Введите корректный номер телефона", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    
    try {
      if (mode === 'register') {
        // Проверка ника
        const username = formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + formData.username.toLowerCase();
        const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          toast({ title: "Ник занят", description: "Выберите другой @username", variant: "destructive" });
          setIsLoading(false);
          return;
        }
      }

      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep('code');
      toast({ title: "Код отправлен", description: "Проверьте входящие SMS" });
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: "Ошибка", 
        description: err.code === 'auth/too-many-requests' ? "Слишком много попыток. Попробуйте позже." : "Не удалось отправить SMS. Проверьте номер.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || formData.code.length < 6) return;

    setIsLoading(true);
    try {
      const result = await confirmationResult.confirm(formData.code);
      const user = result.user;

      // Проверяем, существует ли профиль
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        if (mode === 'login') {
          // Если зашел старый пользователь по новому методу, но профиля нет - создаем дефолт
          await createProfile(user.uid, user.phoneNumber || formData.phone);
        } else {
          // Регистрация нового
          await createProfile(user.uid, user.phoneNumber || formData.phone);
        }
      } else if (userDoc.data()?.isBanned) {
        toast({ title: "Доступ запрещен", description: "Ваш аккаунт заблокирован", variant: "destructive" });
        await auth.signOut();
      }
    } catch (err: any) {
      toast({ title: "Ошибка кода", description: "Неверный код из SMS", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const createProfile = async (uid: string, phone: string) => {
    const username = formData.username || `@user_${uid.slice(0, 5)}`;
    const finalUsername = username.startsWith('@') ? username.toLowerCase() : '@' + username.toLowerCase();
    
    await setDoc(doc(db, 'users', uid), {
      id: uid,
      name: formData.name || 'Пользователь',
      username: finalUsername,
      phone: phone,
      avatarUrl: `https://picsum.photos/seed/user_${uid}/200`,
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
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background">
      <div id="recaptcha-container"></div>
      
      <Card className="w-full max-sm:max-w-none max-w-sm border-primary/20 bg-card/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
              <MessageSquareText className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">NuxusChat</CardTitle>
          <CardDescription>
            {step === 'phone' ? (mode === 'login' ? 'Вход по номеру' : 'Регистрация') : 'Подтверждение'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase text-muted-foreground ml-1">Имя</Label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Имя Фамилия" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-muted/30 pl-9 rounded-xl" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase text-muted-foreground ml-1">Никнейм</Label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="@username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-muted/30 pl-9 rounded-xl" required />
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs uppercase text-muted-foreground ml-1">Телефон</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="+7 900 123 45 67" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-muted/30 pl-9 rounded-xl" required />
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-12 text-md font-bold shadow-lg shadow-primary/20 rounded-xl">
                {isLoading ? <Loader2 className="animate-spin" /> : "Получить код в SMS"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase text-muted-foreground ml-1">Код из SMS</Label>
                <div className="relative">
                  <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="000000" 
                    maxLength={6} 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value})} 
                    className="bg-muted/30 pl-9 rounded-xl tracking-[0.5em] text-center font-bold text-lg" 
                    required 
                  />
                </div>
              </div>
              <Button type="submit" disabled={isLoading || formData.code.length < 6} className="w-full h-12 text-md font-bold shadow-lg shadow-primary/20 rounded-xl">
                {isLoading ? <Loader2 className="animate-spin" /> : "Подтвердить"}
              </Button>
              <Button variant="ghost" className="w-full text-xs" onClick={() => setStep('phone')} disabled={isLoading}>
                Изменить номер
              </Button>
            </form>
          )}
          
          {step === 'phone' && (
            <div className="mt-4 text-center">
              <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {mode === 'login' ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
