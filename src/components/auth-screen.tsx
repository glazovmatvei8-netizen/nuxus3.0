
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageSquareText, Loader2, Smartphone, Lock, UserCircle, AtSign, ShieldCheck, UserX } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs, limit, deleteDoc } from 'firebase/firestore';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    password: ''
  });

  const normalizePhone = (phone: string) => {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) {
      digits = '7' + digits.substring(1);
    }
    return digits;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneDigits = normalizePhone(formData.phone);
    const fullPhone = `+${phoneDigits}`;
    
    if (!phoneDigits || phoneDigits.length < 10) {
      toast({ title: "Ошибка", description: "Введите корректный номер телефона", variant: "destructive" });
      return;
    }
    if (formData.password.length < 6) {
      toast({ title: "Слишком короткий пароль", description: "Минимум 6 символов", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const loginEmail = `${phoneDigits}@nuxus.chat`;
    
    try {
      // Проверка на бан перед регистрацией/логином
      const banQuery = query(collection(db, 'users'), where('phone', '==', fullPhone), where('isBanned', '==', true), limit(1));
      const banSnap = await getDocs(banQuery);
      if (!banSnap.empty) {
        toast({ title: "Доступ заблокирован", description: "Этот номер телефона внесен в черный список.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (mode === 'register') {
        const username = formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + formData.username.toLowerCase();
        
        // Проверка уникальности никнейма
        const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          toast({ title: "Ник занят", description: "Выберите другой @username", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        // Создание аккаунта
        const res = await createUserWithEmailAndPassword(auth, loginEmail, formData.password);
        
        // Создание профиля в Firestore
        await setDoc(doc(db, 'users', res.user.uid), {
          id: res.user.uid,
          name: formData.name,
          username: username,
          phone: fullPhone,
          avatarUrl: `https://picsum.photos/seed/${res.user.uid}/200`,
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          inactivityDeletion: 'never',
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
      } else {
        // Логин
        await signInWithEmailAndPassword(auth, loginEmail, formData.password);
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = "Проверьте данные или интернет";
      if (err.code === 'auth/wrong-password') errorMsg = "Неверный пароль";
      if (err.code === 'auth/user-not-found') errorMsg = "Пользователь не найден";
      if (err.code === 'auth/email-already-in-use') errorMsg = "Этот номер уже зарегистрирован";
      
      toast({ 
        title: "Ошибка авторизации", 
        description: errorMsg, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupTestAccounts = async () => {
    setIsSettingUp(true);
    const accounts = [
      { phone: '79513332147', pass: 'gaz20092', name: 'Админ Абузер', user: '@vnctow46' },
      { phone: '79064222830', pass: '1234567', name: 'Чайник', user: '@Chai' }
    ];
    try {
      for (const acc of accounts) {
        const email = `${acc.phone}@nuxus.chat`;
        try {
          let uid = '';
          try {
            const loginRes = await signInWithEmailAndPassword(auth, email, acc.pass);
            uid = loginRes.user.uid;
          } catch (e) {
            const createRes = await createUserWithEmailAndPassword(auth, email, acc.pass).catch(() => null);
            if (createRes) {
              uid = createRes.user.uid;
            }
          }
          
          if (uid) {
            await setDoc(doc(db, 'users', uid), {
              id: uid,
              name: acc.name,
              username: acc.user,
              phone: `+${acc.phone}`,
              avatarUrl: `https://picsum.photos/seed/${acc.phone}/200`,
              createdAt: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
              inactivityDeletion: 'never',
              isBanned: false,
              settings: {
                theme: 'default',
                chatBackground: 'default',
                messageSize: 'medium',
                privacy: {
                  phoneVisibility: 'nobody',
                  lastSeenVisibility: 'everybody'
                }
              }
            }, { merge: true });
          }
        } catch (e) {}
      }
      toast({ title: "Готово!", description: "Аккаунты настроены. Войдите с паролем." });
    } catch (err) {
      toast({ title: "Ошибка настройки", variant: "destructive" });
    } finally {
      setIsSettingUp(false);
    }
  };

  const cleanupTargetAccount = async () => {
    const targetPhone = '+79997457325';
    setIsSettingUp(true);
    try {
      const q = query(collection(db, 'users'), where('phone', '==', targetPhone), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast({ title: "Аккаунт не найден", description: `Пользователь с номером ${targetPhone} не найден в базе.` });
      } else {
        const userDoc = snap.docs[0];
        await setDoc(userDoc.ref, {
          isBanned: true,
          name: "Удаленный аккаунт",
          username: "@deleted",
          phone: targetPhone,
          deletedAt: new Date().toISOString()
        }, { merge: true });
        toast({ title: "Удалено", description: `Аккаунт ${targetPhone} успешно заблокирован.` });
      }
    } catch (e) {
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setIsSettingUp(false);
    }
  };

  const showDevTool = normalizePhone(formData.phone) === '79513332147';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background">
      <Card className="w-full max-sm:max-w-none max-w-sm border-primary/20 bg-card/50 backdrop-blur-xl shadow-2xl">
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
                <Input placeholder="+79001234567" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-muted/30 pl-9 rounded-xl" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground ml-1">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Минимум 6 символов" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-muted/30 pl-9 rounded-xl" required />
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full h-12 text-md font-bold shadow-lg shadow-primary/20 rounded-xl">
              {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? "Войти" : "Зарегистрироваться")}
            </Button>
          </form>
          <div className="mt-4 flex flex-col gap-2">
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-sm text-muted-foreground hover:text-primary transition-colors text-center">
              {mode === 'login' ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
            </button>
            {showDevTool && (
              <div className="flex flex-col gap-1 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Button variant="ghost" size="sm" onClick={setupTestAccounts} disabled={isSettingUp} className="text-[10px] text-muted-foreground/60 flex gap-2">
                  {isSettingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                  Восстановить аккаунт Админа
                </Button>
                <Button variant="ghost" size="sm" onClick={cleanupTargetAccount} disabled={isSettingUp} className="text-[10px] text-destructive/60 hover:text-destructive flex gap-2">
                  {isSettingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                  Удалить аккаунт +79997457325
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
