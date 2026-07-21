'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { useAppState } from '@/lib/store';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * Глобальный менеджер инстансов Nuxus V72.0.0
 * Использует СТРОГО именованные инстансы для ПОЛНОЙ изоляции Auth-сессий.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const { activeAccountIndex } = useAppState();

  // Инициализируем 5 СТРОГО изолированных приложений с уникальными именами
  const instances = useMemo(() => {
    return [0, 1, 2, 3, 4].map(i => {
      // Имя инстанса привязано к индексу слота
      const instanceName = `nuxus_node_instance_${i}`;
      return initializeFirebase(instanceName);
    });
  }, []);

  // Выбираем активный инстанс на основе индекса из глобального стора
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
