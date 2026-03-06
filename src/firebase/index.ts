
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';

/**
 * Инициализация Firebase v0.61.1 Quantum Resilience.
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
    // Детекция старых устройств для отключения тяжелого кэширования
    const isLegacy = typeof navigator !== 'undefined' && (
      /Android [45]/.test(navigator.userAgent) || 
      /iPhone OS [8910]/.test(navigator.userAgent) ||
      !window.Proxy // Критично для Android 5
    );

    if (isLegacy) {
      console.log('Nuxus Core: Legacy Environment detected. Disabling advanced cache.');
      // Для Android 5 используем максимально простую инициализацию
      cachedFirestore = getFirestore(firebaseApp);
    } else {
      try {
        cachedFirestore = initializeFirestore(firebaseApp, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
            cacheSizeBytes: CACHE_SIZE_UNLIMITED
          })
        });
      } catch (e) {
        console.warn('Nuxus Core: Advanced cache failed, fallback to basic.');
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
