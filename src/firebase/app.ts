'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';

/**
 * Изолированная инициализация инстансов Firebase (Nodes).
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
