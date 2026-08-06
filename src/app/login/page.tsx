
"use client"

import AuthScreen from '@/components/auth-screen';
import { useUser } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Прямой маршрут для входа в Ядро.
 * FIXED: Direct import from provider.
 */
export default function LoginPage() {
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

  return <AuthScreen initialMode="login" />;
}
