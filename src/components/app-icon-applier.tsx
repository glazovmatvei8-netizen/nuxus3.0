
'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * Динамически применяет иконку приложения на основе настроек пользователя.
 * Оптимизировано для iOS Safari и Android Chrome.
 * Форсированное обновление кеша v20.
 */
export function AppIconApplier() {
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  // Ваша основная иконка (v20 для сброса кеша)
  const DEFAULT_ICON = 'https://i.ibb.co/sd2MqGz2/Icon.png?v=20';

  useEffect(() => {
    const customIcon = profile?.settings?.customAppIconUrl;
    const finalIcon = customIcon ? `${customIcon}${customIcon.includes('?') ? '&' : '?'}v=20` : DEFAULT_ICON;

    const updateTag = (selector: string, attr: string, value: string, createIfMissing = true) => {
      let element = document.querySelector(selector) as HTMLLinkElement;
      if (!element && createIfMissing) {
        element = document.createElement('link');
        const parts = selector.split('[');
        const rel = parts[1]?.split('=')[1]?.replace(/['"\]]/g, '');
        if (rel) element.rel = rel;
        document.head.appendChild(element);
      }
      if (element) {
        element.setAttribute(attr, value);
      }
    };

    const updateIcons = () => {
      updateTag('link[rel="icon"]', 'href', finalIcon);
      updateTag('link[rel="shortcut icon"]', 'href', finalIcon);
      updateTag('link[rel="apple-touch-icon"]', 'href', finalIcon);
      
      const sizes = ['16x16', '32x32', '57x57', '72x72', '76x76', '114x114', '120x120', '144x144', '152x152', '180x180'];
      sizes.forEach(size => {
        updateTag(`link[rel="apple-touch-icon"][sizes="${size}"]`, 'href', finalIcon);
      });

      updateTag('meta[name="msapplication-TileImage"]', 'content', finalIcon);
    };

    updateIcons();
    
    // Дополнительный интервал для борьбы с переопределением со стороны браузера
    const interval = setInterval(updateIcons, 2000);
    return () => clearInterval(interval);
  }, [profile?.settings?.customAppIconUrl, DEFAULT_ICON]);

  return null;
}
