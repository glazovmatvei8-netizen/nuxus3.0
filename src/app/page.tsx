
"use client"

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';
import { Loader2, ShieldAlert, Snowflake } from 'lucide-react';
import { doc } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { formatDistanceToNow, parseISO, isAfter } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Проверка на глобальный бан
  if (profile?.isBanned) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="bg-destructive/10 p-6 rounded-full mb-6">
          <ShieldAlert className="w-16 h-16 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold mb-4 text-white">Аккаунт заблокирован</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Ваш аккаунт был навсегда удален или заблокирован администратором за нарушение правил.
        </p>
        <Button variant="outline" onClick={() => signOut(auth)}>
          Выйти
        </Button>
      </div>
    );
  }

  // Проверка на временную заморозку
  const isFrozen = profile?.frozenUntil && isAfter(parseISO(profile.frozenUntil), new Date());
  if (isFrozen) {
    const timeLeft = formatDistanceToNow(parseISO(profile!.frozenUntil!), { locale: ru });
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="bg-accent/10 p-6 rounded-full mb-6">
          <Snowflake className="w-16 h-16 text-accent animate-pulse" />
        </div>
        <h1 className="text-3xl font-bold mb-4 text-white">Аккаунт заморожен</h1>
        <p className="text-muted-foreground max-w-md mb-4">
          Ваш доступ временно ограничен администратором.
        </p>
        <p className="text-accent font-bold mb-8">
          Разблокировка через: {timeLeft}
        </p>
        <Button variant="outline" onClick={() => signOut(auth)}>
          Выйти
        </Button>
      </div>
    );
  }

  return <ChatMain />;
}
