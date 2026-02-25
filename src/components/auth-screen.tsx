"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageSquareText, Loader2, Smartphone, Lock, UserCircle, AtSign } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';

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

  const validatePhone = (phone: string) => {
    // Удаляем всё кроме цифр и проверяем длину
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const phoneId = formData.phone.replace(/\D/g, '');
    
    if (!phoneId || !formData.password) {
      toast({ title: "Ошибка", description: "Заполните телефон и пароль", variant: "destructive" });
      return;
    }

    if (!validatePhone(formData.phone)) {
      toast({ title: "Ошибка", description: "Введите корректный номер телефона (минимум 10 цифр)", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    
    // Используем телефон как email для Firebase Auth (внутренний идентификатор)
    const loginEmail = `${phoneId}@nuxus.chat`;

    try {
      if (mode === 'register') {
        if (!formData.name || !formData.username) {
          toast({ title: "Ошибка", description: "Заполните имя и ник", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        let username = formData.username.trim().toLowerCase();
        if (!username.startsWith('@')) username = '@' + username;

        // 1. Проверка уникальности Username в Firestore
        const usernameQuery = query(collection(db, 'users'), where('username', '==', username));
        const usernameSnapshot = await getDocs(usernameQuery);
        
        if (!usernameSnapshot.empty) {
          toast({ 
            title: "Ник занят", 
            description: "Это имя пользователя уже используется. Выберите другое.", 
            variant: "destructive" 
          });
          setIsLoading(false);
          return;
        }

        // 2. Создание пользователя в Firebase Auth
        const result = await createUserWithEmailAndPassword(auth, loginEmail, formData.password);
        
        // 3. Сохранение профиля в Firestore
        const userProfile = {
          id: result.user.uid,
          name: formData.name.trim(),
          username: username,
          phone: formData.phone.trim(),
          createdAt: new Date().toISOString(),
          avatarUrl: null
        };

        await setDoc(doc(db, 'users', result.user.uid), userProfile);
        toast({ title: "Успех", description: "Аккаунт успешно создан!" });
      } else {
        // Вход по логину (телефону) и паролю
        await signInWithEmailAndPassword(auth, loginEmail, formData.password);
        toast({ title: "С возвращением!", description: "Вы успешно вошли." });
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      let message = "Произошла ошибка при входе.";
      
      if (error.code === 'auth/email-already-in-use') {
        message = "Этот номер телефона уже зарегистрирован.";
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        message = "Неверный номер телефона или пароль.";
      } else if (error.code === 'auth/weak-password') {
        message = "Пароль слишком простой (нужно от 6 символов).";
      }

      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background">
      <Card className="w-full max-w-sm border-primary/20 bg-card/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
              <MessageSquareText className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">NuxusChat</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Полное имя</Label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="name"
                      placeholder="Иван Иванов" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="bg-muted/30 pl-9 h-11 rounded-xl"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Имя пользователя</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="username"
                      placeholder="username" 
                      value={formData.username} 
                      onChange={e => setFormData({...formData, username: e.target.value.replace(/\s/g, '').toLowerCase()})}
                      className="bg-muted/30 pl-9 h-11 rounded-xl"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Номер телефона</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="phone"
                  placeholder="+7 (999) 000-00-00" 
                  type="tel"
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="bg-muted/30 pl-9 h-11 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="password"
                  placeholder="••••••••" 
                  type="password"
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="bg-muted/30 pl-9 h-11 rounded-xl"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-md font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 mt-4 rounded-xl"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? "Войти" : "Создать аккаунт")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors py-2"
            >
              {mode === 'login' ? "Ещё нет аккаунта? Создать" : "Уже есть аккаунт? Войти"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
