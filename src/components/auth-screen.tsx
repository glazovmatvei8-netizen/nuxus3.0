
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MessageSquareText, Loader2, Smartphone, CheckCircle2, UserCircle } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Extend Window interface for Recaptcha
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    grecaptcha: any;
  }
}

type AuthStep = 'phone' | 'code' | 'profile';

export default function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [step, setStep] = useState<AuthStep>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const [profileForm, setProfileForm] = useState({
    name: '',
    username: ''
  });

  // Initialize Recaptcha
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          },
          'expired-callback': () => {
            // Response expired. Ask user to solve reCAPTCHA again.
            if (window.recaptchaVerifier) {
              window.recaptchaVerifier.render().then(widgetId => {
                window.grecaptcha.reset(widgetId);
              });
            }
          }
        });
      } catch (error) {
        console.error("Recaptcha init error:", error);
      }
    }
    
    return () => {
      if (window.recaptchaVerifier) {
        // Optional cleanup if necessary
      }
    };
  }, [auth]);

  const handleSendCode = async () => {
    // Basic phone validation (must start with + and have digits)
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    if (formattedPhone.length < 10) {
      toast({ 
        title: "Ошибка", 
        description: "Введите корректный номер в международном формате (например, +79990001122)", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep('code');
      toast({ title: "Код отправлен", description: "Проверьте ваши SMS сообщения" });
    } catch (error: any) {
      console.error("SMS Error:", error);
      
      let errorMessage = "Не удалось отправить код. Убедитесь, что номер верный.";
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = "Неверный формат номера телефона. Используйте +7...";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Слишком много попыток. Попробуйте позже.";
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Вход по номеру телефона не включен в консоли Firebase.";
      }

      toast({ 
        title: "Ошибка SMS", 
        description: errorMessage, 
        variant: "destructive" 
      });

      // Reset recaptcha on error to allow retry
      if (window.recaptchaVerifier && window.grecaptcha) {
        window.recaptchaVerifier.render().then(widgetId => {
          window.grecaptcha.reset(widgetId);
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6 || !confirmationResult) {
      toast({ title: "Ошибка", description: "Введите 6-значный код", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      
      // Check if user profile exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        toast({ title: "С возвращением!", description: "Вход выполнен успешно" });
      } else {
        setStep('profile');
      }
    } catch (error: any) {
      console.error("Verification Error:", error);
      toast({ 
        title: "Ошибка кода", 
        description: "Неверный или просроченный код подтверждения", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!profileForm.name || !profileForm.username) {
      toast({ title: "Ошибка", description: "Заполните все поля", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Пользователь не найден");

      let username = profileForm.username.trim();
      if (!username.startsWith('@')) {
        username = '@' + username;
      }

      const userProfile = {
        id: user.uid,
        name: profileForm.name.trim(),
        username: username,
        phone: user.phoneNumber || phoneNumber,
        createdAt: new Date().toISOString(),
        avatarUrl: null
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      toast({ title: "Готово!", description: "Ваш профиль успешно создан" });
    } catch (error: any) {
      toast({ 
        title: "Ошибка профиля", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background">
      <div id="recaptcha-container"></div>
      
      <Card className="w-full max-w-md border-primary/20 bg-card/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
              <MessageSquareText className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">NuxusChat</CardTitle>
          <CardDescription>
            {step === 'phone' && "Введите номер в формате +7..."}
            {step === 'code' && "Код из SMS отправлен на ваш номер"}
            {step === 'profile' && "Представьтесь, чтобы начать общение"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {step === 'phone' && (
            <div className="space-y-4">
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="+7 (999) 000-00-00" 
                  value={phoneNumber} 
                  onChange={e => setPhoneNumber(e.target.value)}
                  className="bg-muted/30 border-muted-foreground/20 h-12 pl-10"
                  type="tel"
                />
              </div>
              <Button 
                onClick={handleSendCode} 
                disabled={isLoading}
                className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Получить код"}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground px-4">
                Нажимая «Получить код», вы подтверждаете согласие на получение сервисных SMS.
              </p>
            </div>
          )}

          {step === 'code' && (
            <div className="space-y-4">
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="000000" 
                  value={verificationCode} 
                  maxLength={6}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="bg-muted/30 border-muted-foreground/20 h-12 pl-10 tracking-[0.5em] text-center text-xl font-bold"
                />
              </div>
              <Button 
                onClick={handleVerifyCode} 
                disabled={isLoading}
                className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Подтвердить"}
              </Button>
              <Button 
                variant="link" 
                className="w-full text-muted-foreground" 
                onClick={() => setStep('phone')}
              >
                Изменить номер
              </Button>
            </div>
          )}

          {step === 'profile' && (
            <div className="space-y-4">
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Ваше имя" 
                  value={profileForm.name} 
                  onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                  className="bg-muted/30 border-muted-foreground/20 h-11 pl-10"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">@</span>
                <Input 
                  placeholder="username" 
                  value={profileForm.username} 
                  onChange={e => setProfileForm({...profileForm, username: e.target.value.replace(/\s/g, '')})}
                  className="bg-muted/30 border-muted-foreground/20 h-11 pl-8"
                />
              </div>
              <Button 
                onClick={handleCompleteProfile} 
                disabled={isLoading}
                className="w-full h-11 text-lg font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Завершить регистрацию"}
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
