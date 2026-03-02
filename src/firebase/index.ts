'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

/**
 * Инициализация Firebase v0.54.1 Ghost Protocol.
 * Исправлена ошибка "initializeFirestore() has already been called".
 */
export function initializeFirebase() {
  let firebaseApp: FirebaseApp;
  let firestore;

  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
      // Инициализируем Firestore с оффлайн-кэшем только при создании нового приложения
      firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch (e) {
      console.warn('Firebase core warm-up retry...');
      firebaseApp = getApp();
      firestore = getFirestore(firebaseApp);
    }
  } else {
    firebaseApp = getApp();
    // Если приложение уже создано, просто берем существующий Firestore
    firestore = getFirestore(firebaseApp);
  }

  const auth = getAuth(firebaseApp);

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
