
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Чистая и надежная инициализация Firebase.
 * Использует стандартные синглтоны для предотвращения конфликтов в Next.js.
 */
export function initializeFirebase() {
  // Инициализируем приложение только если оно еще не создано
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  // getAuth и getFirestore возвращают уже существующие инстансы, если они есть.
  // Это гарантированно убирает ошибку "already been called with different options".
  const auth = getAuth(app);
  const firestore = getFirestore(app);

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
