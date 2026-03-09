
'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * Динамически применяет иконку приложения на основе настроек пользователя.
 * Это позволяет изменять иконку на рабочем столе (iOS/Android PWA) и в Edge.
 */
export function AppIconApplier() {
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const DEFAULT_ICON = 'https://i.ibb.co/sd2MqGz2/Icon.png?v=10';

  useEffect(() => {
    const customIcon = profile?.settings?.customAppIconUrl;
    const finalIcon = customIcon || DEFAULT_ICON;

    // Обновляем все теги иконок в <head>
    const updateIcons = () => {
      // Стандартный favicon
      let fav = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!fav) {
        fav = document.createElement('link');
        fav.rel = 'icon';
        document.head.appendChild(fav);
      }
      fav.href = finalIcon;

      // Apple Touch Icon (для iOS "На экран Домой")
      let apple = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (!apple) {
        apple = document.createElement('link');
        apple.rel = 'apple-touch-icon';
        document.head.appendChild(apple);
      }
      apple.href = finalIcon;

      // Специальные размеры для iOS
      const sizes = ['152x152', '180x180', '167x167'];
      sizes.forEach(size => {
        let s = document.querySelector(`link[rel="apple-touch-icon"][sizes="${size}"]`) as HTMLLinkElement;
        if (!s) {
          s = document.createElement('link');
          s.rel = 'apple-touch-icon';
          s.setAttribute('sizes', size);
          document.head.appendChild(s);
        }
        s.href = finalIcon;
      });

      // Shortcut icon для Edge/Chrome на ПК
      let shortcut = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
      if (!shortcut) {
        shortcut = document.createElement('link');
        shortcut.rel = 'shortcut icon';
        document.head.appendChild(shortcut);
      }
      shortcut.href = finalIcon;
    };

    updateIcons();
  }, [profile?.settings?.customAppIconUrl]);

  return null;
}
