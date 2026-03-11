
'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * Динамически применяет иконку приложения (v45)
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
      const existingIcons = document.querySelectorAll('link[rel*="icon"], link[rel="apple-touch-icon"]');
      existingIcons.forEach(el => el.remove());

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
    };

    updateIcons();
    setTimeout(updateIcons, 1000);
  }, [profile?.settings?.customAppIconUrl, DEFAULT_ICON]);

  return null;
}
