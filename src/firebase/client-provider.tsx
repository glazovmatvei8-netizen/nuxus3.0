'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { useAppState } from '@/lib/store';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * Глобальный менеджер инстансов Nuxus V5.8.0
 * Использует СТРОГО изолированные именованные инстансы и фиксирует персистентность сессий.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const { activeAccountIndex } = useAppState();

  // Инициализируем 5 СТРОГО изолированных приложений
  const instances = useMemo(() => {
    if (typeof window === 'undefined') return [];
    return [0, 1, 2, 3, 4].map(i => {
      const instanceName = `nuxus_isolated_node_${i}`;
      const instance = initializeFirebase(instanceName);
      
      // ГАРАНТИЯ ПЕРСИСТЕНТНОСТИ: Сессия не сбросится после закрытия браузера
      setPersistence(instance.auth, browserLocalPersistence).catch(console.warn);
      
      return instance;
    });
  }, []);

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
