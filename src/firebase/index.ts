
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore, 
  Firestore
} from 'firebase/firestore';

/**
 * Инициализация Firebase v0.63.0 Quantum Resilience.
 * Максимальная совместимость со старыми браузерами (Android 5.0 / LG).
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
    // Детекция отсутствия Proxy (ES6), что характерно для Android 5.0.2
    const hasProxy = typeof window !== 'undefined' && !!window.Proxy;
    const isOldAndroid = typeof navigator !== 'undefined' && /Android [45]/.test(navigator.userAgent);

    if (!hasProxy || isOldAndroid) {
      console.log('Nuxus Core: Legacy Environment detected. Forcing basic Firestore mode.');
      // Используем простейшую инициализацию без кэша и полифиллов
      cachedFirestore = getFirestore(firebaseApp);
    } else {
      try {
        // Попытка инициализации с кэшем для современных устройств
        cachedFirestore = initializeFirestore(firebaseApp, {
          localCache: {
            kind: 'persistent'
          }
        } as any);
      } catch (e) {
        console.warn('Nuxus Core: Cache initialization failed, falling back to basic.');
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
