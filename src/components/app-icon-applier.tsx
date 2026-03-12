
'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * Динамически применяет иконку приложения (v45)
 * Исправлена ошибка "removeChild" путем использования более безопасных методов манипуляции DOM.
 */
export function AppIconApplier() {
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const DEFAULT_ICON = 'https://i.ibb.co/sd2MqGz2/Icon.png?v=45';

  useEffect(() => {
    const customIcon = profile?.settings?.customAppIconUrl;
    const finalIcon = customIcon ? `${customIcon}${customIcon.includes('?') ? '&' : '?'}v=45` : DEFAULT_ICON;

    const updateIcons = () => {
      try {
        // Безопасное удаление старых иконок
        const selectors = ['link[rel*="icon"]', 'link[rel="apple-touch-icon"]'];
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el && el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
        });

        const sizes = ['16x16', '32x32', '192x192', '512x512'];
        sizes.forEach(size => {
          const link = document.createElement('link');
          link.rel = 'icon';
          link.type = 'image/png';
          link.sizes = size;
          link.href = finalIcon;
          document.head.appendChild(link);
        });

        const appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        appleLink.href = finalIcon;
        document.head.appendChild(appleLink);
      } catch (e) {
        console.warn("Nuxus Icon Engine: Head sync skipped", e);
      }
    };

    updateIcons();
    // Небольшая задержка для уверенности в SPA-окружении
    const timer = setTimeout(updateIcons, 1500);
    return () => clearTimeout(timer);
  }, [profile?.settings?.customAppIconUrl, DEFAULT_ICON]);

  return null;
}
