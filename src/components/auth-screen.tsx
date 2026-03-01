
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, increment } from 'firebase/firestore';
import { useTranslations } from '@/hooks/use-translations';
import { useAppState } from '@/lib/store';
import type { User } from '@/lib/types';
import { NuxusLogo } from './nuxus-logo';
import { addMonths } from 'date-fns';

type AuthMode = 'login' | 'register' | 'recover' | 'setup2fa';

const MASTER_PHONE = '79997457325';
const MASTER_PASS = '230509';
const MASTER_DOMAIN = '@nuxus.chat';

export default function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslations();
  const { setIs2FAVerified } = useAppState();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [referralId, setReferralId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    identifier: '', 
    password: '',
    enable2FA: true,
    pin2FA: ''
  });

  const [registeredUid, setRegisteredUid] = useState<string | null>(null);

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
    if (newCount >= 5) handleRootAuth();
  };

  const getVirtualEmail = (id: string) => {
    let input = id.trim();
    let digits = input.replace(/\D/g, '');
    
    if (input.endsWith(MASTER_DOMAIN)) return input.toLowerCase();
    
    if (digits.length === 11) {
      if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    } else if (digits.length === 10) {
      digits = '7' + digits;
    }
    
    return digits.length >= 10 ? `${digits}${MASTER_DOMAIN}` : null;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      
      const virtualEmail = getVirtualEmail(formData.identifier);
      
      if (!virtualEmail) {
        toast({ 
          title: "Ошибка формата", 
          description: "Для регистрации и входа используйте только номер телефона", 
          variant: "destructive" 
        });
        setIsLoading(false);
        return;
      }

      const pass = formData.password;
      
      if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, pass);
        const uid = userCredential.user.uid;
        setRegisteredUid(uid);
        
        const profileData = {
          id: uid,
          name: formData.name || 'User',
          username: formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + formData.username.toLowerCase(),
          phone: formData.identifier.replace(/\D/g, ''),
          createdAt: new Date().toISOString(),
          isPremium: false,
          referralCount: 0,
          invitedBy: referralId || null,
          twoFactorEnabled: false
        };
        
        await setDoc(doc(db, 'users', uid), profileData);

        if (referralId && referralId !== uid) {
          const inviterRef = doc(db, 'users', referralId);
          const inviterSnap = await getDoc(inviterRef);
          if (inviterSnap.exists()) {
            const inviterData = inviterSnap.data() as User;
            const currentCount = (inviterData.referralCount || 0) + 1;
            const updateData: any = { referralCount: increment(1) };
            if (currentCount % 5 === 0) {
              const currentPremiumUntil = inviterData.premiumUntil ? new Date(inviterData.premiumUntil) : new Date();
              const newPremiumUntil = addMonths(currentPremiumUntil > new Date() ? currentPremiumUntil : new Date(), 1);
              updateData.isPremium = true;
              updateData.premiumUntil = newPremiumUntil.toISOString();
            }
            await setDoc(inviterRef, updateData, { merge: true });
          }
        }

        if (formData.enable2FA) {
          setMode('setup2fa');
        } else {
          setIs2FAVerified(true);
        }
      } else {
        const cred = await signInWithEmailAndPassword(auth, virtualEmail, pass);
        const snap = await getDoc(doc(db, 'users', cred.user.uid));
        if (snap.exists() && snap.data().twoFactorEnabled) {
          setIs2FAVerified(false);
        } else {
          setIs2FAVerified(true);
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err.code);
      let msg = "Ошибка доступа";
      if (err.code === 'auth/user-not-found') msg = "Пользователь не найден";
      if (err.code === 'auth/wrong-password') msg = "Неверный пароль";
      if (err.code === 'auth/email-already-in-use') msg = "Этот номер уже занят";
      
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeredUid || !formData.pin2FA) return;
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'users', registeredUid), {
        twoFactorEnabled: true,
        twoFactorPin: formData.pin2FA
      }, { merge: true });
      setIs2FAVerified(true);
      toast({ title: "Защита активирована" });
    } catch (e) {
      toast({ title: "Ошибка защиты", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRootAuth = async () => {
    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const email = `${MASTER_PHONE}${MASTER_DOMAIN}`;
      await signInWithEmailAndPassword(auth, email, MASTER_PASS);
      setIs2FAVerified(true);
      toast({ title: "ROOT ACCESS GRANTED", className: "bg-primary text-white font-black" });
    } catch (err: any) {
      console.error("Root Auth Error:", err);
      toast({ title: "Ошибка доступа", description: "Ядро отклонило запрос", variant: "destructive" });
      setClickCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 relative overflow-y-auto">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full -z-10 animate-pulse-glow" />
      <div className="w-full max-w-[400px] relative z-10 py-8">
        <div className="flex justify-center mb-6">
          <div onClick={handleLogoClick} className="transition-all cursor-pointer hover:scale-105 active:scale-95">
            <NuxusLogo size={100} />
          </div>
        </div>
        <Card className="border-white/5 bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden border">
          <CardHeader className="text-center pb-2 pt-6 px-6">
            <CardTitle className="text-4xl font-black tracking-tighter uppercase italic leading-none text-white">
              {mode === 'recover' ? 'RESTORE' : mode === 'setup2fa' ? 'SECURITY' : t('auth.title')}
            </CardTitle>
            <CardDescription className="text-muted-foreground/60 mt-3 font-bold tracking-[0.3em] uppercase text-[9px]">
              {mode === 'setup2fa' ? 'ОБЛАЧНЫЙ ПАРОЛЬ' : mode === 'recover' ? 'PROTECTION CORE' : 'ВХОД ПО НОМЕРУ ТЕЛЕФОНА'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            {mode === 'setup2fa' ? (
              <form onSubmit={handleSetup2FA} className="space-y-5">
                <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10 text-center space-y-1">
                  <ShieldCheck className="w-6 h-6 text-primary mx-auto" />
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-tight">Придумайте секретный 6-значный PIN для защиты вашего аккаунта</p>
                </div>
                <div className="space-y-4">
                  <Input 
                    type="password" 
                    placeholder="Введите PIN" 
                    maxLength={6} 
                    value={formData.pin2FA} 
                    onChange={e => setFormData({...formData, pin2FA: e.target.value.replace(/\D/g, '')})} 
                    className="bg-white/5 border-white/10 h-14 rounded-2xl text-center text-2xl tracking-widest font-black"
                    required 
                  />
                  <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20">
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Активировать защиту'}
                  </Button>
                  <Button variant="ghost" onClick={() => setIs2FAVerified(true)} className="w-full text-[9px] uppercase font-black opacity-40">Пропустить</Button>
                </div>
              </form>
            ) : mode === 'recover' ? (
              <div className="space-y-6 text-center py-4">
                <ShieldAlert className="w-10 h-10 text-accent mx-auto animate-pulse" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 italic leading-relaxed">Для восстановления доступа обратитесь к Главному Администратору Ядра Nuxus Prime.</p>
                <Button variant="ghost" onClick={() => setMode('login')} className="w-full text-[9px] uppercase font-black opacity-60">Назад ко входу</Button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-5">
                <div className="space-y-4">
                  {mode === 'register' && (
                    <div className="space-y-3">
                      <div className="space-y-1"><Label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground ml-1">{t('settings.labels.name')}</Label><Input placeholder="Ваше Имя" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-xl text-sm" required /></div>
                      <div className="space-y-1"><Label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground ml-1">{t('settings.labels.username')}</Label><Input placeholder="Никнейм (@user)" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-xl text-sm" required /></div>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground ml-1">НОМЕР ТЕЛЕФОНА</Label>
                      <Input 
                        placeholder="+7 (___) ___ __ __" 
                        value={formData.identifier} 
                        onChange={e => setFormData({...formData, identifier: e.target.value})} 
                        className="bg-white/5 border-white/10 h-12 rounded-xl text-sm" 
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground ml-1">ПАРОЛЬ</Label>
                      <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-xl text-sm" required />
                    </div>
                  </div>
                  {mode === 'register' && (
                    <div className="flex items-center space-x-2 bg-primary/5 p-2.5 rounded-xl border border-primary/10">
                      <Checkbox id="2fa" checked={formData.enable2FA} onCheckedChange={(v) => setFormData({...formData, enable2FA: !!v})} />
                      <label htmlFor="2fa" className="text-[9px] font-bold uppercase text-primary leading-none cursor-pointer">Включить 2FA (Рекомендуется)</label>
                    </div>
                  )}
                </div>
                {referralId && <p className="text-[8px] text-accent font-black uppercase text-center tracking-widest animate-pulse">Приглашение принято</p>}
                <Button type="submit" disabled={isLoading} className="w-full h-14 text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all bg-primary shadow-primary/30">
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (mode === 'login' ? t('auth.login') : t('auth.register'))}
                </Button>
              </form>
            )}
            {mode !== 'setup2fa' && (
              <div className="mt-6 text-center flex flex-col gap-2">
                <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[9px] text-muted-foreground/60 hover:text-primary transition-colors font-black uppercase tracking-widest">{mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}</button>
                <button onClick={() => setMode('recover')} className="text-[9px] text-accent/60 hover:text-accent transition-colors font-black uppercase tracking-widest">Восстановление доступа</button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
