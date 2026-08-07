'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, Firestore } from 'firebase/firestore';

/**
 * NUXUS KERNEL APP INITIALIZER V9.9.0
 * ОПТИМИЗИРОВАНО: Защита от каскадных ошибок инициализации.
 */
export function initializeFirebase(instanceName: string = '[DEFAULT]') {
  if (typeof window === 'undefined') {
    return { firebaseApp: null, auth: null, firestore: null };
  }

  let app: FirebaseApp;
  const existingApps = getApps();
  const existing = existingApps.find(a => a.name === instanceName);

  if (existing) {
    app = existing;
  } else {
    try {
      app = initializeApp(firebaseConfig, instanceName);
    } catch (e) {
      app = getApp(instanceName);
    }
  }
  
  let db: Firestore;
  try {
    // Всегда сначала проверяем, нет ли уже созданного инстанса для этого приложения
    db = getFirestore(app);
  } catch (e) {
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({})
      });
    } catch (criticalError) {
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
