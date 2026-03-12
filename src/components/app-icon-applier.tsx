'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * Динамически применяет иконку приложения (v45).
 * ИСПОЛЬЗУЕТ БЕЗОПАСНЫЙ МЕТОД: не удаляет системные теги Next.js,
 * а управляет только своими элементами через ID.
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
      if (typeof document === 'undefined') return;

      try {
        // Мы не удаляем существующие иконки (Next.js Metadata), 
        // так как это вызывает ошибку removeChild при перестроении DOM.
        // Вместо этого мы создаем/обновляем наши собственные теги с высшим приоритетом.
        
        const createOrUpdateLink = (id: string, rel: string, href: string, sizes?: string) => {
          let link = document.getElementById(id) as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.id = id;
            link.rel = rel;
            if (sizes) link.sizes = sizes;
            document.head.appendChild(link);
          }
          link.href = href;
        };

        // Обновляем фавиконки
        createOrUpdateLink('nuxus-dynamic-icon-16', 'icon', finalIcon, '16x16');
        createOrUpdateLink('nuxus-dynamic-icon-32', 'icon', finalIcon, '32x32');
        createOrUpdateLink('nuxus-dynamic-icon-192', 'icon', finalIcon, '192x192');
        createOrUpdateLink('nuxus-dynamic-icon-512', 'icon', finalIcon, '512x512');
        
        // Обновляем иконку для Apple
        createOrUpdateLink('nuxus-dynamic-apple-icon', 'apple-touch-icon', finalIcon);
        
      } catch (e) {
        console.warn("Nuxus Icon Engine: Safe sync failed", e);
      }
    };

    const frameId = requestAnimationFrame(updateIcons);
    return () => cancelAnimationFrame(frameId);
  }, [profile?.settings?.customAppIconUrl, DEFAULT_ICON]);

  return null;
}
