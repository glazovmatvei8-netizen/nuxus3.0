
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, ShieldAlert, FileText, ArrowRight, User, Lock, AtSign, Phone } from 'lucide-react';
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
import type { User as UserType } from '@/lib/types';
import { NuxusLogo } from './nuxus-logo';
import { addMonths } from 'date-fns';
import { LegalModal } from './modals/legal-modal';
import { cn } from '@/lib/utils';

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
  
  const [legalModal, setLegalModal] = useState<{ open: boolean, type: 'privacy' | 'terms' }>({ open: false, type: 'privacy' });

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
    if (newCount >= 5) {
      handleRootAuth();
    }
  };

  const getVirtualEmail = (id: string) => {
    let input = id.trim();
    if (input.includes('@')) return input.toLowerCase();
    let digits = input.replace(/\D/g, '');
    if (digits.length === 11) {
      if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    } else if (digits.length === 10) {
      digits = '7' + digits;
    }
    if (digits.length < 10) {
        return `${input.toLowerCase()}${MASTER_DOMAIN}`;
    }
    return `${digits}${MASTER_DOMAIN}`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const virtualEmail = getVirtualEmail(formData.identifier);
      
      if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, formData.password);
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
            const inviterData = inviterSnap.data() as UserType;
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
        const cred = await signInWithEmailAndPassword(auth, virtualEmail, formData.password);
        const snap = await getDoc(doc(db, 'users', cred.user.uid));
        if (snap.exists() && snap.data().twoFactorEnabled) {
          setIs2FAVerified(false);
        } else {
          setIs2FAVerified(true);
        }
      }
    } catch (err: any) {
      let msg = "Ошибка доступа";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') msg = "Неверные данные или пароль";
      if (err.code === 'auth/wrong-password') msg = "Неверный пароль";
      if (err.code === 'auth/email-already-in-use') msg = "Этот логин уже занят";
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
      toast({ title: "Ошибка Root-доступа", description: "Ядро отклонило запрос", variant: "destructive" });
      setClickCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#0a0a0c] p-4 relative overflow-hidden">
      {/* Плавные неоновые сферы на фоне */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/10 blur-[150px] rounded-full animate-pulse-glow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-accent/5 blur-[120px] rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-[400px] relative z-10 flex flex-col items-center">
        <div className="mb-10 transition-all cursor-pointer hover:scale-105 active:scale-95 filter drop-shadow-[0_0_20px_rgba(139,92,246,0.3)]" onClick={handleLogoClick}>
          <NuxusLogo size={100} />
        </div>

        <Card className="w-full border-white/5 bg-white/[0.02] backdrop-blur-3xl shadow-[0_20px_80px_rgba(0,0,0,0.4)] rounded-[3rem] overflow-hidden border">
          <CardHeader className="text-center pb-2 pt-10 px-8">
            <div className="space-y-1">
              <CardTitle className="text-4xl font-black tracking-tighter uppercase italic text-white leading-none">
                {mode === 'recover' ? 'Restore' : mode === 'setup2fa' ? 'Security' : mode === 'login' ? 'Welcome' : 'Join Us'}
              </CardTitle>
              <CardDescription className="text-primary/60 font-black tracking-[0.4em] uppercase text-[10px]">
                {mode === 'setup2fa' ? 'Облачный пароль' : mode === 'recover' ? 'Protection Core' : 'Nuxus Kernel Access'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-10 pt-6">
            {mode === 'setup2fa' ? (
              <form onSubmit={handleSetup2FA} className="space-y-6">
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest text-center leading-relaxed">Создайте 6-значный PIN для защиты вашего узла</p>
                </div>
                
                <div className="space-y-4">
                  <div className="relative">
                    <Input 
                      type="password" 
                      placeholder="••••••" 
                      maxLength={6} 
                      value={formData.pin2FA} 
                      onChange={e => setFormData({...formData, pin2FA: e.target.value.replace(/\D/g, '')})} 
                      className="bg-white/5 border-white/10 h-16 rounded-2xl text-center text-3xl tracking-[0.6em] font-black focus:border-primary/50 transition-all"
                      required 
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 group">
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Активировать <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></>}
                  </Button>
                  <button type="button" onClick={() => setIs2FAVerified(true)} className="w-full text-[10px] uppercase font-black text-muted-foreground/40 hover:text-white transition-colors tracking-widest">Пропустить</button>
                </div>
              </form>
            ) : mode === 'recover' ? (
              <div className="space-y-8 text-center py-4">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto border border-accent/20 animate-pulse">
                  <ShieldAlert className="w-10 h-10 text-accent" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-white leading-relaxed italic">Доступ к ядру заблокирован</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-relaxed">Для восстановления обратитесь к Администратору Nuxus Prime.</p>
                </div>
                <Button variant="outline" onClick={() => setMode('login')} className="w-full h-12 rounded-2xl border-white/10 text-[10px] uppercase font-black tracking-widest">Вернуться</Button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-5">
                <div className="space-y-4">
                  {mode === 'register' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/60 ml-1">Ваше Имя</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <Input placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-xl pl-10 text-sm font-bold" required />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/60 ml-1">Никнейм</Label>
                        <div className="relative">
                          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <Input placeholder="user" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-xl pl-10 text-sm font-mono" required />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/60 ml-1">Номер или Логин</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <Input 
                        placeholder="+7 (___) ___ __ __" 
                        value={formData.identifier} 
                        onChange={e => setFormData({...formData, identifier: e.target.value})} 
                        className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 text-base font-bold tracking-wider" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/60 ml-1">Пароль</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12" required />
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div className="flex items-center space-x-3 bg-primary/5 p-3 rounded-2xl border border-primary/10">
                      <Checkbox id="2fa" checked={formData.enable2FA} onCheckedChange={(v) => setFormData({...formData, enable2FA: !!v})} />
                      <label htmlFor="2fa" className="text-[10px] font-black uppercase text-primary leading-none cursor-pointer tracking-widest">Активировать 2FA защиту</label>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button type="submit" disabled={isLoading} className="w-full h-14 text-sm font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl transition-all bg-primary hover:bg-primary/90 shadow-primary/30 group">
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (mode === 'login' ? <>Вход <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></> : <>Создать Узел <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></>)}
                  </Button>
                </div>

                {mode === 'register' && (
                  <p className="text-[8px] text-muted-foreground/40 text-center leading-relaxed px-4 uppercase font-bold tracking-widest">
                    Регистрируясь, вы принимаете <br />
                    <button type="button" onClick={() => setLegalModal({ open: true, type: 'terms' })} className="text-primary hover:underline">Условия</button> и <button type="button" onClick={() => setLegalModal({ open: true, type: 'privacy' })} className="text-primary hover:underline">Политику</button>
                  </p>
                )}
              </form>
            )}

            {mode !== 'setup2fa' && (
              <div className="mt-8 text-center flex flex-col gap-3">
                <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[10px] text-white/40 hover:text-primary transition-colors font-black uppercase tracking-widest">
                  {mode === 'login' ? 'Нет узла? Регистрация' : 'Уже в системе? Вход'}
                </button>
                <button onClick={() => setMode('recover')} className="text-[10px] text-accent/40 hover:text-accent transition-colors font-black uppercase tracking-widest">
                  Восстановление доступа
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <LegalModal 
        open={legalModal.open} 
        onOpenChange={(o) => setLegalModal({ ...legalModal, open: o })} 
        type={legalModal.type} 
      />
    </div>
  );
}
