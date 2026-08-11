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
 * NUXUS PROVIDER V20.0
 * Облегченный узел трансляции состояния.
 */
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
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
  const context = useContext(FirebaseContext);
  return { user: context.user, isUserLoading: context.isUserLoading };
};

export const useFirestore = () => nuxus.db;
export const useAuth = () => nuxus.auth;
