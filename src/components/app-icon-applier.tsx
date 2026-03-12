'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * АГРЕССИВНЫЙ ОБНОВЛЯТОР ИКОНОК (v45).
 * Находит все существующие теги иконок и принудительно меняет их href.
 */
export function AppIconApplier() {
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  // ГЛОБАЛЬНЫЙ ПРИОРИТЕТ v45
  const TARGET_ICON = 'https://i.ibb.co/sd2MqGz2/Icon.png?v=45';

  useEffect(() => {
    const updateIconsNuclear = () => {
      if (typeof document === 'undefined') return;

      try {
        const customIcon = profile?.settings?.customAppIconUrl;
        const finalIcon = customIcon 
          ? (customIcon.includes('?') ? `${customIcon}&v=45` : `${customIcon}?v=45`)
          : TARGET_ICON;

        // Ищем вообще все теги иконок (стандартные и яблочные)
        const selectors = [
          "link[rel='icon']",
          "link[rel='shortcut icon']",
          "link[rel='apple-touch-icon']",
          "link[rel='apple-touch-icon-precomposed']"
        ];

        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.getAttribute('href') !== finalIcon) {
              el.setAttribute('href', finalIcon);
            }
          });
        });

        // Если тегов нет вообще (редкий случай), создаем базовый
        if (document.querySelectorAll("link[rel='icon']").length === 0) {
          const newLink = document.createElement('link');
          newLink.rel = 'icon';
          newLink.href = finalIcon;
          document.head.appendChild(newLink);
        }
        
      } catch (e) {
        console.warn("Nuxus Icon Shield: Critical overwrite failed", e);
      }
    };

    // Запускаем сразу и через микро-задержку для надежности
    updateIconsNuclear();
    const timeout = setTimeout(updateIconsNuclear, 1000);
    const interval = setInterval(updateIconsNuclear, 5000); // Повторяем проверку

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [profile?.settings?.customAppIconUrl]);

  return null;
}
