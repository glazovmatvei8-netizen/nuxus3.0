'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { translations, type LanguageCode } from '@/lib/translations';
import type { User } from '@/lib/types';

/**
 * Hook to access current translations based on user profile.
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
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = dictionary;
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return key; // Fallback to key name
      }
    }
    
    return value;
  };

  return { t, currentLang: langCode };
}
