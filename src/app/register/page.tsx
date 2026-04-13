
"use client"

import AuthScreen from '@/components/auth-screen';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Прямой маршрут для регистрации новых узлов.
 */
export default function RegisterPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  return <AuthScreen initialMode="register" />;
}
