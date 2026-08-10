
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';

/**
 * NUXUS CORE CONTEXT V12.0
 * Только контекст, никакой тяжелой логики или импортов хуков.
 */

export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
}

export const FirebaseContext = createContext<FirebaseContextState>({
  firebaseApp: null,
  firestore: null,
  auth: null,
  user: null,
  isUserLoading: true,
});

export const FirebaseProvider: React.FC<{
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}> = ({ children, firebaseApp, firestore, auth }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsUserLoading(false);
    });
  }, [auth]);

  const value = useMemo(() => ({
    firebaseApp,
    firestore,
    auth,
    user,
    isUserLoading,
  }), [firebaseApp, firestore, auth, user, isUserLoading]);

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
};

export const useFirebase = () => useContext(FirebaseContext);
export const useUser = () => {
  const { user, isUserLoading } = useFirebase();
  return { user, isUserLoading };
};
export const useFirestore = () => useFirebase().firestore;
export const useAuth = () => useFirebase().auth;
