'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * Динамически применяет иконку приложения (v45).
 * ИСПОЛЬЗУЕТ БЕЗОПАСНЫЕ МЕТОДЫ DOM: предотвращает ошибку "removeChild" 
 * путем проверки привязки элемента к родителю.
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
        // Очищаем только те иконки, которые могли быть созданы этим скриптом ранее
        // Мы ищем по селекторам, но удаляем максимально осторожно
        const selectors = ['link[rel*="icon"]', 'link[rel="apple-touch-icon"]'];
        selectors.forEach(selector => {
          const elements = document.head.querySelectorAll(selector);
          elements.forEach(el => {
            // Проверяем, что элемент всё еще находится в HEAD и имеет родителя
            if (el && el.parentNode === document.head) {
              try {
                document.head.removeChild(el);
              } catch (e) {
                // Если элемент уже был удален другим процессом (React Metadata), просто игнорируем
              }
            }
          });
        });

        // Создаем новые иконки
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
        console.warn("Nuxus Icon Engine: Sync skipped to prevent crash", e);
      }
    };

    // Используем requestAnimationFrame для синхронизации с циклом отрисовки браузера
    const frameId = requestAnimationFrame(updateIcons);
    return () => cancelAnimationFrame(frameId);
  }, [profile?.settings?.customAppIconUrl, DEFAULT_ICON]);

  return null;
}
