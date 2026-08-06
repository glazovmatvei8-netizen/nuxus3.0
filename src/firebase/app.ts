
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';

/**
 * Изолированная инициализация инстансов Firebase (Nodes).
 * УЛУЧШЕНО V7.7.1: Использование глобального синглтона для исключения Assertion Failed при HMR.
 */

// Глобальное хранилище для инстансов
const _global = (typeof window !== 'undefined' ? window : {}) as any;
_global.__NUXUS_NODES__ = _global.__NUXUS_NODES__ || {};

export function initializeFirebase(instanceName?: string) {
  if (typeof window === 'undefined') {
    return { firebaseApp: null as any, auth: null as any, firestore: null as any };
  }

  const name = instanceName || '[DEFAULT]';
  
  // Если инстанс уже в глобальном хранилище, возвращаем его
  if (_global.__NUXUS_NODES__[name]) {
    return _global.__NUXUS_NODES__[name];
  }

  const existingApp = getApps().find(a => a.name === name);
  const app: FirebaseApp = existingApp || initializeApp(firebaseConfig, name);
  
  let db: Firestore;
  try {
    // В Next.js 15 при горячей перезагрузке могут возникать конфликты TabManager.
    // Мы используем максимально упрощенный конфиг для исключения ASSERTION FAILED.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e: any) {
    // Если firestore уже инициализирован для этого app
    db = getFirestore(app);
  }

  const auth: Auth = getAuth(app);

  const result = {
    firebaseApp: app,
    auth: auth,
    firestore: db
  };

  // Сохраняем в синглтон
  _global.__NUXUS_NODES__[name] = result;

  return result;
}
