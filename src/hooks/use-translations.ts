
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import { translations, type LanguageCode } from '@/lib/translations';
import type { User } from '@/lib/types';

/**
 * Hook to access current translations based on user profile.
 * V6.5.4: ИСПРАВЛЕНО - Прямой импорт хуков для стабильности.
 */
export function useTranslations() {
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<User>(userRef);

  const langCode: LanguageCode = (profile?.settings?.language as LanguageCode) || 'ru';
  const dictionary = translations[langCode] || translations.ru;

  /**
   * Translation function. Supports nested keys like 'sidebar.all'.
   */
  const t = (key: string): string => {
    if (profile?.settings?.interfaceOverrides?.[key]) {
      return profile.settings.interfaceOverrides[key];
    }

    const keys = key.split('.');
    let value: any = dictionary;
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        if (dictionary[key as keyof typeof dictionary]) {
          return dictionary[key as keyof typeof dictionary] as string;
        }
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return { t, currentLang: langCode };
}
