'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { nuxus } from '@/lib/nuxus-engine';

/**
 * NUXUS PROVIDER V23.0 «QUANTUM TERMINAL»
 * 
 * УЛЬТРА-СТАБИЛЬНОСТЬ: Исключены любые импорты из барьерных файлов.
 * Прямое использование движка гарантирует отсутствие ошибки 'call'.
 */

export interface FirebaseContextState {
  user: User | null;
  isUserLoading: boolean;
}

export const FirebaseContext = createContext<FirebaseContextState>({
  user: null,
  isUserLoading: true,
});

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const auth = nuxus.auth;
    if (!auth) {
      setIsUserLoading(false);
      return;
    }
    
    return onAuthStateChanged(auth, (firebaseUser) => {
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
  const context = useContext(FirebaseContext);
  return { user: context.user, isUserLoading: context.isUserLoading };
};

export const useFirestore = () => nuxus.db;
export const useAuth = () => nuxus.auth;
