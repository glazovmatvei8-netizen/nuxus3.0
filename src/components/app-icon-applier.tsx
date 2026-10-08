
'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * ОБНОВЛЯТОР ИКОНОК V113.1 «HARD OVERRIDE»
 * ИСПРАВЛЕНО: Принудительное использование новой иконки IMG-2541.jpg.
 */
export function AppIconApplier() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile } = useDoc<User>(userRef);

  // Новая иконка с параметром сброса кэша
  const TARGET_ICON = 'https://i.postimg.cc/T2xvz0mn/IMG-2541.jpg?v=113';

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const updateIcons = () => {
      const customIcon = profile?.settings?.customAppIconUrl;
      const finalIcon = customIcon 
        ? (customIcon.includes('?') ? `${customIcon}&v=113` : `${customIcon}?v=113`)
        : TARGET_ICON;

      const selectors = [
        "link[rel='icon']",
        "link[rel='shortcut icon']",
        "link[rel='apple-touch-icon']"
      ];

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.getAttribute('href') !== finalIcon) {
            el.setAttribute('href', finalIcon);
          }
        });
      });
    };

    updateIcons();
    
    // Запуск через секунду для уверенности, что Next.js не перекрыл иконку
    const timer = setTimeout(updateIcons, 1000);
    return () => clearTimeout(timer);
  }, [profile?.settings?.customAppIconUrl, TARGET_ICON]);

  return null;
}
