'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * ПРИМЕНИТЕЛЬ ТЕМЫ V6.1.0 «ULTIMATE»
 * Безопасная обработка SSR и состояния инициализации.
 * Исправлена ошибка Firestore not available через проверку firestore.
 */
export function ThemeApplier() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile } = useDoc<User>(userRef);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (profile?.settings?.theme) {
      document.documentElement.setAttribute('data-theme', profile.settings.theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    const appearance = profile?.settings?.appearance || 'dark';
    if (appearance === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [profile?.settings?.theme, profile?.settings?.appearance]);

  return null;
}
