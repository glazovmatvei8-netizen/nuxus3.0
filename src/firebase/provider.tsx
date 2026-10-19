
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
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
<<<<<<< HEAD
 * NUXUS FIREBASE PROVIDER V145.0
 * ОПТИМИЗИРОВАНО: Принудительное сохранение сессии и моментальный выход из загрузки.
=======
 * NUXUS FIREBASE PROVIDER V75.0
 * ОПТИМИЗИРОВАНО: Гарантированный выход из состояния загрузки.
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
 */
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const auth = nuxus.auth;
    if (!auth) {
<<<<<<< HEAD
=======
      console.warn("NUXUS PROVIDER: Auth engine not responding");
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      setIsUserLoading(false);
      return;
    }

<<<<<<< HEAD
    // Слушатель состояния с приоритетом на существующую сессию
=======
    // Слушатель состояния
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsUserLoading(false);
    }, (error) => {
      console.error("NUXUS PROVIDER: Auth error", error);
      setIsUserLoading(false);
    });

<<<<<<< HEAD
    // Резервный сброс сокращен до 2 секунд для моментального входа
    const fallback = setTimeout(() => {
      setIsUserLoading(false);
    }, 2000);
=======
    // Резервный сброс через 5 секунд если слушатель молчит
    const fallback = setTimeout(() => {
      setIsUserLoading(false);
    }, 5000);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0

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
