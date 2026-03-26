
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';

/**
 * Безопасная инициализация Firebase с поддержкой оффлайн-режима.
 * Предотвращает ошибку "initializeFirestore() has already been called".
 */
export function initializeFirebase() {
  const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  let db: Firestore;
  try {
    // Пытаемся инициализировать Firestore с расширенными настройками кэширования
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e: any) {
    // Если Firestore уже инициализирован (например, при HMR), получаем текущий экземпляр
    db = getFirestore(app);
  }

  const auth: Auth = getAuth(app);

  return {
    firebaseApp: app,
    auth: auth,
    firestore: db
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
