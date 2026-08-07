'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './app'; 
import { useAppState } from '@/lib/store'; 
import { setPersistence, browserLocalPersistence } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * ГЛОБАЛЬНЫЙ МЕНЕДЖЕР ИЗОЛИРОВАННЫХ УЗЛОВ NUXUS V9.5.0
 * ОПТИМИЗИРОВАНО: Устранение ChunkLoadError путем корректного резолвинга зависимостей.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const { activeAccountIndex } = useAppState();

  const instances = useMemo(() => {
    if (typeof window === 'undefined') return [];
    return [0, 1, 2, 3, 4].map(i => {
      const instance = initializeFirebase(`nuxus_node_v95_${i}`);
      if (instance.auth) {
        setPersistence(instance.auth, browserLocalPersistence).catch(() => {});
      }
      return instance;
    });
  }, []);

  const activeInstance = useMemo(() => {
    if (instances.length === 0) return initializeFirebase('nuxus_ssr_temp');
    return instances[activeAccountIndex] || instances[0];
  }, [instances, activeAccountIndex]);

  if (!activeInstance.firebaseApp || !activeInstance.firestore || !activeInstance.auth) {
    return <div className="h-screen w-full bg-[#020205]" />;
  }

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
