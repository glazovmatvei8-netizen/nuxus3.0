'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, Firestore } from 'firebase/firestore';

/**
 * Изолированная инициализация инстансов Firebase (Nodes).
 * ОПТИМИЗИРОВАНО V8.5.0: Отключен MultipleTabManager для устранения ASSERTION FAILED (ID: ca9).
 */

const _global = (typeof window !== 'undefined' ? window : {}) as any;
_global.__NUXUS_NODES__ = _global.__NUXUS_NODES__ || {};

export function initializeFirebase(instanceName?: string) {
  if (typeof window === 'undefined') {
    return { firebaseApp: null as any, auth: null as any, firestore: null as any };
  }

  const name = instanceName || '[DEFAULT]';
  
  if (_global.__NUXUS_NODES__[name]) {
    return _global.__NUXUS_NODES__[name];
  }

  const existingApp = getApps().find(a => a.name === name);
  const app: FirebaseApp = existingApp || initializeApp(firebaseConfig, name);
  
  let db: Firestore;
  try {
    // Используем упрощенный кэш без мульти-таб менеджера для стабильности в Next.js 15
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({})
    });
  } catch (e: any) {
    db = getFirestore(app);
  }

  const auth: Auth = getAuth(app);

  const result = {
    firebaseApp: app,
    auth: auth,
    firestore: db
  };

  _global.__NUXUS_NODES__[name] = result;

  return result;
}
