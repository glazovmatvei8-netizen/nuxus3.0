
"use client"

import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { useAppState } from '@/lib/store';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { Loader2, ShieldAlert, Lock, ArrowRight, Clock } from 'lucide-react';
import { doc, collection, query, where, limit, getDocs, arrayUnion, updateDoc } from 'firebase/firestore';
import type { User as UserType, Chat } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { isUserActuallyBanned } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { setCurrentChatId, is2FAVerified, setIs2FAVerified } = useAppState();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [twoFactorInput, setTwoFactorInput] = useState('');

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);

  const isBanned = isUserActuallyBanned(profile);

  // Handle ?join=@username link logic
  useEffect(() => {
    if (!user || !db || isJoining || (!is2FAVerified && profile?.twoFactorEnabled) || isBanned) return;

    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');

    if (joinParam) {
      const handleJoin = async () => {
        setIsJoining(true);
        try {
          const searchUsername = joinParam.startsWith('@') ? joinParam.toLowerCase() : '@' + joinParam.toLowerCase();
          const q = query(collection(db, 'chats'), where('username', '==', searchUsername), limit(1));
          const snap = await getDocs(q);

          if (!snap.empty) {
            const chatDoc = snap.docs[0];
            const chatData = { id: chatDoc.id, ...chatDoc.data() } as Chat;
            if (!chatData.participantIds.includes(user.uid)) {
              await updateDoc(doc(db, 'chats', chatDoc.id), { participantIds: arrayUnion(user.uid) });
              toast({ title: "Успех", description: `Вы вступили в ${chatData.name}` });
            }
            setCurrentChatId(chatDoc.id);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (e) {
          console.error("Join error:", e);
        } finally {
          setIsJoining(false);
        }
      };
      handleJoin();
    }
  }, [user, db, setCurrentChatId, toast, isJoining, is2FAVerified, profile, isBanned]);

  const handleVerify2FA = () => {
    if (twoFactorInput === profile?.twoFactorPin) {
      setIs2FAVerified(true);
      toast({ title: "Доступ разрешен", description: "Двухфакторная проверка пройдена" });
    } else {
      toast({ title: "Ошибка кода", description: "Неверный PIN-код", variant: "destructive" });
    }
  };

  // Safe Loading UI to prevent white screen
  if (isUserLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0c]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 animate-pulse">
            Инициализация Ядра Nuxus...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (isProfileLoading || isJoining) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0c]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 animate-pulse">
            Загрузка профиля...
          </p>
        </div>
      </div>
    );
  }

  if (isBanned) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="bg-destructive/10 p-6 rounded-full mb-6">
          <ShieldAlert className="w-16 h-16 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold mb-4 text-white">Аккаунт заблокирован</h1>
        {profile?.bannedUntil ? (
          <div className="flex items-center gap-2 text-muted-foreground mb-8 bg-white/5 px-4 py-2 rounded-xl">
            <Clock className="w-4 h-4 text-primary" />
            <span>До: {format(new Date(profile.bannedUntil), 'd MMMM yyyy, HH:mm', { locale: ru })}</span>
          </div>
        ) : (
          <p className="text-muted-foreground max-w-md mb-8">Ваш доступ к мессенджеру был ограничен навсегда.</p>
        )}
        <Button variant="outline" onClick={() => signOut(auth)}>Выйти</Button>
      </div>
    );
  }

  // 2FA Verification Overlay
  if (profile?.twoFactorEnabled && !is2FAVerified) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 nuxus-core-glow opacity-20 animate-pulse-glow" />
        <div className="relative z-10 w-full max-w-md p-8">
          <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-10 text-center space-y-8">
            <div className="bg-primary/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter">Защита Nuxus</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 leading-relaxed">
                Введите ваш секретный PIN-код для облачного подтверждения личности
              </p>
            </div>
            <div className="space-y-4">
              <Input 
                type="password" 
                placeholder="••••••" 
                maxLength={6} 
                className="bg-black/20 border-white/5 h-16 text-2xl tracking-[0.5em] text-center rounded-2xl font-black"
                value={twoFactorInput}
                onChange={e => setTwoFactorInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
              />
              <Button onClick={handleVerify2FA} className="w-full h-14 rounded-2xl bg-primary font-black uppercase italic tracking-widest shadow-xl shadow-primary/20">
                Подтвердить <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="ghost" onClick={() => signOut(auth)} className="w-full text-[10px] font-bold uppercase opacity-40">Выйти из аккаунта</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatMain />;
}
