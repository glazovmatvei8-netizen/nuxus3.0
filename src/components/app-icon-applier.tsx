
'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * Динамически применяет иконку приложения.
 * Оптимизировано для предотвращения лагов.
 */
export function AppIconApplier() {
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const DEFAULT_ICON = 'https://i.ibb.co/sd2MqGz2/Icon.png?v=25';

  useEffect(() => {
    const customIcon = profile?.settings?.customAppIconUrl;
    const finalIcon = customIcon ? `${customIcon}${customIcon.includes('?') ? '&' : '?'}v=25` : DEFAULT_ICON;

    const updateIcons = () => {
      const links = document.querySelectorAll('link[rel*="icon"], link[rel="apple-touch-icon"]');
      links.forEach(link => {
        link.setAttribute('href', finalIcon);
      });
      
      let metaTile = document.querySelector('meta[name="msapplication-TileImage"]');
      if (metaTile) metaTile.setAttribute('content', finalIcon);
    };

    updateIcons();
    
    // Одна проверка через 3 секунды после загрузки для надежности
    const timer = setTimeout(updateIcons, 3000);
    return () => clearTimeout(timer);
  }, [profile?.settings?.customAppIconUrl, DEFAULT_ICON]);

  return null;
}
