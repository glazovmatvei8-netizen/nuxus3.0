'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, DependencyList } from 'react';
import { FirebaseApp } from 'firebase/app';
import { 
  Firestore, 
  doc, 
  onSnapshot
} from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signOut } from 'firebase/auth';
import { updateDocumentNonBlocking, setDocumentNonBlocking } from './non-blocking-updates';
import { errorEmitter } from './error-emitter';

/**
 * NUXUS FIREBASE PROVIDER V7.0.0 (CORE STABILITY)
 * ОПТИМИЗИРОВАНО: Хуки вынесены в отдельные файлы для предотвращения originalFactory.call.
 */

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<{
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => {
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const handleError = (error: any) => {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error("Nuxus Security Signal:", error.message);
      }
    };
    errorEmitter.on('permission-error', handleError);
    return () => errorEmitter.off('permission-error', handleError);
  }, []);

  useEffect(() => {
    if (!userAuthState.user || !firestore || !auth) return;

    const uid = userAuthState.user.uid;
    const userRef = doc(firestore, 'users', uid);
    
    let sessionId = typeof window !== 'undefined' ? localStorage.getItem('nuxus_session_id') : null;
    if (!sessionId && typeof window !== 'undefined') {
      sessionId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('nuxus_session_id', sessionId);
    }

    if (!sessionId) return;

    const sessionRef = doc(firestore, 'users', uid, 'sessions', sessionId);

    const updateStatus = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const now = new Date().toISOString();
      updateDocumentNonBlocking(userRef, { lastSeen: now });
      updateDocumentNonBlocking(sessionRef, { lastActive: now });
    };

    const initSession = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch('https://ipwho.is/', { signal: controller.signal });
        clearTimeout(timeoutId);
        const geo = await res.json();
        
        const sessionData = {
          id: sessionId,
          userId: uid,
          deviceName: "Nuxus Node",
          ip: geo.ip || '?.?.?.?',
          countryCode: geo.country_code || '??',
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        setDocumentNonBlocking(sessionRef, sessionData, { merge: true });
        updateDocumentNonBlocking(userRef, { countryCode: geo.country_code || '??' });
      } catch (e) {
        setDocumentNonBlocking(sessionRef, { id: sessionId, userId: uid, lastActive: new Date().toISOString() }, { merge: true });
      }
    };

    const unsubscribeSession = onSnapshot(sessionRef, (snap) => {
      if (!snap.exists() && userAuthState.user) {
        signOut(auth).then(() => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('nuxus_session_id');
            window.location.reload();
          }
        });
      }
    });

    initSession();
    updateStatus();
    const interval = setInterval(updateStatus, 60000); 

    return () => {
      clearInterval(interval);
      unsubscribeSession();
    };
  }, [userAuthState.user?.uid, firestore, auth]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  return context || { areServicesAvailable: false, firebaseApp: null, firestore: null, auth: null, user: null, isUserLoading: true, userError: null };
};

export const useAuth = () => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = () => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useUser = () => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
}
