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
 * NUXUS ENGINE PROVIDER V16.0 «PURE ORIGIN»
 * 
 * Изолированный интерфейс связи с ядром Nuxus Engine.
 * Гарантирует отсутствие ошибок Hydration и стабильную передачу Auth-сигналов.
 */
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    // Прямая связь с ядром без посредников
    if (!nuxus.auth) {
      setIsUserLoading(false);
      return;
    }
    
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

// Экспортируем геттеры Ядра для хуков
export const useFirestore = () => nuxus.db;
export const useAuth = () => nuxus.auth;
