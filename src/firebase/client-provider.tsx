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
 * ENGINE WRAPPER V10.0
 * ОПТИМИЗИРОВАНО: Полное устранение Hydration Mismatch и таймаутов чанков.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const { activeAccountIndex } = useAppState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeInstance = useMemo(() => {
    if (typeof window === 'undefined') return null;
    
    try {
      const instance = initializeFirebase(`nuxus_node_v10_${activeAccountIndex}`);
      if (instance.auth) {
        setPersistence(instance.auth, browserLocalPersistence).catch(() => {});
      }
      return instance;
    } catch (e) {
      console.error("Engine Init Error:", e);
      return null;
    }
  }, [activeAccountIndex]);

  // КРИТИЧЕСКИЙ ФИКС: Рендерим загрузчик только на клиенте, не ломая SSR структуру
  if (!mounted || !activeInstance) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#020205] flex items-center justify-center">
         <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={activeInstance.firebaseApp as any}
      auth={activeInstance.auth as any}
      firestore={activeInstance.firestore as any}
    >
      {children}
    </FirebaseProvider>
  );
}
