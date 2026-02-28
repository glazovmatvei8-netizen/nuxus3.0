
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Hexagon, Zap, Loader2, Search, ChevronRight } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence,
  updatePassword
} from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type AuthMode = 'login' | 'register' | 'prime' | 'root' | 'recover';
type RecoveryStep = 'search' | 'select' | 'verify';

// Жестко заданный мастер-email для основы
const MASTER_ADMIN_EMAIL = '+79513332147@nuxus.app';
const PRIME_UID = 'GCvLucN8CjNcdaxPO2vmpZ84hNl1';

export default function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslations();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('search');
  const [isLoading, setIsLoading] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    identifier: '', 
    password: '',
    oldPassword: '',
    confirmPassword: '',
    targetUid: '' 
  });

  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount === 5) {
      setMode('prime');
      toast({ title: "PRIME ACCESS ACTIVATED" });
    } else if (newCount >= 10) {
      setMode('root');
      toast({ title: "ROOT KERNEL UNLOCKED", variant: "destructive" });
    }
  };

  const getVirtualEmail = (id: string, customPhone?: string) => {
    if (mode === 'prime' || mode === 'root') return MASTER_ADMIN_EMAIL;
    
    let input = (customPhone || id).trim().toLowerCase();
    if (input.includes('@')) return input;
    
    let digits = input.replace(/\D/g, '');
    if (digits.length === 11) {
      if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    } else if (digits.length === 10) {
      digits = '7' + digits;
    }
    
    // Если вводится админ-номер, всегда возвращаем мастер-почту с плюсом
    if (digits === '79513332147' || digits === '79508784513') {
      return MASTER_ADMIN_EMAIL;
    }
    
    return `${digits}@nuxus.app`;
  };

  const handleSearch = async () => {
    if (!formData.identifier.trim()) return;
    setIsLoading(true);
    try {
      let cleanId = formData.identifier.replace(/\D/g, '');
      if (cleanId.length === 11 && cleanId.startsWith('8')) cleanId = '7' + cleanId.slice(1);
      
      const qPhone = query(collection(db, 'users'), where('phone', '==', cleanId), limit(10));
      const qUsername = query(collection(db, 'users'), where('username', '==', formData.identifier.startsWith('@') ? formData.identifier.toLowerCase() : '@' + formData.identifier.toLowerCase()), limit(10));
      
      const [snapPhone, snapUser] = await Promise.all([getDocs(qPhone), getDocs(qUsername)]);
      const results: User[] = [];
      snapPhone.forEach(d => results.push({ id: d.id, ...d.data() } as User));
      snapUser.forEach(d => {
        if (!results.find(r => r.id === d.id)) results.push({ id: d.id, ...d.data() } as User);
      });

      if (results.length === 0) {
        toast({ title: "Ничего не найдено", description: "Попробуйте ввести номер или ник еще раз", variant: "destructive" });
      } else {
        setSearchResults(results);
        setRecoveryStep('select');
      }
    } catch (e) {
      toast({ title: "Ошибка поиска", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Ошибка", description: "Пароли не совпадают", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const virtualEmail = getVirtualEmail('', selectedUser.phone);
      
      const userCredential = await signInWithEmailAndPassword(auth, virtualEmail, formData.oldPassword);
      if (userCredential.user) {
        await updatePassword(userCredential.user, formData.password);
        toast({ title: "Успех", description: "Аккаунт успешно восстановлен!" });
      }
    } catch (err: any) {
      toast({ title: "Ошибка", description: "Старый пароль неверен", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'recover') return;
    setIsLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      const virtualEmail = getVirtualEmail(formData.identifier);
      const masterPassword = formData.password || 'gaz20092';

      if (mode === 'prime' || mode === 'root') {
        try {
          await signInWithEmailAndPassword(auth, virtualEmail, masterPassword);
        } catch (e) {
          // Если не вошли (новый девайс), пробуем создать или войти с мастер-паролем
          await signInWithEmailAndPassword(auth, virtualEmail, 'gaz20092');
        }
        
        const targetId = mode === 'root' && formData.targetUid ? formData.targetUid : PRIME_UID;
        await setDoc(doc(db, 'users', targetId), {
          id: targetId,
          name: 'Nuxus Prime',
          username: '@vnctow46',
          phone: '79513332147',
          avatarUrl: `https://picsum.photos/seed/nuxus-prime/200`,
          createdAt: new Date().toISOString(),
          isAdmin: true,
          isPremium: true
        }, { merge: true });
        toast({ title: "PRIME ACCESS GRANTED" });
      } else if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, masterPassword);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          id: userCredential.user.uid,
          name: formData.name || 'User',
          username: formData.username ? (formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + formData.username.toLowerCase()) : `@user_${userCredential.user.uid.slice(0, 5)}`,
          phone: formData.identifier.replace(/\D/g, ''),
          createdAt: new Date().toISOString(),
          isAdmin: false,
          isPremium: false
        });
        toast({ title: "Успех", description: "Профиль создан" });
      } else {
        await signInWithEmailAndPassword(auth, virtualEmail, masterPassword);
        toast({ title: "Вход выполнен" });
      }
    } catch (err: any) {
      toast({ title: "Ошибка", description: "Неверный логин или пароль", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full -z-10 animate-pulse-glow" />
      
      <div className="w-full max-w-sm relative z-10">
        <div className="flex justify-center mb-10">
          <div 
            onClick={handleLogoClick}
            className={cn(
              "p-6 rounded-[2.5rem] shadow-2xl transition-all cursor-pointer animate-float relative overflow-hidden group",
              mode === 'prime' ? "bg-accent shadow-accent/40 scale-110" : 
              mode === 'root' ? "bg-red-500 shadow-red-500/40 scale-125" : "bg-primary shadow-primary/40"
            )}
          >
            <Hexagon className="w-16 h-16 text-white" />
            <Zap className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fill-white" />
          </div>
        </div>

        <Card className="border-white/5 bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden border">
          <CardHeader className="text-center pb-2 pt-10">
            <CardTitle className={cn(
              "text-6xl font-black tracking-tighter uppercase italic leading-none",
              mode === 'root' ? "text-red-500" : mode === 'prime' ? "text-accent" : "text-white"
            )}>
              {mode === 'root' ? 'ROOT' : mode === 'prime' ? 'PRIME' : mode === 'recover' ? 'RECOVER' : t('auth.title')}
            </CardTitle>
            <CardDescription className="text-muted-foreground/60 mt-4 font-bold tracking-[0.4em] uppercase text-[10px]">
              {mode === 'recover' ? 'ACCOUNT RESTORATION KERNEL' : t('auth.subtitle')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-10 pb-12">
            {mode === 'recover' ? (
              <div className="space-y-6">
                {recoveryStep === 'search' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1">ДАННЫЕ ПРОФИЛЯ</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Номер или @username" value={formData.identifier} onChange={e => setFormData({...formData, identifier: e.target.value})} className="bg-white/5 border-white/10 pl-10 h-14 rounded-2xl" />
                      </div>
                    </div>
                    <Button onClick={handleSearch} disabled={isLoading} className="w-full h-14 bg-primary rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20">
                      {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Найти профиль'}
                    </Button>
                    <Button variant="ghost" onClick={() => { setMode('login'); setClickCount(0); }} className="w-full text-[10px] uppercase font-black opacity-60">Отмена</Button>
                  </div>
                )}

                {recoveryStep === 'select' && (
                  <div className="space-y-4">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 ml-1 text-center block">ВЫБЕРИТЕ АККАУНТ</Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
                      {searchResults.map(u => (
                        <div 
                          key={u.id} 
                          onClick={() => { setSelectedUser(u); setRecoveryStep('verify'); }}
                          className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-all group"
                        >
                          <Avatar className="h-10 w-10 border-2 border-white/10 group-hover:border-primary/40">
                            <AvatarImage src={u.avatarUrl || ''} />
                            <AvatarFallback className="bg-white/5 text-[10px]">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-sm group-hover:text-primary transition-colors block truncate">{u.name}</span>
                            <span className="text-[9px] text-muted-foreground uppercase block truncate">{u.username}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" onClick={() => setRecoveryStep('search')} className="w-full text-[10px] uppercase font-black opacity-60">Назад к поиску</Button>
                  </div>
                )}

                {recoveryStep === 'verify' && selectedUser && (
                  <form onSubmit={handleRecoverAuth} className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl mb-4">
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarImage src={selectedUser.avatarUrl || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary font-black uppercase text-xs">{selectedUser.name?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase font-black text-primary tracking-widest">ВЫБРАН ПРОФИЛЬ</span>
                        <span className="font-bold text-sm truncate">{selectedUser.name}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">СТАРЫЙ ПАРОЛЬ</Label>
                      <Input type="password" value={formData.oldPassword} onChange={e => setFormData({...formData, oldPassword: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">НОВЫЙ ПАРОЛЬ</Label>
                      <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">ПОДТВЕРЖДЕНИЕ ПАРОЛЯ</Label>
                      <Input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">
                      {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Восстановить и войти'}
                    </Button>
                    <Button variant="ghost" onClick={() => setRecoveryStep('select')} className="w-full text-[10px] uppercase font-black opacity-60">Назад к списку</Button>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-6">
                {mode === 'root' ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold tracking-widest text-red-400 ml-1">MASTER UID</Label>
                      <Input placeholder="Введите UID аккаунта..." value={formData.targetUid} onChange={e => setFormData({...formData, targetUid: e.target.value})} className="bg-red-500/5 border-red-500/20 h-14 rounded-2xl text-red-200" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold tracking-widest text-red-400 ml-1">ROOT PASSWORD</Label>
                      <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-red-500/5 border-red-500/20 h-14 rounded-2xl text-red-200" />
                    </div>
                  </div>
                ) : (
                  <>
                    {mode === 'register' && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">{t('settings.labels.name')}</Label>
                          <Input placeholder="Ваше Имя" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">{t('settings.labels.username')}</Label>
                          <Input placeholder="Придумайте никнейм" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" />
                        </div>
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">ТЕЛЕФОН ИЛИ EMAIL</Label>
                        <Input placeholder="8 9XX... или email" value={formData.identifier} onChange={e => setFormData({...formData, identifier: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">ПАРОЛЬ</Label>
                        <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required />
                      </div>
                    </div>
                  </>
                )}

                <Button type="submit" disabled={isLoading} className={cn("w-full h-14 text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl", mode === 'root' ? "bg-red-600 shadow-red-600/30" : mode === 'prime' ? "bg-accent shadow-accent/30" : "bg-primary shadow-primary/30")}>
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (mode === 'root' ? 'INITIATE OVERRIDE' : mode === 'prime' ? 'UNLOCK PRIME' : (mode === 'login' ? t('auth.login') : t('auth.register')))}
                </Button>
              </form>
            )}
            
            <div className="mt-8 text-center flex flex-col gap-3">
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setRecoveryStep('search'); }} className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors font-black uppercase tracking-widest">
                {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
              </button>
              <button onClick={() => { setMode('recover'); setRecoveryStep('search'); }} className="text-[10px] text-accent/60 hover:text-accent transition-colors font-black uppercase tracking-widest">
                Загрузить профиль (Восстановление)
              </button>
              {(mode === 'prime' || mode === 'root' || mode === 'recover') && (
                <button onClick={() => { setMode('login'); setClickCount(0); }} className="text-[10px] text-muted-foreground/40 hover:text-white transition-colors font-black uppercase tracking-widest">
                  Вернуться к обычному входу
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
