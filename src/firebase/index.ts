'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore
} from 'firebase/firestore';

/**
 * Инициализация Firebase Modern Core.
 * Защищено от ошибок повторной инициализации в Next.js (Fast Refresh).
 */
export function initializeFirebase() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  
  let firestore: Firestore;
  
  try {
    // Пытаемся инициализировать с кэшированием. 
    // Если это второй вызов (HMR), Firebase выдаст ошибку, которую мы перехватим.
    firestore = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e) {
    // Если уже инициализировано, просто получаем текущий экземпляр
    firestore = getFirestore(app);
  }

  return {
    firebaseApp: app,
    auth: auth,
    firestore: firestore
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
