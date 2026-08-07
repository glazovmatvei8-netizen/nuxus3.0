'use client';

import React, { useMemo, useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './app'; 
import { useAppState } from '@/lib/store'; 
import { setPersistence, browserLocalPersistence } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * ГЛОБАЛЬНЫЙ МЕНЕДЖЕР УЗЛОВ V9.9.0
 * ОПТИМИЗИРОВАНО: Полное устранение Hydration Mismatch.
 * Теперь дерево компонентов остается стабильным между SSR и Hydration.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const { activeAccountIndex } = useAppState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeInstance = useMemo(() => {
    // На сервере всегда возвращаем пустые инстансы для совпадения структуры
    if (typeof window === 'undefined') {
      return { firebaseApp: null, auth: null, firestore: null };
    }
    
    const instance = initializeFirebase(`nuxus_node_v99_${activeAccountIndex}`);
    if (instance.auth) {
      setPersistence(instance.auth, browserLocalPersistence).catch(() => {});
    }
    return instance;
  }, [activeAccountIndex]);

  // Флаг готовности Ядра
  const isReady = mounted && activeInstance.firebaseApp && activeInstance.firestore && activeInstance.auth;

  return (
    <FirebaseProvider
      firebaseApp={activeInstance.firebaseApp as any}
      auth={activeInstance.auth as any}
      firestore={activeInstance.firestore as any}
    >
      {/* 
         КРИТИЧЕСКИЙ ФИКС: Всегда рендерим children, чтобы сохранить структуру Suspense.
         Загрузочный экран показываем поверх как fixed оверлей.
      */}
      {!isReady && (
        <div className="fixed inset-0 z-[10000] bg-[#020205] flex items-center justify-center">
           <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      
      {children}
    </FirebaseProvider>
  );
}
