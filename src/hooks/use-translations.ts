
'use client';

import { useUser, useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { doc } from 'firebase/firestore';
import { translations, type LanguageCode } from '@/lib/translations';
import type { User } from '@/lib/types';

/**
 * TITANIUM SYNC HOOK: useTranslations
 * ОПТИМИЗИРОВАНО: Добавлена поддержка возврата массивов и защита от вылетов.
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
   * Функция перевода. Поддерживает строки и массивы.
   */
  const t = (key: string): any => {
    try {
      if (profile?.settings?.interfaceOverrides?.[key]) {
        return profile.settings.interfaceOverrides[key];
      }

      const keys = key.split('.');
      let value: any = dictionary;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && value[k] !== undefined) {
          value = value[k];
        } else {
          const fallbackValue = (dictionary as any)[key];
          if (fallbackValue !== undefined) return fallbackValue;
          return key;
        }
      }
      
      // Возвращаем значение, если это строка или массив
      return (typeof value === 'string' || Array.isArray(value)) ? value : key;
    } catch (e) {
      console.warn("Translation Error for key:", key, e);
      return key;
    }
  };

  return { t, currentLang: langCode };
}
