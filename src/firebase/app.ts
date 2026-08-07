'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, Firestore } from 'firebase/firestore';

/**
 * Изолированная инициализация инстансов Firebase (Nodes).
 * ОПТИМИЗИРОВАНО V9.5.0: Устранение SyntaxError и стабилизация инициализации.
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
    // Инициализация Firestore с локальным кэшем
    db = getFirestore(app);
  } catch (e: any) {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({})
    });
  }

  const auth: Auth = getAuth(app);

  return {
    firebaseApp: app,
    auth: auth,
    firestore: db
  };
}
