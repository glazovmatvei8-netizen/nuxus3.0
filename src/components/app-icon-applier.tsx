'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * ОБНОВЛЯТОР ИКОНОК V5.8.0
 * ОПТИМИЗИРОВАНО: Прямые импорты для предотвращения originalFactory.call.
 */
export function AppIconApplier() {
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
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
