
"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useAuth, useDoc } from '@/firebase/provider';
import { useAppState } from '@/lib/store.tsx';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { ShieldAlert, Fingerprint, ShieldCheck, Loader2, LogOut, Key, UserX, MessageSquare, Send, X, AlertTriangle } from 'lucide-react';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { isUserActuallyBanned, isUserAnomaly } from '@/lib/utils';
import { NuxusLogo } from '@/components/nuxus-logo';
import { authenticator } from 'otplib';

/**
 * HOME GATE V8.8.0 «AEGIS JUSTICE»
 * ADDED: Appeal system for banned users.
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
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
  
  const isBanned = isUserActuallyBanned(profile);
  const isAnomaly = isUserAnomaly(profile);

  const handleVerify2FA = () => {
    if (!profile) return;
    
    if (profile.totpEnabled && profile.totpSecret) {
       if (authenticator.check(twoFactorInput, profile.totpSecret)) {
          setIs2FAVerified(true);
          toast({ title: "Сигнал подтвержден" });
          return;
       }
    }

    if (profile.twoFactorEnabled && twoFactorInput === profile.twoFactorPin) {
      setIs2FAVerified(true);
      toast({ title: "Доступ разрешен" });
      return;
    }

    toast({ title: "Ключ не принят", variant: "destructive" });
    setTwoFactorInput('');
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
      toast({ title: "Апелляция отправлена", description: "Ожидайте решения Совета Ядра." });
      setIsAppealing(false);
      setAppealReason('');
    } catch (e: any) {
      toast({ title: "Ошибка отправки", variant: "destructive" });
    } finally {
      setIsSendingAppeal(false);
    }
  };

  if (!mounted) return null;
  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#020203] text-white">
        <NuxusLogo size={150} />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  // SCREEN: BANNED OR ANOMALY
  if (isBanned || isAnomaly) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#050505] p-8 text-center text-white space-y-8 animate-in fade-in duration-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.1)_0%,transparent_70%)] pointer-events-none" />
        
        {isAppealing ? (
          <div className="w-full max-w-lg bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative z-10 animate-in zoom-in-95 duration-500">
             <div className="flex items-center justify-between">
                <h2 className="text-xl font-black uppercase italic tracking-widest text-white">Апелляция Узла</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsAppealing(false)} className="rounded-full"><X className="w-5 h-5" /></Button>
             </div>
             
             <div className="grid grid-cols-1 gap-4 text-left">
                <div className="space-y-1">
                   <Label className="text-[8px] font-black uppercase text-white/40 ml-2">Идентификатор (UID)</Label>
                   <Input value={user.uid} readOnly className="bg-white/5 border-white/5 text-[10px] font-mono h-11" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase text-white/40 ml-2">Телефон</Label>
                      <Input value={profile?.phone || 'Unknown'} readOnly className="bg-white/5 border-white/5 text-xs h-11" />
                   </div>
                   <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase text-white/40 ml-2">Email</Label>
                      <Input value={profile?.email || 'Не привязан'} readOnly className="bg-white/5 border-white/5 text-xs h-11" />
                   </div>
                </div>
                <div className="space-y-1 pt-2">
                   <Label className="text-[8px] font-black uppercase text-primary/60 ml-2">Причина разблокировки (до 2000 знаков)</Label>
                   <Textarea 
                     value={appealReason} 
                     onChange={e => setAppealReason(e.target.value.slice(0, 2000))}
                     placeholder="Опишите ситуацию..." 
                     className="bg-black/40 border-white/10 rounded-2xl h-40 resize-none text-sm p-4" 
                   />
                   <div className="flex justify-end pr-2">
                      <span className="text-[9px] font-bold text-white/20">{appealReason.length} / 2000</span>
                   </div>
                </div>
             </div>

             <Button 
               onClick={handleSendAppeal} 
               disabled={isSendingAppeal || !appealReason.trim()}
               className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all"
             >
                {isSendingAppeal ? <Loader2 className="animate-spin" /> : <><Send className="w-5 h-5 mr-2" /> Отправить сигнал</>}
             </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <div className="absolute -inset-10 bg-red-500/20 blur-[60px] rounded-full animate-pulse" />
              <div className="bg-red-500/10 p-6 rounded-[2.5rem] border border-red-500/20 relative z-10">
                <AlertTriangle className="w-20 h-20 text-red-500" />
              </div>
            </div>
            <div className="space-y-4 max-w-sm">
              <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">ВАШ АККАУНТ <br/><span className="text-red-500">ЗАБЛОКИРОВАН</span></h1>
              <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em] leading-relaxed italic">
                {isAnomaly 
                  ? 'Обнаружена аномалия личности. Доступ в Ядро ограничен протоколом Aegis для защиты целостности сети.' 
                  : 'Доступ был аннигилирован за нарушение правил сети Nuxus. Ключи шифрования отозваны.'}
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button onClick={() => setIsAppealing(true)} className="h-16 rounded-2xl bg-white text-black font-black uppercase italic text-xs tracking-widest shadow-xl hover:scale-105 transition-all">
                <MessageSquare className="w-5 h-5 mr-2" /> Подать апелляцию
              </Button>
              <Button variant="ghost" onClick={() => signOut(auth!)} className="h-14 px-8 rounded-2xl border border-white/5 text-white/30 font-black uppercase text-[10px] tracking-widest hover:text-white transition-all">
                Отключиться от сессии
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
      <div className="h-screen w-full flex items-center justify-center bg-[#020203] relative px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at(50%_50%),rgba(168,85,247,0.1)_0%,transparent_70%)] pointer-events-none" />
        <div className="w-full max-w-[340px] space-y-12 text-center relative z-10">
          <div className="bg-white/[0.03] border border-white/10 w-24 h-24 rounded-[2.8rem] flex items-center justify-center mx-auto shadow-2xl overflow-hidden">
            <Fingerprint className="w-10 h-10 text-primary relative z-10 animate-pulse" />
          </div>
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white uppercase italic tracking-widest">{profile?.totpEnabled ? 'Облачный Код' : 'Личный Пароль'}</h2>
              <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">{profile?.totpEnabled ? 'Введите 6 цифр из Google Auth' : 'Введите код доступа к узлу'}</p>
            </div>
            <Input 
              type="password" placeholder="••••••" maxLength={6} autoFocus
              className="bg-white/[0.04] border-white/10 h-16 text-3xl tracking-[0.6em] text-center rounded-2xl font-black focus:border-primary/40 transition-all border-2"
              value={twoFactorInput}
              onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
            />
            <div className="space-y-4">
              <Button onClick={handleVerify2FA} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase italic shadow-2xl active:scale-95 transition-all">Идентифицировать</Button>
              <Button variant="ghost" onClick={() => signOut(auth!)} className="w-full h-12 rounded-xl text-red-500/60 font-black uppercase text-[10px] gap-2"><LogOut className="w-4 h-4" /> Выйти</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatMain />;
}
