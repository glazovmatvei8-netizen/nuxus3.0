'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore
} from 'firebase/firestore';

/**
 * Чистая инициализация Firebase для современных браузеров и ПК.
 * Использует паттерн Singleton для предотвращения ошибок повторной инициализации.
 */
export function initializeFirebase() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  
  let firestore: Firestore;
  
  try {
    // Пытаемся инициализировать Firestore с современным кэшированием для нескольких вкладок.
    // Если он уже инициализирован (например, при Fast Refresh), используем getFirestore().
    firestore = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e: any) {
    // В случае любой ошибки (уже инициализировано или не поддерживается) берем существующий инстанс
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
