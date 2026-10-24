'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * ОБНОВЛЯТОР ИКОНОК V209.0 «FORCE CACHE BUSTER»
 * ОПТИМИЗИРОВАНО: Принудительное обновление иконки таба через ?v= параметры.
 */
export function AppIconApplier() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile } = useDoc<User>(userRef);

  // Локальный путь к иконке
  const DEFAULT_ICON = '/icon.png';

  useEffect(() => {
    if (!mounted || typeof document === 'undefined') return;

    const updateIcons = () => {
      try {
        const customIcon = profile?.settings?.customAppIconUrl;
        // Добавляем версию v=209 для сброса кеша браузера
        const finalIcon = customIcon 
          ? (customIcon.includes('?') ? `${customIcon}&v=209` : `${customIcon}?v=209`)
          : `${DEFAULT_ICON}?v=209`;

        const selectors = [
          "link[rel='icon']",
          "link[rel='shortcut icon']",
          "link[rel='apple-touch-icon']",
          "link[rel='apple-touch-icon-precomposed']"
        ];

        selectors.forEach(selector => {
          let element = document.querySelector(selector);
          
          if (!element) {
            element = document.createElement('link');
            if (selector.includes('icon')) (element as HTMLLinkElement).rel = 'icon';
            if (selector.includes('apple')) (element as HTMLLinkElement).rel = 'apple-touch-icon';
            document.head.appendChild(element);
          }

          if (element.getAttribute('href') !== finalIcon) {
            element.setAttribute('href', finalIcon);
            element.setAttribute('type', 'image/png');
          }
        });
        
        // Отдельно форсируем обновление shortcut icon для старых браузеров
        let shortcut = document.querySelector("link[rel='shortcut icon']");
        if (!shortcut) {
            shortcut = document.createElement('link');
            shortcut.setAttribute('rel', 'shortcut icon');
            document.head.appendChild(shortcut);
        }
        shortcut.setAttribute('href', finalIcon);

      } catch (e) {
        console.error("DOM manipulation error in app-icon-applier:", e);
      }
    };

    updateIcons();
    // Повторяем проверку реже, чтобы не нагружать поток
    const interval = setInterval(updateIcons, 10000);
    return () => clearInterval(interval);
  }, [profile?.settings?.customAppIconUrl, mounted]);

  return null;
}
