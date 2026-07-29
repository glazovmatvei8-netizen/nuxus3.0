'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';

/**
 * Изолированная инициализация инстансов Firebase (Nodes).
 * Добавлена проверка на window для SSR стабильности.
 */
export function initializeFirebase(instanceName?: string) {
  if (typeof window === 'undefined') {
    return { firebaseApp: null as any, auth: null as any, firestore: null as any };
  }

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
