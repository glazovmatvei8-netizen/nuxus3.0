'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { useAppState } from '@/lib/store';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * Глобальный менеджер инстансов Nuxus V74.0.0
 * Использует СТРОГО изолированные именованные инстансы для предотвращения дублирования аккаунтов.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const { activeAccountIndex } = useAppState();

  // Инициализируем 5 СТРОГО изолированных приложений с уникальными идентификаторами хранилища
  const instances = useMemo(() => {
    if (typeof window === 'undefined') return [];
    return [0, 1, 2, 3, 4].map(i => {
      const instanceName = `nuxus_isolated_node_${i}`;
      return initializeFirebase(instanceName);
    });
  }, []);

  // Выбираем активный инстанс на основе индекса из глобального стора
  // Если массив пуст (SSR), создаем временный дефолтный инстанс
  const activeInstance = useMemo(() => {
    if (instances.length === 0) return initializeFirebase('nuxus_ssr_temp');
    return instances[activeAccountIndex] || instances[0];
  }, [instances, activeAccountIndex]);

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
