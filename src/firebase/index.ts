
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore, 
  Firestore,
  terminate
} from 'firebase/firestore';

/**
 * Инициализация Firebase v0.66.0 Quantum Resilience.
 * Максимальная стабильность для десктопных приложений и старых Android.
 */
let cachedFirestore: Firestore | null = null;

export function initializeFirebase() {
  let firebaseApp: FirebaseApp;

  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  const auth = getAuth(firebaseApp);

  if (!cachedFirestore) {
    // Детекция окружения для безопасной работы Firestore
    const hasProxy = typeof window !== 'undefined' && !!window.Proxy;
    const isOldAndroid = typeof navigator !== 'undefined' && /Android [45]/.test(navigator.userAgent);
    const isDesktop = typeof window !== 'undefined' && (
      (window as any).process?.type === 'renderer' || 
      navigator.userAgent.toLowerCase().includes('electron') ||
      navigator.userAgent.toLowerCase().includes('nativefier')
    );

    if (!hasProxy || isOldAndroid || isDesktop) {
      // В десктопных приложениях и старых браузерах отключаем сложные методы кэширования
      console.log('Nuxus Core: Safety Mode active.');
      cachedFirestore = getFirestore(firebaseApp);
    } else {
      try {
        cachedFirestore = initializeFirestore(firebaseApp, {
          localCache: {
            kind: 'persistent'
          }
        } as any);
      } catch (e) {
        cachedFirestore = getFirestore(firebaseApp);
      }
    }
  }

  return {
    firebaseApp,
    auth,
    firestore: cachedFirestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
