'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, Firestore } from 'firebase/firestore';

/**
 * NUXUS KERNEL APP INITIALIZER V9.8.0
 * ОПТИМИЗИРОВАНО: Защита от дублирующей инициализации Firestore.
 */

export function initializeFirebase(instanceName?: string) {
  if (typeof window === 'undefined') {
    return { firebaseApp: null as any, auth: null as any, firestore: null as any };
  }

  const name = instanceName || '[DEFAULT]';
  
  let app: FirebaseApp;
  try {
    const existingApps = getApps();
    const existing = existingApps.find(a => a.name === name);
    app = existing || initializeApp(firebaseConfig, name);
  } catch (e) {
    app = getApp(name);
  }
  
  let db: Firestore;
  try {
    // Сначала пытаемся получить существующий инстанс
    db = getFirestore(app);
  } catch (e) {
    // Если инстанса нет, инициализируем с кэшем
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({})
      });
    } catch (criticalError) {
      // Экстренный фоллбек
      db = getFirestore(app);
    }
  }

  const auth: Auth = getAuth(app);

  return {
    firebaseApp: app,
    auth: auth,
    firestore: db
  };
}
