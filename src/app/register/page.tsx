
"use client"

import AuthScreen from '@/components/auth-screen';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Прямой маршрут для регистрации новых узлов.
 * Исправлено: гарантированный экспорт для Next.js App Router.
 */
export default function RegisterPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user && !isUserLoading) {
      const target = sessionStorage.getItem('nuxus_pending_target');
      if (target) {
        router.push(`/?u=${target}`);
      } else {
        router.push('/');
      }
    }
  }, [user, isUserLoading, router]);

  return <AuthScreen initialMode="register" />;
}
