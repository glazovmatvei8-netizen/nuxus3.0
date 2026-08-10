'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
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
 * NUXUS ENGINE PROVIDER V15.0
 * 
 * Легковесный интерфейс связи с автономным ядром Nuxus Engine.
 * Больше не занимается инициализацией Firebase, только транслирует состояние пользователя.
 */
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    if (!nuxus.auth) {
      setIsUserLoading(false);
      return;
    }
    // Используем синглтон-инстанс напрямую из ядра
    return onAuthStateChanged(nuxus.auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsUserLoading(false);
    });
  }, []);

  const value = useMemo(() => ({
    user,
    isUserLoading,
  }), [user, isUserLoading]);

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
};

export const useFirebase = () => useContext(FirebaseContext);
export const useUser = () => {
  const { user, isUserLoading } = useFirebase();
  return { user, isUserLoading };
};

// Прокси-геттеры для прямого доступа к ядру через хуки
export const useFirestore = () => nuxus.db;
export const useAuth = () => nuxus.auth;
