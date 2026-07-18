
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { useAppState } from '@/lib/store';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * Глобальный менеджер инстансов Nuxus V57.7.0
 * Поддерживает до 5 параллельных сессий для мгновенного переключения.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const { activeAccountIndex } = useAppState();

  // Инициализируем 5 слотов для аккаунтов
  const instances = useMemo(() => {
    return [0, 1, 2, 3, 4].map(i => {
      // Slot 0 uses default app, others use named apps
      const name = i === 0 ? undefined : `nuxus_account_${i}`;
      return initializeFirebase(name);
    });
  }, []);

  // Выбираем активный инстанс на основе индекса из стора
  const activeInstance = instances[activeAccountIndex] || instances[0];

  return (
    <FirebaseProvider
      firebaseApp={activeInstance.firebaseApp}
      auth={activeInstance.auth}
      firestore={activeInstance.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
