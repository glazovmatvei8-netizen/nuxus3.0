
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
 * Инициализация Firebase v0.54.5 Ghost Protocol.
 * Максимальное кэширование для работы в условиях "белых списков".
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
      // Инициализируем Firestore с НЕОГРАНИЧЕННЫМ оффлайн-кэшем
      cachedFirestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
          cacheSizeBytes: CACHE_SIZE_UNLIMITED
        })
      });
      console.log('Nuxus Core: Ghost Persistence Active (Unlimited)');
    } catch (e) {
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
