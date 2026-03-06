
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
 * Инициализация Firebase v0.61.0 Quantum Resilience.
 * Максимальная совместимость со старыми браузерами (Android 5.0 / iOS 10).
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
    try {
      // Пытаемся инициализировать продвинутый кэш
      // На старых Android (5.0) persistentMultipleTabManager может вызывать исключение
      cachedFirestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
          cacheSizeBytes: CACHE_SIZE_UNLIMITED
        })
      });
      console.log('Nuxus Core: Advanced Persistence Active');
    } catch (e) {
      console.warn('Nuxus Core: Legacy device detected, using basic firestore.');
      // Если продвинутый кэш не поддерживается, используем стандартный Firestore
      cachedFirestore = getFirestore(firebaseApp);
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
