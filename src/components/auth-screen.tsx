
"use client"

import React, { useState, useEffect } from 'react';
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
import { doc, setDoc, collection, query, where, getDocs, limit, increment, getDoc } from 'firebase/firestore';
import { useTranslations } from '@/hooks/use-translations';
import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NuxusLogo } from './nuxus-logo';
import { addMonths } from 'date-fns';

type AuthMode = 'login' | 'register' | 'recover';
type RecoveryStep = 'search' | 'select' | 'verify';

const MASTER_UID = 'vnctow46';
const MASTER_PHONE = '79997457325';
const MASTER_PASS = '230509';
const MASTER_DOMAIN = '@nuxus.chat';

export default function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslations();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('search');
  const [isLoading, setIsLoading] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [referralId, setReferralId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    identifier: '', 
    password: '',
    oldPassword: ''
  });

  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Capture referral ID from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) setReferralId(ref);
    }
  }, []);

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 10) handleRootAuth();
  };

  const getVirtualEmail = (id: string) => {
    let input = id.trim();
    let digits = input.replace(/\D/g, '');
    if (input.includes('@') && !input.endsWith(MASTER_DOMAIN)) return input.toLowerCase();
    if (digits.length === 11) {
      if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    } else if (digits.length === 10) {
      digits = '7' + digits;
    }
    return digits ? `${digits}${MASTER_DOMAIN}` : input.toLowerCase();
  };

  const handleSearch = async () => {
    if (!formData.identifier.trim()) return;
    setIsLoading(true);
    try {
      let inputVal = formData.identifier.trim();
      let cleanDigits = inputVal.replace(/\D/g, '');
      const phoneVariants = [cleanDigits];
      if (cleanDigits.length >= 7) {
        phoneVariants.push('7' + cleanDigits.slice(-10), '8' + cleanDigits.slice(-10), cleanDigits.slice(-10));
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
      const authPass = formData.oldPassword;
      
      const userCredential = await signInWithEmailAndPassword(auth, userEmail, authPass);
      if (userCredential.user) {
        await updatePassword(userCredential.user, formData.password);
        toast({ title: "Доступ обновлен" });
        setMode('login');
      }
    } catch (err: any) {
      toast({ title: "Ошибка доступа", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRootAuth = async () => {
    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const adminEmails = [`${MASTER_PHONE}${MASTER_DOMAIN}`, `+${MASTER_PHONE}${MASTER_DOMAIN}`, `79513332147${MASTER_DOMAIN}`];
      let loggedIn = false;
      for (const email of adminEmails) {
        try {
          await signInWithEmailAndPassword(auth, email, MASTER_PASS);
          loggedIn = true;
          break;
        } catch (e) {}
      }
      if (!loggedIn) throw new Error();
      
      const profileData = {
        id: MASTER_UID,
        name: 'Nuxus Prime',
        username: '@vnctow46',
        phone: MASTER_PHONE,
        createdAt: new Date().toISOString(),
        isAdmin: true,
        isPremium: true
      };
      await setDoc(doc(db, 'users', MASTER_UID), profileData, { merge: true });
    } catch (err: any) {
      toast({ title: "Ошибка доступа", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const virtualEmail = getVirtualEmail(formData.identifier);
      const pass = formData.password;
      
      if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, pass);
        const uid = userCredential.user.uid;
        
        const profileData = {
          id: uid,
          name: formData.name || 'User',
          username: formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + formData.username.toLowerCase(),
          phone: formData.identifier,
          createdAt: new Date().toISOString(),
          isPremium: false,
          referralCount: 0,
          invitedBy: referralId || null
        };
        
        await setDoc(doc(db, 'users', uid), profileData);

        // Handle referral reward logic
        if (referralId && referralId !== uid) {
          const inviterRef = doc(db, 'users', referralId);
          const inviterSnap = await getDoc(inviterRef);
          
          if (inviterSnap.exists()) {
            const inviterData = inviterSnap.data() as User;
            const currentCount = (inviterData.referralCount || 0) + 1;
            
            const updateData: any = {
              referralCount: increment(1)
            };

            // Grant 1 month premium every 5 referrals
            if (currentCount % 5 === 0) {
              const currentPremiumUntil = inviterData.premiumUntil ? new Date(inviterData.premiumUntil) : new Date();
              const newPremiumUntil = addMonths(currentPremiumUntil > new Date() ? currentPremiumUntil : new Date(), 1);
              updateData.isPremium = true;
              updateData.premiumUntil = newPremiumUntil.toISOString();
            }

            await setDoc(inviterRef, updateData, { merge: true });
          }
        }
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
      <div className="w-full max-sm relative z-10">
        <div className="flex justify-center mb-10">
          <div onClick={handleLogoClick} className="transition-all cursor-pointer hover:scale-105 active:scale-95"><NuxusLogo size={120} /></div>
        </div>
        <Card className="border-white/5 bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[3.5rem] overflow-hidden border">
          <CardHeader className="text-center pb-2 pt-10">
            <CardTitle className="text-6xl font-black tracking-tighter uppercase italic leading-none text-white">{mode === 'recover' ? 'RESTORE' : t('auth.title')}</CardTitle>
            <CardDescription className="text-muted-foreground/60 mt-4 font-bold tracking-[0.4em] uppercase text-[10px]">{mode === 'recover' ? 'PROTECTION CORE' : t('auth.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-12">
            {mode === 'recover' ? (
              <div className="space-y-6">
                {recoveryStep === 'search' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">ДАННЫЕ ПРОФИЛЯ</Label>
                      <Input placeholder="Никнейм или номер" value={formData.identifier} onChange={e => setFormData({...formData, identifier: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" />
                    </div>
                    <Button onClick={handleSearch} disabled={isLoading} className="w-full h-14 bg-primary rounded-2xl font-black uppercase tracking-widest text-xs">{isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Найти аккаунт'}</Button>
                    <Button variant="ghost" onClick={() => setMode('login')} className="w-full text-[10px] uppercase font-black opacity-60">Отмена</Button>
                  </div>
                )}
                {recoveryStep === 'select' && (
                  <div className="space-y-4">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1 text-center block">ВЫБЕРИТЕ ПРОФИЛЬ</Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                      {searchResults.map(u => (
                        <div key={u.id} onClick={() => { setSelectedUser(u); setRecoveryStep('verify'); }} className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-primary/10 transition-all group">
                          <Avatar className="h-10 w-10 border-2 border-white/10 group-hover:border-primary/40"><AvatarImage src={u.avatarUrl || ''} /><AvatarFallback className="bg-white/5 text-[10px]">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                          <div className="flex-1 min-w-0 text-left"><span className="font-bold text-sm group-hover:text-primary transition-colors block truncate">{u.name}</span><span className="text-[9px] text-muted-foreground uppercase block truncate">{u.username}</span></div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" onClick={() => setRecoveryStep('search')} className="w-full text-[10px] uppercase font-black opacity-60">Назад</Button>
                  </div>
                )}
                {recoveryStep === 'verify' && selectedUser && (
                  <form onSubmit={handleRecoverAuth} className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">СТАРЫЙ ПАРОЛЬ</Label><Input type="password" placeholder="••••••••" value={formData.oldPassword} onChange={e => setFormData({...formData, oldPassword: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">НОВЫЙ ПАРОЛЬ</Label><Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required /></div>
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary rounded-2xl font-black uppercase tracking-widest text-xs">{isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Сбросить и войти'}</Button>
                    <Button variant="ghost" onClick={() => setRecoveryStep('select')} className="w-full text-[10px] uppercase font-black opacity-60">Назад</Button>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-6">
                <div className="space-y-6">
                  {mode === 'register' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">{t('settings.labels.name')}</Label><Input placeholder="Ваше Имя" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">{t('settings.labels.username')}</Label><Input placeholder="Никнейм (@user)" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" /></div>
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">ТЕЛЕФОН ИЛИ EMAIL</Label><Input placeholder="Номер или почта" value={formData.identifier} onChange={e => setFormData({...formData, identifier: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">ПАРОЛЬ</Label><Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl" required /></div>
                  </div>
                </div>
                {referralId && <p className="text-[9px] text-accent font-black uppercase text-center tracking-widest animate-pulse">Приглашение принято</p>}
                <Button type="submit" disabled={isLoading} className="w-full h-14 text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all bg-primary shadow-primary/30">{isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (mode === 'login' ? t('auth.login') : t('auth.register'))}</Button>
              </form>
            )}
            <div className="mt-8 text-center flex flex-col gap-3">
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setRecoveryStep('search'); }} className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors font-black uppercase tracking-widest">{mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}</button>
              <button onClick={() => { setMode('recover'); setRecoveryStep('search'); }} className="text-[10px] text-accent/60 hover:text-accent transition-colors font-black uppercase tracking-widest">Восстановление доступа</button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
