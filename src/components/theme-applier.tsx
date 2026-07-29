'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * ПРИМЕНИТЕЛЬ ТЕМЫ V6.0.2 «ULTIMATE»
 * Безопасная обработка SSR и состояния инициализации.
 * Исправлена ошибка Firestore not available.
 */
export function ThemeApplier() {
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
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
