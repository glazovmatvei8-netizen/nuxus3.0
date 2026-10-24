'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * ОБНОВЛЯТОР ИКОНОК V207.0 «LOCAL SYNC»
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
  const TARGET_ICON = '/icon.png';

  useEffect(() => {
    if (!mounted || typeof document === 'undefined') return;

    const updateIcons = () => {
      try {
        const customIcon = profile?.settings?.customAppIconUrl;
        const finalIcon = customIcon 
          ? (customIcon.includes('?') ? `${customIcon}&v=207` : `${customIcon}?v=207`)
          : TARGET_ICON;

        const selectors = [
          "link[rel='icon']",
          "link[rel='shortcut icon']",
          "link[rel='apple-touch-icon']",
          "link[rel='apple-touch-icon-precomposed']"
        ];

        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          
          if (elements.length === 0 && selector === "link[rel='icon']") {
            const link = document.createElement('link');
            link.rel = 'icon';
            link.href = finalIcon;
            document.head.appendChild(link);
          }

          elements.forEach(el => {
            if (el.getAttribute('href') !== finalIcon) {
              el.setAttribute('href', finalIcon);
            }
          });
        });
      } catch (e) {
        console.error("DOM manipulation error in app-icon-applier:", e);
      }
    };

    updateIcons();
    const interval = setInterval(updateIcons, 5000);
    return () => clearInterval(interval);
  }, [profile?.settings?.customAppIconUrl, mounted]);

  return null;
}
