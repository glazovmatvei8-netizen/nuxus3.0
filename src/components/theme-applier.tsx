
'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase/provider'; 
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * ПРИМЕНИТЕЛЬ ТЕМЫ V12.0 «POWER & AESTHETIC»
 * ОПТИМИЗИРОВАНО: Добавлена поддержка энергосберегающего режима.
 */
export function ThemeApplier() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile } = useDoc<User>(userRef);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const theme = profile?.settings?.theme || 'default';
    const isEliteTheme = theme === 'event-horizon' || theme === 'crimson-nebula';

    // Энергосбережение
    const isEnergySaving = !!profile?.settings?.privacy?.isEnergySaving;
    if (isEnergySaving) {
      document.documentElement.classList.add('energy-saving');
    } else {
      document.documentElement.classList.remove('energy-saving');
    }

    // Применяем атрибут темы
    document.documentElement.setAttribute('data-theme', theme);

    // Применяем режим (dark/light)
    const appearance = profile?.settings?.appearance || 'dark';
    if (appearance === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }

    const applyColor = (hex: string) => {
      if (isEliteTheme) {
        document.documentElement.style.removeProperty('--primary');
        document.documentElement.style.removeProperty('--ring');
        return;
      }

      if (!hex) return;
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (result) {
        let r = parseInt(result[1], 16) / 255;
        let g = parseInt(result[2], 16) / 255;
        let b = parseInt(result[3], 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        const hslString = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
        document.documentElement.style.setProperty('--primary', hslString);
        document.documentElement.style.setProperty('--ring', hslString);
      }
    };

    if (profile?.settings?.customPrimaryColor) {
      applyColor(profile.settings.customPrimaryColor);
    } else {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--ring');
    }
  }, [profile?.settings?.theme, profile?.settings?.appearance, profile?.settings?.customPrimaryColor, profile?.settings?.privacy?.isEnergySaving]);

  return null;
}
