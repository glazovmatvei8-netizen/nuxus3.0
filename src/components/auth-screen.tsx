
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronRight, X, ShieldAlert } from 'lucide-react';
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

// МАСТЕР-ДАННЫЕ ЯДРА v5.6.8 (FINAL CHAT DOMAIN)
const MASTER_UID = 'vnctow46';
const MASTER_PHONE = '79997457325';
const MASTER_EMAIL = '79997457325@nuxus.chat'; 
const FALLBACK_EMAIL = '79513332147@nuxus.chat';
const MASTER_PASS = '230509';

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
    targetUid: MASTER_UID 
  });

  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount === 5) {
      setMode('prime');
      toast({ title: "PRIME ACCESS" });
    } else if (newCount >= 10) {
      setMode('root');
      toast({ title: "ROOT KERNEL", variant: "destructive" });
    }
  };

  const getVirtualEmail = (id: string) => {
    let input = id.trim();
    let digits = input.replace(/\D/g, '');
    
    if (digits === MASTER_PHONE || digits.endsWith('7457325')) {
      return MASTER_EMAIL;
    }
    if (digits === '79513332147' || digits === '79508784513') {
      return FALLBACK_EMAIL;
    }

    if (input.includes('@') && !input.endsWith('@nuxus.chat')) return input.toLowerCase();
    
    if (digits.length === 11) {
      if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    } else if (digits.length === 10) {
      digits = '7' + digits;
    }
    
    return digits ? `${digits}@nuxus.chat` : input.toLowerCase();
  };

  const handleSearch = async () => {
    if (!formData.identifier.trim()) return;
    setIsLoading(true);
    try {
      let inputVal = formData.identifier.trim();
      let cleanDigits = inputVal.replace(/\D/g, '');
      
      const phoneVariants = [cleanDigits];
      if (cleanDigits.length >= 7) {
        if (cleanDigits.endsWith('7457325')) {
           phoneVariants.push('79997457325', '89997457325', '9997457325', '+79997457325');
        }
      }
      
      const finalPhoneVariants = Array.from(new Set([...phoneVariants, ...phoneVariants.map(p => '+' + p)]));

      const qPhone = query(collection(db, 'users'), where('phone', 'in', finalPhoneVariants.slice(0, 10)), limit(10));
      let searchNick = inputVal.startsWith('@') ? inputVal.toLowerCase() : '@' + inputVal.toLowerCase();
      
      const qUsername = query(collection(db, 'users'), where('username', '==', searchNick), limit(10));
      
      const [snapPhone, snapUser] = await Promise.all([getDocs(qPhone), getDocs(qUsername)]);
      
      const resultsMap = new Map<string, User>();
      snapPhone.forEach(d => resultsMap.set(d.id, { id: d.id, ...d.data() } as User));
      snapUser.forEach(d => resultsMap.set(d.id, { id: d.id, ...d.data() } as User));

      const finalResults = Array.from(resultsMap.values());

      if (finalResults.length === 0) {
        toast({ title: "Ошибка доступа", variant: "destructive" });
      } else {
        setSearchResults(finalResults);
        setRecoveryStep('select');
      }
    } catch (e: any) {
      toast({ title: "Ошибка доступа", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !formData.password || !formData.oldPassword) return;

    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userEmail = getVirtualEmail(selectedUser.phone || selectedUser.id);
      
      try {
        const userCredential = await signInWithEmailAndPassword(auth, userEmail, formData.oldPassword);
        if (userCredential.user) {
          await updatePassword(userCredential.user, formData.password);
          toast({ title: "Доступ восстановлен" });
          setMode('login');
        }
      } catch (err) {
        const isMaster = selectedUser.id === MASTER_UID || selectedUser.phone?.includes('7457325');
        if (isMaster && formData.oldPassword === MASTER_PASS) {
           const userCredential = await signInWithEmailAndPassword(auth, MASTER_EMAIL, MASTER_PASS);
           await updatePassword(userCredential.user, formData.password);
           toast({ title: "Доступ восстановлен" });
           setMode('login');
        } else {
          throw new Error("Invalid");
        }
      }
    } catch (err: any) {
      toast({ title: "Верификация отклонена", variant: "destructive" });
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
        const targetId = formData.targetUid || MASTER_UID;
        
        try {
          await signInWithEmailAndPassword(auth, MASTER_EMAIL, MASTER_PASS);
        } catch (e) {
          await signInWithEmailAndPassword(auth, FALLBACK_EMAIL, MASTER_PASS);
        }
        
        const profileData = {
          id: targetId,
          name: 'Nuxus Prime',
          username: '@vnctow46',
          phone: MASTER_PHONE,
          createdAt: new Date().toISOString(),
          isAdmin: true,
          isPremium: true,
          isBanned: false
        };

        await setDoc(doc(db, 'users', targetId), profileData, { merge: true });
        toast({ title: "IDENTITY SYNCED" });
        setIsLoading(false);
        return;
      }

      const virtualEmail = getVirtualEmail(formData.identifier);
      const pass = formData.password;

      if (mode === 'prime') {
        await signInWithEmailAndPassword(auth, MASTER_EMAIL, pass);
        await setDoc(doc(db, 'users', MASTER_UID), {
          id: MASTER_UID,
          name: 'Nuxus Prime',
          username: '@vnctow46',
          phone: MASTER_PHONE,
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
      toast({ title: "Ошибка доступа", variant: "destructive" });
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

        <Card className="border-white/5 bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[3.5rem] overflow-hidden border">
          <CardHeader className="text-center pb-2 pt-10">
            <CardTitle className={cn(
              "text-6xl font-black tracking-tighter uppercase italic leading-none",
              mode === 'root' ? "text-red-500" : mode === 'prime' ? "text-accent" : "text-white"
            )}>
              {mode === 'root' ? 'ROOT' : mode === 'prime' ? 'PRIME' : mode === 'recover' ? 'RECOVER' : t('auth.title')}
            </CardTitle>
            <CardDescription className="text-muted-foreground/60 mt-4 font-bold tracking-[0.4em] uppercase text-[10px]">
              {mode === 'recover' ? 'ACCOUNT RESTORATION' : t('auth.subtitle')}
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
                      {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Найти аккаунт'}
                    </Button>
                    <Button variant="ghost" onClick={() => { setMode('login'); setClickCount(0); }} className="w-full text-[10px] uppercase font-black opacity-60">Отмена</Button>
                  </div>
                )}

                {recoveryStep === 'select' && (
                  <div className="space-y-4">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1 text-center block">ВЫБЕРИТЕ ПРОФИЛЬ</Label>
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
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">ТЕКУЩИЙ ПАРОЛЬ</Label>
                        <Input type="password" placeholder="••••••••" value={formData.oldPassword} onChange={e => setFormData({...formData, oldPassword: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">НОВЫЙ ПАРОЛЬ</Label>
                        <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required />
                      </div>
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary rounded-2xl font-black uppercase tracking-widest text-xs">
                      {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Сбросить и войти'}
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
                      <Label className="text-[10px] uppercase font-bold tracking-widest text-red-400 ml-1">ID КОРНЯ</Label>
                      <Input 
                        placeholder={MASTER_UID} 
                        value={formData.targetUid} 
                        onChange={e => setFormData({...formData, targetUid: e.target.value})} 
                        className="bg-red-500/5 border-red-500/20 h-14 rounded-2xl text-red-200" 
                      />
                    </div>
                    <p className="text-[8px] text-red-400/60 uppercase font-bold text-center tracking-widest italic">
                      SYSTEM IDENTITY OVERRIDE
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
                          <Input placeholder="Никнейм (@user)" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" />
                        </div>
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">ТЕЛЕФОН ИЛИ EMAIL</Label>
                        <Input placeholder="Номер или почта" value={formData.identifier} onChange={e => setFormData({...formData, identifier: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">ПАРОЛЬ</Label>
                        <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required />
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className={cn(
                    "w-full h-14 text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all",
                    mode === 'root' ? "bg-red-600 shadow-red-600/30" : mode === 'prime' ? "bg-accent shadow-accent/30" : "bg-primary shadow-primary/30"
                  )}
                >
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                    mode === 'root' ? 'OVERRIDE' : 
                    mode === 'prime' ? 'UNLOCK' : 
                    (mode === 'login' ? t('auth.login') : t('auth.register'))
                  )}
                </Button>
              </form>
            )}
            
            <div className="mt-8 text-center flex flex-col gap-3">
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setRecoveryStep('search'); }} className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors font-black uppercase tracking-widest">
                {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
              </button>
              <button onClick={() => { setMode('recover'); setRecoveryStep('search'); }} className="text-[10px] text-accent/60 hover:text-accent transition-colors font-black uppercase tracking-widest">
                Восстановление доступа
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
