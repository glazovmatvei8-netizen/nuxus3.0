'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore
} from 'firebase/firestore';

/**
 * Инициализация Firebase v0.70.0 Modern Core.
 * Оптимизировано для стабильности в среде Next.js.
 */
export function initializeFirebase() {
  let firebaseApp: FirebaseApp;

  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  const auth = getAuth(firebaseApp);
  
  let firestore: Firestore;
  
  try {
    // Пытаемся инициализировать Firestore с современным многовкладочным кэшем
    firestore = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (err: any) {
    // Если Firestore уже был инициализирован (например, при Fast Refresh),
    // или если браузер не поддерживает данные опции, используем существующий инстанс.
    // Это предотвращает ошибку "initializeFirestore() has already been called".
    firestore = getFirestore(firebaseApp);
  }

  return {
    firebaseApp,
    auth,
    firestore
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
