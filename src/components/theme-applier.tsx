'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase'; 
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * ПРИМЕНИТЕЛЬ ТЕМЫ V6.1.3 «COLOR RESTORATION»
 * Восстановлена поддержка customPrimaryColor и стабильные импорты.
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

    // 1. Применение базовой темы
    if (profile?.settings?.theme) {
      document.documentElement.setAttribute('data-theme', profile.settings.theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // 2. Применение светлой/темной темы
    const appearance = profile?.settings?.appearance || 'dark';
    if (appearance === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }

    // 3. Восстановление кастомного цвета (КРИТИЧЕСКИЙ ФИКС)
    if (profile?.settings?.customPrimaryColor) {
      document.documentElement.style.setProperty('--primary', profile.settings.customPrimaryColor);
      // Также обновляем ring для фокуса
      document.documentElement.style.setProperty('--ring', profile.settings.customPrimaryColor);
    } else {
      // Сброс к дефолту, если кастомный цвет удален (270 95% 65%)
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--ring');
    }
  }, [profile?.settings?.theme, profile?.settings?.appearance, profile?.settings?.customPrimaryColor]);

  return null;
}
