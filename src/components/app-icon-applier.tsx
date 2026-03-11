
'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * Динамически применяет иконку приложения.
 * Оптимизировано для предотвращения лагов и сброса кеша.
 */
export function AppIconApplier() {
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const DEFAULT_ICON = 'https://i.ibb.co/sd2MqGz2/Icon.png?v=30';

  useEffect(() => {
    const customIcon = profile?.settings?.customAppIconUrl;
    const finalIcon = customIcon ? `${customIcon}${customIcon.includes('?') ? '&' : '?'}v=30` : DEFAULT_ICON;

    const updateIcons = () => {
      const links = document.querySelectorAll('link[rel*="icon"], link[rel="apple-touch-icon"]');
      links.forEach(link => {
        link.setAttribute('href', finalIcon);
      });
      
      let metaTile = document.querySelector('meta[name="msapplication-TileImage"]');
      if (metaTile) metaTile.setAttribute('content', finalIcon);
    };

    updateIcons();
    
    // Принудительное обновление через 2 секунды
    const timer = setTimeout(updateIcons, 2000);
    return () => clearTimeout(timer);
  }, [profile?.settings?.customAppIconUrl, DEFAULT_ICON]);

  return null;
}
