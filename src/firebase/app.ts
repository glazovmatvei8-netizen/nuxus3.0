
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, Firestore } from 'firebase/firestore';

/**
 * Изолированная инициализация инстансов Firebase (Nodes).
 * ОПТИМИЗИРОВАНО V9.4.0: Защита от ASSERTION FAILED (ID: ca9) при повторной инициализации.
 */

const _global = (typeof window !== 'undefined' ? window : {}) as any;
_global.__NUXUS_NODES__ = _global.__NUXUS_NODES__ || {};

export function initializeFirebase(instanceName?: string) {
  if (typeof window === 'undefined') {
    return { firebaseApp: null as any, auth: null as any, firestore: null as any };
  }

  const name = instanceName || '[DEFAULT]';
  
  // Возвращаем существующий инстанс, если он уже в памяти
  if (_global.__NUXUS_NODES__[name]) {
    return _global.__NUXUS_NODES__[name];
  }

  const existingApp = getApps().find(a => a.name === name);
  const app: FirebaseApp = existingApp || initializeApp(firebaseConfig, name);
  
  let db: Firestore;
  try {
    // Пытаемся инициализировать Firestore с кэшем
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({})
    });
  } catch (e: any) {
    // Если Firestore уже инициализирован (ошибка ca9) или сбой кэша — берем стандартный
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
