
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageSquareText, Loader2, Smartphone, UserCircle, AtSign, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';
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

  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => {
      if (recaptchaVerifier.current) {
        recaptchaVerifier.current.clear();
        recaptchaVerifier.current = null;
      }
    };
  }, []);

  const initRecaptcha = () => {
    if (!recaptchaVerifier.current && auth) {
      try {
        recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {}
        });
      } catch (err) {
        console.error("Recaptcha init error:", err);
      }
    }
  };

  const normalizePhone = (phone: string) => {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    if (!digits.startsWith('7') && digits.length === 10) digits = '7' + digits;
    return '+' + digits;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhone = normalizePhone(formData.phone);
    
    if (fullPhone.length < 11) {
      toast({ title: "Ошибка", description: "Введите корректный номер (например, +7...)", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'register') {
        const username = formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + formData.username.toLowerCase();
        const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          toast({ title: "Ник занят", description: "Выберите другой @username", variant: "destructive" });
          setIsLoading(false);
          return;
        }
      }

      initRecaptcha();
      if (!recaptchaVerifier.current) throw new Error("Не удалось инициализировать защиту ReCAPTCHA");

      const result = await signInWithPhoneNumber(auth, fullPhone, recaptchaVerifier.current);
      setConfirmationResult(result);
      setStep('code');
      toast({ title: "SMS отправлено", description: "Введите код из сообщения" });
    } catch (err: any) {
      console.error("Firebase Auth Error:", err);
      let errMsg = "Не удалось отправить SMS. ";
      if (err.code === 'auth/invalid-phone-number') errMsg += "Неверный формат номера.";
      else if (err.code === 'auth/too-many-requests') errMsg += "Слишком много попыток. Попробуйте позже.";
      else if (err.code === 'auth/operation-not-allowed') errMsg += "Вход по телефону не включен в консоли Firebase.";
      else errMsg += `Ошибка: ${err.code || err.message}`;
      
      toast({ title: "Ошибка", description: errMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !formData.code) return;

    setIsLoading(true);
    try {
      const result = await confirmationResult.confirm(formData.code);
      const user = result.user;

      if (mode === 'register') {
        const username = formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + formData.username.toLowerCase();
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          name: formData.name,
          username: username,
          phone: normalizePhone(formData.phone),
          avatarUrl: `https://picsum.photos/seed/user_${user.uid}/200`,
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
        toast({ title: "Успех", description: "Аккаунт создан!" });
      } else {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          toast({ title: "Ошибка", description: "Аккаунт не найден. Зарегистрируйтесь.", variant: "destructive" });
          await auth.signOut();
          setStep('phone');
          setMode('register');
        } else if (userDoc.data()?.isBanned) {
          toast({ title: "Доступ запрещен", description: "Ваш аккаунт заблокирован", variant: "destructive" });
          await auth.signOut();
          setStep('phone');
        }
      }
    } catch (err: any) {
      toast({ title: "Ошибка", description: "Неверный код подтверждения", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
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
            {step === 'phone' ? (mode === 'login' ? 'Вход по номеру' : 'Регистрация') : 'Подтверждение кода'}
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
                {isLoading ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-2">Отправить SMS <ArrowRight className="w-4 h-4" /></span>}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase text-muted-foreground ml-1">Код из SMS</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="123456" maxLength={6} value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="bg-muted/30 pl-9 rounded-xl tracking-[0.5em] font-bold text-center" required />
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-12 text-md font-bold shadow-lg shadow-primary/20 rounded-xl">
                {isLoading ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Подтвердить</span>}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep('phone')}>Назад к вводу номера</Button>
            </form>
          )}
          
          <div className="mt-4 text-center">
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setStep('phone'); }} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {mode === 'login' ? "Нет аккаунта? Регистрация" : "Уже есть аккаунт? Войти"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
