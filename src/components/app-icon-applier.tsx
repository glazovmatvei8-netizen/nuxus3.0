
'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * ОБНОВЛЯТОР ИКОНОК V6.1.1
 * ИСПРАВЛЕНО: Корректный импорт хуков через Firebase Barrel.
 */
export function AppIconApplier() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile } = useDoc<User>(userRef);

  const TARGET_ICON = 'https://i.ibb.co/sd2MqGz2/Icon.png?v=45';

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const updateIcons = () => {
      const customIcon = profile?.settings?.customAppIconUrl;
      const finalIcon = customIcon 
        ? (customIcon.includes('?') ? `${customIcon}&v=45` : `${customIcon}?v=45`)
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
  }, [profile?.settings?.customAppIconUrl]);

  return null;
}
