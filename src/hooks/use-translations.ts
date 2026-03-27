
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { translations, type LanguageCode } from '@/lib/translations';
import type { User } from '@/lib/types';

/**
 * Hook to access current translations based on user profile.
 * Supports Telegram-like custom string overrides.
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
   * Checks user overrides in profile settings before falling back to the dictionary.
   */
  const t = (key: string): string => {
    // 1. Check for user-defined overrides (Telegram-style custom strings)
    if (profile?.settings?.interfaceOverrides?.[key]) {
      return profile.settings.interfaceOverrides[key];
    }

    // 2. Standard dictionary lookup
    const keys = key.split('.');
    let value: any = dictionary;
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        // Search in flat level if nested search fails (for top-level keys like 'initializing')
        if (dictionary[key as keyof typeof dictionary]) {
          return dictionary[key as keyof typeof dictionary] as string;
        }
        return key; // Fallback to key name
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return { t, currentLang: langCode };
}
