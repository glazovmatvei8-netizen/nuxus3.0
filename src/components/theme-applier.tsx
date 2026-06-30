
'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { isUserPremium } from '@/lib/utils';

/**
 * Продвинутый аппликатор тем Nuxus v3.0.
 * Управляет цветовыми схемами и кастомными HEX-цветами для Premium.
 */
export function ThemeApplier() {
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // 1. Установка цветовой схемы (data-theme)
    if (profile?.settings?.theme) {
      document.documentElement.setAttribute('data-theme', profile.settings.theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // 2. Установка режима (Light/Dark)
    const appearance = profile?.settings?.appearance || 'dark';
    if (appearance === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }

    // 3. HEX Custom Color (Premium Only)
    const customHex = profile?.settings?.customPrimaryColor;
    if (isUserPremium(profile) && customHex && /^#[0-9A-F]{6}$/i.test(customHex)) {
      try {
        // Конвертируем HEX в HSL для CSS переменных Tailwind
        const r = parseInt(customHex.slice(1, 3), 16) / 255;
        const g = parseInt(customHex.slice(3, 5), 16) / 255;
        const b = parseInt(customHex.slice(5, 7), 16) / 255;
        
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, l = (max + min) / 2;

        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }

        const H = Math.round(h * 360);
        const S = Math.round(s * 100);
        const L = Math.round(l * 100);

        document.documentElement.style.setProperty('--primary', `${H} ${S}% ${L}%`);
        document.documentElement.style.setProperty('--ring', `${H} ${S}% ${L}%`);
        
        // Устанавливаем акцентный цвет чуть светлее
        document.documentElement.style.setProperty('--accent', `${H} ${S}% ${Math.min(100, L + 20)}%`);
      } catch (e) {
        console.warn("Theme Engine: Color parse error");
      }
    } else {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--ring');
      document.documentElement.style.removeProperty('--accent');
    }
  }, [profile?.settings?.theme, profile?.settings?.appearance, profile?.settings?.customPrimaryColor, profile?.isPremium]);

  return null;
}
