'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, DependencyList } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signOut } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Стабилизатор ссылок Firebase V1.0.
 * Необходим для предотвращения бесконечных циклов в useCollection/useDoc.
 */
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  return useMemo(factory, deps);
}

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
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

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
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
    if (!auth) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

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
    if (!userAuthState.user || !firestore) return;

    const uid = userAuthState.user.uid;
    const userRef = doc(firestore, 'users', uid);
    
    let sessionId = localStorage.getItem('nuxus_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('nuxus_session_id', sessionId);
    }

    const sessionRef = doc(firestore, 'users', uid, 'sessions', sessionId);

    const getDeviceName = () => {
      const ua = navigator.userAgent;
      if (/android/i.test(ua)) return "Android Device";
      if (/iPad|iPhone|iPod/.test(ua)) return "iOS Device";
      if (/Windows/i.test(ua)) return "Windows PC";
      if (/Mac/i.test(ua)) return "macOS Node";
      return "Quantum Node";
    };

    const getBrowserName = () => {
      const ua = navigator.userAgent;
      if (ua.includes("Firefox")) return "Firefox";
      if (ua.includes("Chrome")) return "Chrome";
      if (ua.includes("Safari")) return "Safari";
      return "Nuxus Kernel";
    };

    const updateStatus = async () => {
      if (document.hidden) return;
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
          deviceName: getDeviceName(),
          browser: getBrowserName(),
          ip: geo.ip || '?.?.?.?',
          countryCode: geo.country_code || '??',
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          userAgent: navigator.userAgent
        };

        setDocumentNonBlocking(sessionRef, sessionData, { merge: true });
        updateDocumentNonBlocking(userRef, { 
          lastIp: geo.ip,
          countryCode: geo.country_code || '??'
        });
      } catch (e) {
        setDocumentNonBlocking(sessionRef, {
          id: sessionId,
          userId: uid,
          deviceName: getDeviceName(),
          browser: getBrowserName(),
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
    };

    const unsubscribeSession = onSnapshot(sessionRef, (snap) => {
      if (!snap.exists() && userAuthState.user) {
        signOut(auth).then(() => {
          localStorage.removeItem('nuxus_session_id');
          window.location.reload();
        });
      }
    });

    initSession();
    updateStatus();
    const interval = setInterval(updateStatus, 60000); 

    const handleVisibility = () => { if (!document.hidden) updateStatus(); };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
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
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
