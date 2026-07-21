'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { useAppState } from '@/lib/store';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * Глобальный менеджер инстансов Nuxus V71.0.0
 * Использует именованные инстансы для ПОЛНОЙ изоляции Auth-сессий.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const { activeAccountIndex } = useAppState();

  // Инициализируем 5 СТРОГО изолированных приложений
  const instances = useMemo(() => {
    return [0, 1, 2, 3, 4].map(i => {
      // Каждый слот имеет свое уникальное имя инстанса Firebase
      const instanceName = `nuxus_node_v71_${i}`;
      return initializeFirebase(instanceName);
    });
  }, []);

  // Выбираем активный инстанс на основе индекса
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
