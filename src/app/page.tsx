
"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useAuth, useDoc } from '@/firebase';
import { useAppState } from '@/lib/store.tsx';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { Fingerprint, Loader2, LogOut, X, AlertTriangle } from 'lucide-react';
import { doc, addDoc, collection } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { isUserActuallyBanned, isUserAnomaly } from '@/lib/utils';
import { NuxusLogo } from '@/components/nuxus-logo';

/**
 * HOME GATE V33.0 «HYDRATION SHIELD»
 * FIXED: Extreme hydration safety. All crypto and local storage logic is strictly in useEffect.
 */
export default function Home() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { is2FAVerified, setIs2FAVerified } = useAppState();
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [twoFactorInput, setTwoFactorInput] = useState('');
  const [isAppealing, setIsAppealing] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [isSendingAppeal, setIsSendingAppeal] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const userProfileRef = useMemo(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
  
  const isBanned = isUserActuallyBanned(profile);
  const isAnomaly = isUserAnomaly(profile);

  const handleVerify2FA = async () => {
    if (!profile) return;
    
    // Динамический импорт для предотвращения ошибок SSR (White Screen)
    try {
      const { authenticator } = await import('otplib');
      
      if (profile.totpEnabled && profile.totpSecret) {
         if (authenticator.check(twoFactorInput, profile.totpSecret)) {
            setIs2FAVerified(true);
            toast({ title: "Доступ подтвержден" });
            return;
         }
      }

      if (profile.twoFactorEnabled && twoFactorInput === profile.twoFactorPin) {
        setIs2FAVerified(true);
        toast({ title: "Доступ разрешен" });
        return;
      }

      toast({ title: "Неверный код доступа", variant: "destructive" });
      setTwoFactorInput('');
    } catch (e) {
      toast({ title: "Ошибка модуля защиты", variant: "destructive" });
    }
  };

  const handleSendAppeal = async () => {
    if (!db || !user || !profile || !appealReason.trim()) return;
    setIsSendingAppeal(true);
    try {
      await addDoc(collection(db, 'appeals'), {
        userId: user.uid,
        userName: profile.name,
        userPhone: profile.phone,
        userEmail: profile.email || 'Не привязана',
        reason: appealReason.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast({ title: "Заявка отправлена", description: "Ожидайте ответа службы поддержки." });
      setIsAppealing(false);
      setAppealReason('');
    } catch (e: any) {
      toast({ title: "Ошибка отправки", variant: "destructive" });
    } finally {
      setIsSendingAppeal(false);
    }
  };

  // Предотвращаем любой рендеринг до монтирования, чтобы избежать White Screen
  if (!mounted) {
    return null;
  }

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#010103] text-white">
        <NuxusLogo size={100} className="animate-pulse" />
        <div className="mt-8 flex flex-col items-center gap-2 opacity-20">
           <p className="text-[8px] font-black uppercase tracking-[0.5em]">Syncing Kernel</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (isBanned || isAnomaly) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#010103] p-8 text-center text-white space-y-8 animate-in fade-in duration-700 relative overflow-hidden">
        {isAppealing ? (
          <div className="w-full max-w-lg bg-white/[0.02] border border-white/10 rounded-[3rem] p-10 space-y-8 shadow-2xl relative z-10 animate-in zoom-in-95">
             <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-white uppercase italic">Апелляция</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsAppealing(false)} className="rounded-full h-10 w-10"><X size={24} /></Button>
             </div>
             <div className="space-y-6 text-left">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-white/40 ml-1 tracking-widest">UID аккаунта</Label>
                   <Input value={user.uid} readOnly className="bg-white/5 border-white/5 h-12 rounded-xl font-mono text-sm" />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-primary ml-1 tracking-widest">Причина разблокировки</Label>
                   <Textarea 
                     value={appealReason} 
                     onChange={e => setAppealReason(e.target.value.slice(0, 2000))}
                     placeholder="Пожалуйста, опишите ситуацию..." 
                     className="bg-black/40 border-white/10 rounded-2xl h-44 resize-none p-5 text-lg" 
                   />
                </div>
             </div>
             <Button 
               onClick={handleSendAppeal} 
               disabled={isSendingAppeal || !appealReason.trim()}
               className="w-full h-16 bg-primary hover:bg-primary/80 text-white rounded-2xl font-black uppercase italic tracking-widest transition-all shadow-xl"
             >
                {isSendingAppeal ? <Loader2 className="animate-spin" /> : 'Отправить запрос'}
             </Button>
          </div>
        ) : (
          <>
            <div className="bg-red-500/10 p-8 rounded-[3rem] border border-red-500/20 relative shadow-2xl">
              <AlertTriangle className="w-20 h-20 text-red-500" />
            </div>
            <div className="space-y-4 max-w-sm">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-tight">Доступ <br/> ограничен</h1>
              <p className="text-[13px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                Ваш аккаунт был заблокиров за нарушение правил мессенджера Nuxus.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button onClick={() => setIsAppealing(true)} className="h-16 rounded-2xl bg-white text-black font-black uppercase italic tracking-widest shadow-xl hover:scale-105 transition-all">
                Подать апелляцию
              </Button>
              <Button variant="ghost" onClick={() => signOut(auth!)} className="h-14 rounded-2xl border border-white/5 text-white/40 font-black uppercase tracking-widest hover:text-white transition-all">
                Выйти из системы
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  const isProtected = profile?.twoFactorEnabled || profile?.totpEnabled;

  if (isProtected && !is2FAVerified) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#010103] relative px-6">
        <div className="w-full max-w-[380px] space-y-12 text-center relative z-10">
          <div className="bg-white/[0.03] border border-white/10 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl relative overflow-hidden">
            <Fingerprint className="w-10 h-10 text-primary z-10 animate-pulse" />
            <div className="absolute inset-0 bg-primary/10 animate-pulse" />
          </div>
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter">{profile?.totpEnabled ? 'Облачный код' : 'Пароль защиты'}</h2>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Введите код доступа к вашему аккаунту</p>
            </div>
            <Input 
              type="password" placeholder="••••••" maxLength={6} autoFocus
              className="bg-white/[0.04] border-white/10 h-20 text-4xl tracking-[0.8em] text-center rounded-3xl font-bold focus:border-primary/50 transition-all text-white"
              value={twoFactorInput}
              onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
            />
            <div className="space-y-4 pt-4">
              <Button onClick={handleVerify2FA} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all">Подтвердить личность</Button>
              <Button variant="ghost" onClick={() => signOut(auth!)} className="w-full h-12 text-red-500/60 font-black uppercase tracking-widest gap-2"><LogOut className="w-4 h-4" /> Выйти</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatMain />;
}
