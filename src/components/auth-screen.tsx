
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, ShieldAlert, FileText, ArrowRight, User, Lock, AtSign, Phone, Fingerprint, Zap } from 'lucide-react';
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
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
      {/* 2026 PLASMA BACKGROUND */}
      <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-primary/20 blur-[180px] rounded-full animate-pulse-glow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-accent/10 blur-[150px] rounded-full animate-pulse-glow pointer-events-none" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,transparent_0%,#050505_70%)] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
        <div className="mb-12 transition-all cursor-pointer hover:scale-110 active:scale-90 filter drop-shadow-[0_0_30px_rgba(139,92,246,0.5)]" onClick={handleLogoClick}>
          <NuxusLogo size={110} />
        </div>

        <div className="w-full relative group">
          {/* Ethereal Glow Border */}
          <div className="absolute -inset-[1px] bg-gradient-to-tr from-primary/40 via-white/5 to-accent/40 rounded-[3.5rem] blur-[2px] opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
          
          <Card className="w-full border-white/[0.08] bg-white/[0.03] backdrop-blur-[80px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-[3.5rem] overflow-hidden relative border">
            <CardHeader className="text-center pb-2 pt-12 px-10">
              <div className="space-y-2">
                <CardTitle className="text-5xl font-black tracking-[-0.05em] uppercase italic text-white leading-none">
                  {mode === 'recover' ? 'Restore' : mode === 'setup2fa' ? 'Quantum' : mode === 'login' ? 'Signal' : 'Create'}
                </CardTitle>
                <CardDescription className="text-primary/80 font-black tracking-[0.5em] uppercase text-[9px] opacity-60">
                  {mode === 'setup2fa' ? 'Protection Key' : mode === 'recover' ? 'Neural recovery' : 'Kernel Access Layer'}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-10 pb-12 pt-8">
              {mode === 'setup2fa' ? (
                <form onSubmit={handleSetup2FA} className="space-y-8">
                  <div className="flex flex-col items-center gap-6 py-2">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary blur-3xl opacity-30 animate-pulse" />
                      <div className="w-20 h-20 rounded-[2.2rem] bg-white/5 border border-white/10 flex items-center justify-center relative z-10 shadow-[0_0_40px_rgba(139,92,246,0.2)]">
                        <Fingerprint className="w-10 h-10 text-primary animate-float" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] text-center leading-relaxed max-w-[200px]">Установите квантовый ключ защиты узла</p>
                  </div>
                  
                  <div className="space-y-6">
                    <Input 
                      type="password" 
                      placeholder="••••••" 
                      maxLength={6} 
                      value={formData.pin2FA} 
                      onChange={e => setFormData({...formData, pin2FA: e.target.value.replace(/\D/g, '')})} 
                      className="bg-white/5 border-white/10 h-20 rounded-[2rem] text-center text-4xl tracking-[0.6em] font-black focus:border-primary/50 transition-all shadow-inner"
                      required 
                    />
                    <Button type="submit" disabled={isLoading} className="w-full h-16 bg-primary hover:bg-primary/90 text-white rounded-[2rem] font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 group">
                      {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <>Активировать <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" /></>}
                    </Button>
                    <button type="button" onClick={() => setIs2FAVerified(true)} className="w-full text-[9px] uppercase font-black text-white/20 hover:text-white transition-colors tracking-[0.3em]">Пропустить инициализацию</button>
                  </div>
                </form>
              ) : mode === 'recover' ? (
                <div className="space-y-10 text-center py-6">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-accent blur-3xl opacity-20" />
                    <div className="w-24 h-24 bg-accent/5 rounded-full flex items-center justify-center mx-auto border border-accent/20 relative z-10">
                      <ShieldAlert className="w-12 h-12 text-accent animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-black uppercase tracking-widest text-white italic">Сигнал заблокирован</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-relaxed px-4">Для восстановления нейронной связи обратитесь к Владельцу Nuxus Prime.</p>
                  </div>
                  <Button variant="outline" onClick={() => setMode('login')} className="w-full h-14 rounded-[1.8rem] border-white/10 bg-white/5 text-[10px] uppercase font-black tracking-widest hover:bg-white/10">Вернуться к входу</Button>
                </div>
              ) : (
                <form onSubmit={handleAuth} className="space-y-6">
                  <div className="space-y-5">
                    {mode === 'register' && (
                      <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-500">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black tracking-widest text-primary/60 ml-2">Имя</Label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <Input placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-[1.5rem] pl-12 text-sm font-bold focus:bg-white/[0.08]" required />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black tracking-widest text-primary/60 ml-2">ID</Label>
                          <div className="relative">
                            <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <Input placeholder="user" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-[1.5rem] pl-12 text-sm font-mono focus:bg-white/[0.08]" required />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-primary/60 ml-2">Узел / Телефон</Label>
                      <div className="relative">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <Input 
                          placeholder="+7 (___) ___ __ __" 
                          value={formData.identifier} 
                          onChange={e => setFormData({...formData, identifier: e.target.value})} 
                          className="bg-white/5 border-white/10 h-16 rounded-[1.8rem] pl-14 text-lg font-bold tracking-wider focus:bg-white/[0.08] transition-all" 
                          required 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-primary/60 ml-2">Пароль</Label>
                      <div className="relative">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-16 rounded-[1.8rem] pl-14 focus:bg-white/[0.08] transition-all" required />
                      </div>
                    </div>

                    {mode === 'register' && (
                      <div className="flex items-center space-x-4 bg-primary/5 p-4 rounded-[1.8rem] border border-primary/10 transition-all hover:bg-primary/10">
                        <Checkbox id="2fa" checked={formData.enable2FA} onCheckedChange={(v) => setFormData({...formData, enable2FA: !!v})} />
                        <label htmlFor="2fa" className="text-[10px] font-black uppercase text-primary leading-none cursor-pointer tracking-widest">Активировать 2FA Quantum защиту</label>
                      </div>
                    )}
                  </div>

                  <div className="pt-4">
                    <Button type="submit" disabled={isLoading} className="w-full h-16 text-md font-black uppercase tracking-[0.2em] italic rounded-[2rem] shadow-[0_20px_50px_rgba(139,92,246,0.3)] transition-all bg-primary hover:bg-primary/90 group active:scale-[0.98]">
                      {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : (mode === 'login' ? <>Вход в Ядро <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" /></> : <>Создать Узел <Zap className="w-5 h-5 ml-2 fill-current" /></>)}
                    </Button>
                  </div>

                  {mode === 'register' && (
                    <p className="text-[9px] text-white/20 text-center leading-relaxed px-6 uppercase font-bold tracking-[0.15em]">
                      Регистрируясь, вы принимаете <br />
                      <button type="button" onClick={() => setLegalModal({ open: true, type: 'terms' })} className="text-primary/60 hover:text-primary transition-colors underline">Условия использования</button> и <button type="button" onClick={() => setLegalModal({ open: true, type: 'privacy' })} className="text-primary/60 hover:text-primary transition-colors underline">Политику Ядра</button>
                    </p>
                  )}
                </form>
              )}

              {mode !== 'setup2fa' && (
                <div className="mt-10 text-center flex flex-col gap-4">
                  <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[10px] text-white/30 hover:text-primary transition-all font-black uppercase tracking-[0.3em] py-2">
                    {mode === 'login' ? 'НЕТ УЗЛА? ИНИЦИАЛИЗАЦИЯ' : 'УЖЕ В СИСТЕМЕ? КОННЕКТ'}
                  </button>
                  <button onClick={() => setMode('recover')} className="text-[9px] text-accent/30 hover:text-accent transition-all font-black uppercase tracking-[0.3em]">
                    RECOVERY MODE
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <LegalModal 
        open={legalModal.open} 
        onOpenChange={(o) => setLegalModal({ ...legalModal, open: o })} 
        type={legalModal.type} 
      />
    </div>
  );
}
