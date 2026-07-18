
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';

/**
 * Безопасная инициализация Firebase с поддержкой нескольких инстансов (Multi-Account).
 * instanceName позволяет создавать изолированные сессии в одном браузере.
 */
export function initializeFirebase(instanceName?: string) {
  const name = instanceName || '[DEFAULT]';
  const existingApp = getApps().find(a => a.name === name);
  const app: FirebaseApp = existingApp || initializeApp(firebaseConfig, name);
  
  let db: Firestore;
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e: any) {
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
