'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { useAppState } from '@/lib/store';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * Глобальный менеджер изолированных узлов Nuxus V77.0.0
 * Использует СТРОГО изолированные именованные инстансы для предотвращения дублирования аккаунтов.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const { activeAccountIndex } = useAppState();

  // Инициализируем 5 СТРОГО изолированных приложений (Nodes)
  const instances = useMemo(() => {
    if (typeof window === 'undefined') return [];
    return [0, 1, 2, 3, 4].map(i => {
      const instanceName = `nuxus_node_v77_${i}`;
      const instance = initializeFirebase(instanceName);
      
      // Фиксация сессии для каждого узла отдельно
      setPersistence(instance.auth, browserLocalPersistence).catch(e => 
        console.warn(`Node ${i} persistence fail:`, e)
      );
      
      return instance;
    });
  }, []);

  const activeInstance = useMemo(() => {
    if (instances.length === 0) return initializeFirebase('nuxus_ssr_temp');
    // Гарантируем возврат инстанса по активному индексу
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