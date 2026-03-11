
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, ArrowRight, User, Lock, AtSign, Phone, Fingerprint, Zap, Globe } from 'lucide-react';
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

type AuthMode = 'login' | 'register' | 'recover' | 'setup2fa' | 'vpn_block';

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

  const checkVpnStatus = async () => {
    try {
      const res = await fetch('https://ipwho.is/');
      const data = await res.json();
      
      // Блокировка по флагам VPN, Proxy или Tor
      if (data.security && (data.security.vpn || data.security.proxy || data.security.tor)) {
        return { isVpn: true, ip: data.ip };
      }
      return { isVpn: false, ip: data.ip || 'Unknown' };
    } catch (e) {
      return { isVpn: false, ip: 'Unknown' };
    }
  };

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
      // VPN Check before auth
      const { isVpn, ip } = await checkVpnStatus();
      if (isVpn) {
        setMode('vpn_block');
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
          name: formData.name || 'User',
          username: formData.username.startsWith('@') ? formData.username.toLowerCase() : '@' + formData.username.toLowerCase(),
          phone: formData.identifier.replace(/\D/g, ''),
          createdAt: new Date().toISOString(),
          isPremium: false,
          referralCount: 0,
          invitedBy: referralId || null,
          twoFactorEnabled: false,
          lastIp: ip
        };
        
        await setDoc(doc(db, 'users', uid), profileData);

        if (referralId && referralId !== uid) {
          const inviterRef = doc(db, 'users', referralId);
          const inviterSnap = await getDoc(inviterRef);
          if (inviterSnap.exists()) {
            const updateData: any = { referralCount: increment(1) };
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
        const userRef = doc(db, 'users', cred.user.uid);
        
        // Update IP on login
        await updateDoc(userRef, { lastIp: ip });
        const snap = await getDoc(userRef);

        if (snap.exists() && snap.data().twoFactorEnabled) {
          setIs2FAVerified(false);
        } else {
          setIs2FAVerified(true);
        }
      }
    } catch (err: any) {
      toast({ title: "Ошибка доступа", variant: "destructive" });
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
      const { isVpn, ip } = await checkVpnStatus();
      if (isVpn) {
        setMode('vpn_block');
        setIsLoading(false);
        return;
      }

      await setPersistence(auth, browserLocalPersistence);
      const email = `${MASTER_PHONE}${MASTER_DOMAIN}`;
      const cred = await signInWithEmailAndPassword(auth, email, MASTER_PASS);
      
      await updateDoc(doc(db, 'users', cred.user.uid), { lastIp: ip });
      
      setIs2FAVerified(true);
      toast({ title: "ROOT ACCESS GRANTED" });
    } catch (err: any) {
      toast({ title: "Ошибка Root-доступа", variant: "destructive" });
      setClickCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'vpn_block') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050000] p-6 text-center">
        <div className="bg-destructive/20 p-8 rounded-[3rem] border border-destructive/30 shadow-[0_0_100px_rgba(239,68,68,0.2)] mb-10">
          <Globe className="w-20 h-20 text-destructive animate-bounce" />
        </div>
        <h1 className="text-4xl font-black mb-4 text-white uppercase italic tracking-tighter">Signal Blocked</h1>
        <p className="text-[10px] uppercase font-black tracking-[0.4em] text-destructive animate-pulse mb-10">VPN / PROXY DETECTED</p>
        <p className="text-muted-foreground/60 text-[11px] leading-relaxed uppercase font-bold max-w-xs mb-12">
          Система Nuxus Shield обнаружила использование VPN. Для входа в Ядро необходимо прямое защищенное соединение.
        </p>
        <Button variant="outline" className="rounded-2xl border-white/10 h-14 px-10 font-black uppercase tracking-widest bg-white/5" onClick={() => window.location.reload()}>Переподключиться</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-start md:justify-center bg-[#050505] p-4 relative overflow-y-auto scrollbar-hide">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-primary/20 blur-[180px] rounded-full animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-accent/10 blur-[150px] rounded-full animate-pulse-glow" style={{ animationDelay: '3s' }} />
      </div>

      <div className="w-full max-w-[420px] relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700 py-10">
        <div className="mb-10 transition-all cursor-pointer hover:scale-110 active:scale-90 filter drop-shadow-[0_0_30px_rgba(139,92,246,0.5)]" onClick={handleLogoClick}>
          <NuxusLogo size={90} />
        </div>

        <div className="w-full relative group">
          <div className="absolute -inset-[1px] bg-gradient-to-tr from-primary/40 via-white/5 to-accent/40 rounded-[3rem] blur-[2px] opacity-50" />
          
          <Card className="w-full border-white/[0.08] bg-white/[0.03] backdrop-blur-[100px] shadow-2xl rounded-[3rem] overflow-hidden relative">
            <CardHeader className="text-center pb-2 pt-10 px-8">
              <CardTitle className="text-4xl font-black tracking-tighter uppercase italic text-white">
                {mode === 'recover' ? 'Restore' : mode === 'setup2fa' ? 'Quantum' : mode === 'login' ? 'Signal' : 'Create'}
              </CardTitle>
              <CardDescription className="text-primary/80 font-black tracking-[0.4em] uppercase text-[8px] opacity-60">
                {mode === 'setup2fa' ? 'Protection Key' : mode === 'recover' ? 'Neural recovery' : 'Kernel Access Layer'}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-10 pt-6">
              {mode === 'setup2fa' ? (
                <form onSubmit={handleSetup2FA} className="space-y-6">
                  <div className="flex flex-col items-center gap-4 py-2">
                    <div className="w-16 h-16 rounded-[1.8rem] bg-white/5 border border-white/10 flex items-center justify-center relative shadow-2xl">
                      <Fingerprint className="w-8 h-8 text-primary animate-float" />
                    </div>
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest text-center leading-relaxed">Установите квантовый ключ защиты узла</p>
                  </div>
                  
                  <Input 
                    type="password" 
                    placeholder="••••••" 
                    maxLength={6} 
                    value={formData.pin2FA} 
                    onChange={e => setFormData({...formData, pin2FA: e.target.value.replace(/\D/g, '')})} 
                    className="bg-white/5 border-white/10 h-16 rounded-2xl text-center text-3xl tracking-[0.5em] font-black"
                    required 
                  />
                  <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20">
                    {isLoading ? <Loader2 className="animate-spin" /> : <>Активировать <ArrowRight className="w-5 h-5 ml-2" /></>}
                  </Button>
                  <button type="button" onClick={() => setIs2FAVerified(true)} className="w-full text-[8px] uppercase font-black text-white/20 tracking-widest">Пропустить</button>
                </form>
              ) : mode === 'recover' ? (
                <div className="space-y-8 text-center py-4">
                  <div className="w-20 h-24 bg-accent/5 rounded-full flex items-center justify-center mx-auto border border-accent/20">
                    <ShieldAlert className="w-10 h-10 text-accent animate-pulse" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-2">Для восстановления связи обратитесь к Владельцу Nuxus Prime.</p>
                  <Button variant="outline" onClick={() => setMode('login')} className="w-full h-12 rounded-2xl border-white/10 text-[9px] uppercase font-black tracking-widest">Назад</Button>
                </div>
              ) : (
                <form onSubmit={handleAuth} className="space-y-5">
                  {mode === 'register' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] uppercase font-black text-primary/60 ml-2">Имя</Label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <Input placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-2xl pl-10 text-sm font-bold" required />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] uppercase font-black text-primary/60 ml-2">ID</Label>
                        <div className="relative">
                          <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <Input placeholder="user" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 h-12 rounded-2xl pl-10 text-sm font-mono" required />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-black text-primary/60 ml-2">Узел / Телефон</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <Input 
                        placeholder="+7 (___) ___ __ __" 
                        value={formData.identifier} 
                        onChange={e => setFormData({...formData, identifier: e.target.value})} 
                        className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12 text-lg font-bold tracking-wider" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-black text-primary/60 ml-2">Пароль</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10 h-14 rounded-2xl pl-12" required />
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div className="flex items-center space-x-3 bg-primary/5 p-3 rounded-2xl border border-primary/10">
                      <Checkbox id="2fa" checked={formData.enable2FA} onCheckedChange={(v) => setFormData({...formData, enable2FA: !!v})} />
                      <label htmlFor="2fa" className="text-[9px] font-black uppercase text-primary leading-none cursor-pointer tracking-widest">Включить 2FA Quantum защиту</label>
                    </div>
                  )}

                  <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 mt-4">
                    {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? <>Вход в Ядро <ArrowRight className="w-5 h-5 ml-2" /></> : <>Создать Узел <Zap className="w-4 h-4 ml-2 fill-current" /></>)}
                  </Button>

                  {mode === 'register' && (
                    <div className="pt-2">
                      <p className="text-[8px] text-white/20 text-center uppercase font-bold tracking-wider px-2">
                        Принимаю <button type="button" onClick={() => setLegalModal({ open: true, type: 'terms' })} className="text-primary/60 hover:underline">Условия</button> и <button type="button" onClick={() => setLegalModal({ open: true, type: 'privacy' })} className="text-primary/60 hover:underline">Политику</button>
                      </p>
                    </div>
                  )}
                </form>
              )}

              {mode !== 'setup2fa' && (
                <div className="mt-8 text-center flex flex-col gap-3">
                  <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[9px] text-white/30 hover:text-primary transition-all font-black uppercase tracking-[0.2em]">
                    {mode === 'login' ? 'НЕТ УЗЛА? ИНИЦИАЛИЗАЦИЯ' : 'УЖЕ В СИСТЕМЕ? КОННЕКТ'}
                  </button>
                  <button onClick={() => setMode('recover')} className="text-[8px] text-accent/20 hover:text-accent font-black uppercase tracking-[0.2em]">
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
