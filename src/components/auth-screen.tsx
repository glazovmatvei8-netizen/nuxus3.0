
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
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
  }, [auth]);

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({ title: "Ошибка", description: "Введите корректный номер телефона", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setStep('code');
      toast({ title: "Код отправлен", description: "Проверьте ваши SMS сообщения" });
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: "Ошибка SMS", 
        description: error.message || "Не удалось отправить код", 
        variant: "destructive" 
      });
      // Reset recaptcha on error
      if (window.recaptchaVerifier) {
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
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        toast({ title: "С возвращением!", description: "Вход выполнен успешно" });
      } else {
        setStep('profile');
      }
    } catch (error: any) {
      toast({ 
        title: "Ошибка кода", 
        description: "Неверный код подтверждения", 
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

      const username = profileForm.username.startsWith('@') ? profileForm.username : '@' + profileForm.username;

      const userProfile = {
        id: user.uid,
        name: profileForm.name,
        username: username,
        phone: user.phoneNumber || phoneNumber,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      toast({ title: "Готово!", description: "Ваш профиль создан" });
      // The auth state listener in layout/page will automatically handle the redirect
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
            {step === 'phone' && "Введите номер телефона для входа"}
            {step === 'code' && "Введите код из SMS"}
            {step === 'profile' && "Расскажите о себе"}
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
                />
              </div>
              <Button 
                onClick={handleSendCode} 
                disabled={isLoading}
                className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Отправить код"}
              </Button>
            </div>
          )}

          {step === 'code' && (
            <div className="space-y-4">
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Код из SMS (6 цифр)" 
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
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Завершить"}
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
