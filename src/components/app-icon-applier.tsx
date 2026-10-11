
'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * ОБНОВЛЯТОР ИКОНОК V118.0 «ULTIMATE OVERRIDE»
 * ИСПРАВЛЕНО: Принудительная замена favicon на IMG-2541.jpg с агрессивным обходом кэша.
 */
export function AppIconApplier() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile } = useDoc<User>(userRef);

  // Новая иконка с параметром сброса кэша v118
  const TARGET_ICON = 'https://i.postimg.cc/T2xvz0mn/IMG-2541.jpg?v=118';

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const updateIcons = () => {
      const customIcon = profile?.settings?.customAppIconUrl;
      const finalIcon = customIcon 
        ? (customIcon.includes('?') ? `${customIcon}&v=118` : `${customIcon}?v=118`)
        : TARGET_ICON;

      const selectors = [
        "link[rel='icon']",
        "link[rel='shortcut icon']",
        "link[rel='apple-touch-icon']",
        "link[rel='apple-touch-icon-precomposed']"
      ];

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        
        if (elements.length === 0 && selector === "link[rel='icon']") {
          // Создаем тег, если его нет
          const link = document.createElement('link');
          link.rel = 'icon';
          link.href = finalIcon;
          document.head.appendChild(link);
        }

        elements.forEach(el => {
          if (el.getAttribute('href') !== finalIcon) {
            el.setAttribute('href', finalIcon);
          }
        });
      });
    };

    updateIcons();
    
    // Запускаем несколько раз для борьбы с кэшем браузера
    const interval = setInterval(updateIcons, 1000);
    const timeout = setTimeout(updateIcons, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [profile?.settings?.customAppIconUrl, TARGET_ICON]);

  return null;
}
