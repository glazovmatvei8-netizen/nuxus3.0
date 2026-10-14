
'use client';

import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { doc } from 'firebase/firestore';
import { translations, type LanguageCode } from '@/lib/translations';
import type { User } from '@/lib/types';

/**
 * TITANIUM SYNC HOOK: useTranslations
 * ОПТИМИЗИРОВАНО: Добавлены защитные механизмы против вылета приложения при отсутствии ключей.
 */
export function useTranslations() {
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc<User>(userRef);

  const langCode: LanguageCode = (profile?.settings?.language as LanguageCode) || 'ru';
  const dictionary = translations[langCode] || translations.ru;

  /**
   * Функция перевода. Поддерживает вложенные ключи, например 'app.chats'.
   */
  const t = (key: string): string => {
    try {
      if (profile?.settings?.interfaceOverrides?.[key]) {
        return profile.settings.interfaceOverrides[key];
      }

      const keys = key.split('.');
      let value: any = dictionary;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && value[k]) {
          value = value[k];
        } else {
          // Резервный поиск по всему словарю
          const fallbackValue = (dictionary as any)[key];
          if (typeof fallbackValue === 'string') return fallbackValue;
          return key;
        }
      }
      
      return typeof value === 'string' ? value : key;
    } catch (e) {
      console.warn("Translation Error for key:", key, e);
      return key;
    }
  };

  return { t, currentLang: langCode };
}
