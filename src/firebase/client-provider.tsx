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
 * ГЛОБАЛЬНЫЙ МЕНЕДЖЕР УЗЛОВ V9.8.0
 * ОПТИМИЗИРОВАНО: Ленивая инициализация для предотвращения ChunkLoadError.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const { activeAccountIndex } = useAppState();

  const activeInstance = useMemo(() => {
    if (typeof window === 'undefined') return { firebaseApp: null, auth: null, firestore: null };
    
    // Инициализируем только нужный узел вместо всех пяти сразу
    const instance = initializeFirebase(`nuxus_node_v98_${activeAccountIndex}`);
    if (instance.auth) {
      setPersistence(instance.auth, browserLocalPersistence).catch(() => {});
    }
    return instance;
  }, [activeAccountIndex]);

  if (!activeInstance.firebaseApp || !activeInstance.firestore || !activeInstance.auth) {
    return (
      <div className="h-screen w-full bg-[#020205] flex items-center justify-center">
         <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
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
