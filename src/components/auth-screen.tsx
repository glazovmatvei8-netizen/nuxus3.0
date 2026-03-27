
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Fingerprint, RefreshCcw, Lock, ShieldCheck, ArrowRight, Zap } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { useAppState } from '@/lib/store';
import { NuxusLogo } from './nuxus-logo';
import { LegalModal } from './modals/legal-modal';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register' | 'recover' | 'setup2fa' | 'recovering';

const MASTER_DOMAIN = '@nuxus.chat';

export default function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { setIs2FAVerified } = useAppState();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
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
      if (ref) {
        setReferralId(ref);
        setMode('register');
      }
    }
  }, []);

  const getVirtualEmail = (id: string) => {
    let input = id.trim();
    if (input.includes('@')) return input.toLowerCase();
    let digits = input.replace(/\D/g, '');
    if (digits.length >= 10) return `${digits}${MASTER_DOMAIN}`;
    return `${input.toLowerCase()}${MASTER_DOMAIN}`;
  };

  const createProfileRecord = async (uid: string, overrideData?: any) => {
    const userRef = doc(db!, 'users', uid);
    const snap = await getDoc(userRef);
    
    const profileData = {
      id: uid,
      name: overrideData?.name || formData.name || 'Nuxus User',
      username: overrideData?.username || (formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + (formData.username || 'user' + Math.floor(Math.random()*1000)).toLowerCase()),
      phone: overrideData?.phone || formData.identifier.replace(/\D/g, ''),
      createdAt: snap.exists() ? snap.data().createdAt : new Date().toISOString(),
      isPremium: snap.exists() ? snap.data().isPremium : (overrideData?.isPremium || false),
      premiumUntil: snap.exists() ? snap.data().premiumUntil : (overrideData?.premiumUntil || null),
      referralCount: snap.exists() ? snap.data().referralCount : 0,
      invitedBy: snap.exists() ? snap.data().invitedBy : (referralId || null),
      twoFactorEnabled: snap.exists() ? snap.data().twoFactorEnabled : false,
      balance: snap.exists() ? snap.data().balance : (overrideData?.balance || 0)
    };

    await setDoc(userRef, profileData, { merge: true });

    if (!snap.exists() && referralId && referralId !== uid) {
      try { 
        await updateDoc(doc(db!, 'users', referralId), { referralCount: increment(1) }); 
      } catch (refErr) {}
    }
    return profileData;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast({ title: "Слишком короткий пароль", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const virtualEmail = getVirtualEmail(formData.identifier);
      
      if (mode === 'register') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, formData.password);
          const uid = userCredential.user.uid;
          setRegisteredUid(uid);
          await createProfileRecord(uid);
          if (formData.enable2FA) setMode('setup2fa');
          else setIs2FAVerified(true);
        } catch (regErr: any) {
          if (regErr.code === 'auth/email-already-in-use') {
            setMode('recovering');
            const cred = await signInWithEmailAndPassword(auth, virtualEmail, formData.password);
            const userRef = doc(db!, 'users', cred.user.uid);
            const snap = await getDoc(userRef);
            if (!snap.exists()) {
              await createProfileRecord(cred.user.uid);
            }
            setIs2FAVerified(true);
          } else {
            throw regErr;
          }
        }
      } else {
        const cred = await signInWithEmailAndPassword(auth, virtualEmail, formData.password);
        const userRef = doc(db!, 'users', cred.user.uid);
        const snap = await getDoc(userRef);
        
        if (!snap.exists()) {
          await createProfileRecord(cred.user.uid, {
            name: 'Recovered Node',
            phone: formData.identifier.replace(/\D/g, '')
          });
          toast({ title: "Аккаунт восстановлен" });
        }

        if (snap.exists() && snap.data().twoFactorEnabled) setIs2FAVerified(false);
        else setIs2FAVerified(true);
      }
    } catch (err: any) {
      let msg = err.message;
      if (err.code === 'auth/invalid-credential') msg = "Неверный аккаунт или пароль.";
      toast({ title: "Ошибка доступа", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeredUid || !formData.pin2FA) return;
    setIsLoading(true);
    try {
      await setDoc(doc(db!, 'users', registeredUid), {
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

  if (mode === 'recovering') {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] text-white">
        <div className="relative">
          <div className="absolute inset-0 bg-primary blur-[80px] opacity-20 animate-pulse" />
          <NuxusLogo size={160} />
        </div>
        <div className="mt-16 flex flex-col items-center gap-6">
          <div className="relative w-48 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-primary animate-[scanline_2s_linear_infinite]" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.8em] text-primary/60 animate-pulse ml-[0.8em]">Account Recovery Sync...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] p-4 relative overflow-hidden">
      {/* Cinematic Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[100%] h-[100%] bg-primary/10 blur-[200px] rounded-full animate-pulse-glow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[100%] h-[100%] bg-accent/5 blur-[180px] rounded-full animate-pulse-glow" style={{ animationDelay: '3s' }} />
      </div>

      <div className="w-full max-w-[380px] relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-1000">
        <div className="mb-8 scale-90 hover:scale-100 transition-transform duration-700">
          <NuxusLogo size={100} />
        </div>

        <Card className="w-full border-white/[0.08] bg-white/[0.02] backdrop-blur-[120px] shadow-2xl rounded-[3rem] overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          
          <CardHeader className="text-center pb-2 pt-10 px-8">
            <CardTitle className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">
              {mode === 'recover' ? 'Restore' : mode === 'setup2fa' ? 'Quantum' : mode === 'login' ? 'Signal' : 'Create'}
            </CardTitle>
            <CardDescription className="text-primary/80 font-black tracking-[0.5em] uppercase text-[8px] opacity-60 mt-3 ml-[0.5em]">
              {mode === 'setup2fa' ? 'Protection Key' : mode === 'recover' ? 'Neural recovery' : 'Neural Access Layer'}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-10 pt-6">
            {mode === 'setup2fa' ? (
              <form onSubmit={handleSetup2FA} className="space-y-8">
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary blur-3xl opacity-20 animate-pulse" />
                    <Fingerprint className="w-16 h-16 text-primary animate-float relative z-10" />
                  </div>
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em] text-center">Установите 6-значный квантовый ключ</p>
                </div>
                <Input 
                  type="password" 
                  placeholder="••••••" 
                  maxLength={6} 
                  value={formData.pin2FA} 
                  onChange={e => setFormData({...formData, pin2FA: e.target.value.replace(/\D/g, '')})} 
                  className="bg-white/5 border-white/10 h-16 rounded-2xl text-center text-3xl tracking-[0.6em] font-black focus:border-primary/50 transition-all shadow-inner" 
                  required 
                />
                <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all">
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Активировать Узел"}
                </Button>
              </form>
            ) : mode === 'recover' ? (
              <div className="space-y-8 text-center py-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-accent blur-3xl opacity-10 animate-pulse" />
                  <ShieldAlert className="w-16 h-16 text-accent animate-float mx-auto relative z-10" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-4 leading-relaxed">
                  Для восстановления доступа к узлу обратитесь к Владельцу Nuxus Prime через защищенный канал.
                </p>
                <Button variant="outline" onClick={() => setMode('login')} className="w-full h-14 rounded-2xl border-white/10 text-[10px] uppercase font-black tracking-[0.3em] hover:bg-white/5 transition-all">Вернуться</Button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-5">
                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[8px] uppercase font-black text-primary/60 ml-3 tracking-widest">Имя</Label>
                      <Input placeholder="Node Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-2xl text-xs font-bold" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[8px] uppercase font-black text-primary/60 ml-3 tracking-widest">ID</Label>
                      <Input placeholder="node_id" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-2xl text-xs font-mono" required />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-[8px] uppercase font-black text-primary/60 ml-3 tracking-widest">Аккаунт / Телефон</Label>
                  <Input placeholder="+7 (___) ___ __ __" value={formData.identifier} onChange={e => setFormData({...formData, identifier: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-2xl text-sm font-bold tracking-widest" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-[8px] uppercase font-black text-primary/60 ml-3 tracking-widest">Пароль</Label>
                  <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-2xl text-sm tracking-widest" required />
                </div>
                
                <div className="pt-4">
                  <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all group overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                      <span className="flex items-center gap-2">
                        {mode === 'login' ? "Вход в Ядро" : "Создать Узел"}
                        <Zap className="w-4 h-4 fill-current" />
                      </span>
                    )}
                  </Button>
                </div>

                <div className="mt-8 text-center flex flex-col gap-3">
                  <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[8px] text-white/30 hover:text-primary transition-all font-black uppercase tracking-[0.3em]">
                    {mode === 'login' ? 'НЕТ АККАУНТА? РЕГИСТРАЦИЯ' : 'УЖЕ ЕСТЬ АККАУНТ? ВОЙТИ'}
                  </button>
                  {mode === 'login' && (
                    <button type="button" onClick={() => setMode('recover')} className="text-[8px] text-white/20 hover:text-accent transition-all font-black uppercase tracking-[0.3em]">
                      ВОССТАНОВЛЕНИЕ ДОСТУПА
                    </button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Legal Links */}
        <div className="mt-10 flex gap-8 opacity-30">
          <button onClick={() => setLegalModal({ open: true, type: 'terms' })} className="text-[9px] font-black uppercase tracking-[0.2em] hover:text-primary transition-colors">Условия</button>
          <button onClick={() => setLegalModal({ open: true, type: 'privacy' })} className="text-[9px] font-black uppercase tracking-[0.2em] hover:text-primary transition-colors">Приватность</button>
        </div>
      </div>
      <LegalModal open={legalModal.open} onOpenChange={(o) => setLegalModal({ ...legalModal, open: o })} type={legalModal.type} />
    </div>
  );
}
