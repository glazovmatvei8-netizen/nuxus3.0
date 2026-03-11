
'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * Динамически применяет иконку приложения и ЗАЧИЩАЕТ старые кэшированные favicon.
 */
export function AppIconApplier() {
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const DEFAULT_ICON = 'https://i.ibb.co/sd2MqGz2/Icon.png?v=35';

  useEffect(() => {
    const customIcon = profile?.settings?.customAppIconUrl;
    const finalIcon = customIcon ? `${customIcon}${customIcon.includes('?') ? '&' : '?'}v=35` : DEFAULT_ICON;

    const updateIcons = () => {
      // Удаляем ВСЕ существующие ссылки на иконки, чтобы убрать влияние файла favicon.ico из папки app
      const existingIcons = document.querySelectorAll('link[rel*="icon"], link[rel="apple-touch-icon"]');
      existingIcons.forEach(el => el.remove());

      // Создаем новые чистые ссылки
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
      
      let metaTile = document.querySelector('meta[name="msapplication-TileImage"]');
      if (metaTile) metaTile.setAttribute('content', finalIcon);
    };

    updateIcons();
    
    // Принудительная зачистка через 1 и 3 секунды (на случай если Next.js вставит свой favicon позже)
    setTimeout(updateIcons, 1000);
    setTimeout(updateIcons, 3000);
  }, [profile?.settings?.customAppIconUrl, DEFAULT_ICON]);

  return null;
}
