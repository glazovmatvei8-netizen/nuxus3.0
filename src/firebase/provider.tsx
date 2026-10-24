
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { onAuthStateChanged, User, setPersistence, indexedDBLocalPersistence } from 'firebase/auth';
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
 * NUXUS FIREBASE PROVIDER V187
 * ОПТИМИЗИРОВАНО: Форсированное сохранение сессии для мобильных устройств.
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

    // Принудительная установка персистентности для мобилок
    setPersistence(auth, indexedDBLocalPersistence).catch(console.error);

    // Слушатель состояния
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsUserLoading(false);
    }, (error) => {
      console.error("NUXUS PROVIDER: Auth error", error);
      setIsUserLoading(false);
    });

    // Резервный сброс сокращен до 1 сек для моментального старта
    const fallback = setTimeout(() => {
      setIsUserLoading(false);
    }, 1000);

    return () => {
      unsubscribe();
      clearTimeout(fallback);
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
