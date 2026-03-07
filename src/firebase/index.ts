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
 * Глобальные переменные для хранения инстансов (Singleton).
 * Это предотвращает ошибку "initializeFirestore() has already been called".
 */
let memoizedApp: FirebaseApp | undefined;
let memoizedFirestore: Firestore | undefined;
let memoizedAuth: Auth | undefined;

/**
 * Инициализация Firebase v0.75.0 Modern Core.
 * Оптимизировано для предотвращения конфликтов при Fast Refresh в Next.js.
 */
export function initializeFirebase() {
  // 1. Проверяем наличие существующего приложения
  if (!memoizedApp) {
    if (getApps().length > 0) {
      memoizedApp = getApp();
    } else {
      memoizedApp = initializeApp(firebaseConfig);
    }
  }

  // 2. Инициализируем Auth, если еще нет
  if (!memoizedAuth) {
    memoizedAuth = getAuth(memoizedApp);
  }

  // 3. Инициализируем Firestore с защитой от повторного вызова
  if (!memoizedFirestore) {
    try {
      // Пытаемся инициализировать Firestore с современным многовкладочным кэшем
      memoizedFirestore = initializeFirestore(memoizedApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch (err: any) {
      // Если Firestore уже был инициализирован ранее, просто получаем его экземпляр
      memoizedFirestore = getFirestore(memoizedApp);
    }
  }

  return {
    firebaseApp: memoizedApp,
    auth: memoizedAuth,
    firestore: memoizedFirestore
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
