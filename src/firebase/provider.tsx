
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  setPersistence, 
  indexedDBLocalPersistence,
  getAuth
} from 'firebase/auth';
import { nuxus } from '@/lib/nuxus-engine';

export interface FirebaseContextState {
  user: User | null;
  isUserLoading: boolean;
}

export const FirebaseContext = createContext<FirebaseContextState>({
  user: null,
  isUserLoading: true,
});

/**
 * ПРЯМОЙ ПРОВАЙДЕР FIREBASE V68.2 «HARDENED»
 * Использует IndexedDB для предотвращения вылетов (Error 500) в APK.
 */
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const auth = nuxus.auth;
    if (!auth) {
      setIsUserLoading(false);
      return;
    }

    // ИНИЦИАЛИЗАЦИЯ ПАМЯТИ: Заставляем Firebase использовать IndexedDB вместо localStorage.
    // Это ключевое решение проблемы вылетов в Android WebView.
    const initAuth = async () => {
      try {
        await setPersistence(auth, indexedDBLocalPersistence);
        
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          setUser(firebaseUser);
          setIsUserLoading(false);
        });
        return unsubscribe;
      } catch (e) {
        console.error("Nuxus Auth Engine: Persistence failed", e);
        setIsUserLoading(false);
      }
    };

    const unsubPromise = initAuth();
    return () => {
      unsubPromise.then(unsub => unsub && unsub());
    };
  }, []);

  const value = useMemo(() => ({
    user,
    isUserLoading,
  }), [user, isUserLoading]);

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
};

export const useUser = () => {
  const context = useContext(FirebaseContext);
  return { user: context.user, isUserLoading: context.isUserLoading };
};

export const useFirestore = () => nuxus.db;
export const useAuth = () => nuxus.auth;
