
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronRight } from 'lucide-react';
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
import { NuxusLogo } from './nuxus-logo';

type AuthMode = 'login' | 'register' | 'prime' | 'root' | 'recover';
type RecoveryStep = 'search' | 'select' | 'verify';

const PRIME_UID = 'vnctow46';
const MASTER_EMAIL = '+79513332147@nuxus.app'; 

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
    targetUid: PRIME_UID 
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

  const getVirtualEmail = (id: string) => {
    let input = id.trim();
    let digits = input.replace(/\D/g, '');
    
    if (digits === '79513332147' || digits === '79508784513' || digits === '89513332147' || digits === '89508784513') {
      return MASTER_EMAIL;
    }

    if (input.includes('@') && !input.endsWith('@nuxus.app')) return input.toLowerCase();
    
    if (digits.length === 11) {
      if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    } else if (digits.length === 10) {
      digits = '7' + digits;
    }
    
    return digits ? `${digits}@nuxus.app` : input.toLowerCase();
  };

  const handleSearch = async () => {
    if (!formData.identifier.trim()) return;
    setIsLoading(true);
    try {
      let cleanId = formData.identifier.replace(/\D/g, '');
      if (cleanId.length === 11 && cleanId.startsWith('8')) cleanId = '7' + cleanId.slice(1);
      
      const qPhone = query(collection(db, 'users'), where('phone', '==', cleanId || formData.identifier), limit(10));
      const qUsername = query(collection(db, 'users'), where('username', '==', formData.identifier.startsWith('@') ? formData.identifier.toLowerCase() : '@' + formData.identifier.toLowerCase()), limit(10));
      
      const [snapPhone, snapUser] = await Promise.all([getDocs(qPhone), getDocs(qUsername)]);
      const results: User[] = [];
      snapPhone.forEach(d => results.push({ id: d.id, ...d.data() } as User));
      snapUser.forEach(d => {
        if (!results.find(r => r.id === d.id)) results.push({ id: d.id, ...d.data() } as User);
      });

      if (results.length === 0) {
        toast({ title: "Ничего не найдено", variant: "destructive" });
      } else {
        // Исключаем заблокированный твинк из поиска
        setSearchResults(results.filter(u => u.id !== 'oAMiCwJacaZPx5w3jaJtDoLPgZN2'));
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
      toast({ title: "Пароли не совпадают", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const virtualEmail = (selectedUser.phone === '79513332147' || selectedUser.phone === '79508784513') 
        ? MASTER_EMAIL 
        : `${selectedUser.phone}@nuxus.app`;
      
      const userCredential = await signInWithEmailAndPassword(auth, virtualEmail, formData.oldPassword);
      if (userCredential.user) {
        await updatePassword(userCredential.user, formData.password);
        toast({ title: "Профиль восстановлен" });
      }
    } catch (err: any) {
      toast({ title: "Ошибка верификации", description: "Старый пароль неверен", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      
      if (mode === 'root') {
        const targetId = formData.targetUid || PRIME_UID;
        // В ROOT заходим через мастер-пароль gaz20092 автоматически
        await signInWithEmailAndPassword(auth, MASTER_EMAIL, 'gaz20092');
        
        // Принудительно восстанавливаем данные ядра
        await setDoc(doc(db, 'users', targetId), {
          id: targetId,
          name: 'Nuxus Prime',
          username: '@vnctow46',
          phone: '79513332147',
          createdAt: new Date().toISOString(),
          isAdmin: true,
          isPremium: true
        }, { merge: true });
        
        toast({ title: "ROOT OVERRIDE GRANTED" });
        setIsLoading(false);
        return;
      }

      const virtualEmail = getVirtualEmail(formData.identifier);
      const pass = formData.password;

      if (mode === 'prime') {
        await signInWithEmailAndPassword(auth, MASTER_EMAIL, pass);
        // Гарантируем права для основы
        await setDoc(doc(db, 'users', PRIME_UID), {
          id: PRIME_UID,
          name: 'Nuxus Prime',
          username: '@vnctow46',
          phone: '79513332147',
          isAdmin: true,
          isPremium: true
        }, { merge: true });
        toast({ title: "PRIME ACCESS GRANTED" });
      } else if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, pass);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          id: userCredential.user.uid,
          name: formData.name || 'User',
          username: formData.username ? (formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + formData.username.toLowerCase()) : `@user_${userCredential.user.uid.slice(0, 5)}`,
          phone: formData.identifier.replace(/\D/g, ''),
          createdAt: new Date().toISOString(),
          isAdmin: false,
          isPremium: false
        });
      } else {
        await signInWithEmailAndPassword(auth, virtualEmail, pass);
      }
    } catch (err: any) {
      toast({ title: "Ошибка входа", description: "Проверьте данные доступа", variant: "destructive" });
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
              "transition-all cursor-pointer hover:scale-105 active:scale-95",
              mode === 'root' ? "scale-125" : ""
            )}
          >
            <NuxusLogo size={mode === 'root' ? 160 : 120} />
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
                      <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">ДАННЫЕ ПРОФИЛЯ</Label>
                      <Input placeholder="Номер или @username" value={formData.identifier} onChange={e => setFormData({...formData, identifier: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" />
                    </div>
                    <Button onClick={handleSearch} disabled={isLoading} className="w-full h-14 bg-primary rounded-2xl font-black uppercase tracking-widest text-xs">
                      {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Найти профиль'}
                    </Button>
                    <Button variant="ghost" onClick={() => { setMode('login'); setClickCount(0); }} className="w-full text-[10px] uppercase font-black opacity-60">Отмена</Button>
                  </div>
                )}

                {recoveryStep === 'select' && (
                  <div className="space-y-4">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1 text-center block">ВЫБЕРИТЕ АККАУНТ</Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                      {searchResults.map(u => (
                        <div 
                          key={u.id} 
                          onClick={() => { setSelectedUser(u); setRecoveryStep('verify'); }}
                          className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-primary/10 transition-all group"
                        >
                          <Avatar className="h-10 w-10 border-2 border-white/10 group-hover:border-primary/40">
                            <AvatarImage src={u.avatarUrl || ''} />
                            <AvatarFallback className="bg-white/5 text-[10px]">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 text-left">
                            <span className="font-bold text-sm group-hover:text-primary transition-colors block truncate">{u.name}</span>
                            <span className="text-[9px] text-muted-foreground uppercase block truncate">{u.username}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" onClick={() => setRecoveryStep('search')} className="w-full text-[10px] uppercase font-black opacity-60">Назад к поиску</Button>
                  </div>
                )}

                {recoveryStep === 'verify' && selectedUser && (
                  <form onSubmit={handleRecoverAuth} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-primary ml-1">ВЫБРАН: {selectedUser.name}</Label>
                      <Input type="password" placeholder="Старый пароль" value={formData.oldPassword} onChange={e => setFormData({...formData, oldPassword: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required />
                    </div>
                    <div className="space-y-1.5">
                      <Input type="password" placeholder="Новый пароль" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required />
                    </div>
                    <div className="space-y-1.5">
                      <Input type="password" placeholder="Подтвердите новый пароль" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary rounded-2xl font-black uppercase tracking-widest text-xs">
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
                      <Input 
                        placeholder={PRIME_UID} 
                        value={formData.targetUid} 
                        onChange={e => setFormData({...formData, targetUid: e.target.value})} 
                        className="bg-red-500/5 border-red-500/20 h-14 rounded-2xl text-red-200" 
                      />
                    </div>
                    <p className="text-[8px] text-red-400/60 uppercase font-bold text-center tracking-widest italic">
                      Passwordless entry for core administrative units
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
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
                  </div>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
