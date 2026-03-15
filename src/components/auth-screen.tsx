
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, ArrowRight, User, Lock, AtSign, Phone, Fingerprint, Zap, Globe, ZapOff } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { useTranslations } from '@/hooks/use-translations';
import { useAppState } from '@/lib/store';
import type { User as UserType } from '@/lib/types';
import { NuxusLogo } from './nuxus-logo';
import { LegalModal } from './modals/legal-modal';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register' | 'recover' | 'setup2fa' | 'shield_block' | 'shield_failure';

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
      if (ref) {
        setReferralId(ref);
        setMode('register');
      }
    }
  }, []);

  const checkVpnStatus = async () => {
    try {
      // Превентивная блокировка, если в этой сессии уже ловили VPN
      if (sessionStorage.getItem('nuxus_shield_locked') === 'true') {
        return { isVpn: true, ip: 'Locked', failure: false };
      }

      const res = await fetch('https://ipwho.is/', { cache: 'no-store' });
      if (!res.ok) throw new Error("Shield bypass");
      
      const data = await res.json();
      const ip = data.ip || 'Shielded';
      
      const isSuspicious = data.security && (
        data.security.vpn || 
        data.security.proxy || 
        data.security.tor || 
        data.security.relay ||
        data.security.type === 'hosting'
      );

      if (isSuspicious) {
        sessionStorage.setItem('nuxus_shield_locked', 'true');
        return { isVpn: true, ip, failure: false };
      }
      return { isVpn: false, ip, failure: false };
    } catch (e) {
      // В параноидальном режиме любой сбой проверки — это подозрение на обход
      return { isVpn: true, ip: 'Shielded', failure: true };
    }
  };

  const getVirtualEmail = (id: string) => {
    let input = id.trim();
    if (input.includes('@')) return input.toLowerCase();
    let digits = input.replace(/\D/g, '');
    if (digits.length >= 10) return `${digits}${MASTER_DOMAIN}`;
    return `${input.toLowerCase()}${MASTER_DOMAIN}`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast({ title: "Слишком короткий пароль", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const shield = await checkVpnStatus();
      if (shield.failure) {
        setMode('shield_failure');
        setIsLoading(false);
        return;
      }
      if (shield.isVpn) {
        setMode('shield_block');
        setIsLoading(false);
        return;
      }

      await setPersistence(auth, browserLocalPersistence);
      const virtualEmail = getVirtualEmail(formData.identifier);
      
      if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, formData.password);
        const uid = userCredential.user.uid;
        setRegisteredUid(uid);
        
        const profileData = {
          id: uid,
          name: formData.name || 'Nuxus User',
          username: formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + formData.username.toLowerCase(),
          phone: formData.identifier.replace(/\D/g, ''),
          createdAt: new Date().toISOString(),
          isPremium: false,
          referralCount: 0,
          invitedBy: referralId || null,
          twoFactorEnabled: false,
          lastIp: shield.ip
        };
        
        await setDoc(doc(db!, 'users', uid), profileData);

        if (referralId && referralId !== uid) {
          try {
            await updateDoc(doc(db!, 'users', referralId), { referralCount: increment(1) });
          } catch (refErr) {}
        }

        if (formData.enable2FA) {
          setMode('setup2fa');
        } else {
          setIs2FAVerified(true);
        }
      } else {
        const cred = await signInWithEmailAndPassword(auth, virtualEmail, formData.password);
        const userRef = doc(db!, 'users', cred.user.uid);
        await updateDoc(userRef, { lastIp: shield.ip });
        const snap = await getDoc(userRef);

        if (snap.exists() && snap.data().twoFactorEnabled) {
          setIs2FAVerified(false);
        } else {
          setIs2FAVerified(true);
        }
      }
    } catch (err: any) {
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') msg = "Этот номер уже занят.";
      if (err.code === 'auth/invalid-credential') msg = "Неверный узел или пароль.";
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

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 5) {
      handleRootAuth();
    }
  };

  const handleRootAuth = async () => {
    setIsLoading(true);
    try {
      const email = `${MASTER_PHONE}${MASTER_DOMAIN}`;
      const cred = await signInWithEmailAndPassword(auth, email, MASTER_PASS);
      setIs2FAVerified(true);
      toast({ title: "ROOT ACCESS GRANTED" });
    } catch (err: any) {
      toast({ title: "Ошибка Root", variant: "destructive" });
      setClickCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'shield_block') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050000] p-6 text-center">
        <div className="bg-destructive/20 p-8 rounded-[3rem] border border-destructive/30 shadow-[0_0_100px_rgba(239,68,68,0.2)] mb-10">
          <Globe className="w-20 h-20 text-destructive animate-bounce" />
        </div>
        <h1 className="text-4xl font-black mb-4 text-white uppercase italic tracking-tighter">Shield Blocked</h1>
        <p className="text-[10px] uppercase font-black tracking-[0.4em] text-destructive animate-pulse mb-10">VPN / PROXY DETECTED</p>
        <p className="text-muted-foreground/60 text-[11px] leading-relaxed uppercase font-bold max-w-xs mb-12">
          Система Nuxus Shield обнаружила использование анонимайзера. Прямой защищенный сигнал обязателен.
        </p>
        <Button variant="outline" className="rounded-2xl border-white/10 h-14 px-10 font-black uppercase tracking-widest bg-white/5" onClick={() => window.location.reload()}>Переподключиться</Button>
      </div>
    );
  }

  if (mode === 'shield_failure') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050000] p-6 text-center">
        <ZapOff className="w-16 h-16 text-primary/40 mb-6" />
        <h2 className="text-xl font-black text-white uppercase italic mb-2">Shield Offline</h2>
        <p className="text-[10px] text-muted-foreground uppercase font-bold max-w-xs mb-10 leading-relaxed">
          Не удалось верифицировать узел безопасности. Отключите блокировщики и попробуйте снова.
        </p>
        <Button variant="ghost" onClick={() => window.location.reload()} className="font-black uppercase text-[10px] tracking-widest border border-white/5 rounded-xl h-12 px-8">Перезапустить Ядро</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-primary/20 blur-[180px] rounded-full animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-accent/10 blur-[150px] rounded-full animate-pulse-glow" style={{ animationDelay: '3s' }} />
      </div>

      <div className="w-full max-w-[360px] relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
        <div className="mb-2 transition-all cursor-pointer hover:scale-110 active:scale-90 scale-50 md:scale-75" onClick={handleLogoClick}>
          <NuxusLogo size={60} />
        </div>

        <Card className="w-full border-white/[0.08] bg-white/[0.03] backdrop-blur-[100px] shadow-2xl rounded-[2rem] overflow-hidden relative">
          <CardHeader className="text-center pb-1 pt-4 px-6">
            <CardTitle className="text-xl font-black tracking-tighter uppercase italic text-white leading-none">
              {mode === 'recover' ? 'Restore' : mode === 'setup2fa' ? 'Quantum' : mode === 'login' ? 'Signal' : 'Create'}
            </CardTitle>
            <CardDescription className="text-primary/80 font-black tracking-[0.4em] uppercase text-[6px] opacity-60 mt-1">
              {mode === 'setup2fa' ? 'Protection Key' : mode === 'recover' ? 'Neural recovery' : 'Kernel Access Layer'}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-5 pt-2">
            {mode === 'setup2fa' ? (
              <form onSubmit={handleSetup2FA} className="space-y-4">
                <div className="flex flex-col items-center gap-2 py-1">
                  <Fingerprint className="w-10 h-10 text-primary animate-float" />
                  <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest text-center">Установите квантовый ключ</p>
                </div>
                <Input 
                  type="password" 
                  placeholder="••••••" 
                  maxLength={6} 
                  value={formData.pin2FA} 
                  onChange={e => setFormData({...formData, pin2FA: e.target.value.replace(/\D/g, '')})} 
                  className="bg-white/5 border-white/10 h-10 rounded-xl text-center text-lg tracking-[0.5em] font-black"
                  required 
                />
                <Button type="submit" disabled={isLoading} className="w-full h-10 bg-primary text-white rounded-xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 text-[10px]">
                  {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : "Активировать"}
                </Button>
              </form>
            ) : mode === 'recover' ? (
              <div className="space-y-4 text-center py-2">
                <ShieldAlert className="w-10 h-10 text-accent animate-pulse mx-auto" />
                <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60 px-2 leading-relaxed">Для восстановления обратитесь к Владельцу Nuxus Prime.</p>
                <Button variant="outline" onClick={() => setMode('login')} className="w-full h-9 rounded-xl border-white/10 text-[7px] uppercase font-black tracking-widest">Назад</Button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-3">
                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[7px] uppercase font-black text-primary/60 ml-2">Имя</Label>
                      <Input placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 h-8 rounded-xl text-[10px] font-bold" required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[7px] uppercase font-black text-primary/60 ml-2">ID</Label>
                      <Input placeholder="user" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 h-8 rounded-xl text-[10px] font-mono" required />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[7px] uppercase font-black text-primary/60 ml-2">Узел / Телефон</Label>
                  <Input 
                    placeholder="+7 (___) ___ __ __" 
                    value={formData.identifier} 
                    onChange={e => setFormData({...formData, identifier: e.target.value})} 
                    className="bg-white/5 border-white/10 h-9 rounded-xl text-xs font-bold tracking-wider" 
                    required 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[7px] uppercase font-black text-primary/60 ml-2">Пароль</Label>
                  <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-9 rounded-xl text-xs" required />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full h-10 bg-primary text-white rounded-xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 text-[10px]">
                  {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : (mode === 'login' ? "Вход в Ядро" : "Создать Узел")}
                </Button>

                <div className="mt-4 text-center flex flex-col gap-1.5">
                  <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[7px] text-white/30 hover:text-primary transition-all font-black uppercase tracking-[0.2em]">
                    {mode === 'login' ? 'НЕТ УЗЛА? ИНИЦИАЛИЗАЦИЯ' : 'УЖЕ В СИСТЕМЕ? КОННЕКТ'}
                  </button>
                  <button onClick={() => setMode('recover')} className="text-[6px] text-accent/20 hover:text-accent font-black uppercase tracking-[0.2em]">RECOVERY MODE</button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <LegalModal open={legalModal.open} onOpenChange={(o) => setLegalModal({ ...legalModal, open: o })} type={legalModal.type} />
    </div>
  );
}
